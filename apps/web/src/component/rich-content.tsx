import katex from "katex";
import "katex/dist/katex.min.css";

// Shared question/option body renderer — prefers questionHtml, then
// structured contentParts (text/latex/image), falling back to plain text.
// Same priority order and KaTeX handling as the question bank preview, just
// exported for reuse by anything that renders a question (quizzes, practice
// quizzes, reviews) instead of duplicating the parsing per screen.

interface ContentPart {
  type: "text" | "latex" | "image";
  value?: string;
  display?: "block" | "inline";
}

function renderLatexExpr(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr, { displayMode, throwOnError: false });
  } catch {
    return expr;
  }
}

/** Replaces $...$, $$...$$, \(...\), \[...\] with KaTeX; everything else passes through untouched. */
function renderInlineMath(raw: string): string {
  let out = raw
    .replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
      try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
      catch { return match; }
    })
    .replace(/\\\[([\s\S]+?)\\\]/g, (match, expr) => {
      try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
      catch { return match; }
    });
  out = out
    .replace(/\$([^$\n]+?)\$/g, (match, expr) => {
      try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
      catch { return match; }
    })
    .replace(/\\\((.+?)\\\)/g, (match, expr) => {
      try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
      catch { return match; }
    });
  return out;
}

function parseContentParts(raw: unknown): ContentPart[] {
  let parts: unknown = raw;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try { parts = JSON.parse(raw); } catch { parts = raw; }
  }
  if (!Array.isArray(parts)) return [];
  return (parts as Record<string, unknown>[]).map((part) => ({
    type: (part?.type as ContentPart["type"]) ?? "text",
    value: String(part?.value ?? part?.text ?? ""),
    display: part?.display as ContentPart["display"],
  }));
}

export interface RichContentProps {
  text?: string | null;
  html?: string | null;
  contentParts?: unknown;
  className?: string;
}

export function RichContent({ text, html, contentParts, className }: RichContentProps) {
  const parts = parseContentParts(contentParts);

  if (html) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: renderInlineMath(html) }} />;
  }

  if (parts.length > 0) {
    return (
      <div className={className}>
        {parts.map((part, idx) => {
          if (part.type === "latex") {
            const isBlock = part.display === "block";
            return (
              <span
                key={idx}
                className={isBlock ? "my-1 block" : "inline"}
                dangerouslySetInnerHTML={{ __html: renderLatexExpr(part.value ?? "", isBlock) }}
              />
            );
          }
          if (part.type === "image" && part.value) {
            return (
              <img
                key={idx}
                src={part.value}
                alt=""
                loading="lazy"
                className="my-2 max-h-56 w-auto rounded-lg border border-slate-200 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            );
          }
          return <span key={idx}>{part.value ?? ""}</span>;
        })}
      </div>
    );
  }

  if (!text) return null;
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderInlineMath(text) }} />;
}

export default RichContent;
