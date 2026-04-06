"use client";

import styles from "./page.module.css";

export default function DashboardHomePage() {
  return (
    <div className={styles.homeView}>
      <div className={styles.homeScroll}>
        <section className={styles.homeTopGrid}>
          {/* CARD PRINCIPALE SCORE */}
          <section className={`${styles.card} ${styles.healthCard}`}>
            <div className={styles.healthCardHeader}>
              <div>
                <div className={styles.eyebrow}>Santé administrative du cabinet</div>
                <h1 className={styles.healthTitle}>Score global du cabinet</h1>
                <p className={styles.healthSubtitle}>
                  Synthèse hebdomadaire calculée à partir du traitement des mails,
                  des urgences, des dossiers patients et des délais de résolution.
                </p>
              </div>

              <div className={styles.healthTrendBadge}>+0.6 vs semaine précédente</div>
            </div>

            <div className={styles.healthMain}>
              <div className={styles.healthGaugeWrap}>
                <div className={styles.healthGauge}>
                  <div className={styles.healthGaugeInner}>
                    <div className={styles.healthGaugeValue}>8.1</div>
                    <div className={styles.healthGaugeScale}>/10</div>
                  </div>
                </div>
              </div>

              <div className={styles.healthChartBlock}>
                <div className={styles.healthChartHeader}>
                  <div className={styles.healthChartTitle}>Progression hebdomadaire</div>
                  <div className={styles.healthChartMeta}>5 dernières semaines</div>
                </div>

                <div className={styles.healthBars}>
                  <div className={styles.healthBarCol}>
                    <div className={styles.healthBar} style={{ height: "48%" }} />
                    <span>S1</span>
                  </div>
                  <div className={styles.healthBarCol}>
                    <div className={styles.healthBar} style={{ height: "56%" }} />
                    <span>S2</span>
                  </div>
                  <div className={styles.healthBarCol}>
                    <div className={styles.healthBar} style={{ height: "63%" }} />
                    <span>S3</span>
                  </div>
                  <div className={styles.healthBarCol}>
                    <div className={styles.healthBar} style={{ height: "74%" }} />
                    <span>S4</span>
                  </div>
                  <div className={styles.healthBarCol}>
                    <div className={styles.healthBar} style={{ height: "81%" }} />
                    <span>S5</span>
                  </div>
                </div>

                <div className={styles.healthDrivers}>
                  <div className={styles.healthDriver}>
                    <span className={styles.healthDriverLabel}>Mails traités</span>
                    <span className={styles.healthDriverValue}>82%</span>
                  </div>

                  <div className={styles.healthDriver}>
                    <span className={styles.healthDriverLabel}>Urgences résolues</span>
                    <span className={styles.healthDriverValue}>74%</span>
                  </div>

                  <div className={styles.healthDriver}>
                    <span className={styles.healthDriverLabel}>Dossiers à jour</span>
                    <span className={styles.healthDriverValue}>91%</span>
                  </div>

                  <div className={styles.healthDriver}>
                    <span className={styles.healthDriverLabel}>Temps moyen</span>
                    <span className={styles.healthDriverValue}>3h12</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* COLONNE DROITE */}
          <div className={styles.homeSideStack}>
            <div className={styles.homeMiniCards}>
              {/* MAILS */}
              <section className={`${styles.card} ${styles.miniCard} ${styles.miniCardWarning}`}>
                <div className={styles.miniCardHeader}>
                  <div className={styles.miniCardTitle}>Mails</div>
                  <button type="button" className={styles.actionBtn}>
                    <span className={styles.actionIcon}>✦</span>
                    <span>Agir</span>
                  </button>
                </div>

                <div className={styles.miniCardScoreRow}>
                  <div className={styles.miniCardValue}>82%</div>
                  <div className={styles.miniCardStatus}>traités</div>
                </div>

                <div className={styles.miniCardBody}>
                  <div className={styles.miniCardLine}>
                    <span>42 reçus</span>
                    <strong>34 traités</strong>
                  </div>
                  <div className={styles.miniCardLine}>
                    <span>5 en attente validation</span>
                    <strong>3 U0/U1</strong>
                  </div>
                  <div className={styles.miniCardCritical}>
                    19 messages de criticité élevée détectés
                  </div>
                </div>
              </section>

              {/* URGENCES */}
              <section className={`${styles.card} ${styles.miniCard} ${styles.miniCardDanger}`}>
                <div className={styles.miniCardHeader}>
                  <div className={styles.miniCardTitle}>Urgences</div>
                  <button type="button" className={styles.actionBtn}>
                    <span className={styles.actionIcon}>✦</span>
                    <span>Agir</span>
                  </button>
                </div>

                <div className={styles.miniCardScoreRow}>
                  <div className={styles.miniCardValue}>4</div>
                  <div className={styles.miniCardStatus}>cas à traiter</div>
                </div>

                <div className={styles.miniCardBody}>
                  <div className={styles.miniCardLine}>
                    <span>2 tâches en retard</span>
                    <strong>1 alerte patient</strong>
                  </div>
                  <div className={styles.miniCardLine}>
                    <span>1 dossier critique</span>
                    <strong>U3 détecté</strong>
                  </div>
                  <div className={styles.miniCardCritical}>
                    Attention immédiate requise aujourd’hui
                  </div>
                </div>
              </section>

              {/* DOSSIERS */}
              <section className={`${styles.card} ${styles.miniCard} ${styles.miniCardPositive}`}>
                <div className={styles.miniCardHeader}>
                  <div className={styles.miniCardTitle}>Dossiers</div>
                  <button type="button" className={styles.actionBtn}>
                    <span className={styles.actionIcon}>✦</span>
                    <span>Agir</span>
                  </button>
                </div>

                <div className={styles.miniCardScoreRow}>
                  <div className={styles.miniCardValue}>91%</div>
                  <div className={styles.miniCardStatus}>à jour</div>
                </div>

                <div className={styles.miniCardBody}>
                  <div className={styles.miniCardLine}>
                    <span>126 dossiers actifs</span>
                    <strong>17 suivis planifiés</strong>
                  </div>
                  <div className={styles.miniCardLine}>
                    <span>8 suivis en retard</span>
                    <strong>3 nouveaux dossiers</strong>
                  </div>
                  <div className={styles.miniCardCritical}>
                    Niveau global bon, quelques relances à traiter
                  </div>
                </div>
              </section>
            </div>

            {/* PIC D'ACTIVITÉ */}
            <section className={`${styles.card} ${styles.activityCard}`}>
              <div className={styles.activityHeader}>
                <div>
                  <div className={styles.activityTitle}>Pic d’activité</div>
                  <div className={styles.activitySubtitle}>
                    Semaine en cours : historique réel + projection sur le reste de la semaine
                  </div>
                </div>

                <div className={styles.activityBadge}>semaine type</div>
              </div>

              <div className={styles.activityChart}>
                <div className={styles.activityDay}>
                  <div className={styles.activityBarSolid} style={{ height: "54%" }} />
                  <span>Lun</span>
                </div>
                <div className={styles.activityDay}>
                  <div className={styles.activityBarSolid} style={{ height: "72%" }} />
                  <span>Mar</span>
                </div>
                <div className={styles.activityDay}>
                  <div className={styles.activityBarSolid} style={{ height: "66%" }} />
                  <span>Mer</span>
                </div>
                <div className={styles.activityDay}>
                  <div className={styles.activityBarProjected} style={{ height: "78%" }} />
                  <span>Jeu</span>
                </div>
                <div className={styles.activityDay}>
                  <div className={styles.activityBarProjected} style={{ height: "64%" }} />
                  <span>Ven</span>
                </div>
                <div className={styles.activityDay}>
                  <div className={styles.activityBarProjected} style={{ height: "22%" }} />
                  <span>Sam</span>
                </div>
                <div className={styles.activityDay}>
                  <div className={styles.activityBarProjected} style={{ height: "10%" }} />
                  <span>Dim</span>
                </div>
              </div>

              <div className={styles.activityFooter}>
                <span>Jour le plus chargé : jeudi</span>
                <span>Projection : 58 interactions</span>
              </div>
            </section>
          </div>
        </section>

        <section className={styles.homeBottomGrid}>
          {/* VALIDATIONS MÉDECIN */}
          <section className={`${styles.card} ${styles.bottomCard}`}>
            <div className={styles.bottomCardHeader}>
              <div className={styles.bottomCardTitle}>Validations médecin</div>

              <button type="button" className={styles.actionBtn}>
                <span className={styles.actionIcon}>✦</span>
                <span>Agir</span>
              </button>
            </div>

            <div className={styles.bottomMainValue}>7 éléments</div>
            <div className={styles.bottomSubtitle}>
              Actions préparées par Lisa et en attente de validation humaine.
            </div>

            <div className={styles.validationList}>
              <div className={styles.validationItem}>
                <span className={styles.validationDot}></span>
                <span>3 réponses mails à valider</span>
              </div>

              <div className={styles.validationItem}>
                <span className={styles.validationDot}></span>
                <span>2 notes de synthèse en attente</span>
              </div>

              <div className={styles.validationItem}>
                <span className={styles.validationDot}></span>
                <span>2 suivis patients à approuver</span>
              </div>
            </div>
          </section>

          {/* ACTIVITÉ LISA */}
          <section className={`${styles.card} ${styles.bottomCard}`}>
            <div className={styles.bottomCardHeader}>
              <div className={styles.bottomCardTitle}>Activité Lisa</div>

              <button type="button" className={styles.actionBtn}>
                <span className={styles.actionIcon}>✦</span>
                <span>Agir</span>
              </button>
            </div>

            <div className={styles.lisaStatsGrid}>
              <div className={styles.lisaStatBox}>
                <div className={styles.lisaStatValue}>2h40</div>
                <div className={styles.lisaStatLabel}>temps économisé</div>
              </div>

              <div className={styles.lisaStatBox}>
                <div className={styles.lisaStatValue}>26</div>
                <div className={styles.lisaStatLabel}>actions traitées</div>
              </div>

              <div className={styles.lisaStatBox}>
                <div className={styles.lisaStatValue}>8</div>
                <div className={styles.lisaStatLabel}>dossiers mis à jour</div>
              </div>

              <div className={styles.lisaStatBox}>
                <div className={styles.lisaStatValue}>4</div>
                <div className={styles.lisaStatLabel}>rappels envoyés</div>
              </div>
            </div>
          </section>

          {/* QUALITÉ DE TRAITEMENT */}
          <section className={`${styles.card} ${styles.bottomCard}`}>
            <div className={styles.bottomCardHeader}>
              <div className={styles.bottomCardTitle}>Qualité de traitement</div>

              <button type="button" className={styles.actionBtn}>
                <span className={styles.actionIcon}>✦</span>
                <span>Agir</span>
              </button>
            </div>

            <div className={styles.qualityList}>
              <div className={styles.qualityRow}>
                <span className={styles.qualityLabel}>Délai moyen de réponse</span>
                <strong className={styles.qualityValue}>1h24</strong>
              </div>

              <div className={styles.qualityRow}>
                <span className={styles.qualityLabel}>Dossiers complets</span>
                <strong className={styles.qualityValue}>88%</strong>
              </div>

              <div className={styles.qualityRow}>
                <span className={styles.qualityLabel}>Suivis bien programmés</span>
                <strong className={styles.qualityValue}>79%</strong>
              </div>

              <div className={styles.qualityRow}>
                <span className={styles.qualityLabel}>Backlog ouvert</span>
                <strong className={styles.qualityValue}>12</strong>
              </div>
            </div>

            <div className={styles.qualityFooter}>
              Le cabinet reste en zone saine, avec quelques points de vigilance sur
              la complétude des dossiers et le backlog.
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}