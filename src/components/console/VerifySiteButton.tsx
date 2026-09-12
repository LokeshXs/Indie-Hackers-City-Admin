"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReviewResult } from "@/lib/console/actions";

/** Runs the ownership check against a project's site and reports what came back.
 *
 * The result is a signal for the reviewer, not a decision: finding the tag proves the founder
 * controls the domain, which is one of several things worth knowing before approving a launch. */
export function VerifySiteButton({
  projectId,
  verified,
  verify,
}: {
  projectId: string;
  verified: boolean;
  verify: (projectId: string) => Promise<ReviewResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 text-xs ${
        verified ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
      }`}>
        {verified
          ? <><ShieldCheck className="size-4" /> Site ownership verified</>
          : <><ShieldAlert className="size-4" /> Site ownership not verified</>}
      </span>
      <Button
        size="xs"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(async () => {
          const result = await verify(projectId);
          // Not finding the tag is a real answer, not a failure, so it shows as a warning rather
          // than an error a reviewer might read as "the check broke".
          if (result.ok) toast.success(result.message);
          else toast.warning(result.message);
          router.refresh();
        })}
      >
        {isPending ? "Checking…" : verified ? "Re-check" : "Check site"}
      </Button>
    </span>
  );
}
