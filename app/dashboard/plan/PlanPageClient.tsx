"use client";

import styles from "./page.module.css";

type BillingStatus =
  | "trial_active"
  | "trial_contacted"
  | "trial_expired_waiting_response"
  | "pending_payment"
  | "active_paid"
  | "grace_period"
  | "suspended"
  | "closed"
  | null;

type PlanPageClientProps = {
  billingStatus: BillingStatus;
};

const TRIAL_STATUSES = new Set([
  "trial_active",
  "trial_contacted",
  "trial_expired_waiting_response",
]);

export default function PlanPageClient({ billingStatus }: PlanPageClientProps) {
  const showTrialEmptyView =
    billingStatus !== null && TRIAL_STATUSES.has(billingStatus);

  console.log("[HL Plan client]", {
    billingStatus,
    showTrialEmptyView,
  });

  if (showTrialEmptyView) {
    return (
      <div className={styles.planView}>
        <div className={styles.planShell}>
          <div className={styles.planTrialEmptyState}>
            <img
              src="/imgs/Lisa_Avatar-min.webp"
              alt="Lisa"
              className={styles.planTrialAvatar}
            />

            <h1 className={styles.planTrialTitle}>
              Profitez de ma période d’essai gratuite
            </h1>

            <p className={styles.planTrialSubtitle}>
              Je suis à votre service gratuitement pendant toute cette période pour vous
              soulager sur la gestion du cabinet.
            </p>

            <a href="/dashboard/chat" className={styles.planTrialButton}>
              Discutons ensemble
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.planView}>
      <div className={styles.planShell}>
        <div className={styles.planGrid}>
          <div className={styles.planMainColumn}>
            <section className={styles.planSection}>
              <h1 className={styles.pageTitle}>Facturation</h1>

              <div className={styles.sectionTitle}>Plan actuel</div>
              <div className={styles.mainCard}>
                <div className={styles.mainCardInner}>
                  <div className={styles.planNameRow}>
                    <img
                      src="/imgs/Lisa_Avatar-min.webp"
                      alt="Lisa"
                      className={styles.lisaAvatar}
                    />
                    <span className={styles.planName}>Chef de cabinet - Lisa</span>
                  </div>

                  <ul className={styles.planFeatureList}>
                    <li>Assistant IA médical dédié au cabinet</li>
                    <li>Gestion des mails, rappels et suivi patient</li>
                    <li>Accès à un logiciel médical spécialisé</li>
                    <li>Notes, historique, suggestions et documents analysés</li>
                    <li>Support prioritaire et évolutions produit</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className={styles.planSection}>
              <div className={styles.sectionTitle}>Dépassement</div>
              <div className={styles.mainCard}>
                <div className={styles.usageCardHeader}>
                  <div>
                    <div className={styles.usageTitle}>Hors forfait tokens</div>
                    <div className={styles.usageDescription}>
                      Votre abonnement inclut un volume mensuel de tokens. Au-delà,
                      la consommation additionnelle est facturée automatiquement.
                    </div>
                  </div>

                  <div className={styles.usageAmountPill}>0€</div>
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.planSideColumn}>
            <section className={styles.sideSection}>
              <div className={styles.sideSectionTitle}>Prochaine facture</div>

              <div className={styles.invoiceCard}>
                <div className={styles.invoiceRow}>
                  <span className={styles.invoiceLabel}>Montant de base</span>
                  <span className={styles.invoiceValue}>499€</span>
                </div>

                <div className={styles.invoiceDivider} />

                <div className={styles.invoiceRow}>
                  <span className={styles.invoiceLabel}>Hors forfait</span>
                  <span className={styles.invoiceValue}>0€</span>
                </div>
              </div>
            </section>

            <section className={styles.linkSection}>
              <div className={styles.linkBlock}>
                <div className={styles.linkBlockTitle}>Gérer les infos de facturation</div>
                <div className={styles.linkBlockText}>
                  Mettre à jour les moyens de paiement, l’adresse de facturation ou les
                  informations de l’entreprise.
                </div>
                <a href="#" className={styles.sideLink}>
                  Gérer mon profil →
                </a>
              </div>

              <div className={styles.linkBlock}>
                <div className={styles.linkBlockTitle}>Factures</div>
                <div className={styles.linkBlockText}>
                  Consulter et télécharger vos factures émises depuis votre espace de
                  facturation.
                </div>
                <a href="#" className={styles.sideLink}>
                  Voir les factures →
                </a>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}