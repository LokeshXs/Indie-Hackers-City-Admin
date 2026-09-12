import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewActions } from "@/components/console/ReviewActions";
import { approveAchievement, rejectAchievement, revokeAchievement } from "@/lib/console/actions";
import { formatDate, formatRelative, formatXp } from "@/lib/console/format";
import { getConsoleUser } from "@/lib/console/users";
import type { LevelProgress } from "@/lib/console/types";

function statusVariant(status: string) {
  return status === "approved" ? "secondary" : status === "rejected" ? "destructive" : "default";
}

function LevelBar({ progress }: { progress: LevelProgress }) {
  // xpForLevel is null at the top of the ladder, which is the one case that should read as full.
  const percent = progress.xpForLevel === null
    ? 100
    : Math.min(100, Math.round((progress.xpIntoLevel / progress.xpForLevel) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Level {progress.level}</span>
        <span className="text-muted-foreground tabular-nums">
          {progress.nextLevelXp === null
            ? `${progress.xpTotal.toLocaleString("en-GB")} XP — top level`
            : `${progress.xpTotal.toLocaleString("en-GB")} / ${progress.nextLevelXp.toLocaleString("en-GB")} XP`}
        </span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
      {progress.nextLevelXp !== null ? (
        <p className="text-muted-foreground text-xs">
          {(progress.nextLevelXp - progress.xpTotal).toLocaleString("en-GB")} XP to level {progress.level + 1}
        </p>
      ) : null}
    </div>
  );
}

export default async function UserDetailPage({ params }: PageProps<"/users/[userId]">) {
  // Next 16: route params arrive as a promise.
  const { userId } = await params;
  const user = await getConsoleUser(userId);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <Link href="/users" className="text-muted-foreground text-sm underline underline-offset-4">
        ← All users
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-14">
          <AvatarImage src={user.profile?.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-lg">
            {(user.profile?.fullName || user.email || "?").trim()[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{user.profile?.fullName || "Unnamed founder"}</h1>
          <p className="text-muted-foreground truncate text-sm">
            {user.email ?? "no email on file"}
            {user.profile?.xHandle ? ` · @${user.profile.xHandle}` : ""}
          </p>
        </div>
        {user.plot ? <Badge variant="secondary">Level {user.plot.buildingLevel}</Badge> : <Badge variant="outline">No plot</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
            <CardDescription>
              XP belongs to the plot claim, not to any one project, so switching projects keeps it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.progress
              ? <LevelBar progress={user.progress} />
              : <p className="text-muted-foreground text-sm">This account has not claimed a plot.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Signed up</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Last seen</span>
              <span>{formatRelative(user.lastSignInAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Provider</span>
              <span>{user.provider ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Plot</span>
              <span className="font-mono text-xs">{user.plot?.plotId ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Building</span>
              <span className="font-mono text-xs">{user.plot?.buildingAssetId ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Claimed</span>
              <span>{formatDate(user.plot?.claimedAt)}</span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs break-all">{user.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="achievements">
        <TabsList>
          <TabsTrigger value="achievements">Claims ({user.achievements.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({user.projects.length})</TabsTrigger>
          <TabsTrigger value="ledger">XP ledger ({user.xpEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Achievement</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">Claimed</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.achievements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    Nothing claimed yet.
                  </TableCell></TableRow>
                ) : user.achievements.map((achievement) => (
                  <TableRow key={achievement.id}>
                    <TableCell>
                      <span className="font-medium">{achievement.label}</span>
                      <span className="text-muted-foreground block font-mono text-xs">
                        {achievement.achievementType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {achievement.scope === "founder"
                        ? <span className="text-muted-foreground">Whole portfolio</span>
                        : achievement.projectName ?? "—"}
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(achievement.status)}>{achievement.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{achievement.xpAwarded}</TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      {formatDate(achievement.createdAt)}
                    </TableCell>
                    <TableCell>
                      {/* A rejected row offers nothing: the founder reopens it by filing again. */}
                      {achievement.status === "pending" || achievement.status === "approved" ? (
                        <ReviewActions
                          achievementId={achievement.id}
                          available={achievement.status === "pending"
                            ? ["approve", "reject"]
                            : ["revoke"]}
                          actions={{
                            approve: approveAchievement,
                            reject: rejectAchievement,
                            revoke: revokeAchievement,
                          }}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.projects.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                    No projects.
                  </TableCell></TableRow>
                ) : user.projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                      {project.isShowcased ? <Badge variant="outline" className="ml-2">On billboard</Badge> : null}
                    </TableCell>
                    <TableCell className="text-sm">{project.projectType}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      <a href={project.websiteUrl} target="_blank" rel="noreferrer noopener"
                         className="underline underline-offset-4">
                        {project.websiteUrl}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      {formatDate(project.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.xpEvents.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    No XP events.
                  </TableCell></TableRow>
                ) : user.xpEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <span className="font-medium">{event.eventType}</span>
                      {event.description
                        ? <span className="text-muted-foreground block text-xs">{event.description}</span>
                        : null}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs">{event.eventKey}</TableCell>
                    <TableCell className="max-w-[12rem] truncate font-mono text-xs">{event.awardedBy}</TableCell>
                    <TableCell className={`text-right tabular-nums ${event.xpDelta < 0 ? "text-destructive" : ""}`}>
                      {formatXp(event.xpDelta)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      {formatDate(event.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
