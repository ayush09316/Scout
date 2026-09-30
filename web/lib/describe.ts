export type PreparedDescription = { meta: string[]; body: string };

const looksHN = (first: string) => (first.match(/\s\|\s/g)?.length ?? 0) >= 2;

export function prepareDescription(md: string, source?: string | null): PreparedDescription {
  const text = md.replace(/\r\n?/g, "\n").trim();
  const nl = text.indexOf("\n");
  const first = nl < 0 ? text : text.slice(0, nl);
  const hn = source === "hn" || looksHN(first);
  if (!hn) return { meta: [], body: text };
  const meta = looksHN(first) ? first.split(/\s\|\s/).map((s) => s.trim()).filter(Boolean) : [];
  let body = meta.length ? text.slice(first.length).trim() : text;
  body = body.replace(/^[ \t]*(?:[•·▪◦‣]|\\\*)[ \t]*/gm, "- ").replace(/(\s)-<(https?:)/g, "$1<$2");
  body = body
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*([-*+]|\d+\.)\s/.test(l))) return lines.join("\n");
      return lines.map((l, i) => (i < lines.length - 1 && !/^\s*([-*+]|\d+\.)\s/.test(lines[i + 1]) ? `${l.trimEnd()}  ` : l)).join("\n");
    })
    .join("\n\n");
  return { meta, body };
}

export function prettyUrl(href: string) {
  try {
    const u = new URL(href);
    const path = u.pathname.replace(/\/$/, "");
    const s = u.hostname.replace(/^www\./, "") + (path.length > 28 ? `${path.slice(0, 26)}…` : path);
    return s;
  } catch {
    return href;
  }
}
