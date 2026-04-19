"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type EventKind =
  | "day_opening"
  | "day_summary"
  | "standard"
  | "warning_u2"
  | "warning_u3"
  | "validation"
  | "info_required"
  | "clinical_flag";

type TimelineLink = {
  id: string;
  label: string;
};

type TimelineEvent = {
  id: string;
  dayKey: string;
  timeLabel: string;
  title: string;
  description?: string;
  metaLine?: string;
  dayLabel?: string;
  kind: EventKind;
  actionLabel?: string;
  links?: TimelineLink[];
  timeImpact?: {
    value: string;
    tone: "positive" | "negative" | "neutral";
    tooltip: string;
  };
  actor?: {
    type: "lisa" | "doctor";
    label: string;
    avatarText: string;
  };
  isSummary?: boolean;
  isOpening?: boolean;
};

const filtersPeriod = [
  "Aujourd’hui",
  "Hier",
  "Cette semaine",
  "Semaine dernière",
  "Vendredi 18 avril",
  "Jeudi 17 avril",
];

const filtersScope = [
  "Validations en attente",
  "Urgences",
  "Emails",
  "RDV",
  "Dossiers",
  "Suivi post-acte",
];

const dayLabels: Record<string, string> = {
    "2026-04-19": "Samedi 19 avril",
    "2026-04-18": "Vendredi 18 avril",
    "empty-welcome": "Bienvenue",
  };

const welcomeEvent: TimelineEvent = {
    id: "welcome-default",
    dayKey: "empty-welcome",
    timeLabel: "Maintenant",
    title: "Bienvenue sur votre espace de suivi de l’activité du cabinet.",
    description:
      "Lisa fera remonter ici tout le suivi opérationnel du cabinet : actions traitées, validations attendues, urgences, courriers, relances et points sensibles à arbitrer.",
    kind: "standard",
    actor: {
      type: "lisa",
      label: "Lisa",
      avatarText: "L",
    },
  };

