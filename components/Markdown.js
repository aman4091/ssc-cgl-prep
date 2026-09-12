"use client";

import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { normalizeMath } from "@/lib/mathdelims";

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
//
// Macro ₹ -> \char"20B9 (₹ ka code), \text{₹} NAHI: us text ke andar phir ₹
// aata aur macro khud ko bulata rehta ("Maximum call stack size exceeded") —
// jis formula mein bhi ₹ hota wo poora kachcha LaTeX ban kar dikhta tha.
const RUPEE = '\\text{\\char"20B9}';
const KATEX_OPTS = {
  throwOnError: false,
  errorColor: "#fbbf24",
  strict: "ignore",
  macros: {
    "₹": RUPEE,
    "\\rupee": RUPEE,
    "\\Rs": "\\text{Rs.}",
  },
};

const REMARK = [remarkGfm, remarkMath];
const REHYPE = [[rehypeKatex, KATEX_OPTS]];

function MarkdownImpl({ children, inline = false }) {
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={inline ? "md md--inline" : "md"}>
      <ReactMarkdown
        remarkPlugins={REMARK}
        rehypePlugins={REHYPE}
        components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}
      >
        {normalizeMath(children || "")}
      </ReactMarkdown>
    </Wrapper>
  );
}

// memo: text wahi ho to dobara parse + KaTeX nahi. Answers page har kuch second
// list taaza karta hai (naya question / DeepSeek answer aane par) — bina iske
// har baar SAARE dikhe hue cards ke saare formule dobara bante the aur page
// neeche scroll karte waqt atak jata tha.
const Markdown = memo(MarkdownImpl);
export default Markdown;

// Sirf tab banao jab screen ke paas aaye. Lambe DeepSeek answer (bahut saare
// formule) 25-25 cards ek saath bante the aur scroll atakta tha; ab jo card
// abhi dikhne wala hai sirf wahi banta hai, aur ek baar bana to bana rehta hai.
export function LazyMarkdown(props) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (show) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShow(true); return undefined; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); }
    }, { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [show]);
  if (show) return <Markdown {...props} />;
  return <div ref={ref} className="md md--lazy" aria-busy="true" />;
}
