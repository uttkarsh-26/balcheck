import { test, expect } from './fixtures';
import { banks } from '../src/data/banks';
import { getAadhaarLinkGuide } from '../src/data/aadhaar-link-guides';

test.use({ localOnlyNetwork: true });

const path = '/aadhaar-link/rajasthan-gramin/';
const sources = [
  ['RBI: RRB KYC निर्देश', 'https://www.rbi.org.in/SCRIPTS/BS_ViewMasDirections.aspx?id=13040'],
  ['UIDAI: DBT मार्गदर्शन', 'https://uidai.gov.in/en/direct-benefit-transfer'],
  ['NPCI: APB प्रक्रिया (सरकारी प्रति)', 'https://dbtbharat.gov.in/data/dbt_payments/Standard-Operating-Procedure-of-Aadhaar-Payments-Bridge-(APB).pdf'],
  ['Rajasthan Gramin Bank की आधिकारिक वेबसाइट', 'https://rgb.bank.in/'],
] as const;

// Independently approved contracts; deliberately not read from the guide or snapshots.
const approvedFaq = [
  { q: 'क्या KYC के लिए Aadhaar अनिवार्य है?', a: 'लागू KYC आवश्यकताएँ पूरी करना ज़रूरी है, लेकिन RBI के RRB निर्देश के अनुसार Aadhaar सामान्य रूप से KYC के लिए अनिवार्य नहीं है। Aadhaar कानून की धारा 7 के तहत अधिसूचित लाभ या सब्सिडी के लिए Aadhaar बैंक को देना होता है; अन्य मामलों में इसे स्वेच्छा से दिया जा सकता है।' },
  { q: 'बैंक में Aadhaar कैसे link कराएँ?', a: 'बैंक से अभी उपलब्ध तरीके, जरूरी दस्तावेज, शुल्क और लगने वाला समय पूछें। किसी विशेष माध्यम की उपलब्धता या न होने का अनुमान न लगाएँ।' },
  { q: 'DBT के लिए क्या अलग करना होता है?', a: 'UIDAI का सामान्य मार्गदर्शन खाता रखने वाले बैंक की शाखा में मैंडेट और सहमति देने को कहता है। बैंक Aadhaar को NPCI मैपर में सीड करता है। यह RGB का एकमात्र माध्यम होने का दावा नहीं है; बैंक से मौजूदा प्रक्रिया की पुष्टि करें।' },
  { q: 'CBS, NPCI मैपर और Aadhaar mobile में क्या अंतर है?', a: 'बैंक का CBS खाते और KYC रिकॉर्ड से जुड़ा है; NPCI मैपर Aadhaar आधारित DBT के लिए बैंक मैपिंग से जुड़ा है। UIDAI में registered mobile एक अलग रिकॉर्ड है। एक स्थिति से बाकी सभी स्थितियाँ साबित नहीं होतीं।' },
  { q: 'myAadhaar का bank seeding status क्या बताता है?', a: 'यह NPCI से मिली जानकारी दिखाता है और UIDAI इसके सही होने के लिए ज़िम्मेदार नहीं है। यह हर खाते का CBS या KYC पूरा होने, योजना की पात्रता या भविष्य के भुगतान का प्रमाण नहीं है।' },
  { q: 'लिंक या DBT में दिक्कत हो तो क्या करें?', a: 'बैंक से खाते के CBS रिकॉर्ड और NPCI मैपर की स्थिति अलग-अलग पूछें और समस्या व आगे की प्रक्रिया की पुष्टि करें।' },
];
const approvedDescription = 'राजस्थान ग्रामीण बैंक में Aadhaar, KYC और DBT mapping का अंतर समझें। उपलब्ध तरीके, दस्तावेज, शुल्क और समय बैंक से पूछें।';
const approvedCards = [
  { heading: 'Aadhaar और बैंक खाता', paragraphs: ['Rajasthan Gramin Bank खाते में Aadhaar से जुड़ी जानकारी के लिए बैंक से संपर्क करें। KYC, खाते में Aadhaar की जानकारी और DBT मैपिंग अलग विषय हैं।'], items: [] },
  { heading: 'अलग-अलग रिकॉर्ड समझें', paragraphs: [], items: [
    'बैंक का CBS/KYC रिकॉर्ड खाते से संबंधित है। Aadhaar देना और लागू KYC आवश्यकताएँ एक ही बात नहीं हैं।',
    'NPCI का APB मैपर Aadhaar आधारित DBT के लिए बैंक मैपिंग से जुड़ा है। बैंक रिकॉर्ड में लिंक और मैपर में सीडिंग अलग चरण हैं।',
    'UIDAI के Aadhaar रिकॉर्ड में registered mobile अलग है; बैंक खाता या NPCI मैपर अपडेट होने से इसे एक ही प्रक्रिया न समझें।',
  ] },
  { heading: 'बैंक से जानकारी और DBT स्थिति', paragraphs: [], items: [
    'बैंक से फिलहाल उपलब्ध तरीके, जरूरी दस्तावेज, शुल्क और लगने वाला समय पूछें। उपलब्धता के बारे में किसी एक माध्यम को एकमात्र विकल्प न मानें।',
    'UIDAI का सामान्य DBT मार्गदर्शन खाता रखने वाले बैंक की शाखा में मैंडेट और सहमति देने को कहता है; बैंक NPCI मैपर में सीडिंग करता है। RGB के लिए इसे इकलौता माध्यम न मानें और बैंक से मौजूदा प्रक्रिया की पुष्टि करें।',
    'myAadhaar का bank seeding status NPCI से मिली जानकारी है; UIDAI उसकी सही होने की ज़िम्मेदारी नहीं लेता। यह हर खाते के CBS/KYC, योजना की पात्रता या भविष्य के भुगतान का प्रमाण नहीं है। दिक्कत पर बैंक से रिकॉर्ड और मैपर की स्थिति अलग-अलग पूछें।',
    'इस वेबसाइट पर अपना Aadhaar या खाता नंबर साझा न करें।',
  ] },
  { heading: 'आधिकारिक स्रोत', paragraphs: [], items: sources.map(([label]) => label) },
];

