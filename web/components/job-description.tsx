import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prepareDescription, prettyUrl } from "@/lib/describe";
import { cn } from "@/lib/utils";

const URL_RE = /^(https?:\/\/[^\s<>]+)$/;

function MetaPart({ part }: { part: string }) {
  const bare = part.replace(/^<|>$/g, "");
  if (URL_RE.test(bare))
    return (
      <a href={bare} target="_blank" rel="noreferrer" className="text-accent hover:underline">
        {prettyUrl(bare)}
      </a>
    );
  return <span>{part}</span>;
}

export function JobDescription({ md, source, className }: { md: string; source?: string | null; className?: string }) {
  const { meta, body } = prepareDescription(md, source);
  return (
    <article className={cn("prose-job text-sm", className)}>
      {meta.length > 0 && (
        <p data-testid="desc-meta" className="!mt-0 !mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] !leading-6">
          {meta.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-fg-subtle">·</span>}
              <MetaPart part={m} />
            </span>
          ))}
        </p>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const text = typeof children === "string" ? children : Array.isArray(children) && children.length === 1 && typeof children[0] === "string" ? children[0] : null;
            const label = href && text && (text === href || text === href.replace(/^mailto:/, "")) && /^https?:/.test(href) ? prettyUrl(href) : children;
            return (
              <a href={href} target="_blank" rel="noreferrer" title={href}>
                {label}
              </a>
            );
          },
        }}
      >
        {body || "_No description available._"}
      </ReactMarkdown>
    </article>
  );
}
