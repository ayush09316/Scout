import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { hybridSearch, type SearchFilters } from "@/lib/search";
import { SearchView } from "./search-view";

export const metadata: Metadata = { title: "Search" };

type SP = Record<string, string | undefined>;

const PAGE_SIZE = 20;

async function facets() {
  const r = await db.execute(sql`
    SELECT
      ARRAY(SELECT DISTINCT seniority FROM jobs WHERE seniority IS NOT NULL AND closed_at IS NULL AND is_canonical ORDER BY 1) AS seniority,
      ARRAY(SELECT DISTINCT source FROM jobs WHERE closed_at IS NULL AND is_canonical ORDER BY 1) AS sources`);
  const x = (r as unknown as { seniority: string[]; sources: string[] }[])[0];
  return { seniority: x?.seniority ?? [], sources: x?.sources ?? [] };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filters: SearchFilters = {
    remote: sp.remote === "remote" || sp.remote === "onsite" ? sp.remote : "any",
    location: sp.location ?? "",
    seniority: sp.seniority ?? "",
    source: sp.source ?? "",
    minScore: Number(sp.fit ?? 0) || 0,
    minSalaryLpa: Number(sp.salary ?? 0) || 0,
    anywhere: sp.anywhere === "1",
  };
  const n = Math.floor(Number(sp.page));
  const page = Number.isFinite(n) && n > 1 ? n : 1;
  const [result, f] = await Promise.all([q ? hybridSearch(q, filters, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }) : Promise.resolve(null), facets()]);
  const params = Object.fromEntries(Object.entries(sp).filter(([k, v]) => k !== "page" && typeof v === "string")) as Record<string, string>;
  return <SearchView q={q} filters={filters} result={result} facets={f} pageSize={PAGE_SIZE} params={params} />;
}
