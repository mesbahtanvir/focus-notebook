import { STRIPE_CUSTOMERS_COLLECTION } from '../../../shared/subscription';

const checkoutSessionsCreateMock = jest.fn();
const billingPortalSessionsCreateMock = jest.fn();
const subscriptionsRetrieveMock = jest.fn();
const constructEventMock = jest.fn();
const checkoutSessionsRetrieveMock = jest.fn();

const ORIGINAL_ENV = { ...process.env };
const ENV_KEYS = ['STRIPE_SECRET', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET', 'APP_BASE_URL'];

class MockHttpsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const onCallMock = jest.fn((handler: any) => handler);
const onRequestMock = jest.fn((handler: any) => handler);

jest.mock('firebase-functions', () => ({
  https: {
    onCall: onCallMock,
    onRequest: onRequestMock,
    HttpsError: MockHttpsError,
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const firestoreMock = jest.fn();

jest.mock('firebase-admin', () => ({
  firestore: firestoreMock,
}));

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: checkoutSessionsCreateMock, retrieve: checkoutSessionsRetrieveMock } },
    billingPortal: { sessions: { create: billingPortalSessionsCreateMock } },
    subscriptions: { retrieve: subscriptionsRetrieveMock },
    webhooks: { constructEvent: constructEventMock },
  }))
);

import Stripe from 'stripe';
import {
  createStripeCheckoutSession,
  createStripePortalSession,
  stripeWebhook,
  syncStripeSubscription,
} from '../stripeBilling';

const invokeCheckout = createStripeCheckoutSession as unknown as (
  data: any,
  context: any
) => Promise<any>;
const invokePortal = createStripePortalSession as unknown as (
  data: any,
  context: any
) => Promise<any>;
const invokeWebhook = stripeWebhook as unknown as (req: any, res: any) => Promise<any>;
const invokeSync = syncStripeSubscription as unknown as (data: any, context: any) => Promise<any>;

