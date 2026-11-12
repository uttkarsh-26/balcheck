import type { Bank } from './banks';
import { getUpGraminBalanceGuide } from './up-gramin-balance-guide';

/** Page-only policy: linked verticals and the registry are not re-reviewed here. */
export function getBankPageGuide(bank: Bank) {
  const procedure = getUpGraminBalanceGuide(bank);
  if (!procedure) return undefined;
  return {
    procedure,
    serviceDescription: procedure.serviceDescription,
    instruction: `बैंक के अनुसार रजिस्टर्ड घरेलू मोबाइल से मिस्ड कॉल दें; पहली ring के बाद कॉल कटती है और बैलेंस SMS का निर्देश है।`,
    description: `UPGB (उत्तर प्रदेश ग्रामीण बैंक) बैलेंस चेक नंबर ${bank.missedCall}। रजिस्टर्ड घरेलू मोबाइल से मिस्ड कॉल के बाद बैलेंस SMS की जानकारी।`,
    hiddenServices: new Set(['net-banking', 'mini-statement', 'mobile-number-registration', 'aadhaar-link', 'atm-pin']),
    smsLabel: 'मिस्ड कॉल से बैलेंस SMS',
    whatsappAnswer: `${bank.whatsappBanking?.checkedOn} को जांचे गए बैंक के आधिकारिक पेजों में WhatsApp बैंकिंग नंबर सूचीबद्ध नहीं था। वर्तमान स्थिति बैंक से पूछें; OTP, PIN या पासवर्ड साझा न करें। बैलेंस के लिए ${bank.missedCall} मिस्ड कॉल नंबर है; ${bank.customerCare} सहायता के लिए टोल-फ्री संपर्क है, प्रमाणित बैलेंस IVR नहीं।`,
    mergerSource: 'https://upgb.bank.in/about.php',
    checkedOn: '2026-11-12',
  };
}