async function open(page: import('@playwright/test').Page) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

// Extract the actual rendered DOM once; assertions below are synchronous so
// intentional fault checks do not incur Playwright locator auto-retries.
async function extractContract(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 || node.hasAttribute('hidden')) return false;
      }
      return el.getClientRects().length > 0;
    };
    const faqHeading = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes('अक्सर पूछे जाने वाले प्रश्न'));
    const faqContainer = faqHeading?.parentElement;
    const questions = [...(faqContainer?.querySelectorAll('h3') ?? [])].map(h => {
      const ps = [...(h.parentElement?.querySelectorAll('p') ?? [])];
      return { q: h.textContent?.trim(), answers: ps.map(p => ({ text: p.innerText.trim(), visible: visible(p) })) };
    });
    const cards = [...document.querySelectorAll('main section')].map(section => ({
      heading: section.querySelector('h2')?.textContent?.trim(),
      paragraphs: [...section.querySelectorAll('p')].map(p => p.innerText.trim()),
      items: [...section.querySelectorAll('li')].map(li => li.innerText.trim()),
      text: (section as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
    }));
    const metas = ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].map(selector => [...document.querySelectorAll(selector)].map(m => m.getAttribute('content')));
    const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent || '{}'));
    return { questions, cards, metas, schemas };
  });
}

