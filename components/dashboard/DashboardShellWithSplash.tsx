"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import WebAnimatedSplash from "@/components/ui/WebAnimatedSplash";

type DashboardShellWithSplashProps = {
  userDisplayName: string;
  userInitials: string;
  cabinetName: string;
  publicUserId: string;
  initialBillingStatus: string | null;
  initialStripeUrl: string | null;
  children: React.ReactNode;
};

const SPLASH_STORAGE_KEY = "heylisa_webapp_last_splash_at";
const SPLASH_COOLDOWN_MS = 1000 * 60 * 20; // 20 min

export default function DashboardShellWithSplash(
  props: DashboardShellWithSplashProps
) {
  const [showSplash, setShowSplash] = useState(false);
  const [hasDecided, setHasDecided] = useState(false);

  const now = useMemo(() => Date.now(), []);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SPLASH_STORAGE_KEY);
      const lastShownAt = raw ? Number(raw) : null;

      const shouldShow =
        !lastShownAt ||
        Number.isNaN(lastShownAt) ||
        now - lastShownAt > SPLASH_COOLDOWN_MS;

      if (shouldShow) {
        setShowSplash(true);
        window.sessionStorage.setItem(SPLASH_STORAGE_KEY, String(now));
      }
    } catch (error) {
      console.error("[HL Splash] storage read error:", error);
      setShowSplash(true);
    } finally {
      setHasDecided(true);
    }
  }, [now]);

  if (!hasDecided) {
    return null;
  }

  return (
    <>
      <DashboardShell {...props} />

      {showSplash && (
        <WebAnimatedSplash
          onAnimationComplete={() => {
            setShowSplash(false);
          }}
        />
      )}
    </>
  );
}