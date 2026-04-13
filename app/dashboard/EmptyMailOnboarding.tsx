//app/dashboard/EmptyMailOnboarding.tsx

"use client";

import { useRouter } from "next/navigation";
import styles from "./empty.module.css";

export default function EmptyMailOnboarding() {
  const router = useRouter();
  const mailSetupUrl = "https://calendly.com/quick-help-lisa/parametrage-mail-cabinet";

  return (
    <div className={styles.wrapper}>
      <div className={styles.centerBlock}>
        <img
          src="/imgs/Lisa_Avatar-min.webp"
          alt="Lisa"
          className={styles.avatar}
        />

        <h1 className={styles.title}>
          Connectez le mail du cabinet pour démarrer
        </h1>

        <p className={styles.subtitle}>
          Lisa analyse automatiquement vos mails pour organiser votre cabinet,
          détecter les urgences et préparer les réponses.
        </p>

        <button
          type="button"
          className={styles.helpBtn}
          onClick={() => router.push("/dashboard/support")}
        >
          Besoin d’aide ?
        </button>

        <div className={styles.separator} />

        <div className={styles.providers}>
          <button
            type="button"
            className={`${styles.providerCard} ${styles.gmailCard}`}
            onClick={() => window.open(mailSetupUrl, "_blank", "noopener,noreferrer")}
          >
            <div className={styles.providerIconWrap}>
              <img
                src="/imgs/placeholder-gmail.png"
                alt=""
                className={styles.providerIcon}
              />
            </div>

            <div className={styles.providerContent}>
              <div className={styles.providerTitle}>Se connecter avec Gmail</div>
              <div className={styles.providerText}>
                Le mail du cabinet est hébergé chez Google
              </div>
            </div>
          </button>

          <button
            type="button"
            className={`${styles.providerCard} ${styles.outlookCard}`}
            onClick={() => window.open(mailSetupUrl, "_blank", "noopener,noreferrer")}
          >
            <div className={styles.providerIconWrap}>
              <img
                src="/imgs/placeholder-outlook.png"
                alt=""
                className={styles.providerIcon}
              />
            </div>

            <div className={styles.providerContent}>
              <div className={styles.providerTitle}>Se connecter avec Outlook</div>
              <div className={styles.providerText}>
                Le mail du cabinet est hébergé chez Microsoft
              </div>
            </div>
          </button>

          <button
            type="button"
            className={`${styles.providerCard} ${styles.otherCard}`}
            onClick={() => window.open(mailSetupUrl, "_blank", "noopener,noreferrer")}
          >
            <div className={styles.providerIconWrap}>
              <img
                src="/imgs/placeholder-other-mail.png"
                alt=""
                className={styles.providerIcon}
              />
            </div>

            <div className={styles.providerContent}>
              <div className={styles.providerTitle}>Autre fournisseur Mail</div>
              <div className={styles.providerText}>
                Prendre rendez-vous avec le support HeyLisa
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}