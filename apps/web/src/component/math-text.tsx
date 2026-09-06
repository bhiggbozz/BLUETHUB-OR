import katex from "katex";
import "katex/dist/katex.min.css";

// Renders $...$, $$...$$, \(...\), and \[...\] as KaTeX, leaving everything
// else untouched — plain text with no math notation passes through as-is.
function renderMathHtml(raw: string): string {
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

export interface MathTextProps {
  text: string | null | undefined;
  className?: string;
}

const MathText = ({ text, className }: MathTextProps) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: renderMathHtml(text ?? "") }} />
);

export default MathText;
