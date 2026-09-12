import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { SignOutButton } from "@/components/console/SignOutButton";
import { readAdminGate } from "@/lib/auth/admin";
import { countPendingAchievements } from "@/lib/console/approvals";

/** The console's single gate. Everything under this layout is server-rendered behind it, and every
 * server action calls `requireAdmin()` again -- a layout check alone would not cover an action
 * invoked directly by a crafted request. */
export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  const gate = await readAdminGate();

  if (gate.status === "signed-out") redirect("/login");
  if (gate.status === "denied") redirect("/denied");
  if (gate.status === "unconfigured") {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-6">
        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-semibold">Console not configured</h1>
          <p className="text-muted-foreground text-sm">{gate.detail}</p>
          <p className="text-muted-foreground text-sm">
            Copy <code className="font-mono">.env.local.example</code> to{" "}
            <code className="font-mono">.env.local</code> and fill it in.
          </p>
        </div>
      </main>
    );
  }

  const { identity } = gate;
  const pendingCount = await countPendingAchievements();
  const initials = (identity.user.user_metadata?.full_name as string | undefined)?.trim()?.[0]
    ?? identity.email[0];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-2">
          <span className="truncate text-sm font-semibold">Indie Hackers City</span>
          <span className="text-muted-foreground truncate text-xs">Admin console</span>
        </SidebarHeader>
        <SidebarContent>
          <ConsoleNav pendingCount={pendingCount} />
        </SidebarContent>
        <SidebarFooter className="gap-2">
          <div className="flex items-center gap-2 px-1">
            <Avatar className="size-7">
              <AvatarImage src={identity.user.user_metadata?.avatar_url as string | undefined} alt="" />
              <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground truncate text-xs">{identity.email}</span>
          </div>
          <SignOutButton className="w-full" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <span className="text-sm font-medium">Admin</span>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
