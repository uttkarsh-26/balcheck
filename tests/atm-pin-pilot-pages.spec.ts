import { test, expect } from '@playwright/test';
import { ATM_PIN_GUIDES, getAtmPinGuide } from '../src/data/atm-pin-guides';
import { banks } from '../src/data/banks';
import { findSchema, gotoDom } from './utils';

/**
 * Rendered-HTML contract for the two-page ATM-PIN pilot.
 *
 * The pages this guards are the two approved pilot URLs and the non-pilot
 * fallback. The behavioural conditions asserted here:
 *
 * 1. The pilot pages publish the procedure of the channel the cited official
 *    source actually documents — PSB's nine-step ATM flow, OGB's Card Services
 *    portal — with a visible source link and read date.
 * 2. The pilot pages no longer carry the generic template's four-channel
 *    description, its unconditional "free" claims, or an FAQ/schema assertion
 *    those claims would need.
 * 3. The number-provenance block is still rendered and still cites the record,
 *    but its scope label stops claiming it verifies "customer care".
 * 4. No pilot page collects anything: no form, no input, no credential ask.
 * 5. Non-pilot banks fall back to the generic template deterministically.
 * 6. Mobile layout: one H1, no horizontal overflow, source detail visible.
 * 7. The header subtitle names the documented channel on a pilot page — it
 *    never claims an online Green PIN — while the non-pilot fallback keeps
 *    the generic subtitle string.
 */

const PILOT_PATHS = ['/atm-pin/odisha-grameen/', '/atm-pin/psb/'] as const;
const NON_PILOT_PATHS = ['/atm-pin/sbi/', '/atm-pin/indian-bank/'] as const;

/** The generic template's four-channel list, only ever in its meta description. */
const FORBIDDEN_DESCRIPTION_CLAIM = 'Net banking, ATM, SMS या customer care से Green PIN generate करें';

/** The generic template's unsupported body claims (free, four ways, easiest). */
const FORBIDDEN_BODY_CLAIMS = [
  'Green PIN सेवा मुफ़्त है',
  'सबसे आसान तरीका net banking है',
  '4 तरीके हैं',
  'यह सेवा मुफ़्त है',
  'PIN generation मुफ़्त है',
] as const;

const bankBySlug = (slug: string) => banks.find((bank) => bank.slug === slug)!;

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

