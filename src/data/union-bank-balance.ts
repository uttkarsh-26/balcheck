// Public tabs on the bank's SMS Banking page and its Customer Care page were
// opened on this date. The saved rendered panels are recorded in the audit.
// Phone numbers already represented by Bank stay in banks.ts, not here.
export const UNION_BALANCE_GUIDE = {
  checkedOn: '2026-11-05',
  sources: {
    sms: 'https://www.unionbankofindia.bank.in/en/details/sms-banking',
    customerCare: 'https://www.unionbankofindia.bank.in/en/common/customer-care',
  },
  smsDestinations: ['9152980440', '9152980449'],
  commands: [
    { keyword: 'UBAL', label: 'Primary account का बैलेंस' },
    { keyword: 'UMNS', label: 'Primary account का मिनी स्टेटमेंट' },
  ],
  instruction: 'रजिस्टर्ड मोबाइल से मिस्ड कॉल देकर primary account का बैलेंस SMS में जानें।',
  feeExplanation: 'SMS banking को पूरी तरह मुफ़्त न मानें। बैंक का SMS Banking पेज घरेलू SMS के लिए ₹0.25 + GST प्रति SMS प्रकाशित करता है; भेजे गए enquiry SMS पर mobile operator का सामान्य tariff भी लागू हो सकता है। यह SMS tariff है, missed-call सेवा की अलग fee की पुष्टि नहीं।',
} as const;

/** Used by both the visible instructions and the existing HowTo schema. */
export function unionBalanceSteps(missedCall: string): string[] {
  return [
    `बैंक खाते में रजिस्टर्ड मोबाइल से ${missedCall} पर मिस्ड कॉल दें।`,
    'बैंक के जवाब में primary account का बैलेंस SMS में देखें; SMS banking और mobile registration की स्थिति बैंक से सुनिश्चित करें।',
    'जवाब न आए तो mobile network और incoming SMS जांचें; registration या account सहायता के लिए बैंक के official call centre या शाखा से संपर्क करें।',
  ];
}
