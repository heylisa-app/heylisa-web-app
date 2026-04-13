//components/dashboard/DashboardShellWithSplash.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import WebAnimatedSplash from "@/components/ui/WebAnimatedSplash";
import { createClient } from "@/lib/supabase/client";

type DashboardShellWithSplashProps = {
  userDisplayName: string;
  userInitials: string;
  cabinetName: string;
  publicUserId: string;
  cabinetAccountId: string;
  cabinetSpecialties: string[];
  initialBillingStatus: string | null;
  initialStripeUrl: string | null;
  children: React.ReactNode;
};

const SPLASH_STORAGE_KEY = "heylisa_webapp_last_splash_at";
const SPLASH_COOLDOWN_MS = 1000 * 60 * 20; // 20 min

export default function DashboardShellWithSplash(
  props: DashboardShellWithSplashProps
) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [showSplash, setShowSplash] = useState(false);
  const [hasDecided, setHasDecided] = useState(false);

  const now = useMemo(() => Date.now(), []);
  const refreshTimeoutRef = useRef<number | null>(null);

  function scheduleRefresh(reason: string) {
    console.log("[HL billing realtime] schedule refresh", { reason });

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      console.log("[HL billing realtime] router.refresh()", { reason });
      router.refresh();
    }, 150);
  }

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

  useEffect(() => {
    if (!props.publicUserId) return;

    const channelName = `billing-status-${props.publicUserId}`;

    console.log("[HL billing realtime] subscribe", {
      channelName,
      publicUserId: props.publicUserId,
      initialBillingStatus: props.initialBillingStatus,
    });

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_billing_status",
          filter: `public_user_id=eq.${props.publicUserId}`,
        },
        (payload) => {
          console.log("[HL billing realtime] postgres change", payload);
          scheduleRefresh("postgres_changes");
        }
      )
      .subscribe((status) => {
        console.log("[HL billing realtime] subscription status", {
          publicUserId: props.publicUserId,
          status,
        });
      });

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      console.log("[HL billing realtime] unsubscribe", {
        channelName,
        publicUserId: props.publicUserId,
      });

      supabase.removeChannel(channel);
    };
  }, [props.publicUserId, props.initialBillingStatus, router, supabase]);

  useEffect(() => {
    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        scheduleRefresh("visibilitychange");
      }
    }

    function handleFocusRefresh() {
      scheduleRefresh("window_focus");
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, []);

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