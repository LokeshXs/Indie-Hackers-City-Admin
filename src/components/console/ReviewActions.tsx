"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewResult } from "@/lib/console/actions";

type Decision = {
  key: "approve" | "reject" | "revoke";
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  notePlaceholder: string;
  destructive?: boolean;
  /** A reason is the whole point of a refusal, so these two will not submit without one. */
  noteRequired?: boolean;
};

const DECISIONS: Record<Decision["key"], Decision> = {
  approve: {
    key: "approve",
    label: "Approve",
    title: "Approve this claim?",
    description:
      "This writes the XP ledger and grants every unapproved rung beneath it in the same group. It can be revoked afterwards, but the ledger keeps both entries.",
    confirmLabel: "Approve and award XP",
    notePlaceholder: "What you checked (optional)",
  },
  reject: {
    key: "reject",
    label: "Reject",
    title: "Reject this claim?",
    description:
      "No XP moves. The founder can file the same milestone again once they genuinely reach it, so say why.",
    confirmLabel: "Reject",
    notePlaceholder: "Why this is not approved",
    destructive: true,
    noteRequired: true,
  },
  revoke: {
    key: "revoke",
    label: "Revoke",
    title: "Take this award back?",
    description:
      "Posts a negative correction rather than deleting anything, so the founder's XP drops and their building may fall a level. Only this rung is affected.",
    confirmLabel: "Revoke and remove XP",
    notePlaceholder: "Why this is being taken back",
    destructive: true,
    noteRequired: true,
  },
};

export function ReviewActions({
  achievementId,
  actions,
  available,
}: {
  achievementId: number;
  actions: Record<Decision["key"], (id: number, note?: string) => Promise<ReviewResult>>;
  available: readonly Decision["key"][];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Decision["key"] | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(decision: Decision) {
    startTransition(async () => {
      const result = await actions[decision.key](achievementId, note);
      if (result.ok) {
        toast.success(result.message);
        setOpen(null);
        setNote("");
        // The action revalidated on the server; this pulls the new tree into the open page.
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      {available.map((key) => {
        const decision = DECISIONS[key];
        const blocked = isPending || (decision.noteRequired && note.trim().length === 0);
        return (
          <Dialog
            key={key}
            open={open === key}
            onOpenChange={(next) => {
              if (isPending) return;
              setOpen(next ? key : null);
              setNote("");
            }}
          >
            <DialogTrigger
              render={
                <Button size="sm" variant={decision.destructive ? "destructive" : "default"}>
                  {decision.label}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{decision.title}</DialogTitle>
                <DialogDescription>{decision.description}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor={`note-${achievementId}-${key}`}>
                  Note {decision.noteRequired ? "" : <span className="text-muted-foreground">(optional)</span>}
                </Label>
                <Textarea
                  id={`note-${achievementId}-${key}`}
                  value={note}
                  maxLength={500}
                  placeholder={decision.notePlaceholder}
                  onChange={(event) => setNote(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Kept in the decision log with your name against it.
                </p>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" disabled={isPending}>Cancel</Button>} />
                <Button
                  variant={decision.destructive ? "destructive" : "default"}
                  disabled={blocked}
                  onClick={() => run(decision)}
                >
                  {isPending ? "Working…" : decision.confirmLabel}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