const timelineEvents: TimelineEvent[] = [
  {
    id: "opening-today",
    dayKey: "2026-04-19",
    timeLabel: "Samedi 19 avril",
    title: "Lisa a préparé votre journée.",
    description:
      "4 validations probables, 2 cas sensibles à revoir, et une activité post-acte à surveiller avant envoi.",
    kind: "day_opening",
    actor: {
      type: "lisa",
      label: "Lisa",
      avatarText: "L",
    },
    isOpening: true,
  },
  {
    id: "risk-1",
    dayKey: "2026-04-19",
    timeLabel: "18:42",
    title: "Vigilance clinique détectée avant envoi.",
    description:
      "Lisa a repéré un élément du dossier pouvant influencer le courrier post-acte.",
    kind: "clinical_flag",
    actionLabel: "Vérifier avant envoi",
    links: [
      { id: "risk-link-1", label: "Voir le dossier" },
      { id: "risk-link-2", label: "Voir le courrier préparé" },
    ],
    timeImpact: {
      value: "-5 min",
      tone: "negative",
      tooltip:
        "Temps médical potentiellement perdu ou risque évité grâce à la relecture contextuelle de Lisa.",
    },
  },
  {
    id: "post-acte-1",
    dayKey: "2026-04-19",
    timeLabel: "18:31",
    title: "Courriers post-acte prêts pour validation.",
    description:
      "Courrier patient et courrier médecin traitant préparés à partir du dossier et du rapport d’analyse.",
    kind: "validation",
    actionLabel: "Valider les courriers",
    links: [
      { id: "pa-link-1", label: "Voir le courrier patient" },
      { id: "pa-link-2", label: "Voir le courrier médecin" },
    ],
    timeImpact: {
      value: "+13 min",
      tone: "positive",
      tooltip:
        "Temps estimé économisé par le cabinet grâce à la préparation automatique des deux courriers.",
    },
  },
  {
    id: "context-1",
    dayKey: "2026-04-19",
    timeLabel: "17:54",
    title: "Analyse du contexte patient effectuée.",
    description:
      "Lisa a croisé le rapport d’analyse, l’historique patient et les éléments du dossier.",
    kind: "standard",
    links: [{ id: "ctx-link-1", label: "Voir les infos utilisées" }],
    timeImpact: {
      value: "+4 min",
      tone: "positive",
      tooltip:
        "Temps économisé sur la collecte et la vérification du contexte avant rédaction.",
    },
  },
  {
    id: "reply-1",
    dayKey: "2026-04-19",
    timeLabel: "16:18",
    title: "Réponse préparée pour validation.",
    description:
      "Lisa a rédigé une réponse à partir du mail patient et du dossier.",
    kind: "validation",
    actionLabel: "Valider la réponse",
    links: [
      { id: "reply-link-1", label: "Voir le mail reçu" },
      { id: "reply-link-2", label: "Voir la réponse préparée" },
    ],
    timeImpact: {
      value: "+4 min",
      tone: "positive",
      tooltip:
        "Temps économisé sur la rédaction initiale de la réponse au patient.",
    },
  },
  {
    id: "u2-1",
    dayKey: "2026-04-19",
    timeLabel: "15:47",
    title: "Urgence U2 détectée.",
    description:
      "Patiente signalant une aggravation post-op nécessitant une revue rapide.",
    kind: "warning_u2",
    actionLabel: "Voir le cas",
    timeImpact: {
      value: "-3 min",
      tone: "negative",
      tooltip:
        "Temps médical sensible mobilisé sur un cas urgent nécessitant une attention rapide.",
    },
  },
  {
    id: "info-1",
    dayKey: "2026-04-19",
    timeLabel: "14:26",
    title: "Informations requises pour finaliser la réponse.",
    description:
      "Lisa a besoin de la date de début des symptômes et du traitement actuel.",
    kind: "info_required",
    actionLabel: "Fournir les informations",
    links: [{ id: "info-link-1", label: "Voir les éléments manquants" }],
    actor: {
      type: "lisa",
      label: "Lisa",
      avatarText: "L",
    },
  },
  {
    id: "summary-yesterday",
    dayKey: "2026-04-18",
    timeLabel: "23:59",
    title: "Récapitulatif de la journée.",
    description:
      "58 min gagnées · 3 consultations organisées · 1 urgence U3 traitée · 9 mails reçus · 6 ACK envoyés · 3 réponses préparées · 3 réponses envoyées",
    kind: "day_summary",
    actionLabel: "Voir les détails",
    isSummary: true,
  },
  {
    id: "opening-yesterday",
    dayKey: "2026-04-18",
    timeLabel: "Vendredi 18 avril",
    title: "Lisa a préparé votre journée.",
    description:
      "Une urgence critique identifiée dans les dossiers en attente. Deux réponses prioritaires à arbitrer aujourd’hui.",
    kind: "day_opening",
    actor: {
      type: "lisa",
      label: "Lisa",
      avatarText: "L",
    },
    isOpening: true,
  },
  {
    id: "u3-1",
    dayKey: "2026-04-18",
    timeLabel: "11:22",
    title: "Urgence U3 détectée et escaladée.",
    description:
      "Signal vital critique orienté immédiatement selon protocole.",
    kind: "warning_u3",
    actionLabel: "Voir le cas",
    timeImpact: {
      value: "-7 min",
      tone: "negative",
      tooltip:
        "Temps médical critique mobilisé immédiatement sur un cas U3 traité sans délai.",
    },
  },
  {
    id: "doctor-1",
    dayKey: "2026-04-18",
    timeLabel: "10:14",
    title: "Brouillon validé par le médecin.",
    description:
      "Le courrier préparé a été relu, validé, puis envoyé au patient.",
    kind: "validation",
    actor: {
      type: "doctor",
      label: "Dr T",
      avatarText: "DT",
    },
    links: [{ id: "doctor-link-1", label: "Voir le message envoyé" }],
    timeImpact: {
      value: "+5 min",
      tone: "positive",
      tooltip:
        "Temps économisé grâce au brouillon préparé par Lisa puis validé rapidement par le médecin.",
    },
  },
];

