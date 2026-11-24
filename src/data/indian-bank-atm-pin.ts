// Indian Bank IndSMART feature list, read 2026-11-24:
// https://indianbank.bank.in/en/indsmart
// ATM/debit-card landing page, read 2026-11-24 (no debit-card PIN flow found):
// https://indianbank.bank.in/en/atm-/-debit-cards
export const indsmartUrl = 'https://indianbank.bank.in/en/indsmart';
export const indianBankAtmUrl = 'https://indianbank.bank.in/en/atm-/-debit-cards';
export const indianBankPinDescription = 'Indian Bank ATM PIN: IndSMART में debit card PIN set/reset और Green PIN सेवाओं की जानकारी; ATM के लिए बैंक से पुष्टि करें।';
export const indianBankPinFaqs = [
  {
    q: 'क्या Indian Bank का debit card PIN IndSMART से set या reset कर सकते हैं?',
    a: 'Indian Bank की IndSMART सेवा सूची में Debit Card set/reset pin और Green Pin Generation/Validation दोनों दिए गए हैं। बैंक के आधिकारिक IndSMART पेज पर जानकारी देखें; पात्रता और मौजूदा निर्देश बैंक से पुष्टि करें।',
  },
  {
    q: 'क्या IndSMART के बाद ATM जाना ज़रूरी है?',
    a: 'बैंक की पढ़ी गई IndSMART सेवा सूची ऐसा नहीं कहती। यह सूची पूरे चरण या हर स्थिति में प्रक्रिया कहाँ पूरी होगी, नहीं बताती; अपनी स्थिति के लिए बैंक से पुष्टि करें।',
  },
  {
    q: 'ATM से PIN बनाने के चरण क्या हैं?',
    a: 'पढ़े गए ATM और debit card पेज पर debit card PIN बनाने की वर्तमान चरण-दर-चरण प्रक्रिया नहीं मिली। ATM के निर्देश और उपलब्ध विकल्प बैंक से पुष्टि करें; credit card का तरीका debit card पर लागू न मानें।',
  },
  {
    q: 'PIN set या reset करने के लिए शुल्क और पात्रता क्या है?',
    a: 'पढ़ी गई IndSMART सेवा सूची इन सेवाओं का शुल्क या पात्रता नहीं बताती। अपनी स्थिति में बैंक से पूछें।',
  },
];
