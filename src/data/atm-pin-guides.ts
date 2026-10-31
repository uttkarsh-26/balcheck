// Bank-specific ATM-PIN procedure guides — the two-page pilot.
//
// The audited defect: `/atm-pin/[slug]/` rendered ONE generic 5-step procedure
// plus an unconditional "free" fee claim and a four-channel list (net banking,
// ATM, SMS, customer care) for all 75 banks, with no per-bank source at all.
// On a YMYL procedure surface that is an assertion nobody earned.
//
// This module is the single source of truth for the pilot. A record exists only
// where the bank's own official page or document was actually read on
// `checkedOn`. Every field below is traceable to that source; where the source
// is silent the guide says so in `undocumented` instead of filling the gap.
//
// Adding a third bank is a data change here plus nothing else — the template
// renders whatever `getAtmPinGuide` returns and keeps the generic template for
// everyone else.

/** A single ordered step of the documented procedure. */
export interface AtmPinGuideStep {
  /** Short label rendered beside the step number. */
  label: string;
  /** The instruction itself, traceable to the guide's `sourceUrl`. */
  detail: string;
}

export interface AtmPinGuideFaq {
  q: string;
  a: string;
}

export interface AtmPinGuide {
  slug: string;
  /** The channel the cited official source actually documents. */
  channel: string;
  /** One-line answer to "how do I do it here", in the page's voice. */
  summary: string;
  /** Where the user actually performs the procedure. */
  officialEntry: { label: string; url: string };
  /** The official page or PDF the procedure was read from. */
  sourceUrl: string;
  /** ISO date the official source was read. */
  checkedOn: string;
  /** Short visible label naming the source. */
  sourceLabel: string;
  /** Documented prerequisites. */
  prerequisites: string[];
  /** Ordered procedure steps. */
  steps: AtmPinGuideStep[];
  /** Honest "this source does not cover X" statements. */
  undocumented: string[];
  /** Cause → corrective action, limited to what the source supports. */
  troubleshooting: AtmPinGuideFaq[];
  /** FAQs carrying only source-supported claims. */
  faqs: AtmPinGuideFaq[];
  /** Meta description for this page (the generic one asserted four channels). */
  metaDescription: string;
  /** Optional bank-context note with its own official source. */
  contextNote?: { text: string; sourceUrl: string; checkedOn: string };
}

/**
 * The one safety line every pilot page must carry. BalCheck publishes no form
 * and asks for no credential, so the warning is about where a PIN/OTP belongs:
 * at the bank's ATM or on the bank's own site, and nowhere else.
 */
export const ATM_PIN_SAFETY_WARNING =
  'कभी भी किसी को अपना PIN/OTP न बताएँ — न किसी कर्मचारी को, न किसी call पर और न किसी website पर। BalCheck पर कोई form नहीं है; PIN/OTP सिर्फ़ बैंक के ATM या बैंक की official website पर ही डालें।';

