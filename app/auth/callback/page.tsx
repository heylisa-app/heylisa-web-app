"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Connexion en cours...");

  useEffect(() => {
    async function bootstrapSession() {
      try {
        const supabase = createClient();
        const params = new URLSearchParams(window.location.search);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          setMessage("Session introuvable. Merci de vous reconnecter.");
          setTimeout(() => {
            window.location.href = "https://heylisa.io/signup";
          }, 1200);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          throw error;
        }

        router.replace("/dashboard");
      } catch (error) {
        console.error("Auth callback error", error);
        setMessage("Impossible d’ouvrir votre session. Merci de réessayer.");
        setTimeout(() => {
          window.location.href = "https://heylisa.io/signup";
        }, 1500);
      }
    }

    bootstrapSession();
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#090909",
        color: "#ffffff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          padding: "24px 28px",
          borderRadius: "16px",
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "16px",
          fontWeight: 500,
        }}
      >
        {message}
      </div>
    </main>
  );
}