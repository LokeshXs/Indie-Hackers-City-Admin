import { ExternalLink, ImageOff } from "lucide-react";
import type { ClaimEvidence } from "@/lib/console/evidence";

/** What the founder attached, laid out so a reviewer can judge it without leaving the row.
 *
 * The screenshot is deliberately not lazy-loaded: the whole purpose of the queue is looking at
 * these, and a reviewer should never be waiting on one to appear as they scroll. */
export function EvidencePanel({ evidence }: { evidence: ClaimEvidence | undefined }) {
  if (!evidence) {
    return <p className="text-muted-foreground text-xs">No evidence on file.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {evidence.link ? (
        <a
          href={evidence.link}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="truncate">{evidence.link}</span>
        </a>
      ) : null}

      {evidence.imageUrl ? (
        <a href={evidence.imageUrl} target="_blank" rel="noreferrer noopener" className="block">
          {/* Plain img, not next/image: the URL is signed and expires, so there is nothing for the
              optimiser to cache and a stale cache entry would render a dead link. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={evidence.imageUrl}
            alt="Screenshot attached to this claim"
            className="max-h-56 w-auto rounded-md border object-contain"
          />
        </a>
      ) : null}

      {!evidence.link && !evidence.imageUrl ? (
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <ImageOff className="size-3.5" /> The attached file is missing from storage.
        </p>
      ) : null}

      {evidence.note ? (
        <p className="text-muted-foreground max-w-prose text-xs italic">“{evidence.note}”</p>
      ) : null}
    </div>
  );
}
