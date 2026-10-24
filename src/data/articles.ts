/**
 * Single source of truth for the site's guide articles.
 *
 * Every article's SERP meta (title ≤65 chars, description ≤165 chars — see
 * src/lib/seo.ts) lives here, and every internal link surface (SiteFooter
 * "गाइड" links) renders from this list, so no article can end up orphaned
 * when a new one is added.
 */

export interface ArticleMeta {
  slug: string;
  /** SERP title, budgeted to 65 chars. */
  title: string;
  /** Meta description, budgeted to 165 chars. */
  description: string;
  /** Hindi-first label used on internal link surfaces (footer, related strips). */
  linkLabel: string;
}

export const articles: ArticleMeta[] = [
  {
    slug: 'sbi-data-leak-dark-web-customer-safety-guide',
    title: 'SBI Data Leak: Dark Web Records — क्या करें | BalCheck.in',
    description: 'SBI ने 21 अक्टूबर 2026 को exchanges को सूचित किया: dark web पर 3,897 customer records की PII exposure का शक — safety steps, phishing बचाव और complaint रास्ता।',
    linkLabel: 'SBI Data Leak — Dark Web Records',
  },
  {
    slug: 'coma-patient-bank-account-access-rbi-guidelines',
    title: 'Coma Patient Bank Account: पैसा कैसे निकाले | BalCheck.in',
    description: 'कोमा में मरीज़ के बैंक खाते से पैसा निकालने का एक भी नियम नहीं; इलाहाबाद HC ने Centre-RBI से guidelines मांगे — परिवार के कदम और शिकायत रास्ता।',
    linkLabel: 'कोमा मरीज़ का Bank Account — परिवार के कदम',
  },
  {
    slug: 'rbi-loan-recovery-rules-2027-borrower-rights',
    title: 'RBI Loan Recovery Rules 2027 — Borrower Rights | BalCheck.in',
    description: 'RBI के नए loan recovery rules 1 जनवरी 2027 से लागू — agent call timing, mandatory recording, phone lock limits, ₹250/hr मुआवजा और borrower rights की पूरी जानकारी।',
    linkLabel: 'RBI Loan Recovery Rules 2027',
  },
  {
    slug: 'delhi-hc-flags-credit-card-harassment-directs-rbi-to-strengthen-grievance-system',
    title: 'Credit Card Harassment: RBI शिकायत और CMS प्रक्रिया | BalCheck.in',
    description: 'Credit card harassment या unauthorised transaction पर पहले card-issuer को लिखित शिकायत दें, फिर RBI CMS में escalation करें और threat/fraud में police path अपनाएं।',
    linkLabel: 'Credit Card Harassment — RBI शिकायत प्रक्रिया',
  },
  {
    slug: 'nbfc-loan-apps-harassment-controversy-2026',
    title: 'Loan App Harassment — RBI Rules और Complaint Guide | BalCheck.in',
    description: 'Loan app harassment, unauthorised debit या धमकी की स्थिति में evidence, lender complaint, cybercrime report और RBI CMS escalation के practical steps।',
    linkLabel: 'Loan App Harassment — Complaint Guide',
  },
];

export const articlePath = (slug: string): string => `/article/${slug}/`;

export function getArticle(slug: string): ArticleMeta {
  const article = articles.find(a => a.slug === slug);
  if (!article) throw new Error(`Unknown article slug: ${slug}`);
  return article;
}
