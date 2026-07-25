# ScannableArticleSummary authoring guide

Use this component only in **new, page-local Astro articles**. It is a static presentation component: it has no client-side JavaScript, chart library, autoplay, motion, or automatic Schema JSON-LD.

## Page-local usage

From `src/pages/article/<slug>.astro`:

```astro
---
import ScannableArticleSummary from '../../components/ScannableArticleSummary.astro';

const articleBrief = {
  summary: VERIFIED_ONE_SENTENCE_SUMMARY,
  facts: VERIFIED_FACTS,
  timeline: VERIFIED_TIMELINE,
  action: VERIFIED_ACTION,
  details: VERIFIED_DETAILS,
};
---

<ScannableArticleSummary {...articleBrief} />
```

Replace the uppercase values with page-local constants built from the article's verified sources. Omit optional properties when the article does not have that evidence; do not invent filler content.

## Content constraints

- `summary` is required, one sentence, and **35 words or fewer**. Put the direct answer first.
- Keep `facts` to **3–5** label/value pairs. Use only claims that the article can support.
- Keep `timeline` to **3–5** events. Use it only for factual sequencing, not as decoration or a prediction device. Each event may include an optional ISO 8601 `datetime` for machine-readable markup; keep the display `date` for readers.
- Use `action` only when it has at least one nonempty `steps` entry or a safe official link. Use `action.steps` for a short, ordered checklist. Add `officialUrl` only when it is the current official destination and an absolute `https` URL without username/password credentials; the component opens it in a new tab with `noopener noreferrer`.
- Use `details` for secondary context that readers may progressively disclose. Keep its body factual and concise.
- Charts belong outside this component and only when they show a **source-backed time series**. Do not add a chart for a single number, an unsupported trend, or visual decoration.
- Do not add decorative animation, autoplay media, motion effects, or client-side behavior.
- Verify every number, date, status, and sequence against a named source. Record the source date and distinguish published facts from estimates, demands, expectations, and future dates.
- Rendered content and page-level Schema JSON-LD must agree. Add or update schema explicitly in the page when appropriate; this component must not generate or silently duplicate it.

Keep the component early in the article's logical DOM order, after the heading/intro when used, so mobile readers get the answer, facts, sequence, and next action without scrolling through repeated prose.
