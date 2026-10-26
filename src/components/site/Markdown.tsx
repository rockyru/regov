import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { previewHref } from "@/lib/jobs";

export function Markdown({ text, jobId, origin, className = "" }: { text: string; jobId: string; origin: string; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className={`prose-gov ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ href, children }) => <a href={previewHref(jobId, origin, href ?? "")}>{children}</a> }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
