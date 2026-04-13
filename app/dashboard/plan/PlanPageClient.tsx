"use client";

import styles from "./page.module.css";

type BillingStatus =
  | "new_account"
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
  billingCycle: "monthly" | "annual" | null;
  stripePriceId: string | null;
};

const PRICE_LABELS: Record<
  string,
  {
    planName: string;
    invoiceAmount: string;
    cadenceLabel: string;
  }
> = {
  price_1TLmqIGWLgTu5X9jwNF6o3Nr: {
    planName: "Lisa Standard",
    invoiceAmount: "499€",
    cadenceLabel: "Facturé mensuellement",
  },
  price_1TLmraGWLgTu5X9jNc3gjhTi: {
    planName: "Lisa Standard",
    invoiceAmount: "4 788€",
    cadenceLabel: "Facturé annuellement",
  },
  price_1TLmslGWLgTu5X9jGbQ84RCT: {
    planName: "Lisa Premium",
    invoiceAmount: "799€",
    cadenceLabel: "Facturé mensuellement",
  },
  price_1TLmtgGWLgTu5X9jkL3f64nC: {
    planName: "Lisa Premium",
    invoiceAmount: "7 668€",
    cadenceLabel: "Facturé annuellement",
  },
};

function getPlanDisplay(
  stripePriceId: string | null,
  billingCycle: "monthly" | "annual" | null
) {
  if (stripePriceId && PRICE_LABELS[stripePriceId]) {
    return PRICE_LABELS[stripePriceId];
  }

  if (billingCycle === "annual") {
    return {
      planName: "Lisa Standard",
      invoiceAmount: "4 788€",
      cadenceLabel: "Facturé annuellement",
    };
  }

  return {
    planName: "Lisa Standard",
    invoiceAmount: "499€",
    cadenceLabel: "Facturé mensuellement",
  };
}

export default function PlanPageClient({
  billingStatus,
  billingCycle,
  stripePriceId,
}: PlanPageClientProps) {
  const hasBillingAccess = billingStatus !== null && billingStatus !== "new_account";
  const planDisplay = getPlanDisplay(stripePriceId, billingCycle);

  console.log("[HL Plan client]", {
    billingStatus,
    billingCycle,
    stripePriceId,
    hasBillingAccess,
    planDisplay,
  });

  if (!hasBillingAccess) {
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
              Activez votre facturation
            </h1>

            <p className={styles.planTrialSubtitle}>
              Ajoutez un moyen de paiement pour accéder à votre espace de facturation.
            </p>

            <a href="/dashboard/chat" className={styles.planTrialButton}>
              Retour au chat
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
                    <span className={styles.planName}>{planDisplay.planName}</span>
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
                  <span className={styles.invoiceValue}>{planDisplay.invoiceAmount}</span>
                </div>

                <div className={styles.invoiceDivider} />

                <div className={styles.invoiceRow}>
                  <span className={styles.invoiceLabel}>Hors forfait</span>
                  <span className={styles.invoiceValue}>0€</span>
                </div>
              </div>
              <div className={styles.invoiceCadenceLabel}>
                {planDisplay.cadenceLabel}
              </div>
            </section>

            <section className={styles.linkSection}>
              <div className={styles.linkBlock}>
                <div className={styles.linkBlockTitle}>Gérer mon abonnement</div>
                <div className={styles.linkBlockText}>
                  Mettre à jour les moyens de paiement, l’adresse de facturation ou les
                  informations de l’entreprise.
                </div>
                <a href="/api/billing/portal/invoices" className={styles.sideLink}>
                  Gérer mon profil →
                </a>
              </div>

              <div className={styles.linkBlock}>
                <div className={styles.linkBlockTitle}>Factures</div>
                <div className={styles.linkBlockText}>
                  Consulter et télécharger vos factures émises depuis votre espace de
                  facturation.
                </div>
                <a href="/api/billing/portal/invoices" className={styles.sideLink}>
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