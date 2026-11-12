import type { Bank } from './banks';

type AadhaarLinkGuide = {
  description: string;
  introduction: string;
  distinctions: string[];
  guidance: string[];
  sources: { label: string; href: string }[];
  faqs: { q: string; a: string }[];
};

// Sources are general RRB/DBT guidance, not an RGB-specific channel verification.
const rajasthan: AadhaarLinkGuide = {
  description: 'राजस्थान ग्रामीण बैंक में Aadhaar, KYC और DBT mapping का अंतर समझें। उपलब्ध तरीके, दस्तावेज, शुल्क और समय बैंक से पूछें।',
  introduction: 'Rajasthan Gramin Bank खाते में Aadhaar से जुड़ी जानकारी के लिए बैंक से संपर्क करें। KYC, खाते में Aadhaar की जानकारी और DBT मैपिंग अलग विषय हैं।',
  distinctions: [
    'बैंक का CBS/KYC रिकॉर्ड खाते से संबंधित है। Aadhaar देना और लागू KYC आवश्यकताएँ एक ही बात नहीं हैं।',
    'NPCI का APB मैपर Aadhaar आधारित DBT के लिए बैंक मैपिंग से जुड़ा है। बैंक रिकॉर्ड में लिंक और मैपर में सीडिंग अलग चरण हैं।',
    'UIDAI के Aadhaar रिकॉर्ड में registered mobile अलग है; बैंक खाता या NPCI मैपर अपडेट होने से इसे एक ही प्रक्रिया न समझें।',
  ],
  guidance: [
    'बैंक से फिलहाल उपलब्ध तरीके, जरूरी दस्तावेज, शुल्क और लगने वाला समय पूछें। उपलब्धता के बारे में किसी एक माध्यम को एकमात्र विकल्प न मानें।',
    'UIDAI का सामान्य DBT मार्गदर्शन खाता रखने वाले बैंक की शाखा में मैंडेट और सहमति देने को कहता है; बैंक NPCI मैपर में सीडिंग करता है। RGB के लिए इसे इकलौता माध्यम न मानें और बैंक से मौजूदा प्रक्रिया की पुष्टि करें।',
    'myAadhaar का bank seeding status NPCI से मिली जानकारी है; UIDAI उसकी सही होने की ज़िम्मेदारी नहीं लेता। यह हर खाते के CBS/KYC, योजना की पात्रता या भविष्य के भुगतान का प्रमाण नहीं है। दिक्कत पर बैंक से रिकॉर्ड और मैपर की स्थिति अलग-अलग पूछें।',
    'इस वेबसाइट पर अपना Aadhaar या खाता नंबर साझा न करें।',
  ],
  sources: [
    { label: 'RBI: RRB KYC निर्देश', href: 'https://www.rbi.org.in/SCRIPTS/BS_ViewMasDirections.aspx?id=13040' },
    { label: 'UIDAI: DBT मार्गदर्शन', href: 'https://uidai.gov.in/en/direct-benefit-transfer' },
    { label: 'NPCI: APB प्रक्रिया (सरकारी प्रति)', href: 'https://dbtbharat.gov.in/data/dbt_payments/Standard-Operating-Procedure-of-Aadhaar-Payments-Bridge-(APB).pdf' },
    { label: 'Rajasthan Gramin Bank की आधिकारिक वेबसाइट', href: 'https://rgb.bank.in/' },
  ],
  faqs: [
    { q: 'क्या KYC के लिए Aadhaar अनिवार्य है?', a: 'लागू KYC आवश्यकताएँ पूरी करना ज़रूरी है, लेकिन RBI के RRB निर्देश के अनुसार Aadhaar सामान्य रूप से KYC के लिए अनिवार्य नहीं है। Aadhaar कानून की धारा 7 के तहत अधिसूचित लाभ या सब्सिडी के लिए Aadhaar बैंक को देना होता है; अन्य मामलों में इसे स्वेच्छा से दिया जा सकता है।' },
    { q: 'बैंक में Aadhaar कैसे link कराएँ?', a: 'बैंक से अभी उपलब्ध तरीके, जरूरी दस्तावेज, शुल्क और लगने वाला समय पूछें। किसी विशेष माध्यम की उपलब्धता या न होने का अनुमान न लगाएँ।' },
    { q: 'DBT के लिए क्या अलग करना होता है?', a: 'UIDAI का सामान्य मार्गदर्शन खाता रखने वाले बैंक की शाखा में मैंडेट और सहमति देने को कहता है। बैंक Aadhaar को NPCI मैपर में सीड करता है। यह RGB का एकमात्र माध्यम होने का दावा नहीं है; बैंक से मौजूदा प्रक्रिया की पुष्टि करें।' },
    { q: 'CBS, NPCI मैपर और Aadhaar mobile में क्या अंतर है?', a: 'बैंक का CBS खाते और KYC रिकॉर्ड से जुड़ा है; NPCI मैपर Aadhaar आधारित DBT के लिए बैंक मैपिंग से जुड़ा है। UIDAI में registered mobile एक अलग रिकॉर्ड है। एक स्थिति से बाकी सभी स्थितियाँ साबित नहीं होतीं।' },
    { q: 'myAadhaar का bank seeding status क्या बताता है?', a: 'यह NPCI से मिली जानकारी दिखाता है और UIDAI इसके सही होने के लिए ज़िम्मेदार नहीं है। यह हर खाते का CBS या KYC पूरा होने, योजना की पात्रता या भविष्य के भुगतान का प्रमाण नहीं है।' },
    { q: 'लिंक या DBT में दिक्कत हो तो क्या करें?', a: 'बैंक से खाते के CBS रिकॉर्ड और NPCI मैपर की स्थिति अलग-अलग पूछें और समस्या व आगे की प्रक्रिया की पुष्टि करें।' },
  ],
};

export function getAadhaarLinkGuide(bank: Pick<Bank, 'slug'>): AadhaarLinkGuide | null {
  return bank.slug === 'rajasthan-gramin' ? rajasthan : null;
}
