import type { Bank } from './banks';

export const CANARA_BALANCE_EVIDENCE = {
  checkedOn: '2026-11-07',
  sources: {
    missedCall: 'https://www.canarabank.bank.in/pages/missed-call-banking',
    contact: 'https://www.canarabank.bank.in/pages/contactus',
    smsHelp: 'https://www.canarabank.bank.in/sms-help-desk',
  },
  // Preserve the leading zero exactly as the official service table publishes it.
  miniStatements: [
    { language: 'English', number: '09015734734' },
    { language: 'हिंदी', number: '09015613613' },
  ],
  transactionCount: 5,
  smsHelpPhone: '080-25129259',
  smsHelpHours: '10 AM to 6 PM',
} as const;

export function getCanaraBalanceGuide(bank: Bank) {
  if (bank.slug !== 'canara') return undefined;
  const evidence = CANARA_BALANCE_EVIDENCE;
  const miniSummary = evidence.miniStatements.map(option => `${option.language}: ${option.number}`).join('; ');
  const miniStatementSteps = [
    'पहले mini statement की भाषा चुनें; नीचे दोनों नंबर bank की Missed Call Banking table से हैं।',
    ...evidence.miniStatements.map(option => `${option.language} में last ${evidence.transactionCount} transactions के लिए ${option.number} पर मिस्ड कॉल दें।`),
    `जवाब न मिले तो ${bank.customerCare} पर eligibility और current service instructions पूछें। Table SMS format, registration steps या fixed response time नहीं देती है।`,
  ];
  return {
    ...evidence,
    number: bank.missedCall,
    customerCare: bank.customerCare,
    miniSummary,
    miniStatementSteps,
    instruction: 'Saving Account बैलेंस के लिए इस नंबर पर मिस्ड कॉल दें; mini statement के भाषा-वार नंबर अलग हैं।',
    description: `Canara Bank balance check ${bank.missedCall}। Saving account balance, हिंदी/English mini statement के अलग नंबर और बैंक सहायता की स्रोत-आधारित जानकारी।`,
    steps: [
      `Saving Account का बैलेंस जानना हो तो ${bank.missedCall} पर मिस्ड कॉल दें; बैंक की table इसे savings balance enquiry के लिए प्रकाशित करती है।`,
      `आखिरी ${evidence.transactionCount} transactions चाहिए तो balance नंबर की जगह mini-statement भाषा चुनें: ${miniSummary}। चुने हुए नंबर पर मिस्ड कॉल दें।`,
      `जवाब न मिले या नंबर/सेवा पर संदेह हो तो बैंक के call centre ${bank.customerCare} से सहायता लें; mobile registration और account eligibility की पुष्टि बैंक से कराएं।`,
    ],
    faqs: [
      { q: 'Canara Bank balance check number क्या है?', a: `बैंक का Missed Call Banking पेज Saving Account balance enquiry के लिए ${bank.missedCall} प्रकाशित करता है। Last ${evidence.transactionCount} transactions के लिए अलग भाषा-वार mini-statement नंबर दिए हैं।` },
      { q: 'केनरा बैंक mini statement के हिंदी और English नंबर क्या हैं?', a: `${miniSummary}। बैंक इन missed-call नंबरों को mini statement / last ${evidence.transactionCount} transactions के लिए बताता है। Balance enquiry नंबर ${bank.missedCall} को इनके स्थान पर न समझें।` },
      { q: 'क्या balance के लिए इसी नंबर पर SMS command भेजनी है?', a: 'पढ़ा गया official page missed-call नंबर बताता है, SMS भेजने का keyword या destination नहीं। इस आधार पर कोई SMS keyword या account-number वाला format नहीं दिया जा रहा है। SMS Help Desk सहायता के लिए है; वह balance command की सूची नहीं है।' },
      { q: 'क्या Canara की missed-call सेवा मुफ़्त और 24×7 है?', a: `पढ़ी गई missed-call table में शुल्क, ring count, SMS-delivery time या uptime terms नहीं हैं। Contact Us पेज call centre ${bank.customerCare} को toll-free और 24*7 कहता है; उसे अलग missed-call नंबर की fee या guaranteed availability का प्रमाण न मानें।` },
      { q: 'मोबाइल registration या activation कैसे करें?', a: `पढ़ी गई service table registration, number-change या activation की चरणबद्ध प्रक्रिया नहीं देती। अपनी स्थिति के लिए बैंक के ${bank.customerCare} पर पुष्टि करें या शाखा से मदद लें; यहां remote activation code या अप्रमाणित document list नहीं दी गई है।` },
      { q: 'SMS या service response नहीं मिले तो कहां मदद लें?', a: `बैंक का SMS Help Desk ${evidence.smsHelpPhone} (${evidence.smsHelpHours}) और call centre ${bank.customerCare} प्रकाशित करता है। गलत नंबर/भाषा, mobile registration और service availability की जांच बैंक से मांगें; किसी outage या account block का कारण यहां अनुमान से नहीं बताया गया है।` },
      { q: 'Canara Bank customer care number क्या है?', a: `Official Contact Us page का general call-centre number ${bank.customerCare} है। उसी पेज पर outgoing-only नंबर और अलग pensioner/NRI lines भी हैं; उन्हें इस सामान्य सहायता नंबर के साथ जोड़कर एक लंबा नंबर न बनाएं।` },
    ],
    miniFaqs: [
      { q: 'Canara mini statement के published नंबर क्या हैं?', a: `${miniSummary}। बैंक इन्हें missed call से last ${evidence.transactionCount} transactions के लिए प्रकाशित करता है। अपनी जरूरत की भाषा चुनें।` },
      { q: 'क्या balance number से वही mini statement मिलेगा?', a: `बैंक ${bank.missedCall} को Saving Account balance enquiry और अलग भाषा-वार नंबरों को mini statement के लिए सूचीबद्ध करता है। दोनों कामों के नंबरों को आपस में न बदलें।` },
      { q: 'कितने transactions की जानकारी प्रकाशित है?', a: `Official table mini statement / last ${evidence.transactionCount} transactions कहती है। यह पूरे महीने या चुनी हुई date range का full account statement नहीं है।` },
      { q: 'क्या response SMS, शुल्क और registration steps भी verified हैं?', a: 'पढ़ी गई table नंबर, भाषा और last-five scope बताती है। उसमें exact reply format, fixed delivery time, शुल्क या registration process नहीं है; इन बातों की पुष्टि bank से करें।' },
      { q: 'Mini statement न मिले तो सहायता कहां मिलेगी?', a: `SMS Help Desk ${evidence.smsHelpPhone} (${evidence.smsHelpHours}) या general call centre ${bank.customerCare} पर service/registration की जांच मांगें। OTP, PIN या password अनजान व्यक्ति को न दें।` },
    ],
  };
}
export type CanaraBalanceGuide = NonNullable<ReturnType<typeof getCanaraBalanceGuide>>;
