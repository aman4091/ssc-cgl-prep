"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Imported quiz figures render as markdown images. Wrap each in a link to the
// full-size source (opens in a new tab = "zoom"), and lazy-load them so a page
// with many image questions stays fast.
const ImgLink = ({ node, ...props }) => (
  <a href={props.src} target="_blank" rel="noreferrer">
    <img {...props} alt={props.alt || ""} loading="lazy" />
  </a>
);

// A wide table (CA explanations run to 5 columns) must scroll inside its own box,
// otherwise it drags the whole page sideways on a phone.
const TableWrap = ({ node, ...props }) => (
  <div className="md-tablewrap"><table {...props} /></div>
);

const INLINE_COMPONENTS = {
  p: ({ node, ...props }) => <span {...props} />,
  img: ImgLink,
};
const BLOCK_COMPONENTS = { img: ImgLink, table: TableWrap };

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
        components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}
      >
        {children || ""}
      </ReactMarkdown>
    </Wrapper>
  );
}
