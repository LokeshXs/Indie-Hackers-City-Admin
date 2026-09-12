import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberField } from "@/components/console/NumberField";
import { setLevelMilestone } from "@/lib/console/actions";
import { listLevelMilestones } from "@/lib/console/milestones";
import { readConsoleOverview } from "@/lib/console/overview";

export default async function MilestonesPage() {
  const [milestones, overview] = await Promise.all([listLevelMilestones(), readConsoleOverview()]);
  const countByLevel = new Map(overview.foundersByLevel.map((row) => [row.level, row.count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Level milestones</h1>
        <p className="text-muted-foreground text-sm">
          The XP ladder every building climbs.
        </p>
      </div>

      <Alert>
        <AlertTitle>Editing a threshold is retroactive</AlertTitle>
        <AlertDescription>
          A founder&rsquo;s level is derived from this table, so moving a threshold re-levels everyone
          already past it in the same transaction — buildings change height immediately. Thresholds
          have to keep climbing, and level 1 stays at 0.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Required XP</TableHead>
                <TableHead>Step from previous</TableHead>
                <TableHead className="text-right">Founders here</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((milestone, index) => {
                const previous = index > 0 ? milestones[index - 1].requiredXp : null;
                return (
                  <TableRow key={milestone.level}>
                    <TableCell><Badge variant="secondary">Level {milestone.level}</Badge></TableCell>
                    <TableCell>
                      {/* Level 1 is the floor every founder starts on, so it is not editable. */}
                      {milestone.level === 1 ? (
                        <span className="text-muted-foreground tabular-nums">0</span>
                      ) : (
                        <NumberField
                          label={`Required XP for level ${milestone.level}`}
                          value={milestone.requiredXp}
                          save={setLevelMilestone.bind(null, milestone.level)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {previous === null ? "—" : `+${(milestone.requiredXp - previous).toLocaleString("en-GB")}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {countByLevel.get(milestone.level) ?? 0}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
