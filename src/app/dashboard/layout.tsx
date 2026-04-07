"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useTabs } from "@/hooks/use-tabs";
import { useLineItems } from "@/hooks/use-line-items";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
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
  const { lineItems } = useLineItems();
  const { rates } = useExchangeRates();
  const [authChecked, setAuthChecked] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Listen for auth state changes — handles token refresh automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || (!session && event === "INITIAL_SESSION")) {
          router.replace("/login");
        } else if (session) {
          setAuthChecked(true);
          const splashKey = `splash-${new Date().toDateString()}`;
          if (!sessionStorage.getItem(splashKey)) {
            setShowSplash(true);
            sessionStorage.setItem(splashKey, "1");
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070810]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold animate-pulse">
          YW
        </div>
      </div>
    );
  }

  return (
    <>
      {showSplash && <WelcomeSplash onDone={handleSplashDone} />}
      <div className="flex min-h-screen bg-gradient-radial">
        <Sidebar tabs={tabs} loading={loading} lineItems={lineItems} rates={rates} />
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
