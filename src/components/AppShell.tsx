import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  Receipt,
  ListChecks,
  UserCog,
  PackageCheck,
  BookOpen,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  Camera,
  CalendarDays,
  HardDrive,
  Plane,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { InstallAppButton } from "@/components/InstallAppButton";
import { BankBalancesWidget, OwnerSalaryWidget } from "@/components/MoneyWidgets";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/clients", label: "Clients", icon: Users, adminOnly: true },
  { to: "/projects", label: "Projects", icon: FolderKanban, adminOnly: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, adminOnly: false },
  { to: "/daybook", label: "Daily Daybook", icon: BookOpen, adminOnly: true },
  { to: "/payments", label: "Payments", icon: Wallet, adminOnly: true },
  { to: "/expenses", label: "Expenses", icon: Receipt, adminOnly: true },
  { to: "/reimbursables", label: "Reimbursables", icon: Wallet, adminOnly: true },
  { to: "/tasks", label: "Tasks", icon: ListChecks, adminOnly: false },
  { to: "/staff", label: "Staff", icon: UserCog, adminOnly: true },
  { to: "/raw-data", label: "Raw Data", icon: HardDrive, adminOnly: false },
  { to: "/travel", label: "Travel & Bookings", icon: Plane, adminOnly: false },
  { to: "/delivery", label: "Delivery", icon: PackageCheck, adminOnly: false },
  { to: "/fixed-deposits", label: "Fixed Deposits (FD)", icon: Landmark, adminOnly: true },
  { to: "/accounts", label: "Accounts", icon: BookOpen, adminOnly: true },
  { to: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon, adminOnly: false },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((n) => isAdmin || !n.adminOnly).map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
        <Camera className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold text-sidebar-foreground">JOG MEDIA</p>
        <p className="text-[11px] tracking-wide text-sidebar-foreground/60">Kozhikode, Kerala</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <div className="pt-3">
            <BankBalancesWidget compact />
            <OwnerSalaryWidget compact />
          </div>
          <NavList />
        </div>

        <div className="border-t border-sidebar-border p-3">
          <p className="px-3 pb-2 text-xs text-sidebar-foreground/60">
            {user.email} · {role ?? "no role"}
          </p>
          <InstallAppButton className="mb-2 w-full justify-start bg-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          <Button
            variant="ghost"
            className="h-11 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-2 backdrop-blur lg:hidden no-print">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Brand />
            <div className="pt-3" onClick={() => setOpen(false)}>
              <BankBalancesWidget compact />
              <OwnerSalaryWidget compact />
            </div>
            <NavList onNavigate={() => setOpen(false)} />

            <div className="border-t border-sidebar-border p-3">
              <Button
                variant="ghost"
                className="h-11 w-full justify-start text-sidebar-foreground/80"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <span className="min-w-0 flex-1 truncate font-display text-lg font-semibold">JOG MEDIA</span>
        <InstallAppButton className="shrink-0" />
      </header>


      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
