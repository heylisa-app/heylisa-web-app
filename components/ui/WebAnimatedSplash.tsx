"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./WebAnimatedSplash.module.css";

type WebAnimatedSplashProps = {
  onAnimationComplete: () => void;
};

export default function WebAnimatedSplash({
  onAnimationComplete,
}: WebAnimatedSplashProps) {
  const [isExiting, setIsExiting] = useState(false);

  const letters = useMemo(() => ["L", "i", "s", "a"], []);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 2350);

    const doneTimer = window.setTimeout(() => {
      onAnimationComplete();
    }, 2850);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onAnimationComplete]);

  return (
    <div
      className={`${styles.overlay} ${isExiting ? styles.overlayExit : ""}`}
      aria-hidden="true"
    >
      <div className={`${styles.wordmark} ${isExiting ? styles.wordmarkExit : ""}`}>
        <span className={styles.textStatic}>Hey</span>

        {letters.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={styles.letter}
            style={
              {
                ["--delay" as string]: `${800 + index * 180}ms`,
              } as React.CSSProperties
            }
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}