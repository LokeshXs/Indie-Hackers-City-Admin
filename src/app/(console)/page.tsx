import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readConsoleOverview } from "@/lib/console/overview";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value.toLocaleString("en-GB")}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="text-muted-foreground text-xs">{hint}</CardContent> : null}
    </Card>
  );
}

export default async function OverviewPage() {
  const overview = await readConsoleOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-muted-foreground text-sm">The city at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Accounts" value={overview.accountCount} hint="Everyone who has signed in" />
        <Stat label="Founders" value={overview.founderCount} hint="Accounts holding a city plot" />
        <Stat label="Projects" value={overview.projectCount} />
        <Stat label="XP in circulation" value={overview.xpAwarded} hint="Sum of every founder's total" />
        <Stat label="Approved claims" value={overview.approvedCount} />
        <Card className={overview.pendingCount > 0 ? "border-amber-500/60" : undefined}>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting review</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{overview.pendingCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <Link className="underline underline-offset-4" href="/approvals">
              Open the review queue
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Founders by building level</CardTitle>
          <CardDescription>
            Levels come from the milestone ladder, so editing a threshold moves buildings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Required XP</TableHead>
                <TableHead className="text-right">Founders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.foundersByLevel.map((row) => (
                <TableRow key={row.level}>
                  <TableCell><Badge variant="secondary">Level {row.level}</Badge></TableCell>
                  <TableCell className="tabular-nums">{row.requiredXp.toLocaleString("en-GB")}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
