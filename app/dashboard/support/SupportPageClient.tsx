"use client";

import { useEffect, useRef } from "react";
import styles from "./page.module.css";

export default function SupportPageClient() {
  const calendlyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
  
    function initCalendly() {
      if (isCancelled) return;
      if (!calendlyRef.current) return;
      // @ts-ignore
      if (!window.Calendly) return;
  
      calendlyRef.current.innerHTML = "";
  
    // @ts-ignore
    window.Calendly.initInlineWidget({
        url:
          "https://calendly.com/quick-help-lisa/20min" +
          "?hide_gdpr_banner=1",
        parentElement: calendlyRef.current,
        resize: false,
      });
    }
  
    const existingScript = document.querySelector(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]'
    ) as HTMLScriptElement | null;
  
    if (existingScript) {
      // @ts-ignore
      if (window.Calendly) {
        initCalendly();
      } else {
        existingScript.addEventListener("load", initCalendly, { once: true });
      }
    } else {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = initCalendly;
      document.body.appendChild(script);
    }
  
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className={styles.supportView}>
      <div className={styles.supportGrid}>
        
        {/* LEFT */}
        <div className={styles.supportLeft}>
          <img
            src="/imgs/Lisa_Avatar-min.webp"
            alt="Lisa"
            className={styles.supportAvatar}
          />

          <h1 className={styles.supportTitle}>
            Prenons 20 minutes ensemble
          </h1>

          <p className={styles.supportSubtitle}>
            On va regarder ensemble votre situation, identifier les points de friction
            et voir comment Lisa peut vous faire gagner du temps dès cette semaine.
          </p>

          <div className={styles.supportDetails}>
            <div className={styles.supportDetailItem}>
              ⚡ Audit rapide de votre organisation
            </div>
            <div className={styles.supportDetailItem}>
              🧠 Recommandations concrètes et actionnables
            </div>
            <div className={styles.supportDetailItem}>
              🚀 Mise en place guidée si besoin
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className={styles.supportRight}>
          <div className={styles.calendlyWrapper} ref={calendlyRef} />
        </div>

      </div>
    </div>
  );
}