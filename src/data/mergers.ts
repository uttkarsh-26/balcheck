// Historical RRB → current bank merger records (PSEO vertical: /merged-banks/).
//
// Facts verified 2026-08-10 against primary sources only:
//   - Gazette of India notifications (S.O. 291(E), S.O. 449(E), S.O. 6255(E),
//     S.O. 1629(E), S.O. 1630(E), S.O. 1633(E), S.O. 1634(E))
//   - RBI FS notifications (rbi.org.in/scripts/FS_Notification.aspx?Id=11985)
//   - DICGC de-registered banks list (dicgc.org.in/de-registered-banks)
//   - Official .bank.in amalgamation pages (upgb.bank.in, rgb.bank.in,
//     mpgb.bank.in, karnatakagb.bank.in)
//
// Rules (enforced by tests):
//   - No phone fields here. The ONLY number rendered on a merged-bank page is
//     the current successor's missedCall/customerCare read from banks.ts.
//   - successorSlug MUST resolve in banks.ts (test-enforced).
//   - Events are chronological; the final resultingName must equal the
//     successor bank's name in banks.ts (test-enforced).

export interface MergerEvent {
  effectiveDate: string; // ISO 'YYYY-MM-DD' — effective date of this step
  resultingName: string; // English name of the bank after this step
  resultingNameHindi: string;
  sourceUrl: string; // authoritative https URL (gazette/RBI/official .bank.in)
  sourceLabel: string; // short citation, e.g. 'भारत का राजपत्र — S.O. 1634(E)'
}

export interface MergerRecord {
  oldSlug: string; // unique; may or may not exist in banks.ts
  bankSlugAliases?: string[]; // existing /bank/[slug]/ aliases for this old entity
  oldName: string; // historical English name
  oldNameHindi: string;
  successorSlug: string; // MUST resolve in banks.ts
  events: MergerEvent[]; // chronological, oldest first
  noteHindi: string; // research-backed history note
}

const gazette2025Url = 'https://egazette.gov.in/WriteReadData/2025/262329.pdf';