for (const path of PILOT_PATHS) {
  const slug = path.replace('/atm-pin/', '').replace('/', '');
  const guide = getAtmPinGuide(slug)!;
  const bank = bankBySlug(slug);

  test.describe(`pilot ${path}`, () => {
    test('keeps the existing URL, canonical, title and H1', async ({ page }) => {
      await gotoDom(page, path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://balcheck.in${path}`,
      );
      await expect(page).toHaveTitle(
        `${bank.shortName} ATM PIN Generate — ${bank.nameHindi} | BalCheck`,
      );
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(`${bank.shortName} ATM PIN Generate`);
    });

    test('subtitle names the documented channel and claims no online Green PIN', async ({
      page,
    }) => {
      await gotoDom(page, path);
      const subtitle = page.getByTestId('atm-pin-subtitle');
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toContainText(bank.nameHindi);
      await expect(subtitle).toContainText(guide.channel);
      // The audited defect: the subtitle read "Green PIN ऑनलाइन" on every
      // bank. PSB's cited poster documents the ATM channel only and OGB names
      // its portal service "Card Instant PIN Re-generation", so a pilot page
      // must not claim an online channel.
      await expect(subtitle).not.toContainText('ऑनलाइन');
    });

    test('meta description is scoped to the documented channel and drops the generic claims', async ({
      page,
    }) => {
      await gotoDom(page, path);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description, 'description present').toBeTruthy();
      expect(description!.length, 'description budget').toBeLessThanOrEqual(165);
      expect(description).toContain(bank.name);
      expect(description).not.toContain(FORBIDDEN_DESCRIPTION_CLAIM);
      // No fee claim survives on a page whose source states none.
      expect(description).not.toContain('मुफ़्त');
    });

    test('publishes the channel-specific procedure with its ordered steps', async ({ page }) => {
      await gotoDom(page, path);
      const guideBlock = page.getByTestId('atm-pin-guide');
      await expect(guideBlock).toBeVisible();
      await expect(guideBlock).toContainText(guide.channel);

      const steps = guideBlock.getByTestId('atm-pin-guide-steps').locator('li');
      await expect(steps).toHaveCount(guide.steps.length);
      for (const [index, step] of guide.steps.entries()) {
        await expect(steps.nth(index)).toContainText(step.label);
        await expect(steps.nth(index)).toContainText(step.detail);
      }

      const prerequisites = guideBlock.getByTestId('atm-pin-guide-prerequisites').locator('li');
      await expect(prerequisites).toHaveCount(guide.prerequisites.length);
    });

    test('states what the cited source does not cover and how to recover', async ({ page }) => {
      await gotoDom(page, path);
      const guideBlock = page.getByTestId('atm-pin-guide');

      const undocumented = guideBlock.getByTestId('atm-pin-undocumented');
      await expect(undocumented).toBeVisible();
      for (const line of guide.undocumented) {
        await expect(undocumented).toContainText(line);
      }

      const troubleshooting = guideBlock.getByTestId('atm-pin-troubleshooting');
      await expect(troubleshooting).toBeVisible();
      for (const item of guide.troubleshooting) {
        await expect(troubleshooting).toContainText(item.q);
        await expect(troubleshooting).toContainText(item.a);
      }
    });

    test('cites the official source with a visible link and read date', async ({ page }) => {
      await gotoDom(page, path);
      const source = page.getByTestId('atm-pin-procedure-source');
      await expect(source).toBeVisible();
      await expect(source).toContainText(guide.sourceLabel);
      await expect(source).toContainText(guide.checkedOn);

      const sourceLink = source.getByTestId('atm-pin-procedure-source-link');
      await expect(sourceLink).toHaveAttribute('href', guide.sourceUrl);
      await expect(sourceLink).toHaveAttribute('target', '_blank');
      await expect(sourceLink).toHaveAttribute('rel', /noopener/);

      // The first action inside the procedure block is the bank's own entry point.
      const entryLink = guideBlockEntryLink(page);
      await expect(entryLink).toHaveAttribute('href', guide.officialEntry.url);
      await expect(entryLink).toHaveAttribute('target', '_blank');
    });

    test('keeps the number-provenance citation but rescopes it away from customer care', async ({
      page,
    }) => {
      await gotoDom(page, path);
      const evidence = page.getByTestId('record-evidence');
      await expect(evidence).toBeVisible();
      await expect(evidence).toContainText(bank.verificationSource!);
      await expect(evidence).toContainText(bank.lastVerified!);

      // The audited defect: the scope label read "customer care" on a page whose
      // procedure is not the customer-care number's.
      const scopeLabel = normalize((await evidence.locator('dt').first().textContent()) ?? '');
      expect(scopeLabel).not.toBe(`${bank.shortName} customer care`);
      expect(scopeLabel).toContain('phone number record');
    });

    test('carries the never-share warning and collects nothing from the user', async ({ page }) => {
      await gotoDom(page, path);
      await expect(page.getByTestId('atm-pin-safety-warning')).toContainText(
        /कभी भी किसी को अपना PIN\/OTP न बताएँ/,
      );
      // No credential or account collection anywhere on a BalCheck page.
      await expect(page.locator('form')).toHaveCount(0);
      await expect(page.locator('input, textarea, select')).toHaveCount(0);
    });

    test('publishes the bank customer-care tap-to-call from banks.ts', async ({ page }) => {
      await gotoDom(page, path);
      const telLinks = page.locator('a[href^="tel:"]');
      expect(await telLinks.count(), 'a tap-to-call link exists').toBeGreaterThan(0);
      await expect(telLinks.first()).toBeVisible();
      await expect(telLinks.first()).toHaveAttribute(
        'href',
        `tel:${bank.customerCare}`,
      );
    });

    test('HowTo and FAQ schema assert exactly what the page displays', async ({ page }) => {
      await gotoDom(page, path);
      const schemas = await page.evaluate(() =>
        Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => {
          try {
            return JSON.parse(node.textContent ?? '{}');
          } catch {
            return null;
          }
        }),
      );
      const howTo = findSchema(schemas, 'HowTo') as {
        step: { name: string; text: string }[];
      };
      const faqPage = findSchema(schemas, 'FAQPage') as {
        mainEntity: { name: string; acceptedAnswer: { text: string } }[];
      };
      expect(howTo, 'HowTo schema present').toBeTruthy();
      expect(faqPage, 'FAQPage schema present').toBeTruthy();

      const stepTexts = normalize(
        (await page.getByTestId('atm-pin-guide-steps').locator('li').allTextContents()).join(' '),
      );
      expect(howTo.step).toHaveLength(guide.steps.length);
      howTo.step.forEach((step, index) => {
        expect(step.name).toBe(guide.steps[index].label);
        expect(stepTexts, `schema step ${index + 1} must be displayed`).toContain(
          normalize(step.text),
        );
      });

      const faqText = normalize((await page.getByTestId('atm-pin-faq').textContent()) ?? '');
      expect(faqPage.mainEntity).toHaveLength(guide.faqs.length);
      for (const entry of faqPage.mainEntity) {
        expect(faqText, `schema FAQ "${entry.name}" must be displayed`).toContain(
          normalize(entry.name),
        );
        expect(entry.acceptedAnswer.text.trim().length).toBeGreaterThan(40);
      }
    });

    test('body copy drops the unsupported generic claims', async ({ page }) => {
      await gotoDom(page, path);
      const body = normalize((await page.locator('main').textContent()) ?? '');
      for (const claim of FORBIDDEN_BODY_CLAIMS) {
        expect(body, `body must not claim "${claim}"`).not.toContain(claim);
      }
      // The generic four-channel menu is not rendered on a pilot page at all.
      await expect(page.locator('h2', { hasText: 'PIN Generate के अन्य तरीके' })).toHaveCount(0);
    });

    test('renders on mobile with one heading and no horizontal overflow', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoDom(page, path);
      await expect(page.locator('h1')).toHaveCount(1);

      const guideBlock = page.getByTestId('atm-pin-guide');
      await expect(guideBlock).toBeVisible();
      await expect(page.getByTestId('atm-pin-procedure-source')).toBeVisible();
      await expect(guideBlock.getByTestId('atm-pin-guide-steps').locator('li').first()).toBeVisible();

      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        return Array.from(document.querySelectorAll('main *'))
          .filter((el) => el.getBoundingClientRect().width > docWidth + 1)
          .map((el) => `${el.tagName}.${(el as HTMLElement).className}`)
          .slice(0, 5);
      });
      expect(overflow, 'no element wider than the viewport').toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => document.documentElement.clientWidth),
      );
    });
  });
}

