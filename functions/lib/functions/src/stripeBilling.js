"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncStripeSubscription = exports.stripeWebhook = exports.createStripePortalSession = exports.createStripeCheckoutSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const subscription_1 = require("../../shared/subscription");
const STRIPE_API_VERSION = '2023-10-16';
function getStripeClient() {
    const secretKey = process.env.STRIPE_SECRET;
    if (!secretKey) {
        throw new functions.https.HttpsError('internal', 'Stripe is not configured. Please contact support.');
    }
    return new stripe_1.default(secretKey, { apiVersion: STRIPE_API_VERSION });
}
function resolveBaseUrl(origin) {
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
async function recordCustomerMapping(customerId, uid) {
    if (!customerId)
        return;
    await getFirestore().collection(subscription_1.STRIPE_CUSTOMERS_COLLECTION).doc(customerId).set({
        uid,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
}
async function findUidByCustomer(customerId) {
    if (!customerId)
        return null;
    const doc = await getFirestore().collection(subscription_1.STRIPE_CUSTOMERS_COLLECTION).doc(customerId).get();
    const data = doc.data();
    return typeof (data === null || data === void 0 ? void 0 : data.uid) === 'string' ? data.uid : null;
}
function getStripeCustomerId(subscription) {
    var _a, _b;
    if (!subscription)
        return null;
    if (typeof subscription.customer === 'string') {
        return subscription.customer;
    }
    return (_b = (_a = subscription.customer) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
}
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);
function mapSubscriptionToSnapshot(subscription) {
    var _a, _b, _c, _d;
    const status = subscription.status;
    const stripeCustomerId = getStripeCustomerId(subscription);
    const priceId = (_c = (_b = (_a = subscription.items.data[0]) === null || _a === void 0 ? void 0 : _a.price) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
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
        cancelAtPeriodEnd: (_d = subscription.cancel_at_period_end) !== null && _d !== void 0 ? _d : null,
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
async function updateSubscriptionStatus(uid, payload) {
    await getFirestore()
        .doc(`users/${uid}/${subscription_1.SUBSCRIPTION_STATUS_COLLECTION}/${subscription_1.SUBSCRIPTION_STATUS_DOC_ID}`)
        .set(Object.assign(Object.assign({}, payload), { lastSyncedAt: new Date().toISOString() }), { merge: true });
}
function normalizeCheckoutCustomer(customer) {
    if (!customer) {
        return null;
    }
    if (typeof customer === 'string') {
        return customer;
    }
    if (typeof customer === 'object' && customer !== null && 'id' in customer) {
        const maybeId = customer.id;
        return typeof maybeId === 'string' ? maybeId : null;
    }
    return null;
}
function assertSessionOwnership(session, uid) {
    var _a;
    const sessionUid = typeof ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.uid) === 'string' ? session.metadata.uid : null;
    if (sessionUid && sessionUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Checkout session does not belong to the authenticated user.');
    }
}
async function resolveSessionOwner(session) {
    var _a;
    const sessionUid = typeof ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.uid) === 'string' ? session.metadata.uid : null;
    if (sessionUid) {
        return sessionUid;
    }
    const customerId = normalizeCheckoutCustomer(session.customer);
    if (!customerId) {
        return null;
    }
    return await findUidByCustomer(customerId);
}
async function loadSubscriptionFromSession(session, stripe) {
    const subscriptionFromSession = session.subscription;
    if (!subscriptionFromSession) {
        return null;
    }
    if (typeof subscriptionFromSession !== 'string') {
        return subscriptionFromSession;
    }
    return await stripe.subscriptions.retrieve(subscriptionFromSession, {
        expand: ['latest_invoice.payment_intent'],
    });
}
exports.createStripeCheckoutSession = functions
    .runWith({
    minInstances: 1, // Keep warm to reduce user churn from cold starts
})
    .https.onCall(async (data, context) => {
    var _a, _b, _c;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const uid = context.auth.uid;
    const provider = (_b = (_a = context.auth.token) === null || _a === void 0 ? void 0 : _a.firebase) === null || _b === void 0 ? void 0 : _b.sign_in_provider;
    if (provider === 'anonymous') {
        throw new functions.https.HttpsError('failed-precondition', 'Upgrade requires a permanent account. Link your email before continuing.');
    }
    const email = (_c = context.auth.token) === null || _c === void 0 ? void 0 : _c.email;
    if (typeof email !== 'string' || email.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'A verified email address is required before upgrading.');
    }
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
        console.error('Stripe price id is not configured.');
        throw new functions.https.HttpsError('internal', 'Billing configuration incomplete. Please contact support.');
    }
    const baseUrl = resolveBaseUrl(data === null || data === void 0 ? void 0 : data.origin);
    const successUrl = `${baseUrl}/profile?upgrade=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/profile?upgrade=cancelled`;
    const firestore = getFirestore();
    const statusRef = firestore.doc(`users/${uid}/${subscription_1.SUBSCRIPTION_STATUS_COLLECTION}/${subscription_1.SUBSCRIPTION_STATUS_DOC_ID}`);
    const statusSnap = await statusRef.get();
    const statusData = statusSnap.data();
    const existingCustomerId = typeof (statusData === null || statusData === void 0 ? void 0 : statusData.stripeCustomerId) === 'string' ? statusData.stripeCustomerId : undefined;
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
        throw new functions.https.HttpsError('internal', 'Unable to start checkout right now. Please try again shortly.');
    }
    await statusRef.set({
        stripeCustomerId: existingCustomerId !== null && existingCustomerId !== void 0 ? existingCustomerId : null,
        lastCheckoutSessionId: session.id,
        lastCheckoutInitiatedAt: new Date().toISOString(),
    }, { merge: true });
    return { url: session.url };
});
exports.createStripePortalSession = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const uid = context.auth.uid;
    const provider = (_b = (_a = context.auth.token) === null || _a === void 0 ? void 0 : _a.firebase) === null || _b === void 0 ? void 0 : _b.sign_in_provider;
    if (provider === 'anonymous') {
        throw new functions.https.HttpsError('failed-precondition', 'Anonymous accounts cannot manage billing.');
    }
    const firestore = getFirestore();
    const statusRef = firestore.doc(`users/${uid}/${subscription_1.SUBSCRIPTION_STATUS_COLLECTION}/${subscription_1.SUBSCRIPTION_STATUS_DOC_ID}`);
    const statusSnap = await statusRef.get();
    const statusData = statusSnap.data();
    const customerId = typeof (statusData === null || statusData === void 0 ? void 0 : statusData.stripeCustomerId) === 'string' ? statusData.stripeCustomerId : null;
    if (!customerId) {
        throw new functions.https.HttpsError('failed-precondition', 'No billing profile found. You may need to upgrade before managing your subscription.');
    }
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${resolveBaseUrl(data === null || data === void 0 ? void 0 : data.origin)}/profile`,
    });
    if (!session.url) {
        throw new functions.https.HttpsError('internal', 'Unable to open the billing portal right now. Please try again shortly.');
    }
    await statusRef.set({
        lastPortalSessionId: session.id,
        lastPortalAccessedAt: new Date().toISOString(),
    }, { merge: true });
    return { url: session.url };
});
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
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
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    }
    catch (error) {
        console.error('Stripe webhook signature verification failed:', error);
        res.status(400).send('Invalid signature.');
        return;
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const customerId = typeof session.customer === 'string' ? session.customer : null;
                const uid = (_b = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null;
                // Record customer mapping first
                if (customerId && uid) {
                    await recordCustomerMapping(customerId, uid);
                }
                // Retrieve and process subscription with full data
                const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
                if (subscriptionId) {
                    try {
                        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                            expand: ['latest_invoice.payment_intent'],
                        });
                        const resolvedUid = uid !== null && uid !== void 0 ? uid : (customerId ? await findUidByCustomer(customerId) : null);
                        if (!resolvedUid) {
                            console.error('checkout.session.completed: Unable to resolve UID for subscription.', 'Session ID:', session.id, 'Subscription ID:', subscriptionId, 'Customer ID:', customerId);
                            break;
                        }
                        const resolvedCustomerId = getStripeCustomerId(subscription);
                        if (resolvedCustomerId && resolvedCustomerId !== customerId) {
                            await recordCustomerMapping(resolvedCustomerId, resolvedUid);
                        }
                        // Update with full subscription data including tier and entitlements
                        const subscriptionSnapshot = mapSubscriptionToSnapshot(subscription);
                        await updateSubscriptionStatus(resolvedUid, Object.assign(Object.assign({}, subscriptionSnapshot), { lastCheckoutCompletedAt: new Date().toISOString(), lastCheckoutSessionId: session.id }));
                        console.log('checkout.session.completed: Successfully updated subscription status.', 'User ID:', resolvedUid, 'Tier:', subscriptionSnapshot.tier, 'Status:', subscriptionSnapshot.status);
                    }
                    catch (error) {
                        console.error('checkout.session.completed: Failed to retrieve or process subscription.', 'Session ID:', session.id, 'Subscription ID:', subscriptionId, 'Error:', error);
                        // Don't write partial data - let customer.subscription.created event handle it
                    }
                }
                else {
                    console.warn('checkout.session.completed: No subscription ID found.', 'Session ID:', session.id, 'Payment status:', session.payment_status);
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = getStripeCustomerId(subscription);
                const uidFromMetadata = (_d = (_c = subscription.metadata) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : null;
                const uid = uidFromMetadata !== null && uidFromMetadata !== void 0 ? uidFromMetadata : (customerId ? await findUidByCustomer(customerId) : null);
                if (!uid) {
                    console.error(`${event.type}: Unable to resolve UID for subscription.`, 'Subscription ID:', subscription.id, 'Customer ID:', customerId, 'Metadata UID:', uidFromMetadata);
                    break;
                }
                if (customerId) {
                    await recordCustomerMapping(customerId, uid);
                }
                const subscriptionSnapshot = mapSubscriptionToSnapshot(subscription);
                await updateSubscriptionStatus(uid, subscriptionSnapshot);
                console.log(`${event.type}: Successfully updated subscription status.`, 'User ID:', uid, 'Tier:', subscriptionSnapshot.tier, 'Status:', subscriptionSnapshot.status);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = getStripeCustomerId(subscription);
                const uidFromMetadata = (_f = (_e = subscription.metadata) === null || _e === void 0 ? void 0 : _e.uid) !== null && _f !== void 0 ? _f : null;
                const uid = uidFromMetadata !== null && uidFromMetadata !== void 0 ? uidFromMetadata : (customerId ? await findUidByCustomer(customerId) : null);
                if (!uid) {
                    console.error('customer.subscription.deleted: Unable to resolve UID for subscription.', 'Subscription ID:', subscription.id, 'Customer ID:', customerId, 'Metadata UID:', uidFromMetadata);
                    break;
                }
                const payload = {
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
                console.log('customer.subscription.deleted: Successfully downgraded user to free tier.', 'User ID:', uid);
                break;
            }
            default:
                break;
        }
    }
    catch (error) {
        console.error('Error processing Stripe webhook event:', event.type, error);
        res.status(500).send('Webhook handler failed.');
        return;
    }
    res.json({ received: true });
});
exports.syncStripeSubscription = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const uid = context.auth.uid;
    const rawSessionId = typeof (data === null || data === void 0 ? void 0 : data.sessionId) === 'string' ? data.sessionId.trim() : '';
    if (!rawSessionId) {
        throw new functions.https.HttpsError('invalid-argument', 'A valid Stripe session id is required.');
    }
    const stripe = getStripeClient();
    let session;
    try {
        session = await stripe.checkout.sessions.retrieve(rawSessionId, {
            expand: ['subscription'],
        });
    }
    catch (error) {
        console.error('Failed to retrieve Stripe checkout session for manual sync:', error);
        throw new functions.https.HttpsError('internal', 'Unable to verify Stripe checkout session. Please try again or contact support.');
    }
    assertSessionOwnership(session, uid);
    const resolvedUid = (_a = (await resolveSessionOwner(session))) !== null && _a !== void 0 ? _a : uid;
    if (resolvedUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Checkout session is associated with a different account.');
    }
    const subscription = await loadSubscriptionFromSession(session, stripe);
    if (!subscription) {
        throw new functions.https.HttpsError('failed-precondition', 'No subscription is associated with the provided checkout session.');
    }
    const customerId = (_b = getStripeCustomerId(subscription)) !== null && _b !== void 0 ? _b : normalizeCheckoutCustomer(session.customer);
    if (customerId) {
        await recordCustomerMapping(customerId, uid);
    }
    const snapshot = mapSubscriptionToSnapshot(subscription);
    await updateSubscriptionStatus(uid, Object.assign(Object.assign({}, snapshot), { lastManualSyncSessionId: session.id, lastManualSyncAt: new Date().toISOString() }));
    return {
        success: true,
        subscriptionId: subscription.id,
        status: snapshot.status,
        tier: snapshot.tier,
    };
});
//# sourceMappingURL=stripeBilling.js.map