type Contract = Awaited<ReturnType<typeof extractContract>>;
function validateContract(actual: Contract) {
  expect(actual.questions).toEqual(approvedFaq.map(({ q, a }) => ({ q, answers: [{ text: a, visible: true }] })));
  expect(actual.cards).toEqual(approvedCards.map(card => ({ ...card, text: [card.heading, ...card.paragraphs, ...card.items].join(' ').replace(/\s+/g, ' ').trim() })));
  expect(actual.metas).toEqual([[approvedDescription], [approvedDescription], [approvedDescription]]);
  // Separate parity assertion, plus an exact schema shape to prevent extra
  // contradictory objects/fields or a HowTo alongside the approved FAQ.
  expect(actual.schemas).toHaveLength(1);
  const schema = actual.schemas[0];
  const entities = schema['@graph']?.[0]?.mainEntity;
  expect(entities?.map((entry: any) => ({ q: entry.name, a: entry.acceptedAnswer?.text }))).toEqual(
    actual.questions.map(question => ({ q: question.q, a: question.answers[0]?.text })),
  );
  expect(schema).toEqual({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'FAQPage', mainEntity: approvedFaq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://balcheck.in/' },
      { '@type': 'ListItem', position: 2, name: 'Aadhaar Link', item: 'https://balcheck.in/aadhaar-link/' },
      { '@type': 'ListItem', position: 3, name: 'RGB', item: 'https://balcheck.in/aadhaar-link/rajasthan-gramin/' },
    ] },
  ] });
}

test('independent FAQ, card and metadata contracts with separate JSON-LD parity', async ({ page }) => {
  await open(page);
  validateContract(await extractContract(page));
});

test('rendered mutations with matching JSON-LD are rejected', async ({ page }) => {
  await open(page);
  validateContract(await extractContract(page));
  const faults = [
    { index: 1, answer: 'बैंक से उपलब्ध तरीके, दस्तावेज, शुल्क और समय मत पूछें।', target: 'faq' },
    { index: 3, answer: 'CBS और KYC एक हैं; NPCI और DBT एक हैं; UIDAI का mobile अलग नहीं है।', target: 'faq' },
    { index: 1, answer: 'Aadhaar linking दो दिन में हो जाएगी', target: 'card' },
    { index: 1, answer: 'Aadhaar linking दो दिन में हो जाएगी', target: 'metadata' },
  ];
  for (const fault of faults) {
    await open(page);
    validateContract(await extractContract(page));
    await page.evaluate(({ index, answer, target }) => {
      const faqHeading = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes('अक्सर पूछे जाने वाले प्रश्न'))!;
      const h3 = faqHeading.parentElement!.querySelectorAll('h3')[index];
      h3.parentElement!.querySelector('p')!.textContent = answer;
      const script = document.querySelector('script[type="application/ld+json"]')!;
      const schema = JSON.parse(script.textContent!);
      schema['@graph'].find((node: any) => node['@type'] === 'FAQPage').mainEntity[index].acceptedAnswer.text = answer;
      script.textContent = JSON.stringify(schema);
      if (target === 'card') document.querySelectorAll('main section')[2].querySelector('li')!.append(' ' + answer);
      if (target === 'metadata') document.querySelector('meta[name="description"]')!.setAttribute('content', answer);
    }, fault);
    const actual = await extractContract(page);
    expect(actual.questions[fault.index].answers[0].text).toBe(fault.answer);
    expect(actual.schemas[0]['@graph'][0].mainEntity[fault.index].acceptedAnswer.text).toBe(fault.answer);
    // Prove the individual card/metadata guard also rejects when FAQ is restored.
    expect(() => validateContract(actual), fault.target).toThrow();
    if (fault.target !== 'faq') {
      actual.questions[fault.index].answers[0].text = approvedFaq[fault.index].a;
      actual.schemas[0]['@graph'][0].mainEntity[fault.index].acceptedAnswer.text = approvedFaq[fault.index].a;
      expect(() => validateContract(actual), `${fault.target} independently`).toThrow();
    }
  }
});

