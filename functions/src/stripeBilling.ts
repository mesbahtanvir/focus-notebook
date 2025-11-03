import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import {
  SUBSCRIPTION_STATUS_COLLECTION,
  SUBSCRIPTION_STATUS_DOC_ID,
  STRIPE_CUSTOMERS_COLLECTION,
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
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const currentPeriodEnd = subscription.current_period_end
    ? subscription.current_period_end * 1000
    : null;
  const trialEndsAt = subscription.trial_end ? subscription.trial_end * 1000 : null;
  const cancelAt = subscription.cancel_at ? subscription.cancel_at * 1000 : null;
  const aiAllowed = ACTIVE_STATUSES.has(status);

  return {
    tier: aiAllowed ? 'pro' : 'free',
    status,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    priceId,
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

export const createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
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
  const successUrl = `${baseUrl}/settings?upgrade=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/settings?upgrade=cancelled`;

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
    return_url: `${resolveBaseUrl(data?.origin)}/settings`,
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
        if (customerId && uid) {
          await recordCustomerMapping(customerId, uid);
          await updateSubscriptionStatus(uid, {
            stripeCustomerId: customerId,
            lastCheckoutCompletedAt: new Date().toISOString(),
            lastCheckoutSessionId: session.id,
          });
        }

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
              console.warn(
                'Unable to resolve UID for subscription after checkout.',
                subscriptionId
              );
              break;
            }
            const resolvedCustomerId = getStripeCustomerId(subscription);
            if (resolvedCustomerId) {
              await recordCustomerMapping(resolvedCustomerId, resolvedUid);
            }
            await updateSubscriptionStatus(resolvedUid, mapSubscriptionToSnapshot(subscription));
          } catch (error) {
            console.error('Failed to retrieve subscription after checkout:', error);
          }
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
          console.warn('Received subscription event without mapped uid', subscription.id);
          break;
        }
        if (customerId) {
          await recordCustomerMapping(customerId, uid);
        }
        await updateSubscriptionStatus(uid, mapSubscriptionToSnapshot(subscription));
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = getStripeCustomerId(subscription);
        const uidFromMetadata = subscription.metadata?.uid ?? null;
        const uid =
          uidFromMetadata ?? (customerId ? await findUidByCustomer(customerId) : null);
        if (!uid) {
          console.warn('Received subscription deletion without mapped uid', subscription.id);
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
