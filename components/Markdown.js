"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const INLINE_COMPONENTS = {
  p: ({ node, ...props }) => <span {...props} />,
};

export default function Markdown({ children, inline = false }) {
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={inline ? "md md--inline" : "md"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inline ? INLINE_COMPONENTS : undefined}
      >
        {children || ""}
      </ReactMarkdown>
    </Wrapper>
  );
}
