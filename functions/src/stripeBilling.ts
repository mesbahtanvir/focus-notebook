import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import {
  SUBSCRIPTION_STATUS_COLLECTION,
  SUBSCRIPTION_STATUS_DOC_ID,
  STRIPE_CUSTOMERS_COLLECTION,
  type CachedInvoice,
  type CachedPaymentMethod,
  type UsageStats,
} from '../../shared/subscription';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2023-10-16';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET;
  if (!secretKey) {
    throw new functions.https.HttpsError(
      'internal',
      'Stripe is not configured. Please contact support.'
    );
  }

  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

function resolveBaseUrl(origin?: unknown): string {
  if (typeof origin === 'string' && origin.startsWith('http')) {
    return origin.replace(/\/$/, '');
  }
  const fallback = process.env.APP_BASE_URL;
  if (typeof fallback === 'string' && fallback.startsWith('http')) {
    return fallback.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

function getFirestore() {
  return admin.firestore();
}

async function recordCustomerMapping(customerId: string, uid: string): Promise<void> {
  if (!customerId) return;
  await getFirestore().collection(STRIPE_CUSTOMERS_COLLECTION).doc(customerId).set(
    {
      uid,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function findUidByCustomer(customerId: string): Promise<string | null> {
  if (!customerId) return null;
  const doc = await getFirestore().collection(STRIPE_CUSTOMERS_COLLECTION).doc(customerId).get();
  const data = doc.data();
  return typeof data?.uid === 'string' ? data.uid : null;
}

function getStripeCustomerId(subscription: Stripe.Subscription | null | undefined): string | null {
  if (!subscription) return null;
  if (typeof subscription.customer === 'string') {
    return subscription.customer;
  }
  return subscription.customer?.id ?? null;
}

const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing', 'past_due']);

function mapSubscriptionToSnapshot(subscription: Stripe.Subscription) {
  const status = subscription.status;
  const stripeCustomerId = getStripeCustomerId(subscription);
  const price = subscription.items.data[0]?.price;
  const priceId = price?.id ?? null;
  const currentPeriodEnd = subscription.current_period_end
    ? subscription.current_period_end * 1000
    : null;
  const trialEndsAt = subscription.trial_end ? subscription.trial_end * 1000 : null;
  const cancelAt = subscription.cancel_at ? subscription.cancel_at * 1000 : null;
  const aiAllowed = ACTIVE_STATUSES.has(status);

  // Get price information
  const amount = price?.unit_amount ?? null;
  const currency = price?.currency ?? 'usd';
  const interval = price?.recurring?.interval ?? 'month';

  // Get discount information
  const discount = subscription.discount;
  const discountAmount = discount?.coupon?.amount_off ?? null;
  const discountPercent = discount?.coupon?.percent_off ?? null;

  return {
    tier: aiAllowed ? 'pro' : 'free',
    status,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    priceId,
    amount,
    currency,
    interval,
    discountAmount,
    discountPercent,
    currentPeriodEnd,
    currentPeriodStart: subscription.current_period_start
      ? subscription.current_period_start * 1000
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
    cancelAt,
    trialEndsAt,
    entitlements: {
      aiProcessing: aiAllowed,
      aiCreditsRemaining: null,
      aiCreditsResetsAt: currentPeriodEnd,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function updateSubscriptionStatus(uid: string, payload: Record<string, unknown>) {
  await getFirestore()
    .doc(`users/${uid}/${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`)
    .set(
      {
        ...payload,
        lastSyncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
}

function normalizeCheckoutCustomer(customer: unknown): string | null {
  if (!customer) {
    return null;
  }

  if (typeof customer === 'string') {
    return customer;
  }

  if (typeof customer === 'object' && customer !== null && 'id' in customer) {
    const maybeId = (customer as { id?: unknown }).id;
    return typeof maybeId === 'string' ? maybeId : null;
  }

  return null;
}

function assertSessionOwnership(session: Stripe.Checkout.Session, uid: string): void {
  const sessionUid = typeof session.metadata?.uid === 'string' ? session.metadata.uid : null;
  if (sessionUid && sessionUid !== uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Checkout session does not belong to the authenticated user.'
    );
  }
}

async function resolveSessionOwner(session: Stripe.Checkout.Session): Promise<string | null> {
  const sessionUid = typeof session.metadata?.uid === 'string' ? session.metadata.uid : null;
  if (sessionUid) {
    return sessionUid;
  }

  const customerId = normalizeCheckoutCustomer(session.customer);
  if (!customerId) {
    return null;
  }

  return await findUidByCustomer(customerId);
}

async function loadSubscriptionFromSession(session: Stripe.Checkout.Session, stripe: Stripe) {
  const subscriptionFromSession = session.subscription;
  if (!subscriptionFromSession) {
    return null;
  }

  if (typeof subscriptionFromSession !== 'string') {
    return subscriptionFromSession as Stripe.Subscription;
  }

  return await stripe.subscriptions.retrieve(subscriptionFromSession, {
    expand: ['latest_invoice.payment_intent'],
  });
}

export const createStripeCheckoutSession = functions
  .runWith({
    minInstances: 1, // Keep warm to reduce user churn from cold starts
  })
  .https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = context.auth.uid;
  const provider = context.auth.token?.firebase?.sign_in_provider;
  if (provider === 'anonymous') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Upgrade requires a permanent account. Link your email before continuing.'
    );
  }

  const email = context.auth.token?.email;
  if (typeof email !== 'string' || email.length === 0) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'A verified email address is required before upgrading.'
    );
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error('Stripe price id is not configured.');
    throw new functions.https.HttpsError(
      'internal',
      'Billing configuration incomplete. Please contact support.'
    );
  }

  const baseUrl = resolveBaseUrl(data?.origin);
  const successUrl = `${baseUrl}/profile?upgrade=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/profile?upgrade=cancelled`;

  const firestore = getFirestore();
  const statusRef = firestore.doc(
    `users/${uid}/${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`
  );
  const statusSnap = await statusRef.get();
  const statusData = statusSnap.data();
  const existingCustomerId =
    typeof statusData?.stripeCustomerId === 'string' ? statusData.stripeCustomerId : undefined;

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    billing_address_collection: 'auto',
    customer: existingCustomerId,
    customer_email: existingCustomerId ? undefined : email,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { uid },
    },
    metadata: { uid },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new functions.https.HttpsError(
      'internal',
      'Unable to start checkout right now. Please try again shortly.'
    );
  }

  await statusRef.set(
    {
      stripeCustomerId: existingCustomerId ?? null,
      lastCheckoutSessionId: session.id,
      lastCheckoutInitiatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { url: session.url };
});

export const createStripePortalSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = context.auth.uid;
  const provider = context.auth.token?.firebase?.sign_in_provider;
  if (provider === 'anonymous') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Anonymous accounts cannot manage billing.'
    );
  }

  const firestore = getFirestore();
  const statusRef = firestore.doc(
    `users/${uid}/${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`
  );
  const statusSnap = await statusRef.get();
  const statusData = statusSnap.data();
  const customerId =
    typeof statusData?.stripeCustomerId === 'string' ? statusData.stripeCustomerId : null;

  if (!customerId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'No billing profile found. You may need to upgrade before managing your subscription.'
    );
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${resolveBaseUrl(data?.origin)}/profile`,
  });

  if (!session.url) {
    throw new functions.https.HttpsError(
      'internal',
      'Unable to open the billing portal right now. Please try again shortly.'
    );
  }

  await statusRef.set(
    {
      lastPortalSessionId: session.id,
      lastPortalAccessedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { url: session.url };
});

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured.');
    res.status(500).send('Webhook misconfigured.');
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    res.status(400).send('Missing Stripe signature header.');
    return;
  }

  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    res.status(400).send('Invalid signature.');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === 'string' ? session.customer : null;
        const uid = session.metadata?.uid ?? null;

        // Record customer mapping first
        if (customerId && uid) {
          await recordCustomerMapping(customerId, uid);
        }

        // Retrieve and process subscription with full data
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : null;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['latest_invoice.payment_intent'],
            });
            const resolvedUid =
              uid ?? (customerId ? await findUidByCustomer(customerId) : null);
            if (!resolvedUid) {
              console.error(
                'checkout.session.completed: Unable to resolve UID for subscription.',
                'Session ID:',
                session.id,
                'Subscription ID:',
                subscriptionId,
                'Customer ID:',
                customerId
              );
              break;
            }
            const resolvedCustomerId = getStripeCustomerId(subscription);
            if (resolvedCustomerId && resolvedCustomerId !== customerId) {
              await recordCustomerMapping(resolvedCustomerId, resolvedUid);
            }

            // Update with full subscription data including tier and entitlements
            const subscriptionSnapshot = mapSubscriptionToSnapshot(subscription);
            await updateSubscriptionStatus(resolvedUid, {
              ...subscriptionSnapshot,
              lastCheckoutCompletedAt: new Date().toISOString(),
              lastCheckoutSessionId: session.id,
            });
            console.log(
              'checkout.session.completed: Successfully updated subscription status.',
              'User ID:',
              resolvedUid,
              'Tier:',
              subscriptionSnapshot.tier,
              'Status:',
              subscriptionSnapshot.status
            );
          } catch (error) {
            console.error(
              'checkout.session.completed: Failed to retrieve or process subscription.',
              'Session ID:',
              session.id,
              'Subscription ID:',
              subscriptionId,
              'Error:',
              error
            );
            // Don't write partial data - let customer.subscription.created event handle it
          }
        } else {
          console.warn(
            'checkout.session.completed: No subscription ID found.',
            'Session ID:',
            session.id,
            'Payment status:',
            session.payment_status
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = getStripeCustomerId(subscription);
        const uidFromMetadata = subscription.metadata?.uid ?? null;
        const uid =
          uidFromMetadata ?? (customerId ? await findUidByCustomer(customerId) : null);
        if (!uid) {
          console.error(
            `${event.type}: Unable to resolve UID for subscription.`,
            'Subscription ID:',
            subscription.id,
            'Customer ID:',
            customerId,
            'Metadata UID:',
            uidFromMetadata
          );
          break;
        }
        if (customerId) {
          await recordCustomerMapping(customerId, uid);
        }
        const subscriptionSnapshot = mapSubscriptionToSnapshot(subscription);
        await updateSubscriptionStatus(uid, subscriptionSnapshot);
        console.log(
          `${event.type}: Successfully updated subscription status.`,
          'User ID:',
          uid,
          'Tier:',
          subscriptionSnapshot.tier,
          'Status:',
          subscriptionSnapshot.status
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = getStripeCustomerId(subscription);
        const uidFromMetadata = subscription.metadata?.uid ?? null;
        const uid =
          uidFromMetadata ?? (customerId ? await findUidByCustomer(customerId) : null);
        if (!uid) {
          console.error(
            'customer.subscription.deleted: Unable to resolve UID for subscription.',
            'Subscription ID:',
            subscription.id,
            'Customer ID:',
            customerId,
            'Metadata UID:',
            uidFromMetadata
          );
          break;
        }

        const payload: Record<string, unknown> = {
          tier: 'free',
          status: 'canceled',
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          entitlements: {
            aiProcessing: false,
            aiCreditsRemaining: 0,
            aiCreditsResetsAt: null,
          },
          updatedAt: new Date().toISOString(),
        };

        if (customerId) {
          payload.stripeCustomerId = customerId;
        }

        await updateSubscriptionStatus(uid, payload);
        console.log(
          'customer.subscription.deleted: Successfully downgraded user to free tier.',
          'User ID:',
          uid
        );
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;

        if (!customerId) {
          console.warn(`${event.type}: No customer ID found on invoice.`, 'Invoice ID:', invoice.id);
          break;
        }

        const uid = await findUidByCustomer(customerId);
        if (!uid) {
          console.warn(`${event.type}: Unable to resolve UID for invoice.`, 'Customer ID:', customerId);
          break;
        }

        // Cache invoice in Firestore
        const cachedInvoice: CachedInvoice = {
          id: invoice.id,
          amount: invoice.amount_paid || invoice.total || 0,
          currency: invoice.currency,
          status: invoice.status as CachedInvoice['status'],
          description: invoice.description || invoice.lines.data[0]?.description || null,
          created: invoice.created * 1000,
          periodStart: invoice.period_start ? invoice.period_start * 1000 : null,
          periodEnd: invoice.period_end ? invoice.period_end * 1000 : null,
          invoicePdf: invoice.invoice_pdf || null,
          hostedInvoiceUrl: invoice.hosted_invoice_url || null,
          cachedAt: Date.now(),
        };

        await getFirestore()
          .doc(`users/${uid}/invoices/${invoice.id}`)
          .set(cachedInvoice);

        console.log(`${event.type}: Cached invoice for user ${uid}, invoice ${invoice.id}`);
        break;
      }
      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        const customerId = typeof paymentMethod.customer === 'string' ? paymentMethod.customer : null;

        if (!customerId) {
          break;
        }

        const uid = await findUidByCustomer(customerId);
        if (!uid || paymentMethod.type !== 'card' || !paymentMethod.card) {
          break;
        }

        // Cache payment method
        const cachedPaymentMethod: CachedPaymentMethod = {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
          cachedAt: Date.now(),
        };

        await getFirestore()
          .doc(`users/${uid}/paymentMethod/default`)
          .set(cachedPaymentMethod);

        console.log(`payment_method.attached: Cached payment method for user ${uid}`);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('Error processing Stripe webhook event:', event.type, error);
    res.status(500).send('Webhook handler failed.');
    return;
  }

  res.json({ received: true });
});

export const syncStripeSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = context.auth.uid;
  const rawSessionId = typeof data?.sessionId === 'string' ? data.sessionId.trim() : '';

  if (!rawSessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid Stripe session id is required.');
  }

  const stripe = getStripeClient();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(rawSessionId, {
      expand: ['subscription'],
    });
  } catch (error) {
    console.error('Failed to retrieve Stripe checkout session for manual sync:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to verify Stripe checkout session. Please try again or contact support.'
    );
  }

  assertSessionOwnership(session, uid);

  const resolvedUid = (await resolveSessionOwner(session)) ?? uid;
  if (resolvedUid !== uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Checkout session is associated with a different account.'
    );
  }

  const subscription = await loadSubscriptionFromSession(session, stripe);
  if (!subscription) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'No subscription is associated with the provided checkout session.'
    );
  }

  const customerId = getStripeCustomerId(subscription) ?? normalizeCheckoutCustomer(session.customer);
  if (customerId) {
    await recordCustomerMapping(customerId, uid);
  }

  const snapshot = mapSubscriptionToSnapshot(subscription);

  await updateSubscriptionStatus(uid, {
    ...snapshot,
    lastManualSyncSessionId: session.id,
    lastManualSyncAt: new Date().toISOString(),
  });

  return {
    success: true,
    subscriptionId: subscription.id,
    status: snapshot.status,
    tier: snapshot.tier,
  };
});

/**
 * Fetch and cache Stripe invoices for the authenticated user
 */
export const getStripeInvoices = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = context.auth.uid;
  const limit = typeof data?.limit === 'number' ? Math.min(data.limit, 100) : 20;
  const startingAfter = typeof data?.startingAfter === 'string' ? data.startingAfter : undefined;
  const forceRefresh = data?.forceRefresh === true;

  const firestore = getFirestore();
  const statusRef = firestore.doc(
    `users/${uid}/${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`
  );
  const statusSnap = await statusRef.get();
  const statusData = statusSnap.data();
  const customerId =
    typeof statusData?.stripeCustomerId === 'string' ? statusData.stripeCustomerId : null;

  if (!customerId) {
    // No Stripe customer, return empty array
    return {
      invoices: [],
      hasMore: false,
      cachedAt: Date.now(),
    };
  }

  // Check cache age (1 hour = 3600000ms)
  const invoicesCachedAt = typeof statusData?.invoicesCachedAt === 'number'
    ? statusData.invoicesCachedAt
    : 0;
  const cacheAge = Date.now() - invoicesCachedAt;
  const CACHE_DURATION = 3600000; // 1 hour

  // If cache is fresh and not forcing refresh, return cached invoices
  if (!forceRefresh && cacheAge < CACHE_DURATION && !startingAfter) {
    const invoicesSnap = await firestore
      .collection(`users/${uid}/invoices`)
      .orderBy('created', 'desc')
      .limit(limit)
      .get();

    const cachedInvoices: CachedInvoice[] = [];
    invoicesSnap.forEach((doc) => {
      cachedInvoices.push(doc.data() as CachedInvoice);
    });

    if (cachedInvoices.length > 0) {
      return {
        invoices: cachedInvoices,
        hasMore: cachedInvoices.length === limit,
        cachedAt: invoicesCachedAt,
      };
    }
  }

  // Fetch from Stripe
  const stripe = getStripeClient();
  let invoices: Stripe.Invoice[];
  let hasMore = false;

  try {
    const response = await stripe.invoices.list({
      customer: customerId,
      limit,
      starting_after: startingAfter,
    });
    invoices = response.data;
    hasMore = response.has_more;
  } catch (error) {
    console.error('Failed to fetch invoices from Stripe:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to fetch invoices. Please try again later.'
    );
  }

  // Cache invoices in Firestore
  const cachedAt = Date.now();
  const batch = firestore.batch();

  invoices.forEach((invoice) => {
    const cachedInvoice: CachedInvoice = {
      id: invoice.id,
      amount: invoice.amount_paid || invoice.total || 0,
      currency: invoice.currency,
      status: invoice.status as CachedInvoice['status'],
      description: invoice.description || invoice.lines.data[0]?.description || null,
      created: invoice.created * 1000,
      periodStart: invoice.period_start ? invoice.period_start * 1000 : null,
      periodEnd: invoice.period_end ? invoice.period_end * 1000 : null,
      invoicePdf: invoice.invoice_pdf || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      cachedAt,
    };

    const invoiceRef = firestore.doc(`users/${uid}/invoices/${invoice.id}`);
    batch.set(invoiceRef, cachedInvoice);
  });

  // Update cache timestamp
  batch.set(statusRef, { invoicesCachedAt: cachedAt }, { merge: true });

  await batch.commit();

  return {
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid || invoice.total || 0,
      currency: invoice.currency,
      status: invoice.status as CachedInvoice['status'],
      description: invoice.description || invoice.lines.data[0]?.description || null,
      created: invoice.created * 1000,
      periodStart: invoice.period_start ? invoice.period_start * 1000 : null,
      periodEnd: invoice.period_end ? invoice.period_end * 1000 : null,
      invoicePdf: invoice.invoice_pdf || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      cachedAt,
    })),
    hasMore,
    cachedAt,
  };
});

/**
 * Fetch default payment method for the authenticated user
 */
export const getStripePaymentMethod = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = context.auth.uid;
  const firestore = getFirestore();
  const statusRef = firestore.doc(
    `users/${uid}/${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`
  );
  const statusSnap = await statusRef.get();
  const statusData = statusSnap.data();
  const customerId =
    typeof statusData?.stripeCustomerId === 'string' ? statusData.stripeCustomerId : null;

  if (!customerId) {
    return null;
  }

  const stripe = getStripeClient();

  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });

    if (customer.deleted) {
      return null;
    }

    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    // If no default payment method, try to get from subscription
    let paymentMethod: Stripe.PaymentMethod | null = null;

    if (typeof defaultPaymentMethod === 'string') {
      paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethod);
    } else if (defaultPaymentMethod && typeof defaultPaymentMethod === 'object') {
      paymentMethod = defaultPaymentMethod as Stripe.PaymentMethod;
    }

    // Fallback: get from active subscription
    if (!paymentMethod) {
      const subscriptionId = typeof statusData?.stripeSubscriptionId === 'string'
        ? statusData.stripeSubscriptionId
        : null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subPaymentMethod = subscription.default_payment_method;

        if (typeof subPaymentMethod === 'string') {
          paymentMethod = await stripe.paymentMethods.retrieve(subPaymentMethod);
        } else if (subPaymentMethod && typeof subPaymentMethod === 'object') {
          paymentMethod = subPaymentMethod as Stripe.PaymentMethod;
        }
      }
    }

    if (!paymentMethod || paymentMethod.type !== 'card' || !paymentMethod.card) {
      return null;
    }

    const cachedPaymentMethod: CachedPaymentMethod = {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
      cachedAt: Date.now(),
    };

    // Cache payment method
    await firestore
      .doc(`users/${uid}/paymentMethod/default`)
      .set(cachedPaymentMethod);

    return cachedPaymentMethod;
  } catch (error) {
    console.error('Failed to fetch payment method from Stripe:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to fetch payment method. Please try again later.'
    );
  }
});

/**
 * Reactivate a canceled subscription (undo cancel_at_period_end)
 */
export const reactivateStripeSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = context.auth.uid;
  const firestore = getFirestore();
  const statusRef = firestore.doc(
    `users/${uid}/${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`
  );
  const statusSnap = await statusRef.get();
  const statusData = statusSnap.data();

  const subscriptionId =
    typeof statusData?.stripeSubscriptionId === 'string' ? statusData.stripeSubscriptionId : null;
  const cancelAtPeriodEnd = statusData?.cancelAtPeriodEnd === true;

  if (!subscriptionId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'No active subscription found.'
    );
  }

  if (!cancelAtPeriodEnd) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Subscription is not scheduled for cancellation.'
    );
  }

  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    const snapshot = mapSubscriptionToSnapshot(subscription);
    await updateSubscriptionStatus(uid, {
      ...snapshot,
      updatedAt: new Date().toISOString(),
    });

    console.log('Subscription reactivated successfully:', uid, subscriptionId);

    return {
      success: true,
      subscription: snapshot,
    };
  } catch (error) {
    console.error('Failed to reactivate subscription:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to reactivate subscription. Please try again later.'
    );
  }
});

/**
 * Get usage statistics for the authenticated user
 */
export const getUsageStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = context.auth.uid;
  const months = typeof data?.months === 'number' ? Math.min(data.months, 12) : 3;

  const firestore = getFirestore();
  const now = new Date();
  const statsToFetch: string[] = [];

  // Generate month keys (YYYY-MM format)
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    statsToFetch.push(monthKey);
  }

  // Fetch all month stats in parallel
  const statsPromises = statsToFetch.map((month) =>
    firestore.doc(`users/${uid}/usageStats/${month}`).get()
  );

  const statsSnaps = await Promise.all(statsPromises);
  const stats: UsageStats[] = [];
  let totalAllTime = 0;
  let currentMonthTotal = 0;

  statsSnaps.forEach((snap, index) => {
    const data = snap.data();
    if (data && typeof data.thoughtsProcessed === 'number') {
      const stat: UsageStats = {
        month: statsToFetch[index],
        thoughtsProcessed: data.thoughtsProcessed,
        lastProcessedAt: data.lastProcessedAt || 0,
        dailyBreakdown: data.dailyBreakdown || {},
      };
      stats.push(stat);
      totalAllTime += data.thoughtsProcessed;

      if (index === 0) {
        currentMonthTotal = data.thoughtsProcessed;
      }
    }
  });

  // If no stats exist, fetch total from all-time counter if it exists
  if (totalAllTime === 0) {
    const allTimeRef = firestore.doc(`users/${uid}/usageStats/allTime`);
    const allTimeSnap = await allTimeRef.get();
    const allTimeData = allTimeSnap.data();
    if (allTimeData && typeof allTimeData.thoughtsProcessed === 'number') {
      totalAllTime = allTimeData.thoughtsProcessed;
    }
  }

  return {
    stats,
    totalAllTime,
    currentMonthTotal,
  };
});

/**
 * Helper function to increment usage stats (exported for use in processThought)
 */
export async function incrementUsageStats(uid: string): Promise<void> {
  const firestore = getFirestore();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const statsRef = firestore.doc(`users/${uid}/usageStats/${monthKey}`);

  try {
    await firestore.runTransaction(async (transaction) => {
      const statsSnap = await transaction.get(statsRef);
      const currentData = statsSnap.data();

      const thoughtsProcessed = (currentData?.thoughtsProcessed || 0) + 1;
      const dailyBreakdown = currentData?.dailyBreakdown || {};
      dailyBreakdown[dayKey] = (dailyBreakdown[dayKey] || 0) + 1;

      transaction.set(
        statsRef,
        {
          month: monthKey,
          thoughtsProcessed,
          lastProcessedAt: Date.now(),
          dailyBreakdown,
        },
        { merge: true }
      );
    });
  } catch (error) {
    console.error('Failed to increment usage stats:', error);
    // Don't throw - usage tracking shouldn't block thought processing
  }
}
