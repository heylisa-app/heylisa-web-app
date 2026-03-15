import styles from "./page.module.css";

export default function DashboardCalendarPage() {
  return (
    <div className={styles.agenda}>
      <div className={styles.agendaBg} />

      <div className={styles.agendaInner}>
        <div className={styles.agendaHero}>
          <h1 className={styles.agendaTitle}>
            Votre cabinet, mais en mieux organisé
          </h1>

          <p className={styles.agendaSubtitle}>
            Connectez votre calendrier pour que Lisa puisse suivre vos rendez-vous
            patients en toute autonomie : consulter le planning, modifier un
            rendez-vous, proposer de nouveaux créneaux et préparer vos consultations.
          </p>

          <div className={styles.agendaConnect}>
            <div className={styles.agendaConnectTitle}>Commencez par</div>

            <div className={styles.agendaConnectGrid}>
              <button className={styles.agendaSource} type="button">
                <img
                  src="/imgs/doctolib.png"
                  alt="Doctolib"
                  className={styles.doctolibLogo}
                />
                <span>Doctolib</span>
              </button>

              <button className={styles.agendaSource} type="button">
                <img
                  src="/imgs/google_agenda.png"
                  alt="Google Agenda"
                  className={styles.googleLogo}
                />
                <span>Google Agenda</span>
              </button>

              <button className={styles.agendaSource} type="button">
                <img
                  src="/imgs/microsoft-calendar.png"
                  alt="Microsoft Calendar"
                  className={styles.microsoftLogo}
                />
                <span>Microsoft Calendar</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.agendaCards}>
          <div className={styles.agendaCard}>
            <div className={styles.agendaCardImage}>
              <img
                src="/imgs/placeholder.png"
                alt=""
              />
            </div>

            <div className={styles.agendaCardTitle}>
              Proposez des rendez-vous plus simplement
            </div>

            <div className={styles.agendaCardText}>
              Lisa analyse votre planning et peut proposer automatiquement des
              créneaux pertinents aux patients, en fonction de votre disponibilité
              et du type de consultation.
            </div>
          </div>

          <div className={styles.agendaCard}>
            <div className={styles.agendaCardImage}>
              <img
                src="/imgs/placeholder.png"
                alt=""
              />
            </div>

            <div className={styles.agendaCardTitle}>
              Suivi patient plus intelligent
            </div>

            <div className={styles.agendaCardText}>
              Grâce au calendrier synchronisé, Lisa peut suggérer automatiquement
              des rendez-vous de suivi selon l’état du dossier patient et envoyer
              une proposition par email après validation.
            </div>
          </div>

          <div className={styles.agendaCard}>
            <div className={styles.agendaCardImage}>
              <img
                src="/imgs/placeholder.png"
                alt=""
              />
            </div>

            <div className={styles.agendaCardTitle}>
              Automatisez la prise de notes de consultation
            </div>

            <div className={styles.agendaCardText}>
              Activez l’enregistrement automatique des consultations : Lisa écoute
              automatiquement chaque consultation, transcrit la conversation,
              génère une synthèse et met à jour le dossier patient après validation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}