"use client";

import { useState } from "react";
import styles from "./page.module.css";

const patients = [
  {
    id: "P-001",
    name: "Claire Martin",
    meta: "52 ans · Suivi gastro",
    status: "active",
  },
  {
    id: "P-002",
    name: "Julien Bernard",
    meta: "41 ans · Contrôle résultats",
    status: "pending",
  },
  {
    id: "P-003",
    name: "Sophie Lambert",
    meta: "36 ans · Consultation initiale",
    status: "active",
  },
  {
    id: "P-004",
    name: "Marc Renaud",
    meta: "67 ans · Surveillance",
    status: "urgent",
  },
];

export default function DashboardPatientsPage() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [patientMainTab, setPatientMainTab] = useState<"notes" | "history" | "details">("notes");
  const [selectedNoteId, setSelectedNoteId] = useState("note-1");
  const [selectedDetailId, setSelectedDetailId] = useState("detail-1");
  const notes = [
    {
      id: "note-1",
      title: "Consultation de suivi",
      summary: "Symptômes stabilisés, contrôle recommandé sous 2 semaines.",
      datetime: "08 mars 2026 · 14:20",
      author: "Dr Martin",
      content:
        "Patiente revue en consultation de suivi. Douleurs abdominales toujours présentes mais moins fréquentes que lors du précédent épisode. Pas de signe de décompensation aiguë. Surveillance recommandée à court terme avec contrôle des résultats biologiques dès réception. Revoir la patiente sous 2 semaines ou plus tôt en cas d’aggravation clinique.",
      hasAudio: true,
      audioDuration: "01:42",
      audioWaveform: [18, 32, 24, 40, 52, 34, 22, 46, 58, 44, 28, 20, 36, 54, 42, 26, 16, 30, 48, 38, 24, 18, 34, 50],
    },
    {
      id: "note-2",
      title: "Post-coloscopie",
      summary: "Récupération correcte, vigilance simple sur l’évolution digestive.",
      datetime: "04 mars 2026 · 18:10",
      author: "Dr Martin",
      content:
        "Suites post-coloscopie simples à ce stade. Pas de complication immédiate rapportée. Consignes de surveillance données à la patiente. Réévaluer selon les résultats consolidés et l’évolution des symptômes digestifs dans les prochains jours.",
      hasAudio: false,
      audioDuration: null,
      audioWaveform: [],
    },
    {
      id: "note-3",
      title: "Synthèse Lisa",
      summary: "Résultats rapprochés du protocole actif et suivi suggéré.",
      datetime: "27 février 2026 · 09:42",
      author: "Lisa",
      content:
        "Les derniers éléments reçus ont été rapprochés du protocole patient actif. Une proposition de suivi à 14 jours a été identifiée comme cohérente avec la trajectoire actuelle du dossier. Aucun signal critique immédiat détecté à ce stade, mais une relecture humaine des résultats reste recommandée.",
      hasAudio: true,
      audioDuration: "00:58",
      audioWaveform: [14, 22, 18, 28, 44, 36, 20, 26, 48, 40, 24, 16, 30, 46, 34, 22, 18, 26, 38, 30, 20, 14, 24, 32],
    },
  ];

  const [tasks, setTasks] = useState([
    {
      id: "task-1",
      label: "Envoyer le rappel patient",
      due: "Dû pour le 24 mars 2026",
      status: null,
      done: false,
    },
    {
      id: "task-2",
      label: "Vérifier les résultats biologiques",
      due: "Dû pour le 18 mars 2026",
      status: "urgent",
      done: false,
    },
    {
      id: "task-3",
      label: "Préparer le prochain rendez-vous",
      due: "Dû pour le 20 mars 2026",
      status: "late",
      done: true,
    },
  ]);

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      )
    );
  };
  
  const selectedNote =
    notes.find((note) => note.id === selectedNoteId) ?? notes[0];

    const anatomyMap: Record<
    string,
    {
      zone: string;
      severity: "low" | "medium" | "high";
      label: string;
      top: string;
      left: string;
      width: string;
      height: string;
      pointTop: string;
      pointLeft: string;
    }
  > = {
    "detail-1": {
      zone: "abdomen",
      severity: "medium",
      label: "Abdomen · Pathologie confirmée",
      top: "33%",
      left: "39%",
      width: "22%",
      height: "18%",
      pointTop: "42%",
      pointLeft: "50%",
    },
    "detail-2": {
      zone: "abdomen",
      severity: "high",
      label: "Abdomen · Suspicion inflammatoire",
      top: "34%",
      left: "37%",
      width: "26%",
      height: "20%",
      pointTop: "43%",
      pointLeft: "51%",
    },
    "detail-3": {
      zone: "abdomen",
      severity: "medium",
      label: "Zone clinique surveillée",
      top: "31%",
      left: "35%",
      width: "30%",
      height: "24%",
      pointTop: "41%",
      pointLeft: "50%",
    },
    "detail-4": {
      zone: "torso",
      severity: "low",
      label: "Suivi global · Tronc",
      top: "20%",
      left: "34%",
      width: "32%",
      height: "46%",
      pointTop: "48%",
      pointLeft: "50%",
    },
    "detail-5": {
      zone: "global",
      severity: "high",
      label: "Alerte thérapeutique générale",
      top: "12%",
      left: "24%",
      width: "52%",
      height: "72%",
      pointTop: "30%",
      pointLeft: "52%",
    },
  };

  const selectedAnatomy = anatomyMap[selectedDetailId] ?? anatomyMap["detail-1"];

    const historyEvents = [
      {
        id: "evt-1",
        title: "Consultation de suivi",
        summary: "Symptômes stabilisés. Contrôle recommandé sous 2 semaines.",
        datetime: "08 mars 2026 · 14:20",
      },
      {
        id: "evt-2",
        title: "Compte-rendu Lisa",
        summary: "Patiente relancée. Documents bien reçus. Proposition automatique envoyée.",
        datetime: "04 mars 2026 · 09:10",
      },
      {
        id: "evt-3",
        title: "Résultats intégrés au dossier",
        summary: "Bilan importé et rapproché automatiquement du protocole patient.",
        datetime: "27 février 2026 · 11:42",
      },
      {
        id: "evt-4",
        title: "Relance patient",
        summary: "Demande de confirmation de réception des résultats biologiques.",
        datetime: "25 février 2026 · 17:05",
      },
      {
        id: "evt-5",
        title: "Ajout document",
        summary: "Compte-rendu d’examen ajouté au dossier patient.",
        datetime: "24 février 2026 · 10:18",
      },
    ];
    const documents = [
      {
        id: "doc-1",
        title: "Radio abdominale",
        type: "Imagerie",
        date: "07 mars 2026",
        status: "Analysé",
        preview: "/imgs/placeholder.png",
      },
      {
        id: "doc-2",
        title: "Bilan sanguin",
        type: "PDF",
        date: "06 mars 2026",
        status: "À relire",
        preview: "/imgs/placeholder.png",
      },
      {
        id: "doc-3",
        title: "Compte-rendu coloscopie",
        type: "Document",
        date: "04 mars 2026",
        status: "Analysé",
        preview: "/imgs/placeholder.png",
      },
      {
        id: "doc-4",
        title: "Ordonnance de suivi",
        type: "Ordonnance",
        date: "02 mars 2026",
        status: "Non analysé",
        preview: "/imgs/placeholder.png",
      },
    ];
  return (
    <div className={styles.patientsView}>
      <aside className={styles.patientsSidebar}>
        <div className={styles.patientsSidebarInner}>
          <div className={styles.patientsSidebarHeader}>
            <h2 className={styles.patientsSidebarTitle}>Patients</h2>
          </div>

          <div className={styles.patientsSearchWrap}>
            <img className={styles.patientsSearchIcon} src="/imgs/search.png" alt="" />
            <input
              type="text"
              className={styles.patientsSearchInput}
              placeholder="Rechercher un patient"
              autoComplete="off"
            />
          </div>

          <div className={styles.patientsSidebarSection}>
            <div className={styles.patientsSidebarLabel}>Vue</div>

            <button type="button" className={`${styles.patientsSidebarTab} ${styles.isActive}`}>
              Tous les patients
            </button>

            <button type="button" className={styles.patientsSidebarTab}>
              Aujourd’hui
            </button>

            <button type="button" className={styles.patientsSidebarTab}>
              À rappeler
            </button>

            <button type="button" className={styles.patientsSidebarTab}>
              Prioritaires
            </button>
          </div>

          <div className={styles.patientsSidebarSection}>
            <div className={styles.patientsSidebarLabelRow}>
              <div className={styles.patientsSidebarLabel}>Liste patients</div>

              <button
                type="button"
                className={styles.patientsHelpButton}
                aria-label="Comprendre les priorités patients"
                onClick={() => setIsHelpOpen(true)}
              >
                <img src="/imgs/details.png" alt="" />
              </button>
            </div>

            <div className={styles.patientList}>
              {patients.map((patient, index) => (
                <button
                  key={patient.id}
                  type="button"
                  className={`${styles.patientListItem} ${index === 0 ? styles.isSelected : ""}`}
                >
                  <div className={styles.patientAvatar}>{patient.name.charAt(0)}</div>

                  <div className={styles.patientListContent}>
                    <div className={styles.patientListName}>{patient.name}</div>
                    <div className={styles.patientListMeta}>{patient.meta}</div>
                  </div>

                  <span
                    className={[
                      styles.patientStatusDot,
                      patient.status === "urgent"
                        ? styles.statusUrgent
                        : patient.status === "pending"
                        ? styles.statusPending
                        : styles.statusActive,
                    ].join(" ")}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className={styles.patientsSecurityCard}>
            <div className={styles.patientsSecurityText}>
              <div className={styles.patientsSecurityTitle}>Sécurité des données</div>
              <div className={styles.patientsSecuritySubtitle}>
                Activer la protection maximum des données
              </div>
            </div>

            <button
              type="button"
              className={`${styles.patientsSecurityToggle} ${styles.isSecurityOn}`}
              aria-label="Activer la sécurité des données"
            >
              <span className={styles.patientsSecurityKnob} />
            </button>
          </div>
        </div>
      </aside>

      <section className={styles.patientsMain}>
        <div className={styles.patientsMainInner}>
          <header className={styles.patientHeader}>
          <div className={styles.patientHeaderIdentity}>
              <div className={styles.patientHeaderAvatar}>C</div>

              <div className={styles.patientHeaderText}>
                <div className={styles.patientHeaderTitleRow}>
                  <h1 className={styles.patientHeaderName}>Claire Martin</h1>

                  <div className={styles.patientHeaderBadges}>
                    <span className={`${styles.patientHeaderBadge} ${styles.badgeFollow}`}>
                      <span className={styles.patientHeaderBadgeDot} />
                      À suivre
                    </span>

                    <span className={styles.patientHeaderBadge}>
                      Contrôle résultats
                    </span>

                    <span className={styles.patientHeaderBadge}>
                      Suivi recommandé dans 14 jours
                    </span>
                  </div>
                </div>

                <div className={styles.patientHeaderMeta}>
                  52 ans · Née le 14/02/1974 · Dossier #P-001
                </div>
              </div>
            </div>

            <div className={styles.patientHeaderActions}>
              <button type="button" className={styles.patientActionBtn}>
                <img
                  src="/imgs/Lisa_Avatar-min.webp"
                  alt=""
                  className={styles.patientActionIconAvatar}
                />
                <span className={styles.patientActionText}>Demander à Lisa</span>
              </button>

              <button type="button" className={styles.patientActionBtn}>
                <img
                  src="/imgs/mic-notes.png"
                  alt=""
                  className={styles.patientActionIcon}
                />
                <span className={styles.patientActionText}>Laisser une note</span>
              </button>
            </div>
          </header>

          <div
            className={`${styles.patientContentGrid} ${
              patientMainTab === "details" ? styles.isDetailsMode : ""
            }`}
          >
          <div className={styles.patientLeftColumn}>
            <div className={styles.patientInfoCard}>
              <div className={styles.patientInfoCardTitle}>Coordonnées</div>

              <div className={styles.patientInfoRows}>
                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel}>Téléphone</span>
                  <div className={styles.patientInfoValueWithAction}>
                    <span className={styles.patientInfoValue}>06 12 34 56 78</span>
                    <button
                      type="button"
                      className={styles.patientInlineAction}
                      aria-label="Appeler le patient"
                    >
                      <img src="/imgs/call.png" alt="" />
                    </button>
                  </div>
                </div>

                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel}>Email</span>
                  <div className={styles.patientInfoValueWithAction}>
                    <span className={styles.patientInfoValue}>claire.martin@email.fr</span>
                    <button
                      type="button"
                      className={styles.patientInlineAction}
                      aria-label="Envoyer un email"
                    >
                      <img src="/imgs/mail.png" alt="" />
                    </button>
                  </div>
                </div>

                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel}>Médecin traitant</span>
                  <span className={styles.patientInfoValue}>Dr Martin</span>
                </div>

                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel}>Proche de confiance</span>
                  <div className={styles.patientInfoStack}>
                    <span className={styles.patientInfoValue}>Sophie Martin</span>
                    <span className={styles.patientInfoSubvalue}>06 44 22 18 90 · sophie.martin@email.fr</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.patientInfoCard}>
              <div className={styles.patientInfoCardTitle}>Suivi</div>

              <div className={styles.patientKeyGrid}>
                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Dernière consultation</span>
                  <span className={styles.patientKeyValue}>08 mars 2026</span>
                </div>

                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Prochain suivi suggéré</span>
                  <span className={styles.patientKeyValue}>22 mars 2026</span>
                </div>

                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Poids</span>
                  <span className={styles.patientKeyValue}>64 kg</span>
                </div>

                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Dernier motif</span>
                  <span className={styles.patientKeyValue}>Douleurs abdominales</span>
                </div>
              </div>
            </div>

            <div className={styles.patientInfoCard}>
              <div className={styles.patientInfoCardTitle}>Points d’attention</div>

              <div className={styles.patientAlertList}>
                <div className={styles.patientAlertItem}>
                  <span className={styles.patientAlertTag}>Allergie</span>
                  <span className={styles.patientAlertText}>Pénicilline</span>
                </div>

                <div className={styles.patientAlertItem}>
                  <span className={styles.patientAlertTag}>ALD</span>
                  <span className={styles.patientAlertText}>Maladie de Crohn</span>
                </div>

                <div className={styles.patientAlertItem}>
                  <span className={styles.patientAlertTag}>Condition</span>
                  <span className={styles.patientAlertText}>Mobilité réduite</span>
                </div>
              </div>
            </div>

            <div className={styles.patientInfoCard}>
              <div className={styles.patientInfoCardTitle}>Contexte médical</div>

              <div className={styles.patientContextText}>
                Patiente suivie pour douleurs abdominales récurrentes sur terrain inflammatoire chronique.
                Résultats biologiques récents en attente de relecture complète. Traitement de fond connu,
                surveillance recommandée à court terme selon évolution clinique.
              </div>
            </div>

            <div className={styles.patientInfoCard}>
              <div className={styles.patientInfoCardTitle}>Droits & couverture</div>

              <div className={styles.patientCoverageGrid}>
                <div className={styles.patientCoverageItem}>
                  <span className={styles.patientCoverageLabel}>Carte Vitale</span>
                  <span className={`${styles.patientCoverageBadge} ${styles.isCoverageOn}`}>
                    Active
                  </span>
                </div>

                <div className={styles.patientCoverageItem}>
                  <span className={styles.patientCoverageLabel}>Mutuelle</span>
                  <span className={`${styles.patientCoverageBadge} ${styles.isCoverageOn}`}>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {patientMainTab === "details" && (
            <div className={styles.patientAnatomyColumn}>
              <div className={styles.patientAnatomyPanel}>
                <div className={styles.patientAnatomyInner}>
                  <div className={styles.patientAnatomyStage}>
                    <img
                      src="/imgs/human_body.webp"
                      alt="Vue anatomique du patient"
                      className={styles.patientAnatomyImage}
                    />

                    <div
                      className={[
                        styles.patientAnatomyGlow,
                        selectedAnatomy.severity === "high"
                          ? styles.anatomyGlowHigh
                          : selectedAnatomy.severity === "medium"
                          ? styles.anatomyGlowMedium
                          : styles.anatomyGlowLow,
                      ].join(" ")}
                      style={{
                        top: selectedAnatomy.top,
                        left: selectedAnatomy.left,
                        width: selectedAnatomy.width,
                        height: selectedAnatomy.height,
                      }}
                    />

                    <div
                      className={[
                        styles.patientAnatomyPoint,
                        selectedAnatomy.severity === "high"
                          ? styles.anatomyPointHigh
                          : selectedAnatomy.severity === "medium"
                          ? styles.anatomyPointMedium
                          : styles.anatomyPointLow,
                      ].join(" ")}
                      style={{
                        top: selectedAnatomy.pointTop,
                        left: selectedAnatomy.pointLeft,
                      }}
                    />

                    <div
                      className={styles.patientAnatomyLabel}
                      style={{
                        top: `calc(${selectedAnatomy.pointTop} - 44px)`,
                        left: `calc(${selectedAnatomy.pointLeft} + 18px)`,
                      }}
                    >
                      {selectedAnatomy.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.patientCenterColumn}>
            <section className={styles.cardLarge}>
              <div className={styles.cardLargeHeader}>
                <div className={styles.cardTitle}>Dossier clinique</div>

                <div className={styles.segmentedControl}>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${patientMainTab === "notes" ? styles.isActive : ""}`}
                    onClick={() => setPatientMainTab("notes")}
                  >
                    Notes
                  </button>

                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${patientMainTab === "history" ? styles.isActive : ""}`}
                    onClick={() => setPatientMainTab("history")}
                  >
                    Historique
                  </button>

                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${patientMainTab === "details" ? styles.isActive : ""}`}
                    onClick={() => setPatientMainTab("details")}
                  >
                    Détails
                  </button>
                </div>
              </div>

              {patientMainTab === "notes" && (
            <div className={styles.notesSplitView}>
              <div className={styles.notesListPane}>
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className={`${styles.noteListItem} ${
                      selectedNoteId === note.id ? styles.isNoteSelected : ""
                    }`}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <div className={styles.noteListItemMain}>
                      <div className={styles.noteListItemTopRow}>
                        <div className={styles.noteListItemTitle}>{note.title}</div>

                        {note.hasAudio && (
                          <div className={styles.noteListItemAudioBadge}>
                            <span className={styles.noteListItemAudioDot}></span>
                            <span>Audio</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.noteListItemSummary}>{note.summary}</div>
                    </div>

                    <div className={styles.noteListItemTime}>{note.datetime}</div>
                  </button>
                ))}
              </div>

              <div className={styles.noteDetailPane}>
                <div className={styles.noteDetailHeader}>
                  <div>
                    <div className={styles.noteDetailTitle}>{selectedNote.title}</div>
                    <div className={styles.noteDetailMeta}>
                      {selectedNote.author} · {selectedNote.datetime}
                    </div>
                  </div>
                </div>

                <div className={styles.noteDetailBody}>{selectedNote.content}</div>

                {selectedNote.hasAudio && (
                  <div className={styles.noteDetailFooter}>
                    <div className={styles.audioDock}>
                      <button
                        type="button"
                        className={styles.audioDockMenu}
                        aria-label="Actions note audio"
                      >
                        <span />
                        <span />
                        <span />
                      </button>

                      <div className={styles.audioDockInner}>
                        <div className={styles.audioDockLeft}>
                          <button
                            type="button"
                            className={styles.audioPlayButton}
                            aria-label="Lire la note audio"
                          >
                            <span className={styles.audioPlayIcon} />
                          </button>

                          <div className={styles.audioPlayerDuration}>
                            {selectedNote.audioDuration}
                          </div>
                        </div>

                        <div className={styles.audioDockWave}>
                          {selectedNote.audioWaveform.map((bar, index) => (
                            <span
                              key={`${selectedNote.id}-${index}`}
                              className={styles.audioWaveBar}
                              style={{ height: `${Math.max(bar, 10)}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

              {patientMainTab === "history" && (
                <div className={styles.historyListView}>
                  {historyEvents.map((event) => (
                    <div key={event.id} className={styles.historyListItem}>
                      <div className={styles.historyListItemMain}>
                        <div className={styles.historyListItemTitle}>{event.title}</div>
                        <div className={styles.historyListItemSummary}>{event.summary}</div>
                      </div>

                      <div className={styles.historyListItemTime}>{event.datetime}</div>
                    </div>
                  ))}
                </div>
              )}

              {patientMainTab === "details" && (
                <div className={styles.detailsCardsView}>
                  <button
                    type="button"
                    className={`${styles.detailMedicalCard} ${styles.detailSeverityMedium} ${
                      selectedDetailId === "detail-1" ? styles.isDetailSelected : ""
                    }`}
                    onClick={() => setSelectedDetailId("detail-1")}
                  >
                    <div className={styles.detailMedicalCardTop}>
                      <span className={`${styles.detailMedicalBadge} ${styles.detailMedicalBadgeConfirmed}`}>
                        Confirmée
                      </span>
                    </div>

                    <div className={styles.detailMedicalTitle}>Maladie de Crohn</div>

                    <div className={styles.detailMedicalMeta}>
                      Suivi digestif chronique · impact inflammatoire actif
                    </div>

                    <div className={styles.detailMedicalSummary}>
                      Pathologie connue du dossier nécessitant une prise en compte systématique
                      lors des consultations et des décisions de suivi.
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`${styles.detailMedicalCard} ${styles.detailSeverityHigh} ${
                      selectedDetailId === "detail-2" ? styles.isDetailSelected : ""
                    }`}
                    onClick={() => setSelectedDetailId("detail-2")}
                  >
                    <div className={styles.detailMedicalCardTop}>
                      <span className={`${styles.detailMedicalBadge} ${styles.detailMedicalBadgeSuspicion}`}>
                        Suspicion
                      </span>
                    </div>

                    <div className={styles.detailMedicalTitle}>Poussée inflammatoire</div>

                    <div className={styles.detailMedicalMeta}>
                      Investigation en cours · résultats biologiques à consolider
                    </div>

                    <div className={styles.detailMedicalSummary}>
                      Hypothèse clinique actuellement surveillée à partir des symptômes récents
                      et des examens en attente de validation.
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`${styles.detailMedicalCard} ${styles.detailSeverityMedium} ${
                      selectedDetailId === "detail-3" ? styles.isDetailSelected : ""
                    }`}
                    onClick={() => setSelectedDetailId("detail-3")}
                  >
                    <div className={styles.detailMedicalCardTop}>
                      <span className={`${styles.detailMedicalBadge} ${styles.detailMedicalBadgeMonitoring}`}>
                        Surveillance
                      </span>
                    </div>

                    <div className={styles.detailMedicalTitle}>Contrôle résultats biologiques</div>

                    <div className={styles.detailMedicalMeta}>
                      Action recommandée sous 14 jours
                    </div>

                    <div className={styles.detailMedicalSummary}>
                      Vérification conseillée à court terme pour confirmer la stabilité du
                      dossier et ajuster le suivi si nécessaire.
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`${styles.detailMedicalCard} ${styles.detailSeverityLow} ${
                      selectedDetailId === "detail-4" ? styles.isDetailSelected : ""
                    }`}
                    onClick={() => setSelectedDetailId("detail-4")}
                  >
                    <div className={styles.detailMedicalCardTop}>
                      <span className={`${styles.detailMedicalBadge} ${styles.detailMedicalBadgeMonitoring}`}>
                        Surveillance
                      </span>
                    </div>

                    <div className={styles.detailMedicalTitle}>Suivi poids</div>

                    <div className={styles.detailMedicalMeta}>
                      Comparaison à effectuer à la prochaine consultation
                    </div>

                    <div className={styles.detailMedicalSummary}>
                      Indicateur simple mais utile pour détecter une évolution défavorable ou
                      confirmer la stabilité clinique globale.
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`${styles.detailMedicalCard} ${styles.detailSeverityHigh} ${
                      selectedDetailId === "detail-5" ? styles.isDetailSelected : ""
                    }`}
                    onClick={() => setSelectedDetailId("detail-5")}
                  >
                    <div className={styles.detailMedicalCardTop}>
                      <span className={`${styles.detailMedicalBadge} ${styles.detailMedicalBadgeConfirmed}`}>
                        Confirmée
                      </span>
                    </div>

                    <div className={styles.detailMedicalTitle}>Allergie à la pénicilline</div>

                    <div className={styles.detailMedicalMeta}>
                      Point d’attention thérapeutique permanent
                    </div>

                    <div className={styles.detailMedicalSummary}>
                      Élément à prendre en compte dans toute prescription ou proposition de
                      traitement médicamenteux.
                    </div>
                  </button>
                </div>
              )}
            </section>

            <section className={styles.documentsCard}>
              <div className={styles.documentsCardHeader}>
                <div>
                  <div className={styles.cardTitle}>Documents & analyses</div>
                  <div className={styles.documentsCardSubtitle}>
                    Pièces du patient et analyses associées
                  </div>
                </div>

                <button type="button" className={styles.documentsAddBtn}>
                  + Ajouter un document
                </button>
              </div>

              <div className={styles.documentsToolbar}>
                <div className={styles.documentsToolbarLeft}>
                  <button type="button" className={styles.documentsToolbarBtn}>
                    Filtrer
                  </button>

                  <button type="button" className={styles.documentsToolbarBtn}>
                    Trier
                  </button>
                </div>

                <div className={styles.documentsSearchWrap}>
                  <img src="/imgs/search.png" alt="" className={styles.documentsSearchIcon} />
                  <input
                    type="text"
                    className={styles.documentsSearchInput}
                    placeholder="Rechercher"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className={styles.documentsTableWrap}>
              <table className={styles.documentsTable}>
                  <colgroup>
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Type</th>
                      <th>Date d’ajout</th>
                      <th>Analyse</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div className={styles.documentsNameCell}>
                            <span className={styles.documentsFileDot}></span>
                            <span className={styles.documentsFileName}>{doc.title}</span>
                          </div>
                        </td>

                        <td>
                          <span className={styles.documentsTypeText}>{doc.type}</span>
                        </td>

                        <td>
                          <span className={styles.documentsDateText}>{doc.date}</span>
                        </td>

                        <td>
                          <button type="button" className={styles.documentsViewBtn}>
                            Voir
                          </button>
                        </td>

                        <td>
                          <button type="button" className={styles.documentsMoreBtn} aria-label="Actions document">
                            ⋯
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

            <div className={styles.patientRightColumn}>
            <section className={styles.card}>
              <div className={styles.rightCardHeader}>
                <div className={styles.cardTitle}>Prochain rendez-vous</div>
              </div>

              <div className={styles.nextAppointmentCard}>
                <div className={styles.nextAppointmentTop}>
                  <div>
                    <div className={styles.nextAppointmentLabel}>À venir</div>
                    <div className={styles.nextAppointmentType}>Consultation de suivi</div>
                  </div>

                  <button type="button" className={styles.nextAppointmentMoreBtn} aria-label="Actions rendez-vous">
                    ⋯
                  </button>
                </div>

                <div className={styles.nextAppointmentDivider}></div>

                <div className={styles.nextAppointmentMain}>
                  <div className={styles.nextAppointmentDateBlock}>
                    <div className={styles.nextAppointmentDay}>23</div>
                    <div className={styles.nextAppointmentMonthBlock}>
                      <div className={styles.nextAppointmentMonth}>mars</div>
                      <div className={styles.nextAppointmentYear}>2026</div>
                    </div>
                  </div>

                  <div className={styles.nextAppointmentMetaBlock}>
                    <div className={styles.nextAppointmentTime}>14:30</div>
                    <div className={styles.nextAppointmentDoctor}>Dr Martin</div>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.lisaSuggestionsHeader}>
                <div className={styles.lisaSuggestionsTitleRow}>
                  <img
                    src="/imgs/Lisa_Avatar-min.webp"
                    alt="Lisa"
                    className={styles.lisaSuggestionsAvatar}
                  />

                  <div className={styles.lisaSuggestionsTitle}>
                    Suggestions de suivi
                  </div>
                </div>

                <div className={styles.lisaSuggestionsMeta}>
                  Mis à jour il y a 12 min
                </div>
              </div>

              <div className={styles.lisaSuggestionsList}>

                <div className={styles.lisaSuggestionItem}>
                  <div className={`${styles.lisaSuggestionIcon} ${styles.lisaSuggestionPurple}`}>
                    ⌁
                  </div>

                  <div className={styles.lisaSuggestionText}>
                    Proposer un rendez-vous de suivi dans 14 jours
                  </div>
                </div>

                <div className={styles.lisaSuggestionItem}>
                  <div className={`${styles.lisaSuggestionIcon} ${styles.lisaSuggestionRed}`}>
                    !
                  </div>

                  <div className={styles.lisaSuggestionText}>
                    Vérifier la réception des résultats biologiques
                  </div>
                </div>

                <div className={styles.lisaSuggestionItem}>
                  <div className={`${styles.lisaSuggestionIcon} ${styles.lisaSuggestionPurple}`}>
                    ✎
                  </div>

                  <div className={styles.lisaSuggestionText}>
                    Créer une note de synthèse consultation
                  </div>
                </div>

              </div>
            </section>

            <section className={styles.card}>
                <div className={styles.tasksHeader}>
                  <div className={styles.cardTitle}>Tâches en attente</div>
                  <div className={styles.tasksCount}>
                    {tasks.filter((task) => !task.done).length}
                  </div>
                </div>

                <div className={styles.tasksList}>
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={`${styles.taskItem} ${task.done ? styles.isTaskDone : ""}`}
                      onClick={() => toggleTask(task.id)}
                    >
                      <span className={`${styles.taskCheckbox} ${task.done ? styles.isChecked : ""}`}>
                        {task.done ? "✓" : ""}
                      </span>

                      <span className={styles.taskContent}>
                        <span className={styles.taskTitleRow}>
                          <span className={styles.taskLabel}>{task.label}</span>

                          {task.status === "urgent" && (
                            <span className={`${styles.taskBadge} ${styles.taskBadgeUrgent}`}>
                              Urgent
                            </span>
                          )}

                          {task.status === "late" && (
                            <span className={`${styles.taskBadge} ${styles.taskBadgeLate}`}>
                              En retard
                            </span>
                          )}
                        </span>

                        <span className={styles.taskMeta}>{task.due}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
      {isHelpOpen && (
        <div
          className={styles.patientsModalOverlay}
          onClick={() => setIsHelpOpen(false)}
        >
          <div
            className={styles.patientsModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.patientsModalHeader}>
              <div>
                <h3 className={styles.patientsModalTitle}>
                  Comprendre la liste patients
                </h3>
                <p className={styles.patientsModalSubtitle}>
                  Voici comment Lisa organise les dossiers pour t’aider à repérer
                  rapidement les patients à suivre.
                </p>
              </div>

              <button
                type="button"
                className={styles.patientsModalClose}
                aria-label="Fermer"
                onClick={() => setIsHelpOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.patientsModalBody}>
              <div className={styles.patientsModalBlock}>
                <div className={styles.patientsModalBlockTitle}>Couleurs</div>
                <p className={styles.patientsModalText}>
                  <strong>Vert</strong> : dossier stable, aucune action urgente.
                  <br />
                  <strong>Orange</strong> : action à suivre, sans urgence immédiate.
                  <br />
                  <strong>Rouge</strong> : dossier prioritaire ou action urgente.
                </p>
              </div>

              <div className={styles.patientsModalBlock}>
                <div className={styles.patientsModalBlockTitle}>Sous-menus</div>
                <p className={styles.patientsModalText}>
                  <strong>Aujourd’hui</strong> regroupe les patients à traiter ou revoir dans la journée.
                  <br />
                  <strong>À rappeler</strong> regroupe les dossiers avec relance, retour patient ou suivi à faire.
                  <br />
                  <strong>Prioritaires</strong> regroupe les dossiers qui nécessitent une attention rapide.
                </p>
              </div>

              <div className={styles.patientsModalBlock}>
                <div className={styles.patientsModalBlockTitle}>Statut affiché</div>
                <p className={styles.patientsModalText}>
                  Le libellé affiché à côté de l’âge correspond à la prochaine
                  étape attendue sur le dossier : suivi, contrôle, relance ou
                  action à planifier.
                </p>
              </div>
            </div>

            <div className={styles.patientsModalFooter}>
              <button
                type="button"
                className={styles.patientsModalAction}
                onClick={() => setIsHelpOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}