"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useTabs } from "@/hooks/use-tabs";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { WelcomeSplash } from "@/components/welcome-splash";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { tabs, loading } = useTabs();
  const [authChecked, setAuthChecked] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setAuthChecked(true);
        const splashKey = `splash-${new Date().toDateString()}`;
        if (!sessionStorage.getItem(splashKey)) {
          setShowSplash(true);
          sessionStorage.setItem(splashKey, "1");
        }
      }
    });
  }, [router]);

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold animate-pulse">
          YW
        </div>
      </div>
    );
  }

  return (
    <>
      {showSplash && <WelcomeSplash onDone={handleSplashDone} />}
      <div className="flex min-h-screen">
        <Sidebar tabs={tabs} loading={loading} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </>
  );
}