describe('stripeBilling cloud functions', () => {
  let statusDoc: any;
  let customerDoc: any;
  let firestoreInstance: any;

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.STRIPE_SECRET = 'sk_test_123';
    process.env.STRIPE_PRICE_ID = 'price_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
    process.env.APP_BASE_URL = 'https://focus.example.com';

    statusDoc = {
      get: jest.fn().mockResolvedValue({ data: () => ({}) }),
      set: jest.fn().mockResolvedValue(undefined),
    };

    customerDoc = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ data: () => ({ uid: 'mapped-user' }) }),
    };

    firestoreInstance = {
      doc: jest.fn(() => statusDoc),
      collection: jest.fn((name: string) => {
        if (name === STRIPE_CUSTOMERS_COLLECTION) {
          return { doc: jest.fn(() => customerDoc) };
        }
        return { doc: jest.fn() };
      }),
    };

    (firestoreMock as jest.Mock).mockReturnValue(firestoreInstance);

    checkoutSessionsCreateMock.mockResolvedValue({
      id: 'cs_123',
      url: 'https://stripe.test/checkout',
    });

    billingPortalSessionsCreateMock.mockResolvedValue({
      id: 'bps_123',
      url: 'https://stripe.test/portal',
    });

    subscriptionsRetrieveMock.mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      customer: 'cus_123',
      items: { data: [{ price: { id: 'price_123' } }] },
      current_period_end: 1_700_000_000,
      current_period_start: 1_690_000_000,
      cancel_at_period_end: false,
      cancel_at: null,
      trial_end: null,
      metadata: {},
    });

    checkoutSessionsRetrieveMock.mockResolvedValue({
      id: 'cs_123',
      customer: 'cus_123',
      subscription: {
        id: 'sub_123',
        status: 'active',
        customer: 'cus_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        current_period_end: 1_700_000_000,
        current_period_start: 1_690_000_000,
        cancel_at_period_end: false,
        cancel_at: null,
        trial_end: null,
        metadata: {},
      },
      metadata: { uid: 'user_123' },
    });

    constructEventMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    for (const key of ENV_KEYS) {
      if (ORIGINAL_ENV[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = ORIGINAL_ENV[key];
      }
    }
  });

  const authContext = {
    auth: {
      uid: 'user_123',
      token: {
        firebase: { sign_in_provider: 'password' },
        email: 'user@example.com',
      },
    },
  } as any;

  describe('createStripeCheckoutSession', () => {
    it('rejects unauthenticated calls', async () => {
      await expect(invokeCheckout({}, {} as any)).rejects.toHaveProperty(
        'code',
        'unauthenticated'
      );
    });

    it('rejects anonymous users', async () => {
      await expect(
        invokeCheckout({}, { auth: { uid: 'anon', token: { firebase: { sign_in_provider: 'anonymous' } } } } as any)
      ).rejects.toHaveProperty('code', 'failed-precondition');
    });

    it('creates a checkout session for authenticated user', async () => {
      statusDoc.get.mockResolvedValueOnce({
        data: () => ({ stripeCustomerId: 'cus_existing' }),
      });

      const result = await invokeCheckout({ origin: 'https://custom.app' }, authContext);

      expect(result).toEqual({ url: 'https://stripe.test/checkout' });
      expect((Stripe as unknown as jest.Mock).mock.calls[0][0]).toBe('sk_test_123');
      expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
          customer_email: undefined,
          success_url: 'https://custom.app/profile?upgrade=success&session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://custom.app/profile?upgrade=cancelled',
        })
      );
      expect(statusDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastCheckoutSessionId: 'cs_123',
          stripeCustomerId: 'cus_existing',
        }),
        { merge: true }
      );
    });

    it('falls back to configured base URL when origin missing', async () => {
      statusDoc.get.mockResolvedValueOnce({ data: () => ({}) });
      process.env.APP_BASE_URL = 'https://config.example.com';

      await invokeCheckout({}, authContext);

      expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: undefined,
          customer_email: 'user@example.com',
          success_url: 'https://config.example.com/profile?upgrade=success&session_id={CHECKOUT_SESSION_ID}',
        })
      );
    });

    it('falls back to localhost when no base URL configured', async () => {
      statusDoc.get.mockResolvedValueOnce({ data: () => ({}) });
      delete process.env.APP_BASE_URL;

      await invokeCheckout(undefined, authContext);

      const callArgs = checkoutSessionsCreateMock.mock.calls.pop()?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs.success_url).toBe('http://localhost:3000/profile?upgrade=success&session_id={CHECKOUT_SESSION_ID}');
      expect(callArgs.customer_email).toBe('user@example.com');
    });

    it('throws when price id is missing', async () => {
      delete process.env.STRIPE_PRICE_ID;
      await expect(invokeCheckout({}, authContext)).rejects.toHaveProperty(
        'code',
        'internal'
      );
    });
  });

  describe('createStripePortalSession', () => {
    it('throws when no stripe customer', async () => {
      statusDoc.get.mockResolvedValueOnce({ data: () => ({}) });
      await expect(invokePortal({}, authContext)).rejects.toHaveProperty(
        'code',
        'failed-precondition'
      );
    });

    it('rejects anonymous users', async () => {
      statusDoc.get.mockResolvedValueOnce({ data: () => ({ stripeCustomerId: 'cus_portal' }) });
      await expect(
        invokePortal({}, { auth: { uid: 'anon', token: { firebase: { sign_in_provider: 'anonymous' } } } } as any)
      ).rejects.toHaveProperty('code', 'failed-precondition');
    });

    it('returns a portal session url', async () => {
      statusDoc.get.mockResolvedValueOnce({
        data: () => ({ stripeCustomerId: 'cus_portal' }),
      });

      const result = await invokePortal({ origin: 'https://custom.app' }, authContext);

      expect(result).toEqual({ url: 'https://stripe.test/portal' });
      expect(billingPortalSessionsCreateMock).toHaveBeenCalledWith({
        customer: 'cus_portal',
        return_url: 'https://custom.app/profile',
      });
      expect(statusDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastPortalSessionId: 'bps_123',
        }),
        { merge: true }
      );
    });

    it('uses configured base URL when origin missing', async () => {
      statusDoc.get.mockResolvedValueOnce({
        data: () => ({ stripeCustomerId: 'cus_portal' }),
      });
      process.env.APP_BASE_URL = 'https://config.example.com';

      await invokePortal({}, authContext);

      expect(billingPortalSessionsCreateMock).toHaveBeenCalledWith({
        customer: 'cus_portal',
        return_url: 'https://config.example.com/profile',
      });
    });
  });

  describe('syncStripeSubscription', () => {
    it('rejects unauthenticated calls', async () => {
      await expect(invokeSync({ sessionId: 'cs_123' }, {} as any)).rejects.toHaveProperty(
        'code',
        'unauthenticated'
      );
    });

    it('updates subscription status when session matches user', async () => {
      await invokeSync({ sessionId: 'cs_123' }, authContext);

      expect(checkoutSessionsRetrieveMock).toHaveBeenCalledWith('cs_123', {
        expand: ['subscription'],
      });
      expect(customerDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'user_123',
        }),
        { merge: true }
      );
      expect(statusDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'pro',
          status: 'active',
          stripeSubscriptionId: 'sub_123',
          entitlements: expect.objectContaining({ aiProcessing: true }),
          lastManualSyncSessionId: 'cs_123',
        }),
        { merge: true }
      );
    });

    it('rejects when session metadata belongs to different user', async () => {
      checkoutSessionsRetrieveMock.mockResolvedValueOnce({
        id: 'cs_mismatch',
        customer: 'cus_999',
        subscription: 'sub_123',
        metadata: { uid: 'other_user' },
      });

      await expect(invokeSync({ sessionId: 'cs_mismatch' }, authContext)).rejects.toHaveProperty(
        'code',
        'permission-denied'
      );
    });
  });

  describe('stripeWebhook', () => {
    const createResponse = () => {
      const res: any = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        setHeader(name: string, value: string) {
          this.headers[name] = value;
        },
        send: jest.fn(),
        json: jest.fn(),
      };
      jest.spyOn(res, 'status');
      jest.spyOn(res, 'setHeader');
      return res;
    };

    it('returns 405 for non-POST methods', async () => {
      const res = createResponse();
      await invokeWebhook(
        { method: 'GET', headers: {}, rawBody: Buffer.from('') } as any,
        res
      );
      expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.send).toHaveBeenCalledWith('Method Not Allowed');
    });

    it('returns 400 when signature header missing', async () => {
      const res = createResponse();
      await invokeWebhook(
        {
          method: 'POST',
          headers: {},
          rawBody: Buffer.from('body'),
        } as any,
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Missing Stripe signature header.');
    });

    it('processes checkout.session.completed events', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            customer: 'cus_123',
            metadata: { uid: 'user_123' },
            subscription: 'sub_123',
          },
        },
      };

      constructEventMock.mockImplementation((body: Buffer, signature: string, secret: string) => {
        expect(signature).toBe('sig_header');
        expect(secret).toBe('whsec_123');
        return event;
      });

      const res = createResponse();
      await invokeWebhook(
        {
          method: 'POST',
          headers: { 'stripe-signature': 'sig_header' },
          rawBody: Buffer.from('body'),
        } as any,
        res
      );

      expect(customerDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'user_123' }),
        { merge: true }
      );
      expect(subscriptionsRetrieveMock).toHaveBeenCalledWith('sub_123', {
        expand: ['latest_invoice.payment_intent'],
      });
      const subscriptionUpdateCall = statusDoc.set.mock.calls.find(
        ([data]: [any]) => data && data.stripeSubscriptionId === 'sub_123'
      );
      expect(subscriptionUpdateCall).toBeDefined();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('handles subscription deletion events', async () => {
      customerDoc.get.mockResolvedValueOnce({ data: () => ({ uid: 'user_from_mapping' }) });

      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_deleted',
            status: 'canceled',
            customer: 'cus_999',
            items: { data: [{ price: { id: 'price_123' } }] },
            current_period_end: 1_700_000_000,
            current_period_start: 1_690_000_000,
            cancel_at_period_end: false,
            cancel_at: null,
            trial_end: null,
            metadata: {},
          },
        },
      };

      constructEventMock.mockReturnValue(event as any);

      const res = createResponse();
      await invokeWebhook(
        {
          method: 'POST',
          headers: { 'stripe-signature': 'sig_header' },
          rawBody: Buffer.from('body'),
        } as any,
        res
      );

      const cancelCall = statusDoc.set.mock.calls.find(
        ([data]: [any]) => data && data.status === 'canceled'
      );
      expect(cancelCall).toBeDefined();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('handles subscription updated events with metadata UID', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_updated',
            status: 'active',
            customer: 'cus_meta',
            items: { data: [{ price: { id: 'price_456' } }] },
            current_period_end: 1_700_500_000,
            current_period_start: 1_690_500_000,
            cancel_at_period_end: false,
            cancel_at: null,
            trial_end: null,
            metadata: { uid: 'meta-user' },
          },
        },
      };

      constructEventMock.mockReturnValue(event as any);

      const res = createResponse();
      await invokeWebhook(
        {
          method: 'POST',
          headers: { 'stripe-signature': 'sig_header' },
          rawBody: Buffer.from('body'),
        } as any,
        res
      );

      expect(customerDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'meta-user' }),
        { merge: true }
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('ignores unhandled events but acknowledges receipt', async () => {
      const event = { type: 'some.random.event', data: { object: {} } };
      constructEventMock.mockReturnValue(event as any);

      const res = createResponse();
      await invokeWebhook(
        {
          method: 'POST',
          headers: { 'stripe-signature': 'sig_header' },
          rawBody: Buffer.from('body'),
        } as any,
        res
      );

      expect(statusDoc.set).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });
});
