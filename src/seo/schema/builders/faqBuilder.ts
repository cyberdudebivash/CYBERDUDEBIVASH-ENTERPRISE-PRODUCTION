import { buildId } from "../normalizers";
import type { FAQPageSchemaNode } from "../types/nodes";
import type { QuestionNode } from "../types/common";

export interface FAQEntry {
  question: string;
  answer: string;
}

// FAQBuilder — a pure, composable builder for FAQPage schema. Not
// wired to any registry producer today: FAQPage schema is genuinely
// live on 5 real pages (compliance.html and others, per the Phase 0
// audit's migration mapping), but no FAQ config data exists anywhere
// in src/seo/config/ to generate it from. Ready for the moment FAQ
// content is modeled in config — takes entries directly so it isn't
// blocked on that happening first. See documentation/SCHEMA_ENGINE.md's
// Known Risks.

function toQuestion(entry: FAQEntry): QuestionNode {
  return { "@type": "Question", name: entry.question, acceptedAnswer: { "@type": "Answer", text: entry.answer } };
}

export function buildFAQPage(pageUrl: string, entries: readonly FAQEntry[]): FAQPageSchemaNode {
  return { "@type": "FAQPage", "@id": buildId(pageUrl, "faq"), mainEntity: entries.map(toQuestion) };
}
