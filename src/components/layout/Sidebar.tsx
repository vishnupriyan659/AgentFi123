import { NavLink, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Bot,
  BrainCircuit,
  Wallet,
  PlayCircle,
  Activity,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Compass,
  FileText,
  Sparkles,
  Users,
  Target,
  ArrowRightLeft,
} from "lucide-react";
import { useState } from "react";

import { useAgentStore } from "@/store/useAgentStore";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  getBadge?: (store: ReturnType<typeof useAgentStore.getState>) => string;
}

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Transfer Agent",
    href: "/agents",
    icon: Bot,
    getBadge: (store) => {
      if (store.connectionStatus === "offline" || store.connectionStatus === "error") return undefined;
      return "READY";
    },
  },
  {
    title: "Portfolio",
    href: "/portfolio",
    icon: Wallet,
  },
  {
    title: "Intelligence",
    href: "/intelligence",
    icon: BrainCircuit,
  },
  {
    title: "Strategy Lab",
    href: "/simulation",
    icon: PlayCircle,
  },
  {
    title: "Swap Lab",
    href: "/swap-lab",
    icon: ArrowRightLeft,
  },
  {
    title: "Market Radar",
    href: "/market-radar",
    icon: Activity,
  },
];

const executiveNavItems: NavItem[] = [
  {
    title: "Executive Insights",
    href: "/executive-insights",
    icon: Compass,
  },
  {
    title: "Enterprise Reports",
    href: "/enterprise-reports",
    icon: FileText,
  },
  {
    title: "AI Copilot",
    href: "/ai-copilot",
    icon: Sparkles,
  },
  {
    title: "Agent Debate",
    href: "/agent-debate",
    icon: Users,
  },
  {
    title: "Recommendation Center",
    href: "/recommendations",
    icon: Target,
  },
];

const secondaryNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Support",
    href: "/support",
    icon: HelpCircle,
  },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const store = useAgentStore();

  const isConnected = store.connectionStatus === "connected";
  const isDemo = store.connectionStatus === "demo";

  return (
    <div
      className={cn(
        "relative flex flex-col border-r border-border/40 bg-background/80 backdrop-blur-2xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-72"
      )}
    >
      {/* Logo Section */}
      <Link to="/" className="flex h-20 items-center gap-4 px-6 hover:opacity-90 transition-opacity">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary glow-primary shadow-lg shadow-primary/20">
          <Hexagon className="h-6 w-6 text-primary-foreground absolute" strokeWidth={2.5} />
          <div className="h-2 w-2 bg-primary-foreground rounded-full animate-pulse" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight animate-fade-in">
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Agent<span className="gradient-text">Fi</span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              Operating System
            </span>
          </div>
        )}
      </Link>

      <Separator className="mx-6 w-auto opacity-50" />

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="flex flex-col gap-1.5">
          {!collapsed && (
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Intelligence Core
            </div>
          )}
          {mainNavItems.map((item) => (
            <NavLink key={item.href} to={item.href}>
              {({ isActive }) => {
                const badgeText = item.getBadge ? item.getBadge(store) : undefined;
                return (
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-11 smooth-transition rounded-xl",
                      isActive 
                        ? "bg-primary/15 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm shadow-primary/5" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.title}</span>
                        {badgeText && (
                          <Badge variant="outline" className={cn(
                            "h-5 px-2 text-[10px] font-semibold border-primary/30 uppercase tracking-wider",
                            badgeText === "ACTIVE" ? "bg-success/10 text-success border-success/30" : "bg-muted/10 text-muted-foreground border-border/40"
                          )}>
                            {badgeText}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                );
              }}
            </NavLink>
          ))}
        </nav>

        <Separator className="my-6 opacity-50" />

        {/* Executive Navigation */}
        <nav className="flex flex-col gap-1.5">
          {!collapsed && (
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Executive
            </div>
          )}
          {executiveNavItems.map((item) => (
            <NavLink key={item.href} to={item.href}>
              {({ isActive }) => (
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 smooth-transition rounded-xl",
                    isActive 
                      ? "bg-primary/15 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm shadow-primary/5" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "")} />
                  {!collapsed && <span className="flex-1 text-left font-medium">{item.title}</span>}
                </Button>
              )}
            </NavLink>
          ))}
        </nav>

        <Separator className="my-6 opacity-50" />

        {/* System Settings Navigation */}
        <nav className="flex flex-col gap-1.5">
          {!collapsed && (
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              System Settings
            </div>
          )}
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} to={item.href}>
              {({ isActive }) => (
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 smooth-transition rounded-xl",
                    isActive 
                      ? "bg-primary/15 text-primary hover:bg-primary/20 border border-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="font-medium">{item.title}</span>}
                </Button>
              )}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="mx-6 w-auto opacity-50" />

      {/* Collapse Toggle */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl h-10",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Collapse Menu</span>
            </>
          )}
        </Button>
      </div>

      {/* Status Badge */}
      <div className={cn("p-4 pt-0", collapsed && "px-3")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-sm",
            isConnected ? "border-success/20 bg-success/10 text-success" : isDemo ? "border-warning/20 bg-warning/10 text-warning" : "border-destructive/20 bg-destructive/10 text-destructive",
            collapsed && "justify-center px-2"
          )}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {isConnected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />}
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", isConnected ? "bg-success" : isDemo ? "bg-warning" : "bg-destructive")} />
          </span>
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isConnected ? "Backend Connected" : isDemo ? "Demo Mode" : "Backend Offline"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
