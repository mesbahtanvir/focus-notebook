/* istanbul ignore file */
const Stripe = jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  subscriptions: { retrieve: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
}));

export default Stripe;
module.exports = Stripe;
