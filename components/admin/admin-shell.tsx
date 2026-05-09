"use client";

import { Suspense, type ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  Film,
  HelpCircle,
  LayoutDashboard,
  Popcorn,
  Settings,
  Ticket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AdminNotice } from "@/components/admin/admin-notice";
import { ResolvedAvatarImage } from "@/components/shared/avatar-image";
import { getUserInitials } from "@/lib/auth/profile";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Back to website", icon: ArrowLeft },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/theaters", label: "Theaters", icon: Building2 },
  { href: "/admin/movies", label: "Movies", icon: Film },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/admin/events", label: "Events", icon: Ticket },
  { href: "/admin/concessions", label: "Concessions", icon: Popcorn },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  children,
  userAvatarUrl,
  userDisplayName,
  userEmail,
}: {
  children: ReactNode;
  userAvatarUrl?: string | null;
  userDisplayName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const navLinkClasses =
    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors";
  const navLabelClasses =
    "font-sans text-[11px] font-semibold uppercase tracking-[0.22em]";
  const headerIdentity = userDisplayName?.trim() || userEmail || "Admin";
  const headerSubtitle =
    userDisplayName?.trim() && userEmail ? userEmail : "Marquee Admin";
  const initials = getUserInitials(userDisplayName, userEmail);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-72 md:flex-col md:border-r md:border-border/20 md:bg-surface-container-low">
        <div className="px-8 py-8">
          <p className="font-serif text-2xl italic text-primary">Marquee Admin</p>
          <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {APP_NAME}
          </p>
        </div>
        <nav className="flex flex-1 flex-col px-4 pb-6">
          <div className="flex flex-1 flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    navLinkClasses,
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span className={navLabelClasses}>{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 border-t border-border/10 pt-6">
            <button
              type="button"
              className={cn(
                navLinkClasses,
                "w-full text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              )}
            >
              <HelpCircle className="size-4" />
              <span className={navLabelClasses}>Support</span>
            </button>
            <SignOutButton
              variant="ghost"
              size="default"
              label="Log out"
              className={cn(
                navLinkClasses,
                "mt-1 w-full justify-start px-4 py-3 text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              )}
            />
          </div>
        </nav>
      </div>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/10 bg-background/90 backdrop-blur">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 font-sans text-[10px] uppercase tracking-[0.24em] text-muted-foreground md:hidden">
                Admin Navigation Below
              </div>
              <div className="ml-auto flex items-center gap-3">
                <Button variant="outline" size="icon-sm" type="button">
                  <Bell />
                </Button>
                <Link
                  href="/admin/account"
                  className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-surface-container-high"
                >
                  <div className="hidden min-w-0 text-right sm:block">
                    <p className="truncate text-sm font-semibold leading-none text-foreground">
                      {headerIdentity}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {headerSubtitle}
                    </p>
                  </div>
                  <Avatar className="size-10 ring-1 ring-border/30">
                    <ResolvedAvatarImage src={userAvatarUrl} alt={headerIdentity} />
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              {navItems.map(({ href, label }) => {
                const active =
                  href === "/"
                    ? pathname === "/"
                    : href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] whitespace-nowrap",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-container-high text-muted-foreground"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <AdminNotice />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
