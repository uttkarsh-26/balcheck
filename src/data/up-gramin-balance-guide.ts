import type { Bank } from './banks';

/** Procedure evidence is separate from the older number-record review date. */
export function getUpGraminBalanceGuide(bank: Bank) {
  if (bank.slug !== 'up-gramin') return undefined;
  return {
    number: bank.missedCall,
    checkedOn: '2026-11-07',
    sourceUrl: 'https://upgb.bank.in/Miss-Call-Facility.php',
    steps: [
      { name: 'Registered domestic mobile से call करें', text: `खाते में रजिस्टर्ड घरेलू मोबाइल नंबर से ${bank.missedCall} पर मिस्ड कॉल दें।` },
      { name: 'पहली ring के बाद call कटना', text: 'बैंक के प्रकाशित निर्देश के अनुसार पहली ring के बाद call अपने-आप disconnect होती है; इसे अपने-आप असफल call न मानें।' },
      { name: 'SMS में खाते की पहचान और balance देखें', text: 'जवाबी SMS में खाते के अंतिम चार अंक और मौजूदा बैलेंस देखें; बैंक उसी CUST ID से जुड़े पात्र खातों के balance की जानकारी बताता है।' },
      { name: 'जवाब न आए तो registration जांचें', text: 'SMS न मिले तो खाते से जुड़े मोबाइल और पात्रता की जांच base branch से कराएं; खोए, बदले या बंद हुए मोबाइल की जानकारी शाखा को तुरंत दें।' },
    ],
    faqs: [
      { q: 'UPGB balance enquiry number क्या है?', a: `UPGB का प्रकाशित missed-call balance enquiry number ${bank.missedCall} है। बैंक खाते में रजिस्टर्ड घरेलू मोबाइल से call देने पर खाते के अंतिम चार अंक और balance वाला SMS बताता है।` },
      { q: 'किन खातों का balance इस सुविधा से मिलता है?', a: 'बैंक के अनुसार Saving Bank (SB), Current Account (CA), Overdraft (OD) और Cash Credit (CC) खाते पात्र हैं। जानकारी उसी CUST ID से जुड़े पात्र खातों पर आधारित है; इसे हर तरह के deposit, card या loan की पूरी सूची न मानें।' },
      { q: 'क्या विदेशी मोबाइल नंबर पर balance SMS मिलेगा?', a: 'बैंक इस सुविधा को resident accounts और domestic mobile numbers तक सीमित बताता है। विदेश के country code / mobile number पर इस सुविधा का SMS नहीं भेजा जाता।' },
      { q: 'क्या UPGB missed-call balance enquiry मुफ़्त और 24×7 है?', a: 'बैंक का official Miss Call Facility पेज इस सुविधा को free of cost और 24×7 बताता है। यह बैंक का प्रकाशित service description है; हमने live call या SMS करके uptime अथवा delivery का समय नहीं जांचा है।' },
      { q: 'मोबाइल रजिस्टर्ड नहीं है, बदल गया है या खो गया है तो क्या करें?', a: 'मोबाइल रजिस्टर्ड नहीं है तो अपनी base branch से registration के लिए संपर्क करें। मोबाइल खोने, चोरी होने, surrender करने या नंबर बदलने पर बैंक उसी शाखा को तुरंत सूचना देकर पुराने नंबर की deletion/change कराने को कहता है। यहां remote activation, किसी शुल्क या दस्तावेज़ों की अप्रमाणित सूची नहीं दी गई है।' },
      { q: 'क्या इस नंबर पर SMS command भेजना या मिनी स्टेटमेंट मांगना चाहिए?', a: 'पढ़ा गया bank page मिस्ड कॉल के बाद आने वाले balance SMS का विवरण देता है। वह SMS भेजने का command या इसी नंबर से मिनी स्टेटमेंट मिलने की प्रक्रिया नहीं देता; दूसरे बैंक का format यहां न भेजें और balance SMS को पूरा account statement न मानें।' },
      { q: 'रजिस्टर्ड नंबर से भी balance SMS नहीं आए तो क्या जांचें?', a: 'देखें कि call उसी मोबाइल से दी गई है जो बैंक में दर्ज है और वह domestic number है। फोन पर incoming SMS देख लें; फिर base branch से mobile mapping, account eligibility और CUST ID linkage जांचने को कहें। बैंक के पेज में fixed delivery time नहीं दिया गया है।' },
    ],
  };
}

export type UpGraminBalanceGuide = NonNullable<ReturnType<typeof getUpGraminBalanceGuide>>;
