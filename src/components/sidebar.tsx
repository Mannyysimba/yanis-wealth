"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import type { Tab } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  tabs: Tab[];
  loading: boolean;
}

const sectionLabels: Record<string, string> = {
  capital: "💰 CAPITAL",
  investissement: "📈 INVESTISSEMENT",
};

export function Sidebar({ tabs, loading }: SidebarProps) {
  const pathname = usePathname();

  const capitalTabs = tabs.filter((t) => t.section === "capital");
  const investTabs = tabs.filter((t) => t.section === "investissement");

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          YW
        </div>
        <span className="text-lg font-semibold tracking-tight">Yanis Wealth</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>

        {loading ? (
          <div className="space-y-2 px-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <>
            {[
              { key: "capital", items: capitalTabs },
              { key: "investissement", items: investTabs },
            ].map(({ key, items }) => (
              <div key={key} className="space-y-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {sectionLabels[key]}
                </p>
                {items.map((tab) => {
                  const hasChildren = tab.children && tab.children.length > 0;
                  if (hasChildren) {
                    return (
                      <div key={tab.id} className="space-y-0.5">
                        <p className="px-3 py-1.5 text-sm font-medium text-foreground/80">
                          {tab.name}
                        </p>
                        {tab.children!.map((child) => (
                          <Link
                            key={child.id}
                            href={`/dashboard/${key}/${child.id}`}
                            className={cn(
                              "flex items-center rounded-lg px-3 py-1.5 pl-7 text-sm transition-colors",
                              pathname === `/dashboard/${key}/${child.id}`
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={tab.id}
                      href={`/dashboard/${key}/${tab.id}`}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-1.5 text-sm transition-colors",
                        pathname === `/dashboard/${key}/${tab.id}`
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {tab.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-border px-3 py-3 flex items-center justify-between">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Réglages
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
