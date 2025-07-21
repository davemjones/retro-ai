"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Presentation,
  Plus,
  History,
  Settings,
} from "lucide-react";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Teams",
    href: "/teams",
    icon: Users,
  },
  {
    title: "Boards",
    href: "/boards",
    icon: Presentation,
  },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Helper function to determine if a navigation item is active
  const isActiveRoute = (href: string) => {
    // Exact match for dashboard and settings
    if (href === "/dashboard" || href === "/settings") {
      return pathname === href;
    }
    
    // For other routes, check if pathname starts with the href
    // This handles sub-routes like /teams/new, /boards/123, etc.
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex-1 space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-4">
            <Button asChild className="w-full justify-start">
              <Link href="/boards/new">
                <Plus className="mr-2 h-4 w-4" />
                New Board
              </Link>
            </Button>
          </div>
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive && "bg-muted"
                  )}
                  asChild
                >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}