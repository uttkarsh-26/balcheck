import { test as base, expect } from '@playwright/test';

/** Block ad networks in E2E before any browser request leaves the machine. */
export const AD_NETWORK_REQUEST_MATCHER = /googlesyndication\.com|doubleclick\.net|googleadservices\.com|googletagservices\.com|adtrafficquality\.google|\/adsbygoogle\.js|google-adsense/i;

// All specs import test from this fixture; production ad tags remain unchanged.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(AD_NETWORK_REQUEST_MATCHER, (route) => route.abort('blockedbyclient'));
    await use(context);
  },
});

export { expect };
export type { Page } from '@playwright/test';
