"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Building2, LayoutDashboard, ListChecks, Users } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/approvals", label: "Approvals", icon: ListChecks },
  { href: "/users", label: "Users", icon: Users },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/milestones", label: "Level milestones", icon: Building2 },
] as const;

export function ConsoleNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Console</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {LINKS.map(({ href, label, icon: Icon }) => {
            // "/" would prefix-match everything, so only it is compared exactly.
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton render={<Link href={href} />} isActive={isActive} tooltip={label}>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
                {href === "/approvals" && pendingCount > 0 ? (
                  <SidebarMenuBadge>{pendingCount}</SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
