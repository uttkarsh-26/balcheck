import type { Bank } from './banks';

// Contact page checked 2026-11-12: only the published contact number was
// checked, not the historical registry record or availability of a service.
export function getBiharGraminBankGuide(bank: Bank) {
  if (bank.slug !== 'bihar-gramin') return undefined;
  const contact = 'https://bgb.bank.in/contact';
  const mobileBanking = 'https://bgb.bank.in/mobile-banking';
  return {
    contact,
    mobileBanking,
    contactCheckedOn: '2026-11-12',
    evidenceDateSubject: 'published-toll-free-contact',
    label: 'बैंक का टोल-फ्री संपर्क',
    instruction: 'बैंक इसे टोल-फ्री संपर्क बताता है। इस लाइन से balance enquiry, कोई menu, registered mobile की जरूरत या 24×7 उपलब्धता की पुष्टि स्रोत में नहीं है। सहायता के लिए बैंक से पूछें।',
    description: `Bihar Gramin Bank का प्रकाशित टोल-फ्री संपर्क ${bank.missedCall} और BGB mBanking में सूचीबद्ध balance enquiry की जानकारी।`,
    faqs: [
      { q: 'Bihar Gramin Bank का प्रकाशित संपर्क नंबर क्या है?', a: `बैंक के contact page पर ${bank.missedCall} टोल-फ्री संपर्क के रूप में प्रकाशित है। इस लाइन पर उपलब्ध सहायता के बारे में बैंक से पूछें।` },
      { q: 'क्या इस नंबर से बैलेंस मिलना तय है?', a: 'पढ़ा गया contact page इस लाइन से balance enquiry या किसी balance menu की पुष्टि नहीं करता। इसका अर्थ यह नहीं कि सेवा असंभव है; उपलब्ध विकल्प बैंक से पूछें।' },
      { q: 'क्या registered mobile या 24×7 उपलब्धता की पुष्टि है?', a: 'पढ़े गए contact page में इस लाइन के लिए registered mobile की जरूरत या 24×7 उपलब्धता की पुष्टि नहीं है। समय और शर्तें बैंक से पूछें।' },
      { q: 'बैंक बैलेंस के लिए कौन सा ऐप सूचीबद्ध करता है?', a: 'बैंक के mobile banking page पर BGB mBanking App की सुविधाओं में balance enquiry सूचीबद्ध है। पात्रता, पंजीकरण और उपलब्धता बैंक से जांचें; यहां परिणाम की गारंटी नहीं है।' },
    ],
  } as const;
}
