"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReviewResult } from "@/lib/console/actions";

/** An inline number with a Save that only appears once it differs from what is stored.
 *
 * Deliberately not a form that saves on blur: both numbers behind this control move real things --
 * one re-levels every founder in the city -- so committing has to be something the admin does on
 * purpose rather than something that happens when they click away. */
export function NumberField({
  label,
  value,
  min = 0,
  max = 100000,
  save,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  save: (next: number) => Promise<ReviewResult>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(String(value));
  const [isPending, startTransition] = useTransition();

  const parsed = Number.parseInt(draft, 10);
  const isValid = Number.isFinite(parsed) && parsed >= min && parsed <= max;
  const isDirty = isValid && parsed !== value;

  return (
    <span className="inline-flex items-center gap-2">
      <Input
        aria-label={label}
        className="h-8 w-28 text-right tabular-nums"
        inputMode="numeric"
        value={draft}
        disabled={isPending}
        onChange={(event) => setDraft(event.target.value)}
      />
      {isDirty ? (
        <Button
          size="xs"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            const result = await save(parsed);
            if (result.ok) {
              toast.success(result.message);
              router.refresh();
            } else {
              toast.error(result.message);
              // Put the stored value back, so the field never sits showing a number the database
              // refused as though it had been saved.
              setDraft(String(value));
            }
          })}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      ) : null}
    </span>
  );
}
