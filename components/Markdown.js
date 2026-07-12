"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const INLINE_COMPONENTS = {
  p: ({ node, ...props }) => <span {...props} />,
};

// KaTeX can't render the rupee sign (₹) in math mode and throws "Unknown symbol",
// which breaks the whole expression. Map it (and \rupee) to text mode where the
// KaTeX fonts DO have it, and never throw on an unknown command — show the source
// in a subtle colour instead of blanking the line.
const KATEX_OPTS = {
  throwOnError: false,
  errorColor: "#fbbf24",
  macros: {
    "₹": "\\text{₹}", // ₹
    "\\rupee": "\\text{₹}",
    "\\Rs": "\\text{Rs.}",
  },
};

export default function Markdown({ children, inline = false }) {
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={inline ? "md md--inline" : "md"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, KATEX_OPTS]]}
        components={inline ? INLINE_COMPONENTS : undefined}
      >
        {children || ""}
      </ReactMarkdown>
    </Wrapper>
  );
}
