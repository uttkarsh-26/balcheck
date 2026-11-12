import type { Bank } from './banks';

// BOI grievance portal, registered-mobile notice (read 2026-11-12):
// https://grievances.bankofindia.bank.in:8443/OnlineGrievance.aspx
// “Incase of change in Mobile Number/ Email Id : Please visit your BOI branch.”
// This notice concerns grievance communications; it does not rule out other channels.
// BOI mobile banking page describes app onboarding, not changing the account's mobile number:
// https://bankofindia.bank.in/smart-banking/mobile-banking-payment
export function getBoiMobileRegistrationGuide(bank: Bank) {
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
