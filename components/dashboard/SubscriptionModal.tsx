"use client";

import styles from "./SubscriptionModal.module.css";

type SubscriptionModalMode = "hard" | "soft" | "reactivation";

type SubscriptionModalProps = {
  isOpen: boolean;
  mode?: SubscriptionModalMode;
  onClose: () => void;
  onSelectAnnual: () => void;
  onSelectMonthly: () => void;
};

export default function SubscriptionModal({
  isOpen,
  mode = "soft",
  onClose,
  onSelectAnnual,
  onSelectMonthly,
}: SubscriptionModalProps) {
  if (!isOpen) return null;

  const isHard = mode === "hard";

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} />

      <div className={styles.modal}>
        {!isHard && (
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Fermer"
            onClick={onClose}
          >
            ×
          </button>
        )}

        <div className={styles.header}>
          <h2 className={styles.title}>Votre secrétaire médicale spécialisée, 24/7</h2>
          <p className={styles.subtitle}>
            Prenez appui sur Lisa pour libérer votre cabinet de l'administratif & mieux accompagner vos patients.
          </p>
        </div>

        <div className={styles.body}>
          <aside className={styles.contextCard}>
            <div className={styles.contextCardInner}>
              <div className={styles.contextTitle}>Configuration actuelle</div>

              <div className={styles.contextField}>
                <div className={styles.contextLabel}>Taille du cabinet</div>
                <div className={styles.contextValue}>1 médecin</div>
              </div>

              <div className={styles.contextField}>
                <div className={styles.contextLabel}>Zone</div>
                <div className={styles.contextValue}>🇪🇺 Europe</div>
              </div>
            </div>
          </aside>

          <section className={styles.pricingSection}>
            <div className={styles.cards}>
              <article className={`${styles.card} ${styles.cardFeatured}`}>
                <div className={styles.badge}>Plus économique</div>

                <div className={styles.planName}>ANNUEL</div>

                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={onSelectAnnual}
                >
                  Continuer avec Lisa
                </button>

                <div className={styles.priceBlock}>
                  <div className={styles.priceLine}>
                    <span className={styles.price}>399€</span>
                    <span className={styles.priceSuffix}>/ mois</span>
                  </div>

                  <div className={styles.priceMeta}>
                    facturé annuellement (4 788€ HT)
                  </div>

                  <div className={styles.discountLine}>
                    -22% par rapport au mensuel
                  </div>
                </div>

                <div className={styles.separator} />

                <div className={styles.featuresTitle}>Inclus :</div>

                <ul className={styles.featureList}>
                  <li>Protocole de Gestion des Flux Patients aux standards internationaux</li>
                  <li>Gestion complète des mails</li>
                  <li>Coordination RDV patients</li>
                  <li>Préparation des actes administratifs</li>
                  <li>Tenue des dossiers patients</li>
                  <li>Notes de consultation automatisées</li>
                  <li>IA conversationnelle spécialisée médecine</li>
                  <li>Logiciel médical avancé</li>  
                  <li>Sécurité des données (Hébergeur de Données de Santé)</li>
                  <li>Économie de 1 200€ / an</li>
                </ul>
              </article>

              <article className={styles.card}>
                <div className={styles.planName}>MENSUEL</div>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={onSelectMonthly}
                >
                  Continuer avec Lisa
                </button>

                <div className={styles.priceBlock}>
                  <div className={styles.priceLine}>
                    <span className={styles.price}>499€</span>
                    <span className={styles.priceSuffix}>/ mois</span>
                  </div>

                  <div className={styles.priceMeta}>
                    sans engagement annuel
                  </div>
                </div>

                <div className={styles.separator} />

                <div className={styles.featuresTitle}>Inclus :</div>

                <ul className={styles.featureList}>
                <li>Protocole de Gestion des Flux Patients aux standards internationaux</li>
                  <li>Gestion complète des mails</li>
                  <li>Coordination RDV patients</li>
                  <li>Préparation des actes administratifs</li>
                  <li>Tenue des dossiers patients</li>
                  <li>Notes de consultation automatisées</li>
                  <li>IA conversationnelle spécialisée médecine</li>
                  <li>Logiciel médical avancé</li>  
                  <li>Sécurité des données (Hébergeur de Données de Santé)</li>
                </ul>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}