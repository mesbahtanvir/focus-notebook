const rawBaseUrl = process.env.LHCI_BASE_URL || 'https://focus.yourthoughts.ca';
const baseUrl = rawBaseUrl.replace(/\/+$/, '');

const withBase = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

const paths = [
  '/',
  '/login',
  '/dashboard',
  '/profile',
  '/settings',
  '/admin',
  '/tools',
  '/tools/focus',
  '/tools/tasks',
  '/tools/thoughts',
  '/tools/moodtracker',
  '/tools/cbt',
  '/tools/brainstorming',
  '/tools/projects',
  '/tools/relationships',
  '/tools/friends',
  '/tools/goals',
  '/tools/notes',
  '/tools/errands',
  '/tools/deepreflect',
];

module.exports = {
  ci: {
    collect: {
      url: paths.map(withBase),
      numberOfRuns: 1,
      puppeteerScript: './puppeteer-login.js',
    },
    settings: {
      disableStorageReset: true,
      chromeFlags: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
    assert: {
      preset: 'lighthouse:recommended',
    },
    upload: {
      target: 'filesystem',
      outputDir: './lhci_reports',
    },
  },
};