/** The first link inside the pilot procedure block — the bank's own entry point. */
function guideBlockEntryLink(page: import('@playwright/test').Page) {
  return page.getByTestId('atm-pin-guide').locator('a').first();
}

for (const path of NON_PILOT_PATHS) {
  const slug = path.replace('/atm-pin/', '').replace('/', '');
  test.describe(`non-pilot fallback ${path}`, () => {
    test('keeps the generic template and renders no pilot block', async ({ page }) => {
      await gotoDom(page, path);
      await expect(page.getByTestId('atm-pin-guide')).toHaveCount(0);
      await expect(page.getByTestId('atm-pin-procedure-source')).toHaveCount(0);
      await expect(page.getByTestId('atm-pin-safety-warning')).toHaveCount(0);
      await expect(page.getByTestId('atm-pin-undocumented')).toHaveCount(0);

      // The generic five-step HowTo body is still there, unchanged.
      const steps = page.getByTestId('atm-pin-generic-steps').locator('li');
      await expect(steps).toHaveCount(5);
      await expect(page.locator('h2', { hasText: 'PIN Generate के अन्य तरीके' })).toHaveCount(1);
    });

    test('keeps its canonical, title, generic meta description and number provenance', async ({
      page,
    }) => {
      const bank = bankBySlug(slug);
      await gotoDom(page, path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://balcheck.in${path}`,
      );
      await expect(page).toHaveTitle(
        `${bank.shortName} ATM PIN Generate — ${bank.nameHindi} | BalCheck`,
      );
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(`${bank.shortName} ATM PIN Generate`);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toContain(FORBIDDEN_DESCRIPTION_CLAIM);

      // The untouched fallback still scopes its number citation to customer care.
      const scopeLabel = normalize(
        (await page.getByTestId('record-evidence').locator('dt').first().textContent()) ?? '',
      );
      expect(scopeLabel).toContain(`${bank.shortName} customer care`);
    });

    test('keeps the generic Green PIN ऑनलाइन subtitle', async ({ page }) => {
      await gotoDom(page, path);
      const subtitle = page.getByTestId('atm-pin-subtitle');
      await expect(subtitle).toContainText('Green PIN ऑनलाइन');
    });
  });
}

test('the pilot registry never grows past the approved two banks silently', () => {
  expect(Object.keys(ATM_PIN_GUIDES)).toHaveLength(2);
});