export const mergers: MergerRecord[] = [
  {
    oldSlug: 'baroda-up-gramin',
    oldName: 'Baroda UP Gramin Bank',
    oldNameHindi: 'बड़ौदा यूपी ग्रामीण बैंक',
    successorSlug: 'up-gramin',
    events: [
      {
        effectiveDate: '2020-04-01',
        resultingName: 'Baroda U.P. Bank',
        resultingNameHindi: 'बरोदा यू.पी. बैंक',
        sourceUrl: 'https://upgb.bank.in/about.php',
        sourceLabel: 'UPGB — भारत सरकार अधिसूचना 3837 (26.11.2019)',
      },
      {
        effectiveDate: '2025-05-01',
        resultingName: 'Uttar Pradesh Gramin Bank',
        resultingNameHindi: 'उत्तर प्रदेश ग्रामीण बैंक',
        sourceUrl: gazette2025Url,
        sourceLabel: 'भारत का राजपत्र — S.O. 1634(E) (05.04.2025)',
      },
    ],
    noteHindi:
      'बड़ौदा यूपी ग्रामीण बैंक 01.04.2020 को पूर्वांचल बैंक और काशी गोमती संयुत ग्रामीण बैंक के साथ बरोदा यू.पी. बैंक में विलय हुआ, और 01.05.2025 से उत्तर प्रदेश ग्रामीण बैंक (UPGB) का हिस्सा है।',
  },
  {
    oldSlug: 'baroda-rajasthan',
    oldName: 'Baroda Rajasthan Kshetriya Gramin Bank',
    oldNameHindi: 'बड़ौदा राजस्थान क्षेत्रीय ग्रामीण बैंक',
    successorSlug: 'rajasthan-gramin',
    events: [
      {
        effectiveDate: '2025-05-01',
        resultingName: 'Rajasthan Gramin Bank',
        resultingNameHindi: 'राजस्थान ग्रामीण बैंक',
        sourceUrl: gazette2025Url,
        sourceLabel: 'भारत का राजपत्र — S.O. 1633(E) (05.04.2025)',
      },
    ],
    noteHindi:
      'बड़ौदा राजस्थान क्षेत्रीय ग्रामीण बैंक (BRKGB) 01.05.2025 को राजस्थान मारुधरा ग्रामीण बैंक के साथ विलय होकर राजस्थान ग्रामीण बैंक (RGB), जयपुर बना — SBI प्रायोजित।',
  },
  {
    oldSlug: 'narmada-jhabua',
    oldName: 'Narmada Jhabua Gramin Bank',
    oldNameHindi: 'नर्मदा झाबुआ ग्रामीण बैंक',
    successorSlug: 'mp-gramin',
    events: [
      {
        effectiveDate: '2019-04-01',
        resultingName: 'Madhya Pradesh Gramin Bank',
        resultingNameHindi: 'मध्य प्रदेश ग्रामीण बैंक',
        sourceUrl: 'https://mpgb.bank.in/inner-pages/NOTIFICATION.pdf',
        sourceLabel: 'भारत का राजपत्र सं. 193 — S.O. 291(E) (14.01.2019)',
      },
    ],
    noteHindi:
      'नर्मदा झाबुआ ग्रामीण बैंक (NJGB) 01.04.2019 को सेंट्रल मध्य प्रदेश ग्रामीण बैंक के साथ विलय होकर मध्य प्रदेश ग्रामीण बैंक (MPGB), इंदौर बना — Bank of India प्रायोजित।',
  },
  {
    oldSlug: 'central-madhya-pradesh',
    oldName: 'Central Madhya Pradesh Gramin Bank',
    oldNameHindi: 'सेंट्रल मध्य प्रदेश ग्रामीण बैंक',
    successorSlug: 'mp-gramin',
    events: [
      {
        effectiveDate: '2019-04-01',
        resultingName: 'Madhya Pradesh Gramin Bank',
        resultingNameHindi: 'मध्य प्रदेश ग्रामीण बैंक',
        sourceUrl: 'https://mpgb.bank.in/inner-pages/NOTIFICATION.pdf',
        sourceLabel: 'भारत का राजपत्र सं. 193 — S.O. 291(E) (14.01.2019)',
      },
    ],
    noteHindi:
      'सेंट्रल मध्य प्रदेश ग्रामीण बैंक (CMPGB) 01.04.2019 को नर्मदा झाबुआ ग्रामीण बैंक के साथ विलय होकर मध्य प्रदेश ग्रामीण बैंक (MPGB), इंदौर बना — Bank of India प्रायोजित।',
  },
  {
    oldSlug: 'madhyanchal',
    oldName: 'Madhyanchal Gramin Bank',
    oldNameHindi: 'मध्यांचल ग्रामीण बैंक',
    successorSlug: 'mp-gramin',
    events: [
      {
        effectiveDate: '2025-05-01',
        resultingName: 'Madhya Pradesh Gramin Bank',
        resultingNameHindi: 'मध्य प्रदेश ग्रामीण बैंक',
        sourceUrl: gazette2025Url,
        sourceLabel: 'भारत का राजपत्र — S.O. 1630(E) (05.04.2025)',
      },
    ],
    noteHindi:
      'मध्यांचल ग्रामीण बैंक 01.05.2025 को मध्य प्रदेश ग्रामीण बैंक (MPGB) में विलय हो गया; DICGC की de-registered banks सूची में इसकी पुष्टि है।',
  },
  {
    oldSlug: 'malwa',
    oldName: 'Malwa Gramin Bank',
    oldNameHindi: 'मालवा ग्रामीण बैंक',
    successorSlug: 'punjab-gramin',
    events: [
      {
        effectiveDate: '2019-01-01',
        resultingName: 'Punjab Gramin Bank',
        resultingNameHindi: 'पंजाब ग्रामीण बैंक',
        sourceUrl: 'https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=11985&fn=2&Mode=0',
        sourceLabel: 'RBI अधिसूचना — S.O. 6255(E) (21.12.2018)',
      },
    ],
    noteHindi:
      'मालवा ग्रामीण बैंक 01.01.2019 को पंजाब ग्रामीण बैंक और सतलुज ग्रामीण बैंक के साथ विलय होकर पंजाब ग्रामीण बैंक, कपूरथला बना।',
  },
  {
    oldSlug: 'sutlej',
    oldName: 'Sutlej Gramin Bank',
    oldNameHindi: 'सतलुज ग्रामीण बैंक',
    successorSlug: 'punjab-gramin',
    events: [
      {
        effectiveDate: '2019-01-01',
        resultingName: 'Punjab Gramin Bank',
        resultingNameHindi: 'पंजाब ग्रामीण बैंक',
        sourceUrl: 'https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=11985&fn=2&Mode=0',
        sourceLabel: 'RBI अधिसूचना — S.O. 6255(E) (21.12.2018)',
      },
    ],
    noteHindi:
      'सतलुज ग्रामीण बैंक 01.01.2019 को पंजाब ग्रामीण बैंक और मालवा ग्रामीण बैंक के साथ विलय होकर पंजाब ग्रामीण बैंक, कपूरथला बना।',
  },
  {
    oldSlug: 'kashi-gomti-samyut',
    oldName: 'Kashi Gomti Samyut Gramin Bank',
    oldNameHindi: 'काशी गोमती संयुत ग्रामीण बैंक',
    successorSlug: 'up-gramin',
    events: [
      {
        effectiveDate: '2020-04-01',
        resultingName: 'Baroda U.P. Bank',
        resultingNameHindi: 'बरोदा यू.पी. बैंक',
        sourceUrl: 'https://upgb.bank.in/about.php',
        sourceLabel: 'UPGB — भारत सरकार अधिसूचना 3837 (26.11.2019)',
      },
      {
        effectiveDate: '2025-05-01',
        resultingName: 'Uttar Pradesh Gramin Bank',
        resultingNameHindi: 'उत्तर प्रदेश ग्रामीण बैंक',
        sourceUrl: gazette2025Url,
        sourceLabel: 'भारत का राजपत्र — S.O. 1634(E) (05.04.2025)',
      },
    ],
    noteHindi:
      'काशी गोमती संयुत ग्रामीण बैंक 01.04.2020 को बड़ौदा यूपी ग्रामीण बैंक और पूर्वांचल बैंक के साथ बरोदा यू.पी. बैंक में विलय हुआ, और 01.05.2025 से उत्तर प्रदेश ग्रामीण बैंक (UPGB) का हिस्सा है।',
  },
  {
    oldSlug: 'purvanchal',
    oldName: 'Purvanchal Gramin Bank',
    oldNameHindi: 'पूर्वांचल ग्रामीण बैंक',
    successorSlug: 'up-gramin',
    events: [
      {
        effectiveDate: '2020-04-01',
        resultingName: 'Baroda U.P. Bank',
        resultingNameHindi: 'बरोदा यू.पी. बैंक',
        sourceUrl: 'https://upgb.bank.in/about.php',
        sourceLabel: 'UPGB — भारत सरकार अधिसूचना 3837 (26.11.2019)',
      },
      {
        effectiveDate: '2025-05-01',
        resultingName: 'Uttar Pradesh Gramin Bank',
        resultingNameHindi: 'उत्तर प्रदेश ग्रामीण बैंक',
        sourceUrl: gazette2025Url,
        sourceLabel: 'भारत का राजपत्र — S.O. 1634(E) (05.04.2025)',
      },
    ],
    noteHindi:
      'पूर्वांचल बैंक 01.04.2020 को बड़ौदा यूपी ग्रामीण बैंक और काशी गोमती संयुत ग्रामीण बैंक के साथ बरोदा यू.पी. बैंक में विलय हुआ, और 01.05.2025 से उत्तर प्रदेश ग्रामीण बैंक (UPGB) का हिस्सा है।',
  },
  {
    oldSlug: 'karnataka-vikas',
    bankSlugAliases: ['kvgb'],
    oldName: 'Karnataka Vikas Grameena Bank',
    oldNameHindi: 'कर्नाटक विकास ग्रामीण बैंक',
    successorSlug: 'karnataka-grameena',
    events: [
      {
        effectiveDate: '2025-05-01',
        resultingName: 'Karnataka Grameena Bank',
        resultingNameHindi: 'कर्नाटक ग्रामीण बैंक',
        sourceUrl: gazette2025Url,
        sourceLabel: 'भारत का राजपत्र — S.O. 1629(E) (05.04.2025)',
      },
    ],
    noteHindi:
      'कर्नाटक विकास ग्रामीण बैंक (KVGB) 01.05.2025 को कर्नाटक ग्रामीण बैंक के साथ विलय होकर कर्नाटक ग्रामीण बैंक, बल्लारी बना — Canara Bank प्रायोजित।',
  },
  {
    oldSlug: 'allahabad-up-gramin',
    oldName: 'Allahabad UP Gramin Bank',
    oldNameHindi: 'इलाहाबाद उत्तर प्रदेश ग्रामीण बैंक',
    successorSlug: 'up-gramin',
    events: [
      {
        effectiveDate: '2019-04-01',
        resultingName: 'Aryavart Bank',
        resultingNameHindi: 'आर्यावर्त बैंक',
        sourceUrl: 'https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=11985&fn=2&Mode=0',
        sourceLabel: 'RBI/2020-21/57 Second Schedule update — Aryavart Bank / AUPGB',
      },
      {
        effectiveDate: '2025-05-01',
        resultingName: 'Uttar Pradesh Gramin Bank',
        resultingNameHindi: 'उत्तर प्रदेश ग्रामीण बैंक',
        sourceUrl: gazette2025Url,
        sourceLabel: 'भारत का राजपत्र — S.O. 1634(E) (05.04.2025)',
      },
    ],
    noteHindi:
      'इलाहाबाद उत्तर प्रदेश ग्रामीण बैंक 01.04.2019 को ग्रामीण बैंक ऑफ आर्यावर्त के साथ विलय होकर आर्यावर्त बैंक बना (S.O. 449(E)), और 01.05.2025 से उत्तर प्रदेश ग्रामीण बैंक (UPGB) का हिस्सा है।',
  },
];

export function getMerger(oldSlug: string): MergerRecord | undefined {
  return mergers.find((m) => m.oldSlug === oldSlug || m.bankSlugAliases?.includes(oldSlug));
}

export function getPredecessors(successorSlug: string): MergerRecord[] {
  return mergers.filter((m) => m.successorSlug === successorSlug);
}
