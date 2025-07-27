"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse";
import {
  LayoutDashboard,
  Users,
  Presentation,
  Plus,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
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
  const { isCollapsed, toggleCollapsed } = useSidebarCollapse();

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
    <div className={cn(
      "flex h-full flex-col border-r bg-background transition-all duration-200 ease-in-out relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex-1 space-y-4 py-4">
        <div className={cn("py-2", isCollapsed ? "px-2" : "px-3")}>
          <div className="mb-4">
            <Button asChild className={cn(
              "w-full",
              isCollapsed ? "justify-center px-0" : "justify-start"
            )}>
              <Link href="/boards/new" title={isCollapsed ? "New Board" : undefined}>
                <Plus className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "New Board"}
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
                    "w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start",
                    isActive && "bg-muted"
                  )}
                  asChild
                >
                <Link href={item.href} title={isCollapsed ? item.title : undefined}>
                  <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && item.title}
                </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Floating circular toggle button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleCollapsed}
        className="absolute top-1/2 -translate-y-1/2 -right-4 h-8 w-8 rounded-full bg-background shadow-md border hover:shadow-lg transition-shadow z-10"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}