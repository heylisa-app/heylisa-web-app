import styles from "./page.module.css";

export default function DashboardProtocolsPage() {
  return (
    <div className={styles.protocol}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarHead}>
            <h2 className={styles.sidebarTitle}>Protocole</h2>
          </div>

          <div className={styles.docCurrent}>
            <button type="button" className={`${styles.docCurrentBtn} ${styles.activeDoc}`}>
              <span className={styles.docCurrentIcon}>
                <img src="/imgs/doc.png" alt="" />
              </span>
              <span className={styles.docCurrentText}>
                Protocole de gestion du flux patient
              </span>
            </button>
          </div>

          <div className={styles.sectionsShell}>
            <div className={styles.sectionsLine} />

            <div className={styles.sections}>
              <a href="#proto-objet" className={`${styles.sectionLink} ${styles.sectionActive}`}>
                <span className={styles.sectionIndex}>1</span>
                <span className={styles.sectionLabel}>Objet du document</span>
              </a>

              <a href="#proto-cabinet" className={styles.sectionLink}>
                <span className={styles.sectionIndex}>2</span>
                <span className={styles.sectionLabel}>Connaissance du cabinet</span>
              </a>

              <a href="#proto-patients" className={styles.sectionLink}>
                <span className={styles.sectionIndex}>3</span>
                <span className={styles.sectionLabel}>Connaissance des patients</span>
              </a>

              <a href="#proto-demandes" className={styles.sectionLink}>
                <span className={styles.sectionIndex}>4</span>
                <span className={styles.sectionLabel}>Demandes entrantes</span>
              </a>

              <a href="#proto-urgences" className={styles.sectionLink}>
                <span className={styles.sectionIndex}>5</span>
                <span className={styles.sectionLabel}>Urgences & Priorisation</span>
              </a>

              <a href="#proto-resultats" className={styles.sectionLink}>
                <span className={styles.sectionIndex}>6</span>
                <span className={styles.sectionLabel}>Résultats & Comptes-rendus</span>
              </a>

              <a href="#proto-courriers" className={styles.sectionLink}>
                <span className={styles.sectionIndex}>7</span>
                <span className={styles.sectionLabel}>Courriers entrants</span>
              </a>

              <a href="#proto-admin" className={styles.sectionLink}>
                <span className={styles.sectionIndex}>8</span>
                <span className={styles.sectionLabel}>Administratif</span>
              </a>
            </div>
          </div>

          <button type="button" className={styles.addSectionBtn}>
            <span className={styles.addSectionPlus}>+</span>
            <span>Proposer une nouvelle section</span>
          </button>

          <div className={styles.sidebarVersions}>
            <div className={styles.sidebarVersionsLabel}>Historique</div>

            <button type="button" className={`${styles.versionItem} ${styles.versionItemActive}`}>
              <span className={styles.versionDot} />
              <span>v1.2 · active</span>
            </button>

            <button type="button" className={styles.versionItem}>
              <span className={`${styles.versionDot} ${styles.versionDotArchive}`} />
              <span>v1.1 · archivée</span>
            </button>

            <button type="button" className={styles.versionItem}>
              <span className={`${styles.versionDot} ${styles.versionDotArchive}`} />
              <span>v1.0 · archivée</span>
            </button>
          </div>
        </div>
      </aside>

      <section className={styles.main}>
        <div className={styles.mainScroll}>
          <div className={styles.topbar}>
            <div className={styles.breadcrumbs}>
              <span className={styles.breadcrumbCabinet}>
                <span className={styles.breadcrumbCabinetBadge}>C</span>
                Cabinet du Dr Martin
              </span>

              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbCurrent}>
                Protocole de Gestion du Flux Patient (PGFP)
              </span>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbSection}>Objet du document</span>
            </div>

            <div className={styles.topActions}>
              <button type="button" className={styles.topActionBtn}>
                <span className={styles.topActionAvatarWrap}>
                  <img src="/imgs/Lisa_Avatar-min.webp" alt="Lisa" />
                  <span className={styles.topActionOnlineDot} />
                </span>
                <span>Éditer avec Lisa</span>
              </button>

              <button type="button" className={styles.topActionBtn}>
                <img src="/imgs/share.png" alt="" className={styles.topActionIcon} />
                <span>Partager</span>
              </button>
            </div>
          </div>

          <div className={styles.docFrame}>
            <div className={styles.docShell}>
              <div className={styles.docTools}>
                <button type="button" className={styles.docToolBtn} aria-label="Commentaires">
                  <img src="/imgs/comment.png" alt="" />
                </button>

                <button type="button" className={styles.docToolBtn} aria-label="Télécharger en PDF">
                  <img src="/imgs/download.png" alt="" />
                </button>
              </div>

              <header className={styles.docHeader}>
                <h1 className={styles.docTitle}>Protocole de gestion du flux patient</h1>

                <div className={styles.docMeta}>
                  <span className={styles.docMetaAuthor}>
                    <img src="/imgs/Lisa_Avatar-min.webp" alt="Lisa" />
                    Lisa
                  </span>

                  <span className={styles.docMetaSep}>·</span>
                  <span className={styles.docMetaText}>
                    Dernière mise à jour aujourd’hui à 10:33
                  </span>
                  <span className={styles.docMetaSep}>·</span>
                  <span className={styles.docMetaText}>v1.2</span>
                </div>
              </header>

              <article id="proto-objet" className={styles.docSection}>
                <h2 className={styles.docSectionTitle}>Objet du document</h2>

                <div className={styles.docContent}>
                  <p>
                    Ce protocole constitue la référence opérationnelle centrale du cabinet
                    pour le traitement de l’ensemble des interactions patients et correspondants
                    médicaux : emails, appels téléphoniques, courriers, demandes Doctolib.
                    Il a vocation à être utilisé au quotidien, mis à jour régulièrement, et
                    enrichi à mesure que le cabinet développe ses pratiques.
                  </p>

                  <p>Il remplit quatre fonctions simultanées :</p>

                  <ul>
                    <li>
                      Guide opérationnel : chaque situation courante y trouve une réponse claire
                      et standardisée.
                    </li>
                    <li>
                      Base de formation : toute nouvelle secrétaire peut s’appuyer sur ce document
                      pour monter en compétence rapidement.
                    </li>
                    <li>
                      Référence légale et organisationnelle : les règles de confidentialité, de
                      triage et de communication y sont formalisées.
                    </li>
                    <li>
                      Source de vérité pour Lisa : l’assistante IA tire de ce protocole les règles
                      qui guident ses réponses automatiques.
                    </li>
                  </ul>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}