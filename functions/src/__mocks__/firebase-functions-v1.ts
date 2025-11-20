/* istanbul ignore file */
export const https = {
  onCall: jest.fn(),
  onRequest: jest.fn(),
  HttpsError: class MockHttpsError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message);
      this.code = code;
    }
  },
};

export const logger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const scheduleFactory = () => {
  const onRun = jest.fn();
  const scheduleObject = {
    onRun,
    timeZone: jest.fn(() => scheduleObject),
  } as any;

  return scheduleObject;
};

export const firestore = {
  document: jest.fn(() => ({ onWrite: jest.fn() })),
  schedule: jest.fn(scheduleFactory),
};

export const pubsub = {
  schedule: jest.fn(scheduleFactory),
};

export const runWith = jest.fn(() => ({
  https: { onCall: jest.fn() },
  firestore: { document: jest.fn(() => ({ onWrite: jest.fn() })) },
  pubsub: { schedule: jest.fn(() => ({ onRun: jest.fn() })) },
}));
