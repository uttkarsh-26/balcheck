import { test, expect } from './fixtures';
import { banks } from '../src/data/banks';
import { getMobileRegistrationGuide } from '../src/data/mobile-registration-guides';
import { gotoDom, getJsonLdScripts, findSchema } from './utils';

test.use({ localOnlyNetwork: true });

const bank = banks.find(b => b.slug === 'up-gramin')!;

test('UPGB registration describes only source-scoped guidance', async ({ page, request, localOnlyNetwork }) => {
  expect(localOnlyNetwork).toBe(true);
  const bankRequests: string[] = [];
  page.on('request', r => { if (new URL(r.url()).hostname === 'upgb.bank.in') bankRequests.push(r.url()); });
  await gotoDom(page, '/mobile-number-registration/up-gramin/');
  const scripts = await getJsonLdScripts(page);
  const description = (await page.locator('meta[name="description"]').getAttribute('content'))!;
  const content = `${await page.locator('body').innerText()} ${description} ${JSON.stringify(scripts)}`;
  // This assertion must fail on the original generic page, not on a missing selector.
  expect(content).not.toContain('24-48 घंटे');
  for (const claim of ['OTP आएगा — verify करें', 'Aadhaar card और passbook की copy', 'हर deposit/withdrawal की SMS', 'SMS आता है → service registration active है', 'Branch, ATM या official website से', 'PAN card', 'KYC / Mobile Registration form', 'तुरंत रजिस्टर']) expect(content).not.toContain(claim);
  expect(content).not.toMatch(/(?:केवल|सिर्फ)\s+शाखा\s+(?:ही\s+)?(?:है|जाना|से)/);
  for (const pattern of [/24\s*[-–]\s*48\s*घंटे/i, /(?:ATM|online|app).{0,45}(?:से|में).{0,35}(?:PIN डालें|OTP से verify|नंबर डालें)/i, /(?:आधार|Aadhaar|PAN|passbook|पुराना SIM).{0,25}(?:अनिवार्य है|जरूरी है)/i, /(?:SMS|notification).{0,30}(?:आएगा|मिलेगा)/i, /(?:नंबर|registration).{0,25}(?:तुरंत|instant).{0,20}(?:हो जाएगा|होगा)/i, /(?:ATM|online|app).{0,30}उपलब्ध नहीं/i]) expect(content).not.toMatch(pattern);
  expect(description.length).toBeLessThanOrEqual(160);
  expect(description).toBe('उत्तर प्रदेश ग्रामीण बैंक (UPGB) में मोबाइल नंबर जोड़ने या बदलने के लिए शाखा से प्रक्रिया पूछें। आधिकारिक स्रोत और जरूरी सावधानियाँ।');
  await expect(page).toHaveTitle('UPGB Mobile Number Registration — उत्तर प्रदेश ग्रामीण बैंक');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('UPGB Mobile Number Registration');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/mobile-number-registration/up-gramin/');
  await expect(page.getByTestId('quick-answer')).toContainText('base branch');
  await expect(page.getByTestId('quick-answer')).toContainText(bank.customerCare);
  await expect(page.getByTestId('category-context')).toContainText('2026-11-12');
  const section = page.getByTestId('up-gramin-registration-guide');
  await expect(section).toContainText('दूसरे विकल्पों के न होने का दावा नहीं है');
  const guide = getMobileRegistrationGuide(bank)!;
  for (const [href, label] of [
    ['https://upgb.bank.in/sms-alert.php', 'UPGB: SMS alerts'],
    ['https://upgb.bank.in/Miss-Call-Facility.php', 'UPGB: missed-call सुविधा'],
    ['https://upgb.bank.in/mobile-banking.php', 'UPGB: mobile banking'],
    ['https://upgb.bank.in/webdata/FAQ%20English.pdf', 'UPGB: mobile banking FAQ'],
    ['https://upgb.bank.in/webdata/pdf/Mobile_Banking_2025.pdf', 'UPGB: M-Tarang दिशानिर्देश'],
  ]) await expect(section.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
  const howto = findSchema(scripts, 'HowTo') as { step: { name: string; text: string; position: number }[] };
  const faq = findSchema(scripts, 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  expect(howto.step.map(({ name, text }) => ({ name, text }))).toEqual(guide.steps);
  expect(howto.step.map(s => s.position)).toEqual(guide.steps.map((_, i) => i + 1));
  expect(faq.mainEntity.map(f => ({ q: f.name, a: f.acceptedAnswer.text }))).toEqual(guide.faqs);
  const steps = page.getByTestId('up-gramin-registration-steps').locator('li');
  await expect(steps).toHaveCount(howto.step.length);
  for (let i = 0; i < howto.step.length; i++) {
    await expect(steps.nth(i).locator('strong')).toHaveText(`${howto.step[i].name}:`);
    await expect(steps.nth(i).locator('span')).toHaveText(howto.step[i].text);
  }
  for (const item of faq.mainEntity) {
    const heading = page.getByRole('heading', { name: item.name, exact: true });
    await expect(heading).toBeVisible();
    await expect(heading.locator('..').locator('p')).toHaveText(item.acceptedAnswer.text);
  }
  // These expectations are independent of the guide and schema: a shared deletion
  // or weakening of an answer must not pass just because both still agree.
  const answerFor = (question: string) => page.getByRole('heading', { name: question, exact: true }).locator('..').locator('p');
  const first = answerFor('UPGB में पहली बार मोबाइल नंबर कैसे जोड़ें या बदलें?');
  await expect(first).toBeVisible();
  await expect(first).toContainText('SMS alerts के लिए बैंक base branch में नंबर दर्ज कराने और बदलाव पर base branch को सूचित करने को कहता है।');
  await expect(first).toContainText('अपनी पहली registration या बदलाव की प्रक्रिया और जरूरतें शाखा से पूछें');
  await expect(first).toContainText('यह अन्य विकल्पों को नकारता नहीं है।');

  const channels = answerFor('क्या ATM, online या app से खाते का नंबर बदल सकता है?');
  await expect(channels).toBeVisible();
  await expect(channels).toContainText('खाते या CIF का नंबर ATM, online या app से बदलने का क्रम पुष्ट नहीं हुआ।');
  await expect(channels).toContainText('अपने खाते के लिए उपलब्ध विकल्प बैंक से पूछें।');
  await expect(channels).toContainText('mobile banking registration के लिए Branch और Internet Banking दिए हैं; app enrolment खाते का नंबर बदलने का प्रमाण नहीं है।');

  const oldSim = answerFor('पुराना SIM उपलब्ध न हो तो क्या करें?');
  await expect(oldSim).toBeVisible();
  await expect(oldSim).toContainText('अपनी स्थिति base branch या customer care को बताएं और लागू प्रक्रिया पूछें।');
  await expect(oldSim).toContainText('पढ़े गए स्रोत इस स्थिति के लिए सभी ग्राहकों की प्रक्रिया तय नहीं करते।');
  await expect(oldSim).not.toContainText(/(?:पुराना SIM|पुराने नंबर|OTP).{0,40}(?:अनिवार्य|जरूरी|आवश्यक)/);

  const requirements = answerFor('कौन से documents, शुल्क, समय या OTP जरूरी हैं?');
  await expect(requirements).toBeVisible();
  await expect(requirements).toContainText('पहचान, फॉर्म, शुल्क, अपेक्षित समय और पुष्टि की जरूरत अपनी स्थिति के अनुसार बैंक से पूछें।');
  await expect(requirements).toContainText('पढ़े गए स्रोत हर मामले के लिए कोई एक दस्तावेज़ सूची, समय या OTP की शर्त नहीं बताते।');
  const fixedOrFreeFee = /(?:₹\s*\d+|(?:रु\.?|रुपये|रुपए)\s*\d+|\d+\s*(?:रुपये|रुपए|रु\.?))|(?:registration|रजिस्ट्रेशन|पंजीकरण|शुल्क|fee).{0,30}(?:मुफ्त|निःशुल्क|नि:शुल्क|फ्री|free|fixed|निश्चित)|(?:मुफ्त|निःशुल्क|नि:शुल्क|फ्री|free).{0,30}(?:registration|रजिस्ट्रेशन|पंजीकरण)/i;
  await expect(requirements).not.toContainText(fixedOrFreeFee);
  await expect(section).not.toContainText(fixedOrFreeFee);

  const status = answerFor('खाते और missed-call सेवा की स्थिति कैसे जानें?');
  await expect(status).toBeVisible();
  await expect(status).toContainText('खाते या CIF में दर्ज नंबर और प्रत्येक सेवा की स्थिति बैंक से अलग पूछें।');
  await expect(status).toContainText('SMS आने या न आने से सभी सेवाओं का activation या CIF में दर्ज नंबर सिद्ध नहीं होता।');
  const app = answerFor('क्या M-Tarang registration खाते का नंबर बदलना है?');
  await expect(app).toBeVisible();
  await expect(app).toContainText('mobile banking app में enrolment बताते हैं, खाते या CIF का मोबाइल नंबर बदलने की प्रक्रिया नहीं।');
  await expect(page.locator('body')).toContainText('हर सुविधा की पात्रता और activation अलग हो सकती है');
  await expect(page.locator('body')).not.toContainText('UPI और mobile banking app का उपयोग');
  await expect(page.locator('[data-testid="more-services"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /UPGB Balance Check/ })).toHaveAttribute('href', '/bank/up-gramin/');
  await expect(page.getByRole('link', { name: /UPGB Helpline/ })).toHaveAttribute('href', '/customer-care/up-gramin/');
  await expect(page.locator(`a[href="tel:${bank.customerCare}"]`).first()).toBeVisible();
  await expect(page.locator(`a[href="tel:${bank.missedCall}"]`)).toHaveCount(0);
  for (const path of ['/bank/up-gramin/', '/customer-care/up-gramin/']) expect((await request.get(path)).status()).toBe(200);
  const evidence = page.getByTestId('record-evidence');
  await expect(evidence.getByTestId('record-evidence-source')).toContainText(bank.verificationSource!);
  await expect(evidence.getByTestId('record-evidence-date')).toHaveText('2026-09-18');
  await expect(evidence.getByTestId('record-evidence-date')).toHaveAttribute('datetime', '2026-09-18');
  expect(bankRequests).toEqual([]);
});

test('default and existing guides keep the related-service rail', async ({ page }) => {
  for (const slug of ['sbi', 'boi', 'indian-bank', 'uco-bank']) {
    await gotoDom(page, `/mobile-number-registration/${slug}/`);
    await expect(page.getByTestId('more-services')).toBeVisible();
    await expect(page.getByTestId('more-services').getByRole('link', { name: 'Customer Care', exact: true })).toHaveAttribute('href', `/customer-care/${slug}/`);
  }
});
