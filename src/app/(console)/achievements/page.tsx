import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberField } from "@/components/console/NumberField";
import { updateAchievementDefinition } from "@/lib/console/actions";
import { listAchievementDefinitions } from "@/lib/console/catalog";

export default async function AchievementsPage() {
  const definitions = await listAchievementDefinitions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Achievements</h1>
        <p className="text-muted-foreground text-sm">
          The reward catalog. Amounts are read inside the award function and never supplied by a
          client, so this table is the only place XP per milestone is decided.
        </p>
      </div>

      <Alert>
        <AlertTitle>Re-pricing is not retroactive</AlertTitle>
        <AlertDescription>
          The XP ledger is append-only, so past awards keep the amount they were written with. A new
          price applies to claims approved from now on. Claiming a rung also grants every lower rung
          in its group, so the XP a founder receives is the sum of what they did not already hold.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Milestone</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>XP</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.map((definition) => (
                <TableRow key={definition.achievementType}>
                  <TableCell className="max-w-md">
                    <span className="font-medium">{definition.label}</span>
                    <span className="text-muted-foreground block text-xs">{definition.description}</span>
                    {/* What the founder is asked for. Shown here because an admin judging evidence
                        should be able to see the question that produced it. */}
                    <span className="mt-2 block text-xs">
                      <span className="font-medium">{definition.evidencePrompt}</span>
                      <span className="text-muted-foreground block">{definition.evidenceHint}</span>
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="secondary">{definition.groupKey}</Badge>
                    <span className="text-muted-foreground ml-2 text-xs">tier {definition.tier}</span>
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {definition.scope === "founder" ? "Per founder" : "Per project"}
                  </TableCell>
                  <TableCell className="align-top">
                    <NumberField
                      label={`XP for ${definition.label}`}
                      value={definition.xpReward}
                      min={1}
                      save={(next) => updateAchievementDefinition(definition.achievementType, { xpReward: next })}
                    />
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums">{definition.awardedCount}</TableCell>
                  <TableCell className="align-top text-right tabular-nums">{definition.pendingCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
