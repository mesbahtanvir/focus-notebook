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
exports.stripeWebhook = exports.createStripePortalSession = exports.createStripeCheckoutSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const subscription_1 = require("../../shared/subscription");
const STRIPE_API_VERSION = '2023-10-16';
function getStripeClient() {
    var _a;
    const secretKey = (_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.secret;
    if (!secretKey) {
        throw new functions.https.HttpsError('internal', 'Stripe is not configured. Please contact support.');
    }
    return new stripe_1.default(secretKey, { apiVersion: STRIPE_API_VERSION });
}
function resolveBaseUrl(origin) {
    var _a;
    if (typeof origin === 'string' && origin.startsWith('http')) {
        return origin.replace(/\/$/, '');
    }
    const fallback = (_a = functions.config().app) === null || _a === void 0 ? void 0 : _a.base_url;
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
exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
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
    const priceId = (_d = functions.config().stripe) === null || _d === void 0 ? void 0 : _d.price_id;
    if (!priceId) {
        console.error('Stripe price id is not configured.');
        throw new functions.https.HttpsError('internal', 'Billing configuration incomplete. Please contact support.');
    }
    const baseUrl = resolveBaseUrl(data === null || data === void 0 ? void 0 : data.origin);
    const successUrl = `${baseUrl}/settings?upgrade=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/settings?upgrade=cancelled`;
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
        return_url: `${resolveBaseUrl(data === null || data === void 0 ? void 0 : data.origin)}/settings`,
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
    var _a, _b, _c, _d, _e, _f, _g;
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).send('Method Not Allowed');
        return;
    }
    const webhookSecret = (_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.webhook_secret;
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
                const uid = (_c = (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.uid) !== null && _c !== void 0 ? _c : null;
                if (customerId && uid) {
                    await recordCustomerMapping(customerId, uid);
                    await updateSubscriptionStatus(uid, {
                        stripeCustomerId: customerId,
                        lastCheckoutCompletedAt: new Date().toISOString(),
                        lastCheckoutSessionId: session.id,
                    });
                }
                const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
                if (subscriptionId) {
                    try {
                        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                            expand: ['latest_invoice.payment_intent'],
                        });
                        const resolvedUid = uid !== null && uid !== void 0 ? uid : (customerId ? await findUidByCustomer(customerId) : null);
                        if (!resolvedUid) {
                            console.warn('Unable to resolve UID for subscription after checkout.', subscriptionId);
                            break;
                        }
                        const resolvedCustomerId = getStripeCustomerId(subscription);
                        if (resolvedCustomerId) {
                            await recordCustomerMapping(resolvedCustomerId, resolvedUid);
                        }
                        await updateSubscriptionStatus(resolvedUid, mapSubscriptionToSnapshot(subscription));
                    }
                    catch (error) {
                        console.error('Failed to retrieve subscription after checkout:', error);
                    }
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = getStripeCustomerId(subscription);
                const uidFromMetadata = (_e = (_d = subscription.metadata) === null || _d === void 0 ? void 0 : _d.uid) !== null && _e !== void 0 ? _e : null;
                const uid = uidFromMetadata !== null && uidFromMetadata !== void 0 ? uidFromMetadata : (customerId ? await findUidByCustomer(customerId) : null);
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
                const subscription = event.data.object;
                const customerId = getStripeCustomerId(subscription);
                const uidFromMetadata = (_g = (_f = subscription.metadata) === null || _f === void 0 ? void 0 : _f.uid) !== null && _g !== void 0 ? _g : null;
                const uid = uidFromMetadata !== null && uidFromMetadata !== void 0 ? uidFromMetadata : (customerId ? await findUidByCustomer(customerId) : null);
                if (!uid) {
                    console.warn('Received subscription deletion without mapped uid', subscription.id);
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
//# sourceMappingURL=stripeBilling.js.map