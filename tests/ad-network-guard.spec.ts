import { expect, test } from './fixtures';

// Offline is a fail-safe: this regression can prove the fixture blocks the
// production ad loader without ever sending a real request to Google.
test('browser tests block the AdSense loader before it reaches the network', async ({ page, context }) => {
  await context.setOffline(true);
  const failed = page.waitForEvent('requestfailed', {
    predicate: (request) => request.url().includes('/pagead/js/adsbygoogle.js'),
  });
  await page.setContent('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2164302228306652"></script>');
  const request = await failed;
  expect(request.failure()?.errorText).toContain('ERR_BLOCKED_BY_CLIENT');
});
