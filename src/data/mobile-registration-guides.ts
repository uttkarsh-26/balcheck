import type { Bank } from './banks';

// BOI grievance portal, registered-mobile notice (read 2026-11-12):
// https://grievances.bankofindia.bank.in:8443/OnlineGrievance.aspx
// “Incase of change in Mobile Number/ Email Id : Please visit your BOI branch.”
// This notice concerns grievance communications; it does not rule out other channels.
// BOI mobile banking page describes app onboarding, not changing the account's mobile number:
// https://bankofindia.bank.in/smart-banking/mobile-banking-payment
export function getMobileRegistrationGuide(bank: Bank) {
  if (bank.slug === 'uco-bank') {
    // UCO digital FAQ: changed number in mBanking and m-Passbook contexts.
    // https://www.uco.bank.in/faq-on-digital-products
    // UCO mBanking: My Profile lists Update Mobile Number; its scope is unspecified.
    // https://www.uco.bank.in/mbanking-plus
    const steps = [
      { name: 'अपनी स्थिति बैंक को बताएं', text: `UCO Bank में पहली बार नंबर जोड़ने या बदलने के विकल्प और पात्रता शाखा या customer care ${bank.customerCare} से पूछें। पुराना SIM उपलब्ध नहीं है तो यह भी बताएं।` },
      { name: 'बदले नंबर के लिए शाखा से पूछें', text: 'UCO की mBanking FAQ बदले हुए नंबर को Finacle में शाखा द्वारा अपडेट करने की बात करती है। m-Passbook में बदले नंबर के लिए ग्राहक ID से जोड़ने को base branch जाने का निर्देश है।' },
      { name: 'App विकल्प की पुष्टि करें', text: 'UCO की mBanking सुविधा सूची में My Profile के अंतर्गत Update Mobile Number है। App तक पहुंच registered mobile number से होती है; इस सुविधा की पात्रता, क्रम और खाते या customer ID पर प्रभाव बैंक से पूछें।' },
      { name: 'जरूरत और स्थिति पूछें', text: 'अपनी स्थिति में जरूरी फॉर्म, पहचान, शुल्क, समय और पुष्टि का तरीका बैंक से पूछें। OTP, PIN और password किसी को न बताएं।' },
    ];
    const faqs = [
      { q: 'UCO mobile number registration कैसे करें?', a: `पहली बार नंबर जोड़ने या बदलने की उपलब्ध प्रक्रिया और पात्रता UCO Bank शाखा या customer care ${bank.customerCare} से पूछें। mBanking FAQ में बदले नंबर का शाखा द्वारा Finacle अपडेट बताया गया है; यह अन्य विकल्पों को असंभव नहीं बताता।` },
      { q: 'क्या UCO app से मोबाइल नंबर बदल सकते हैं?', a: 'UCO की mBanking सूची में My Profile के अंतर्गत Update Mobile Number है। बैंक से अपनी पात्रता, प्रक्रिया और खाते या customer ID पर इसका प्रभाव पूछें; स्रोत इनका विवरण नहीं देता। App तक पहुंच registered mobile number से होती है।' },
      { q: 'क्या ATM से खाते का मोबाइल नंबर जोड़ सकते हैं?', a: 'UCO ATM को mBanking सेवा के registration के विकल्प के रूप में बताता है। इससे खाते का मोबाइल नंबर जोड़ने का ATM क्रम सिद्ध नहीं होता; उपलब्ध विकल्प बैंक से पूछें।' },
      { q: 'पुराना SIM उपलब्ध नहीं हो तो क्या करें?', a: 'अपनी स्थिति शाखा या customer care को बताएं और लागू विकल्प तथा पुष्टि का तरीका पूछें। पढ़े गए स्रोत में इस स्थिति की प्रक्रिया स्पष्ट नहीं है।' },
      { q: 'कौन से documents और कितना समय या शुल्क लगेगा?', a: 'जरूरी फॉर्म, पहचान, शुल्क, अपेक्षित समय और अनुरोध की पुष्टि अपनी स्थिति के अनुसार बैंक से पूछें। पढ़े गए स्रोत हर मामले के लिए निश्चित दस्तावेज़ या समय नहीं बताते।' },
      { q: 'm-Passbook में बदले नंबर के लिए क्या करें?', a: 'UCO की FAQ में नए नंबर को customer ID से base branch के माध्यम से जोड़ने और m-Passbook में नए user के रूप में registration का निर्देश है। अपनी स्थिति बैंक से पुष्टि करें।' },
    ];
    return {
      description: `यूको बैंक (UCO Bank) में mobile number registration कैसे करें। जानकारी customer care ${bank.customerCare} से confirm करें।`,
      quickAnswer: `UCO Bank में नंबर जोड़ने या बदलने के विकल्प Branch या customer care ${bank.customerCare} से पूछें। mBanking FAQ में बदला नंबर शाखा द्वारा अपडेट बताया है; app में Update Mobile Number भी सूचीबद्ध है। अन्य विकल्प असंभव होने का दावा नहीं करते।`,
      context: 'UCO Bank की mBanking FAQ बदले नंबर के लिए शाखा द्वारा Finacle अपडेट और m-Passbook FAQ base branch द्वारा customer ID से नए नंबर को जोड़ने की बात करती है। ये संबंधित संदर्भ हैं, सभी मामलों में केवल शाखा का दावा नहीं।',
      steps,
      faqs,
      sources: [
        { href: 'https://www.uco.bank.in/faq-on-digital-products', label: 'UCO Bank: digital products FAQ' },
        { href: 'https://www.uco.bank.in/mbanking-plus', label: 'UCO Bank: mBanking सुविधाएं और registration' },
      ],
    };
  }
  if (bank.slug === 'indian-bank') {
    const steps = [
      { name: 'शाखा से प्रक्रिया पूछें', text: `खाते में पहली बार नंबर जोड़ने या बदलने के लिए Indian Bank शाखा से प्रक्रिया और अपनी स्थिति के लिए जरूरी दस्तावेज़ पूछें। पुराने नंबर तक पहुंच नहीं है तो यह भी बताएं; सहायता के लिए ${bank.customerCare} से पूछें।` },
      { name: 'पुष्टि की जरूरत समझें', text: 'बैंक की deposit policy CIF पर नए मोबाइल की positive confirmation और पुराने नंबर से Do Not Register संदेश मिलने पर अनुरोध अस्वीकार करने की प्रक्रिया बताती है। अपनी स्थिति में संदेश और पुष्टि का तरीका शाखा से पूछें।' },
      { name: 'Cooling period और स्थिति जानें', text: 'बैंक की policy CIF में नंबर अपडेट से पहले कम से कम 4 घंटे का cooling period बताती है। शाखा द्वारा शुरू अनुरोध में इस दौरान पुराने नंबर पर OTP/SMS या अन्य डिजिटल चैनल का उपयोग नहीं हो सकता। पूरी प्रक्रिया का समय शाखा से पूछें।' },
    ];
    const faqs = [
      { q: 'Indian Bank mobile number registration कैसे करें?', a: `पहली बार नंबर जोड़ने या बदलने के लिए Indian Bank शाखा से अपनी स्थिति के अनुसार प्रक्रिया पूछें। बैंक की policy शाखा से शुरू अनुरोध का उल्लेख करती है; अन्य चैनलों को असंभव नहीं बताती। सहायता के लिए ${bank.customerCare} से पूछें।` },
      { q: 'क्या ATM या online से नंबर बदल सकते हैं?', a: 'पढ़े गए बैंक स्रोतों से खाते के नंबर को ATM या online बदलने का पूरा क्रम और पात्रता स्थापित नहीं होती। उपलब्ध विकल्प शाखा या customer care से पुष्टि करें। App registration खाते का नंबर बदलने से अलग है।' },
      { q: 'पुराना registered mobile उपलब्ध नहीं हो तो क्या करें?', a: 'अपनी स्थिति शाखा को बताएं और पहली बार registration या नंबर बदलने के लिए लागू प्रक्रिया पूछें। पढ़ी गई policy में पुराने नंबर के बिना प्रक्रिया स्पष्ट नहीं है।' },
      { q: 'क्या documents और OTP जरूरी हैं?', a: 'पहचान के दस्तावेज़, फॉर्म और पुष्टि का तरीका अपनी स्थिति के अनुसार शाखा से पूछें। पढ़ी गई policy हर मामले के लिए Aadhaar, PAN या OTP अनिवार्य नहीं बताती। OTP, PIN या password किसी को न बताएं।' },
      { q: 'Mobile number बदलने में कितना समय लगता है?', a: 'बैंक की policy CIF में नंबर अपडेट से पहले कम से कम 4 घंटे का cooling period बताती है, न कि पूरी प्रक्रिया का निश्चित समय। शाखा से अपने अनुरोध की स्थिति और अपेक्षित समय पूछें।' },
      { q: 'App registration और खाते का नंबर बदलना क्या एक ही है?', a: 'नहीं। Indian Bank की app जानकारी app registration बताती है; उससे खाते के CIF पर मोबाइल नंबर जोड़ने या बदलने का क्रम सिद्ध नहीं होता। SMS या missed-call service की activation स्थिति भी अलग से पूछें।' },
    ];
    return {
      description: 'इंडियन बैंक (Indian Bank) में mobile number registration या बदलाव के लिए शाखा से प्रक्रिया पूछें। बैंक की policy और जरूरी सावधानियाँ।',
      quickAnswer: `Indian Bank खाते में नंबर जोड़ने या बदलने के लिए शाखा से अपनी स्थिति की प्रक्रिया पूछें। बैंक की policy CIF अपडेट से पहले कम से कम 4 घंटे का cooling period बताती है। सहायता: ${bank.customerCare}।`,
      context: 'Indian Bank की deposit policy CIF स्तर पर मोबाइल नंबर की positive confirmation और शाखा से शुरू अनुरोध का उल्लेख करती है। पहली registration और पुराने नंबर के बिना बदलाव के लिए अपनी स्थिति शाखा से स्पष्ट करें।',
      steps,
      faqs,
      sources: [
        { href: 'https://indianbank.bank.in/documents/d/guest/deposit-policy-2025-26', label: 'Indian Bank deposit policy v1.5: section 4.36' },
        { href: 'https://indianbank.bank.in/en/indsmart', label: 'Indian Bank: IndSMART app' },
        { href: 'https://apps.indianbank.in/ibcard/help.htm', label: 'Indian Bank: IB Smart Remote app help' },
      ],
    };
  }
  if (bank.slug !== 'boi') return undefined;

  const steps = [
    { name: 'शाखा से प्रक्रिया पूछें', text: `अपने BOI खाते में मोबाइल नंबर जोड़ने या बदलने की प्रक्रिया के लिए शाखा से संपर्क करें। BOI के grievance portal का नंबर बदलने संबंधी नोट भी शाखा जाने को कहता है।` },
    { name: 'जरूरी जानकारी की पुष्टि करें', text: 'अपनी स्थिति के अनुसार form, पहचान के दस्तावेज़ और उपलब्ध तरीकों की पुष्टि शाखा से करें।' },
    { name: 'स्थिति जांचें', text: `अनुरोध के बाद बैंक से स्थिति और अपेक्षित समय पूछें; सहायता के लिए ${bank.customerCare} पर संपर्क करें।` },
  ];
  const faqs = [
    { q: 'BOI mobile number registration कैसे करें?', a: `खाते में मोबाइल नंबर जोड़ने या बदलने के लिए BOI शाखा से प्रक्रिया पूछें। बैंक के grievance portal पर नंबर बदलने के मामले में शाखा जाने की सलाह है। उपलब्ध विकल्प और आवश्यकताओं की पुष्टि ${bank.customerCare} से भी करें।` },
    { q: 'BOI mobile number link या update online कैसे करें?', a: 'पढ़े गए BOI स्रोतों से खाते का मोबाइल नंबर online या ATM से बदलने का पूरा क्रम स्थापित नहीं होता। अपनी पात्रता और उपलब्ध विकल्प बैंक से पुष्टि करें; अन्य विकल्पों को असंभव नहीं कहा जा रहा है।' },
    { q: 'Mobile number registration के लिए क्या documents चाहिए?', a: 'फॉर्म और पहचान के लिए जरूरी दस्तावेज़ अपनी स्थिति के अनुसार BOI शाखा से पूछें। Aadhaar या PAN को हर मामले में अनिवार्य नहीं बताया जा रहा।' },
    { q: 'Mobile number registered है या नहीं कैसे check करें?', a: `अपने खाते में दर्ज नंबर और SMS या missed-call service की अलग स्थिति शाखा या customer care ${bank.customerCare} से जांचें। एक service का परिणाम दूसरी के activation का प्रमाण नहीं है।` },
    { q: 'Mobile number change करने में कितना समय लगता है?', a: `पढ़े गए BOI स्रोत में सभी अनुरोधों के लिए तय समय या SMS की गारंटी नहीं मिली। अपने अनुरोध का अपेक्षित समय और स्थिति शाखा या ${bank.customerCare} से पूछें।` },
    { q: 'क्या BOI mobile app registration और खाते का मोबाइल नंबर बदलना एक ही है?', a: 'नहीं। BOI का mobile banking पेज app onboarding बताता है; उससे खाते में नया मोबाइल नंबर जोड़ने या बदलने का तरीका साबित नहीं होता।' },
  ];
  return {
    description: 'बैंक ऑफ इंडिया (BOI) में mobile number registration या नंबर बदलने के लिए शाखा/customer care से प्रक्रिया पूछें। आधिकारिक स्रोत और जरूरी सावधानियाँ।',
    quickAnswer: `BOI खाते में मोबाइल नंबर जोड़ने या बदलने की प्रक्रिया शाखा या customer care ${bank.customerCare} से पूछें। BOI का grievance portal नंबर बदलने पर शाखा जाने को कहता है; यह दूसरे तरीकों को नकारता नहीं है।`,
    context: 'Bank of India के grievance portal में registered mobile बदलने के मामले में शाखा जाने को कहा गया है। यह निर्देश grievance communication के संदर्भ में है, सभी खातों के लिए अन्य चैनलों के बारे में निष्कर्ष नहीं।',
    steps,
    faqs,
    sources: [
      { href: 'https://grievances.bankofindia.bank.in:8443/OnlineGrievance.aspx', label: 'BOI grievance portal: registered mobile संबंधी नोट' },
      { href: 'https://bankofindia.bank.in/smart-banking/mobile-banking-payment', label: 'BOI: mobile banking app onboarding' },
      { href: bank.website, label: 'BOI official website' },
    ],
  };
}