export const ATM_PIN_GUIDES: Record<string, AtmPinGuide> = {
  psb: {
    slug: 'psb',
    channel: 'PSB ATM — Green PIN',
    summary:
      'पंजाब एंड सिंध बैंक के आधिकारिक Green PIN poster के अनुसार, PSB के Debit Card का PIN किसी भी PSB ATM पर खुद generate किया जा सकता है। Poster के अनुसार यह सुविधा बैंक के सभी मौजूदा और नए ग्राहकों के लिए उपलब्ध है।',
    officialEntry: {
      label: 'Punjab & Sind Bank — official website',
      url: 'https://punjabandsind.bank.in',
    },
    sourceUrl: 'https://punjabandsind.bank.in/document/Debit_Card_Green_PIN_poster.pdf',
    checkedOn: '2026-10-31',
    sourceLabel: 'Punjab & Sind Bank — Debit Card Green PIN poster (आधिकारिक PDF)',
    prerequisites: [
      'आपके पास PSB का Debit Card होना चाहिए।',
      'OTP के लिए card से जुड़ा registered mobile number होना चाहिए।',
      'कोई भी PSB ATM — यह प्रक्रिया किसी भी PSB ATM पर चलती है।',
      'Poster के अनुसार यह सुविधा बैंक के सभी मौजूदा और नए ग्राहकों के लिए उपलब्ध है।',
    ],
    steps: [
      {
        label: 'Card डालें',
        detail: 'अपना PSB Debit Card ATM में डालें और "Green PIN" option select करें।',
      },
      {
        label: 'OTP generation',
        detail: '"Green PIN" के बाद "OTP generation" option select करें।',
      },
      {
        label: 'OTP प्राप्त करें',
        detail:
          '"OTP generation" के बाद transaction समाप्त हो जाएगी और आपके registered mobile number पर 6 अंकों की OTP आएगी, जो आधे घंटे (30 मिनट) तक मान्य रहती है।',
      },
      {
        label: 'Card दोबारा डालें',
        detail: 'अपना PSB Debit Card दोबारा ATM में डालें और "Green PIN" option select करें।',
      },
      {
        label: 'OTP validation',
        detail: '"Green PIN" के बाद "OTP validation" option select करें।',
      },
      {
        label: 'OTP दर्ज करें',
        detail:
          'ATM आपसे registered mobile number पर आई 6 अंकों की OTP दर्ज करने के लिए कहेगा — OTP सिर्फ़ इसी ATM पर डालें, किसी को न बताएँ।',
      },
      {
        label: 'OTP verify',
        detail: 'OTP डालने के बाद ATM उसे validate करता है।',
      },
      {
        label: 'नया PIN चुनें',
        detail: 'अपनी पसंद का नया 4 अंकों का Personal Identification Number (PIN) ATM पर डालें।',
      },
      {
        label: 'पुष्टि',
        detail:
          'PIN सफलतापूर्वक बनने पर ATM screen पर संदेश दिखेगा और वही receipt पर भी छपेगा।',
      },
    ],
    undocumented: [
      'इस poster में net banking, mobile app, SMS या branch से Green PIN का तरीका उल्लेख नहीं है। इसका मतलब यह नहीं कि वे विकल्प मौजूद नहीं हैं — बस इस आधिकारिक स्रोत में वे documented नहीं हैं।',
      'PIN generation का कोई charge इस poster में नहीं दिया गया है, इसलिए हम कोई राशि नहीं बता सकते। Charge की जानकारी बैंक की official website या base branch से लें।',
    ],
    troubleshooting: [
      {
        q: 'OTP नहीं आई तो क्या करें?',
        a: 'Poster के अनुसार OTP registered mobile number पर जाती है। दोबारा OTP भेजने का तरीका इस दस्तावेज़ में नहीं लिखा है, इसलिए अनुमान नहीं लगाते — सहायता के लिए अपनी base branch से संपर्क करें।',
      },
      {
        q: 'Card दो बार क्यों डालना पड़ता है?',
        a: 'क्योंकि "OTP generation" और "OTP validation" दो अलग-अलग transactions हैं। पहली transaction में OTP बनती है, दूसरी में वही OTP डालकर नया PIN set होता है।',
      },
      {
        q: 'OTP 30 मिनट बाद काम नहीं कर रही?',
        a: 'Poster के अनुसार OTP आधे घंटे तक मान्य रहती है। इसके बाद का प्रवाह इस दस्तावेज़ में उल्लेख नहीं है — base branch से पूछें।',
      },
    ],
    faqs: [
      {
        q: 'PSB ATM PIN कैसे generate करें?',
        a: 'PSB के आधिकारिक Green PIN poster के अनुसार: ATM में Debit Card डालें → "Green PIN" → "OTP generation" → registered mobile number पर 6 अंकों की OTP (30 मिनट मान्य) → card दोबारा डालें → "Green PIN" → "OTP validation" → OTP डालें → नया 4 अंकों का PIN set करें। कुल 9 चरण।',
      },
      {
        q: 'PSB Green PIN के लिए क्या ज़रूरी है?',
        a: 'PSB Debit Card, card से जुड़ा registered mobile number (OTP के लिए) और कोई भी PSB ATM। Poster के अनुसार यह सुविधा बैंक के सभी मौजूदा और नए ग्राहकों के लिए उपलब्ध है।',
      },
      {
        q: 'PSB Green PIN का charge कितना लगता है?',
        a: 'इस आधिकारिक poster में PIN generation का charge उल्लेख नहीं है, इसलिए हम कोई राशि या मुफ़्त होने का दावा नहीं कर सकते। Charge की सही जानकारी बैंक की official website या base branch से लें।',
      },
      {
        q: 'PSB Green PIN में OTP कितने समय तक चलती है?',
        a: 'Poster के अनुसार registered mobile number पर आई 6 अंकों की OTP आधे घंटे (30 मिनट) तक मान्य रहती है।',
      },
      {
        q: 'क्या PSB Green PIN net banking या app से भी हो सकता है?',
        a: 'हमने जो आधिकारिक दस्तावेज़ पढ़ा है उसमें सिर्फ़ ATM का तरीका दिया गया है। net banking, app, SMS या branch के विकल्पों के बारे में इस स्रोत से कुछ नहीं कह सकते — बैंक की official website देखें।',
      },
    ],
    metaDescription:
      'पंजाब एंड सिंध बैंक (Punjab & Sind Bank) ATM PIN generate — PSB ATM पर Green PIN के 9 चरण, OTP 30 मिनट मान्य। आधिकारिक poster के अनुसार।',
  },

  'odisha-grameen': {
    slug: 'odisha-grameen',
    channel: 'Odisha Grameen Bank Card Services portal',
    summary:
      'ओडिशा ग्रामीण बैंक की official website के "My Cards" से जुड़ा Card Services portal (mycards.ogb.bank.in) "Generate PIN" सेवा देता है, जिसे वहाँ "Card Instant PIN Re-generation" भी कहा गया है।',
    officialEntry: {
      label: 'Odisha Grameen Bank — Card Services portal (Generate PIN)',
      url: 'https://mycards.ogb.bank.in/',
    },
    sourceUrl: 'https://mycards.ogb.bank.in/',
    checkedOn: '2026-10-31',
    sourceLabel: 'Odisha Grameen Bank — Card Services portal, Generate PIN (आधिकारिक portal)',
    prerequisites: [
      'आप Resident Individual या Senior Citizen होने चाहिए और Savings Account होना चाहिए।',
      'आपका Savings Account operational होना चाहिए।',
      'यह सेवा उन accounts के लिए है जिनका holding pattern SB या CA है।',
      'आपके account से जुड़ा Debit Card होना चाहिए — active या inactive, दोनों के लिए सेवा है।',
    ],
    steps: [
      {
        label: 'Bank website खोलें',
        detail:
          'ओडिशा ग्रामीण बैंक की official website odishabank.bank.in पर जाएँ और "My Cards" पर जाएँ — यह mycards.ogb.bank.in खोलेगा।',
      },
      {
        label: 'Generate PIN चुनें',
        detail:
          'Card Services page पर Function में "Generate PIN" (Card Instant PIN Re-generation) चुनें।',
      },
      {
        label: 'Mobile Number',
        detail: 'Portal आपसे Mobile Number मांगेगा — card से जुड़ा वही number डालें।',
      },
      {
        label: 'Date of Birth',
        detail: 'फिर अपनी Date of Birth डालें।',
      },
      {
        label: 'Account के आख़िर 4 अंक',
        detail: 'फिर Account number के आख़िर 4 अंक डालें।',
      },
      {
        label: 'Captcha',
        detail: 'Captcha भरें (यह case sensitive है) और Continue दबाएँ।',
      },
      {
        label: 'आगे के निर्देश',
        detail:
          'Portal के अगले screens के निर्देश follow करें। यह सब कुछ आप बैंक की official portal पर ही करें — BalCheck पर कोई form नहीं है और हम कोई विवरण नहीं मांगते।',
      },
    ],
    undocumented: [
      'इस card portal के landing page पर ATM, net banking या mobile app से Green PIN का कोई मेन्यू पथ उल्लेख नहीं है। इसका मतलब यह नहीं कि वे विकल्प मौजूद नहीं हैं — बस यहाँ documented नहीं हैं।',
      'Form submit करने के बाद का प्रवाह (OTP आएगी या कोई और verification होगा, PIN कैसे set होगा) हमने नहीं पढ़ा है, इसलिए उस बारे में कुछ नहीं कह सकते।',
      'PIN generation का कोई charge इस portal पर उल्लेख नहीं है, इसलिए कोई राशि नहीं बता सकते।',
    ],
    troubleshooting: [
      {
        q: 'OTP आएगी या नहीं?',
        a: 'Card Services portal के landing page से यह स्पष्ट नहीं होता कि form submit करने के बाद OTP आएगी या कोई और verification होगी। हमने वह प्रवाह नहीं पढ़ा है, इसलिए अनुमान नहीं लगाते।',
      },
      {
        q: 'Net banking से Green PIN कैसे करें?',
        a: 'इस card portal के landing page पर net banking का कोई मेन्यू पथ उल्लेख नहीं है। इसका मतलब यह नहीं कि वह विकल्प मौजूद नहीं है — बैंक की official website या customer care से पूछें।',
      },
      {
        q: 'Portal पर विवरण नहीं भर पा रहे?',
        a: 'यह form बैंक की official portal पर है, इसलिए सहायता बैंक से लेनी होगी। BalCheck पर कोई form नहीं है और हम आपका कोई विवरण नहीं लेते।',
      },
    ],
    faqs: [
      {
        q: 'ओडिशा ग्रामीण बैंक ATM PIN कैसे generate करें?',
        a: 'बैंक की official website odishabank.bank.in के "My Cards" से खुलने वाले Card Services portal (mycards.ogb.bank.in) पर "Generate PIN" सेवा है। Portal Mobile Number, Date of Birth, Account number के आख़िर 4 अंक और Captcha मांगता है।',
      },
      {
        q: 'Odisha Gramya Bank के लिए यह page सही है?',
        a: 'हाँ। Odisha Grameen Bank की स्थापना 1 मई 2025 को Odisha Gramya Bank और Utkal Grameen Bank के amalgamation से हुई थी। पुराने नाम से खोजने वाले उपयोगकर्ताओं के लिए भी यही सही page है।',
      },
      {
        q: 'OGB Card Instant PIN Re-generation के लिए क्या ज़रूरी है?',
        a: 'Portal के अनुसार: Resident Individual या Senior Citizen होना चाहिए, operational Savings Account होना चाहिए, account का holding pattern SB या CA होना चाहिए, और account से जुड़ा Debit Card (active या inactive) होना चाहिए।',
      },
      {
        q: 'OGB Green PIN का charge कितना लगता है?',
        a: 'इस card portal पर PIN generation का कोई charge उल्लेख नहीं है, इसलिए हम कोई राशि या मुफ़्त होने का दावा नहीं कर सकते। Charge की जानकारी बैंक की official website पर देखें।',
      },
    ],
    metaDescription:
      'ओडिशा ग्रामीण बैंक (Odisha Grameen Bank) ATM PIN — official Card Services portal से Generate PIN। Odisha Gramya Bank नाम से खोजें तो भी यही सही page है।',
    contextNote: {
      text: 'नाम बदला है: इस बैंक की स्थापना 1 मई 2025 को ओडिशा ग्राम्य बैंक (Odisha Gramya Bank) और उत्कल ग्रामीण बैंक (Utkal Grameen Bank) के amalgamation से हुई — Government of India, Department of Financial Services, Ministry of Finance, Notification No. CG-DL-E-07042025-262329 (05/04/2025)। अगर आपने "Odisha Gramya Bank" नाम से खोजा था, तो आप सही page पर हैं।',
      sourceUrl: 'https://odishabank.bank.in/',
      checkedOn: '2026-10-31',
    },
  },
};

/**
 * The pilot guide for `slug`, or undefined for every other bank. Undefined is
 * the deterministic fallback the template renders as the generic template.
 */
export function getAtmPinGuide(slug: string): AtmPinGuide | undefined {
  return ATM_PIN_GUIDES[slug];
}
