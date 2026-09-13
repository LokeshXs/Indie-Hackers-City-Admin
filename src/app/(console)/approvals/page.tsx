import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EvidencePanel } from "@/components/console/EvidencePanel";
import { ReviewActions } from "@/components/console/ReviewActions";
import { approveAchievement, rejectAchievement, revokeAchievement } from "@/lib/console/actions";
import { formatDate } from "@/lib/console/format";
import { listPendingAchievements } from "@/lib/console/approvals";

export default async function ApprovalsPage() {
  const queue = await listPendingAchievements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground text-sm">
          Claims waiting on a decision, oldest first. Approving one writes the XP ledger event, grants
          every unapproved rung beneath it, and can move the founder&rsquo;s building up a level.
        </p>
      </div>

      {queue.length === 0 ? (
        <Alert>
          <AlertTitle>Queue empty</AlertTitle>
          <AlertDescription>
            Nothing is awaiting review. Every milestone a founder logs in the city lands here first,
            so this filling up is the normal state of things.
          </AlertDescription>
        </Alert>
      ) : (
        // A list of cards rather than a table: the evidence is the point of this page, and a
        // screenshot does not fit in a table cell.
        <ul className="space-y-4">
          {queue.map((row) => (
            <li key={row.id}>
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{row.label}</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {row.achievementType}
                        </Badge>
                        {row.scope === "founder" ? (
                          <Badge variant="outline">Whole portfolio</Badge>
                        ) : row.projectName ? (
                          <Badge variant="outline">{row.projectName}</Badge>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        <Link href={`/users/${row.ownerId}`} className="underline underline-offset-4">
                          {row.ownerName || row.ownerEmail || row.ownerId}
                        </Link>
                        {" · "}Level {row.ownerBuildingLevel ?? "—"}
                        {" · "}{(row.ownerXpTotal ?? 0).toLocaleString("en-GB")} XP
                        {" · "}filed {formatDate(row.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums">+{row.xpAwarded}</p>
                      <p className="text-muted-foreground text-xs">XP at stake</p>
                    </div>
                  </div>

                  <Separator />

                  <EvidencePanel evidence={row.evidence} />

                  <ReviewActions
                    achievementId={row.id}
                    available={["approve", "reject"]}
                    actions={{
                      approve: approveAchievement,
                      reject: rejectAchievement,
                      revoke: revokeAchievement,
                    }}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