function TimelineIcon({ kind }: { kind: EventKind }) {
  return (
    <div className={`${styles.timelineIcon} ${styles[`icon_${kind}`]}`}>
      <span className={styles.timelineIconGlyph} />
    </div>
  );
}

function ActorAvatar({
  actor,
}: {
  actor: NonNullable<TimelineEvent["actor"]>;
}) {
  return (
    <div
    className={`${styles.actorAvatar} ${
        actor.type === "lisa" ? styles.actorLisa : styles.actorDoctor
    }`}
    >
    {actor.type === "lisa" ? (
        <img
        src="/imgs/Lisa_Avatar-min.webp"
        alt="Lisa"
        className={styles.actorAvatarImg}
        />
    ) : (
        actor.avatarText
    )}
    </div>
  );
}

function TimelineEventRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  return (
    <article
    data-day-key={event.dayKey}
    className={`${styles.eventRow} ${
        event.isSummary ? styles.eventRowSummary : ""
      } ${event.isOpening ? styles.eventRowOpening : ""}`}
    >
      <div className={styles.eventRail}>
        <TimelineIcon kind={event.kind} />
        {!isLast ? <div className={styles.eventRailLine} /> : null}
      </div>

      <div className={styles.eventBody}>
        <div className={styles.eventMain}>
          <div className={styles.eventTime}>{event.timeLabel}</div>

          <div className={styles.eventContent}>
            <div className={styles.eventHeading}>
                <h3 className={styles.eventTitle}>{event.title}</h3>

                {event.timeImpact ? (
                <span
                    className={`${styles.timeImpactInline} ${
                    event.timeImpact.tone === "positive"
                        ? styles.timeImpactPositive
                        : event.timeImpact.tone === "negative"
                        ? styles.timeImpactNegative
                        : styles.timeImpactNeutral
                    }`}
                    title={event.timeImpact.tooltip}
                >
                    {event.timeImpact.value}
                </span>
                ) : null}
            </div>

            {event.description ? (
                <p className={styles.eventDescription}>{event.description}</p>
            ) : null}

            {event.actor ? <ActorAvatar actor={event.actor} /> : null}

            {event.links?.length ? (
                <div className={styles.eventLinksBranch}>
                {event.links.map((link) => (
                    <button key={link.id} type="button" className={styles.eventLink}>
                    <span className={styles.eventLinkBranch} />
                    <span className={styles.eventLinkText}>{link.label}</span>
                    </button>
                ))}
                </div>
            ) : null}
            </div>
        </div>

        <div className={styles.eventAside}>
        {event.actionLabel ? (
            <button type="button" className={styles.actionButton}>
            <span className={styles.actionButtonIconWrap}>
                <span className={styles.actionButtonIcon} />
            </span>
            <span className={styles.actionButtonDivider} />
            <span className={styles.actionButtonLabel}>{event.actionLabel}</span>
            </button>
        ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
    return (
      <div className={styles.timelineCanvas}>
        <TimelineEventRow event={welcomeEvent} isLast />
      </div>
    );
  }

export default function DashboardActivityPage() {
    // TEMP PROD SAFE MODE:
    // On déploie pour l’instant uniquement la vue empty en production.
    // La timeline réelle sera réactivée quand l’intégration logs/backend sera prête.
    const isEmpty = true;
  
    const timelineRef = useRef<HTMLDivElement | null>(null);
    const [activeDayKey, setActiveDayKey] = useState<string>("2026-04-19");
  
    const visibleEvents = useMemo(
      () => (isEmpty ? [] : timelineEvents),
      [isEmpty]
    );
  
    useEffect(() => {
      if (isEmpty) return;
  
      const container = timelineRef.current;
      if (!container) return;
  
      const handleScroll = () => {
        const rows = Array.from(
          container.querySelectorAll<HTMLElement>("[data-day-key]")
        );
  
        const containerRect = container.getBoundingClientRect();
        const probeY = containerRect.bottom - 56;
  
        let currentDay = rows[0]?.dataset.dayKey ?? "2026-04-19";
  
        for (const row of rows) {
          const rect = row.getBoundingClientRect();
          if (rect.top <= probeY && rect.bottom >= probeY) {
            currentDay = row.dataset.dayKey ?? currentDay;
            break;
          }
          if (rect.top <= probeY) {
            currentDay = row.dataset.dayKey ?? currentDay;
          }
        }
  
        setActiveDayKey(currentDay);
      };
  
      handleScroll();
      container.addEventListener("scroll", handleScroll, { passive: true });
  
      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }, [isEmpty, visibleEvents]);
  
    if (isEmpty) {
      return (
        <div className={styles.activityView}>
          <aside className={styles.activitySidebar}>
          <div className={styles.activitySidebarInner}>
            <div className={styles.activitySidebarHeader}>
                <h2 className={styles.activitySidebarViewTitle}>Activité du cabinet</h2>
            </div>

            <div className={styles.activitySidebarSection}>
                <div className={styles.activitySidebarLabel}>Choisir une période</div>
                <div className={styles.sidebarList}>
                  {filtersPeriod.map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.sidebarItem} ${
                        index === 0 ? styles.sidebarItemActiveLight : ""
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
  
              <div className={styles.activitySidebarSection}>
                <div className={styles.activitySidebarLabel}>Filtrer par événement</div>
                <div className={styles.filterGroup}>
                <button type="button" className={`${styles.filterRow} ${styles.filterRowActive}`}>
                    <span className={styles.filterRadio} />
                    <span className={styles.filterRowLabel}>Tout</span>
                </button>

                <div className={styles.filterDivider} />

                <div className={styles.filterList}>
                    {filtersScope.map((item) => (
                    <button key={item} type="button" className={styles.filterRow}>
                        <span className={styles.filterRadio} />
                        <span className={styles.filterRowLabel}>{item}</span>
                    </button>
                    ))}
                </div>
                </div>
              </div>
            </div>
          </aside>
  
          <section className={styles.activityMain}>
            <EmptyState />
          </section>
        </div>
      );
    }
  
    return (
      <div className={styles.activityView}>
        <aside className={styles.activitySidebar}>
        <div className={styles.activitySidebarInner}>
            <div className={styles.activitySidebarHeader}>
                <h2 className={styles.activitySidebarViewTitle}>Activité du cabinet</h2>
            </div>

            <div className={styles.activitySidebarSection}>
            <div className={styles.activitySidebarLabel}>Choisir une période</div>
              <div className={styles.sidebarList}>
                {filtersPeriod.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.sidebarItem} ${
                      index === 0 ? styles.sidebarItemActiveLight : ""
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
  
            <div className={styles.activitySidebarSection}>
              <div className={styles.activitySidebarLabel}>Filtrer par événement</div>
              <div className={styles.filterGroup}>
                <button type="button" className={`${styles.filterRow} ${styles.filterRowActive}`}>
                    <span className={styles.filterRadio} />
                    <span className={styles.filterRowLabel}>Tout</span>
                </button>

                <div className={styles.filterDivider} />

                <div className={styles.filterList}>
                    {filtersScope.map((item) => (
                    <button key={item} type="button" className={styles.filterRow}>
                        <span className={styles.filterRadio} />
                        <span className={styles.filterRowLabel}>{item}</span>
                    </button>
                    ))}
                </div>
                </div>
            </div>
          </div>
        </aside>
  
        <section className={styles.activityMain}>
          <div ref={timelineRef} className={styles.timelineCanvas}>
            {visibleEvents.map((event, index) => (
              <div
                key={event.id}
                data-day-key={event.dayKey}
                className={styles.timelineRowWrap}
              >
                <TimelineEventRow
                  event={event}
                  isLast={index === visibleEvents.length - 1}
                />
              </div>
            ))}
          </div>
  
          <div className={styles.bottomStickyDay}>
            <span className={styles.bottomStickyDayPill}>
              {dayLabels[activeDayKey] ?? activeDayKey}
            </span>
          </div>
        </section>
      </div>
    );
  }