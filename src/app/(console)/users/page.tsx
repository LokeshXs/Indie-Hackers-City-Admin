import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelative } from "@/lib/console/format";
import { listConsoleUsers } from "@/lib/console/users";

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const { users, hasMore } = await listConsoleUsers({ page, query });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Every account, whether or not it holds a plot. Open one to see its projects, claims and XP
          ledger.
        </p>
      </div>

      {/* A GET form so the query lives in the URL: an admin can bookmark or share a search. */}
      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={query} placeholder="Name, email, X handle or plot" aria-label="Search users" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Founder</TableHead>
                <TableHead>Plot</TableHead>
                <TableHead className="text-right">Level</TableHead>
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                    {query ? `No account matches “${query}” on this page.` : "No accounts yet."}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link href={`/users/${user.id}`} className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={user.profile?.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback>
                            {(user.profile?.fullName || user.email || "?").trim()[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {user.profile?.fullName || "Unnamed"}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {user.email ?? user.id}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {user.plot ? user.plot.plotId : <span className="text-muted-foreground">No plot</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.plot ? <Badge variant="secondary">{user.plot.buildingLevel}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.plot ? user.plot.xpTotal.toLocaleString("en-GB") : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{user.projectCount}</TableCell>
                    <TableCell className="text-right">
                      {user.pendingAchievements > 0
                        ? <Badge>{user.pendingAchievements}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      {formatRelative(user.lastSignInAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Page {page}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button variant="outline" size="sm"
                    render={<Link href={{ pathname: "/users", query: { q: query, page: page - 1 } }} />}>
              Previous
            </Button>
          ) : <Button variant="outline" size="sm" disabled>Previous</Button>}
          {hasMore ? (
            <Button variant="outline" size="sm"
                    render={<Link href={{ pathname: "/users", query: { q: query, page: page + 1 } }} />}>
              Next
            </Button>
          ) : <Button variant="outline" size="sm" disabled>Next</Button>}
        </div>
      </div>
    </div>
  );
}
