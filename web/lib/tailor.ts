import "server-only";
import { GEMINI_MODEL, geminiText } from "./llm";
import { coverage, inventedKeywords, jobKeywords, stripFences, tailorDeterministic, tailorPrompt } from "./tailor-core";

export type TailorResult = { bodyMd: string; before: number; after: number; keywords: string[]; added: string[]; invented: string[]; missing: string[]; model: string };

export async function tailorResume(resumeMd: string, job: { title: string; companyName: string; descriptionMd: string }): Promise<TailorResult> {
  const keywords = jobKeywords(job.descriptionMd, job.title);
  let bodyMd: string | null = null;
  let model = "deterministic";
  const out = await geminiText(tailorPrompt(resumeMd, job, keywords), { temperature: 0.2, maxTokens: 6000 });
  if (out && out.length > resumeMd.length * 0.4) {
    bodyMd = stripFences(out);
    model = GEMINI_MODEL;
  }
  if (!bodyMd) bodyMd = tailorDeterministic(resumeMd, keywords);
  const b = coverage(resumeMd, keywords);
  const a = coverage(bodyMd, keywords);
  return {
    bodyMd,
    before: b.score,
    after: a.score,
    keywords,
    added: a.hit.filter((k) => !b.hit.includes(k)),
    invented: inventedKeywords(resumeMd, bodyMd),
    missing: keywords.filter((k) => !b.evidenced.includes(k)),
    model,
  };
}