test('source links, frozen identity, metadata and unsafe claims', async ({ page }) => {
  await open(page);
  await expect(page.locator('h1')).toHaveText('RGB Aadhaar Link');
  await expect(page).toHaveTitle('RGB Aadhaar Link — राजस्थान ग्रामीण बैंक आधार लिंक कैसे करें');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://balcheck.in/aadhaar-link/rajasthan-gramin/');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'RGB Aadhaar Link — राजस्थान ग्रामीण बैंक आधार लिंक कैसे करें');
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', 'RGB Aadhaar Link — राजस्थान ग्रामीण बैंक आधार लिंक कैसे करें');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://balcheck.in/og-image.jpg');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://balcheck.in/aadhaar-link/rajasthan-gramin/');
  const description = await page.locator('meta[name=description]').getAttribute('content');
  expect(description).toBe('राजस्थान ग्रामीण बैंक में Aadhaar, KYC और DBT mapping का अंतर समझें। उपलब्ध तरीके, दस्तावेज, शुल्क और समय बैंक से पूछें।');
  expect(description!.length).toBeLessThanOrEqual(160);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description!);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', description!);
  for (const [label, href] of sources) {
    const link = page.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', href);
    expect(await link.evaluate((a: HTMLAnchorElement) => a.href)).toBe(href);
  }
  const main = page.locator('main');
  const text = await main.innerText();
  const all = text + ' ' + (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ') + ' ' + description;
  expect(all).not.toMatch(/सभी bank accounts.*ज़रूरी|linking mandatory|My Profile|Service Requests|24-48|5-7|मुफ़्त|OTP|सबसे आसान|4 तरीके|नाम और mobile number match|SMS में confirmation|1800.?532.?7444|2026-09-18/i);
  expect(all).not.toMatch(/Aadhaar (?:linking )?(?:is )?mandatory|सभी खातों.*आधार.*अनिवार्य|मोबाइल.*(?:match|मेल.*ज़रूरी)|instant|तुरंत|24\s*(?:से|[-–])\s*48|5\s*(?:से|[-–])\s*7|SMS.*(?:आएगा|आती है)|(?:fee|शुल्क).*(?:free|मुफ्त|नहीं लगेगा)|(?:ATM|app|SMS|net banking).*(?:से.*(?:लिंक करें|select करें|login करें))/i);
  await expect(page.locator('[data-testid="record-evidence"]')).toHaveCount(0);
  const breadcrumbs = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts => scripts.flatMap(s => JSON.parse(s.textContent || '{}')['@graph'] || []).find(n => n['@type'] === 'BreadcrumbList'));
  expect(breadcrumbs.itemListElement.map((n: any) => [n.name, n.item])).toEqual([['Home', 'https://balcheck.in/'], ['Aadhaar Link', 'https://balcheck.in/aadhaar-link/'], ['RGB', 'https://balcheck.in/aadhaar-link/rajasthan-gramin/']]);
  const links = await main.locator('a').evaluateAll(as => as.map(a => ({ href: (a as HTMLAnchorElement).href, label: a.textContent?.trim() })));
  expect(links.filter(a => /^(tel:|sms:)/i.test(a.href) || /18005327444|\/(net-banking|atm-pin|sms-banking|mobile-number-registration)\/rajasthan-gramin\//i.test(a.href))).toEqual([]);
  expect(links.some(a => /rgb\.bank\.in\/?$/.test(a.href) && /Net Banking|login|seeding/i.test(a.label || ''))).toBe(false);
  await expect(page.locator('[data-testid="more-services"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('default page and unknown route stay separate', async ({ page }) => {
  await page.goto('/aadhaar-link/sbi/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Aadhaar link करने के 4 तरीके हैं', { exact: false })).toBeVisible();
  await expect(page.locator('[data-testid="more-services"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="record-evidence"]')).toHaveCount(1);
  expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join()).toContain('HowTo');
  const response = await page.goto('/aadhaar-link/unknown-bank/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
});

test('getter is exact-slug only and default without evidence still renders', async ({ page }) => {
  expect(getAadhaarLinkGuide({ slug: 'rajasthan-gramin' })).not.toBeNull();
  expect(getAadhaarLinkGuide({ slug: 'RAJASTHAN-GRAMIN' })).toBeNull();
  expect(getAadhaarLinkGuide({ slug: 'unknown-bank' })).toBeNull();
  for (const bank of banks.filter(b => b.slug !== 'rajasthan-gramin')) expect(getAadhaarLinkGuide(bank)).toBeNull();
  const noEvidence = banks.find(b => !b.verificationSource || !b.lastVerified);
  expect(noEvidence).toBeTruthy();
  await page.goto(`/aadhaar-link/${noEvidence!.slug}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="record-evidence"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="more-services"]')).toHaveCount(1);
  await expect(page.getByText('Aadhaar link करने के 4 तरीके हैं', { exact: false })).toBeVisible();
});
