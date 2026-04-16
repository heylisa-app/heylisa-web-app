//components/dashboard/DashboardShell.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import InviteModal from "./InviteModal";
import styles from "./DashboardShell.module.css";
import { createClient } from "@/lib/supabase/client";
import SubscriptionModal from "./SubscriptionModal";
import { getPostActeConfig } from "@/lib/onboarding/getPostActeConfig";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  activeClass: string;
};

type OnboardingStep = "loading" | "pain_points" | "generated_flow";

type OnboardingBootstrapData = {
  billingStatus: string | null;
  onboardingCompleted: boolean;
  onboardingCurrentStep: number | null;
  onboardingAnswers: Record<string, any>;
  onboardingLastStepId: string | null;
  onboardingLastStepIndex: number | null;
  cabinetName: string;
  cabinetSpecialties: string[];
};

type OnboardingScreenType =
  | "transition"
  | "loading_sequence"
  | "reassurance"
  | "setup_question"
  | "activation_cta"
  | "summary"
  | "paywall";

  type OnboardingOption = {
    id: string;
    label: string;
    helperText?: string;
    recommended?: boolean;
  };

type OnboardingScreen = {
  id: string;
  brickId?: string;
  type: OnboardingScreenType;
  title?: string;
  subtitle?: string;
  body?: string;
  visual?: string;
  badge?: string;
  progressLabel?: string;
  progressLabelSecondary?: string;
  progressValue?: number;
  options?: OnboardingOption[];
  fieldKey?: string;
  ctaLabel?: string;
  ctaSecondaryLabel?: string;
  ctaAction?: string;
  allowResumeOnboarding?: boolean;
};

type OnboardingBrick = {
  id: string;
  painPointId: string;
  priority: number;
  primaryCta: string;
  screens: OnboardingScreen[];
};

type OnboardingPainPoint = {
  id: string;
  label: string;
  image: string;
  description: string;
};

type BillingCycle = "monthly" | "annual";

type PaywallPlan = {
  id: "standard" | "premium";
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotalLabel: string;
  annualBadge?: string;
  description: string;
  features: string[];
};

const ONBOARDING_FLOW_VERSION = "medical_onboarding_v1";

const PAYWALL_PLANS: PaywallPlan[] = [
  {
    id: "standard",
    name: "Lisa Standard",
    monthlyPrice: 499,
    annualMonthlyPrice: 399,
    annualTotalLabel: "4 788€ HT",
    annualBadge: "-20%",
    description: "Toutes les capacités essentielles de Lisa pour fluidifier le cabinet au quotidien.",
    features: [
      "Protocole de Gestion des Flux Patients",
      "Gestion complète des mails",
      "Coordination des rendez-vous patients",
      "Préparation des actes administratifs",
      "Tenue des dossiers patients",
      "Notes de consultation automatisées",
      "IA conversationnelle spécialisée médecine",
      "Logiciel médical autonome",
      "Espace collaboratif interne & externe",
      "Sécurité des données (hébergement santé)",
    ],
  },
  {
    id: "premium",
    name: "Lisa Premium",
    monthlyPrice: 799,
    annualMonthlyPrice: 639,
    annualTotalLabel: "7 668€ HT",
    annualBadge: "-20%",
    description: "Toute la puissance de Lisa, avec en plus des automatisations conçues sur mesure pour votre cabinet.",
    features: [
      "Tout ce qui est inclus dans Lisa Standard",
      "Gestion des appels entrants du cabinet",
      "Automatisations & fonctionnalités sur mesure pour votre cabinet",
      "Intégrations et automatisations utiles au-delà des capacités natives de Lisa",
      "Accompagnement prioritaire pour faire évoluer votre système",
    ],
  },
];

const topItems: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: "/imgs/Home.png", activeClass: "activeHome" },
  { href: "/dashboard/calendar", label: "Rendez-vous", icon: "/imgs/calendar.png", activeClass: "activeAgenda" },
  { href: "/dashboard/chat", label: "Discuter", icon: "/imgs/chat_def.png", activeClass: "activeMessages" },
  { href: "/dashboard/patients", label: "Patients", icon: "/imgs/patients.png", activeClass: "activeContacts" },
  { href: "/dashboard/protocols", label: "Protocole", icon: "/imgs/protocole.png", activeClass: "activeProtocole" },
];

const bottomItems: NavItem[] = [
  { href: "/dashboard/invite", label: "Inviter", icon: "/imgs/invite.png", activeClass: "activeInvite" },
  { href: "/dashboard/support", label: "Support", icon: "/imgs/support.png", activeClass: "activeSupport" },
  { href: "/dashboard/plan", label: "Plan", icon: "/imgs/docs.png", activeClass: "activePlan" },
];

const onboardingPainPoints: OnboardingPainPoint[] = [
  {
    id: "mail_delay",
    label: "Les mails s’accumulent sans être traités",
    image: "/imgs/onboarding-mails.webp",
    description:
      "Entre les consultations et les validations à donner, les demandes patients et résultats s’empilent. Ça attend… et ça traîne.",
  },
  {
    id: "post_acte",
    label: "Les courriers post-acte prennent trop de temps",
    image: "/imgs/onboarding-courriers.png",
    description:
      "Après chaque acte (Anapath, etc.), il faut rédiger, structurer, envoyer au patient et au médecin-traitant… et ça finit souvent en retard ou fait à la va-vite.",
  },
  {
    id: "patient_files",
    label: "Les infos sur les patients sont dispersées",
    image: "/imgs/onboarding-dossiers.webp",
    description:
      "Des infos dans les mails, d’autres dans les notes ou reçues par fax… c'est lourd de tout réordonner tout le temps, au risque de prescrire en passant à côté d'une donnée médicale importante.",
  },
  {
    id: "appointments",
    label: "Le planning bouge & n'est pas optimisé",
    image: "/imgs/onboarding-rdv.webp",
    description:
      "Annulations, décalages, urgences… remplir les trous sans créer de chaos ni d'attente trop longue pour les patients devient un casse-tête.",
  },
  {
    id: "single_person",
    label: "Tout repose sur une seule personne",
    image: "/imgs/onboarding-dependance.png",
    description:
      "Si cette personne est absente ou débordée ou démissionne, tout ralentit, c'est la panique. Et vous vous retrouvez à devoir compenser en urgence.",
  },
  {
    id: "peer_interaction",
    label: "Vos journées sont beaucoup trop solitaires",
    image: "/imgs/onboarding-confreres.webp",
    description:
      "Pas de pause café collaborative. Peu d’échanges. Les journées s’enchaînent sans vrai moment pour souffler ou partager. À la fin, tout se passe en silence.",
  },
  {
    id: "admin_overload",
    label: "L’administratif vous vide après vos journées",
    image: "/imgs/onboarding-admin.png",
    description:
      "Après les consultations, il reste les papiers, la compta, les tâches administratives… difficile de décrocher, la journée ne s’arrête jamais vraiment.",
  },
];

type SpecialtyPersonalization = {
  loaderTitle: string;
  loaderStepA: string;
  loaderStepB: string;
  followupQuestionTitle: string;
  followupQuestionSubtitle: string;
  followupOptions: OnboardingOption[];
};

const FOLLOWUP_SPECIALTY_COPY: Record<string, SpecialtyPersonalization> = {
  "gastro-enterologie": {
    loaderTitle: "Lisa évalue vos besoins de suivi post-actes...",
    loaderStepA: "Vérifie vos spécialités médicales",
    loaderStepB: "Construit l’outil personnalisé de génération des courriers de suivi",
    followupQuestionTitle: "Sur quels suivis Lisa doit-elle vous faire gagner le plus de temps ?",
    followupQuestionSubtitle:
      "Lisa peut déjà structurer automatiquement vos courriers et suivis post-actes selon votre pratique.",
    followupOptions: [
      { id: "post_consult", label: "Courriers post-consultation" },
      { id: "results", label: "Transmission de résultats" },
      { id: "post_procedure", label: "Consignes post-actes" },
      { id: "all_common", label: "Tous les suivis fréquents" },
    ],
  },

  cardiologie: {
    loaderTitle: "Lisa évalue vos besoins de suivi post-actes...",
    loaderStepA: "Vérifie vos spécialités médicales",
    loaderStepB: "Construit l’outil personnalisé de génération des courriers de suivi",
    followupQuestionTitle: "Sur quels suivis Lisa doit-elle vous faire gagner le plus de temps ?",
    followupQuestionSubtitle:
      "Lisa peut déjà structurer automatiquement vos comptes rendus et suivis cardiologiques récurrents.",
    followupOptions: [
      { id: "consult_letters", label: "Courriers post-consultation" },
      { id: "exam_results", label: "Transmission de résultats d’examens" },
      { id: "monitoring", label: "Consignes de suivi et surveillance" },
      { id: "all_common", label: "Tous les suivis fréquents" },
    ],
  },

  dentaire: {
    loaderTitle: "Lisa évalue vos besoins de suivi post-actes...",
    loaderStepA: "Vérifie vos spécialités médicales",
    loaderStepB: "Construit l’outil personnalisé de génération des courriers de suivi",
    followupQuestionTitle: "Sur quels suivis Lisa doit-elle vous faire gagner le plus de temps ?",
    followupQuestionSubtitle:
      "Lisa peut déjà préparer les suivis dentaires fréquents, consignes post-soins et transmissions utiles.",
    followupOptions: [
      { id: "post_consult", label: "Courriers post-consultation" },
      { id: "post_care", label: "Consignes post-soins" },
      { id: "results", label: "Transmission de résultats / radios" },
      { id: "all_common", label: "Tous les suivis fréquents" },
    ],
  },

  default: {
    loaderTitle: "Lisa évalue vos besoins de suivi post-actes...",
    loaderStepA: "Vérifie vos spécialités médicales",
    loaderStepB: "Construit l’outil personnalisé de génération des courriers de suivi",
    followupQuestionTitle: "Sur quels suivis Lisa doit-elle vous faire gagner le plus de temps ?",
    followupQuestionSubtitle:
      "Lisa peut déjà structurer automatiquement vos courriers et suivis post-actes selon votre pratique.",
    followupOptions: [
      { id: "post_consult", label: "Courriers post-consultation" },
      { id: "results", label: "Transmission de résultats" },
      { id: "post_procedure", label: "Consignes post-actes" },
      { id: "all_common", label: "Tous les suivis fréquents" },
    ],
  },
};

function normalizeSpecialtyValue(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getPrimarySpecialtyCopy(cabinetSpecialties: string[]): SpecialtyPersonalization {
  const normalized = (cabinetSpecialties ?? [])
    .map(normalizeSpecialtyValue)
    .filter(Boolean);

  const primary = normalized[0] ?? "default";

  return (
    FOLLOWUP_SPECIALTY_COPY[primary] ??
    FOLLOWUP_SPECIALTY_COPY.default
  );
}


const mailBrick: OnboardingBrick = {
  id: "brick_mail",
  painPointId: "mail_delay",
  priority: 1,
  primaryCta: "connect_secretariat_mail",
  screens: [
    {
      id: "mail_loading",
      type: "loading_sequence",
      title: "Lisa analyse vos défis...",
      progressLabel: "Définition des priorités",
      progressLabelSecondary: "Rédaction du protocole de gestion des flux patients",
      progressValue: 52,
    },
    {
      id: "mail_reassurance",
      type: "reassurance",
      title: "Lisa automatise déjà la gestion des mails pour 100+ cabinets médicaux",
      visual: "/imgs/lisa-mail-proof.webp",
      body: "HeyLisa has been featured in...",
      ctaLabel: "Continuer",
      ctaSecondaryLabel: "Cliquer pour fermer cette fenêtre et découvrir HeyLisa par vous-même",
    },
    {
      id: "mail_setup_question",
      type: "setup_question",
      title: "Qui pourra valider les mails préparés par Lisa ?",
      subtitle:
        "Cette information nous aide à organiser un circuit simple et sûr avant envoi.",
      fieldKey: "mail_validation_workflow",
      options: [
        {
          id: "doctor_self",
          label: "Vous-même (le médecin)",
          helperText: "Ou tout médecin destinataire du mail reçu (pour cabinet de groupe)",
        },
        {
          id: "human_secretariat",
          label: "Le secrétariat (humain)",
        },
        {
          id: "doctor_and_secretariat",
          label: "Médecin & Secrétariat",
          helperText: "Selon le niveau de criticité médicale du mail",
          recommended: true,
        },
      ],
      ctaLabel: "Continuer",
    },
    {
      id: "mail_activation",
      type: "activation_cta",
      title: "Connectez Lisa à la messagerie du cabinet",
      subtitle:
        "Lisa n'a pas le pouvoir de supprimer les mails et elle ne répond jamais sans validation interne.",
      ctaLabel: "Continuer",
      ctaSecondaryLabel: "Je le ferai plus tard",
      ctaAction: "connect_secretariat_mail",
    },
    {
      id: "mail_outcome",
      type: "summary",
      title: "Votre meilleur point de départ avec Lisa",
      subtitle:
        "Une fois connectée à votre messagerie, Lisa observe pendant 24h les flux du cabinet, puis elle prend le relais dès le lendemain selon un protocole strict, traçable et ajustable par votre organisation.",
      visual: "/imgs/placeholder-protocole-mails-preview.webp",
      ctaLabel: "Continuer",
      ctaAction: "mail_protocol_preview",
    },
  ],
};

function buildPostActeBrick(specialty?: string): OnboardingBrick {
  const config = getPostActeConfig(specialty);

  return {
    id: "brick_post_acte",
    painPointId: "post_acte",
    priority: 2,
    primaryCta: "post_acte_followup",
    screens: [
      {
        id: "post_acte_loading",
        type: "loading_sequence",
        title: "Lisa évalue vos besoins de suivi post-actes...",
        progressLabel: "Vérifie vos spécialités médicales",
        progressLabelSecondary: "Construit l’outil personnalisé de génération des courriers de suivi",
        progressValue: 52,
      },
      {
        id: "post_acte_setup_question",
        type: "setup_question",
        title: "Sur quels suivis Lisa doit-elle vous faire gagner le plus de temps ?",
        subtitle: config.subtitle,
        fieldKey: "post_acte_followup_focus",
        options: config.options.map((label) => ({
          id: label
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, ""),
          label,
        })),
        ctaLabel: "Continuer",
      },
      {
        id: "post_acte_outcome",
        type: "summary",
        title: "Moins de rédaction. Plus de médecine.",
        subtitle:
          "Lisa est prête à préparer vos courriers post-actes. Elle n'attend plus que vos notes.",
        body: "Avant : rédaction manuelle, oublis, retards.\nAprès : courriers prêts en quelques secondes.",
        ctaLabel: "Continuer",
      },
    ],
  };
}

function buildPatientFilesBrick(): OnboardingBrick {
  return {
    id: "brick_patient_files",
    painPointId: "patient_files",
    priority: 3,
    primaryCta: "patient_files_context",
    screens: [
      {
        id: "patient_files_loading",
        type: "loading_sequence",
        title: "Lisa prépare votre logiciel médical autonome...",
        progressLabel: "Prépare la mise à jour automatique des dossiers patients",
        progressLabelSecondary:
          "Organise le contexte clinique pour vous aider à analyser plus vite et plus sûrement",
        progressValue: 52,
      },
      {
        id: "patient_files_setup_question",
        type: "setup_question",
        title: "Combien de patients le cabinet reçoit-il en moyenne par jour ?",
        subtitle:
          "Lisa s’appuie sur ce volume pour estimer le temps que vous pouvez récupérer chaque semaine.",
        fieldKey: "patient_files_daily_volume",
        options: [
          { id: "10", label: "10 patients / jour" },
          { id: "20", label: "20 patients / jour" },
          { id: "30", label: "30 patients / jour" },
          { id: "40", label: "40+ patients / jour" },
        ],
        ctaLabel: "Continuer",
      },
      {
        id: "patient_files_value",
        type: "summary",
        title: "Lisa réduit le risque de décision sans contexte clinique complet.",
        subtitle:
          "Quand le contexte clinique est incomplet, le risque d’erreur augmente. Lisa remet automatiquement les bonnes informations au bon moment pour faire baisser ce risque.",
        ctaLabel: "Continuer",
      },
    ],
  };
}

function buildAppointmentsBrick(cabinetSpecialties: string[] = []): OnboardingBrick {
  const specialtiesLabel = formatAgendaSpecialties(cabinetSpecialties);

  return {
    id: "brick_appointments",
    painPointId: "appointments",
    priority: 4,
    primaryCta: "appointments_optimization",
    screens: [
      {
        id: "appointments_loading",
        type: "loading_sequence",
        title: "Lisa construit l'agenda médical synchronisé...",
        progressLabel: "Prépare les connexions à Doctolib, Google Agenda & Microsoft Calendar",
        progressLabelSecondary: `Regroupe les contraintes de planification en ${specialtiesLabel}`,
        progressValue: 52,
      },
      {
        id: "appointments_setup_question",
        type: "setup_question",
        title: "Comment souhaitez-vous que Lisa optimise le planning ?",
        subtitle:
          "En cas de demande de rendez-vous directe, Lisa proposera 3 créneaux disponibles au patient selon vos priorités.",
        fieldKey: "appointments_optimization_mode",
        options: [
          {
            id: "reduce_wait_time",
            label: "Réduire le délai d’attente des patients",
            helperText: "Lisa privilégie les créneaux les plus proches pour fluidifier la prise en charge.",
          },
          {
            id: "maximize_fill_rate",
            label: "Maximiser le remplissage du cabinet",
            helperText: "Lisa privilégie la densité de planning pour limiter les trous et améliorer le rendement du cabinet.",
          },
          {
            id: "balanced",
            label: "Mix des 2",
            helperText: "Lisa équilibre rapidité pour le patient et efficacité du planning.",
          },
        ],
        ctaLabel: "Continuer",
      },
      {
        id: "appointments_reassurance",
        type: "reassurance",
        title: "Lisa améliore la prise en charge des patients en réduisant leur délai d’attente de 14%.",
        body:
          "Lisa ne remplace pas votre outil de rendez-vous. Elle optimise simplement l’agenda existant à chaque demande directe, en tenant compte de vos priorités de planification.",
        ctaLabel: "Continuer",
      },
      {
        id: "appointments_activation",
        type: "activation_cta",
        title: "Connectez Lisa à votre agenda médical",
        subtitle:
          "Lisa se synchronise avec vos outils existants pour proposer les bons créneaux, sans changer votre organisation actuelle.",
        ctaLabel: "Continuer",
        ctaSecondaryLabel: "Je le ferai plus tard",
        ctaAction: "connect_medical_calendar",
      },
    ],
  };
}


function buildSinglePersonBrick(): OnboardingBrick {
  return {
    id: "brick_single_person",
    painPointId: "single_person",
    priority: 5,
    primaryCta: "cabinet_dependency_analysis",
    screens: [
      {
        id: "single_person_dependency",
        type: "setup_question",
        title: "À quel point le fonctionnement du cabinet repose sur vous ?",
        subtitle:
          "1 = pas du tout sur vous • 10 = tout repose sur vous",
        fieldKey: "cabinet_dependency_level",
        ctaLabel: "Continuer",
      },
      {
        id: "single_person_staff",
        type: "setup_question",
        title: "Combien de personnes gèrent le secrétariat aujourd’hui ?",
        fieldKey: "staff_count",
        options: [
          { id: "0", label: "0" },
          { id: "1", label: "1" },
          { id: "2", label: "2" },
          { id: "3_plus", label: "3+" },
        ],
        ctaLabel: "Continuer",
      },
      {
        id: "single_person_testimonial",
        type: "summary",
        title: "Même avec une équipe en place, un cabinet peut rester fragile.",
        subtitle:
          "Lisa apporte une couche de stabilité et de productivité qui sécurise votre organisation au quotidien.",
        ctaLabel: "Continuer",
      },
    ],
  };
}

function buildPeerInteractionBrick(): OnboardingBrick {
  return {
    id: "brick_peer_interaction",
    painPointId: "peer_interaction",
    priority: 6,
    primaryCta: "peer_interaction_collaboration",
    screens: [
      {
        id: "peer_interaction_loading",
        type: "loading_sequence",
        title: "Lisa prépare votre espace collaboratif...",
        progressLabel: "Crée les canaux d’échange pour les relances rapides internes",
        progressLabelSecondary: "Ouvre les canaux d’échange avec d’autres confrères",
        progressValue: 52,
      },
      {
        id: "peer_interaction_vote",
        type: "setup_question",
        title: "''Exercer la médecine en cabinet est un travail très solitaire.''",
        subtitle: "Êtes-vous d’accord avec cette affirmation ?",
        fieldKey: "peer_interaction_feeling",
        options: [
          { id: "strongly_disagree", label: "👎" },
          { id: "disagree", label: "👎🏻" },
          { id: "neutral", label: "🤷" },
          { id: "agree", label: "👍🏻" },
          { id: "strongly_agree", label: "👍" },
        ],
        ctaLabel: "Continuer",
      },
      {
        id: "peer_interaction_reassurance",
        type: "reassurance",
        title: "Collaborez avec des centaines de confrères en temps réel.",
        subtitle:
          "Accédez à un espace collaboratif sécurisé où vous pouvez échanger par message, audio ou visio avec Lisa, vos équipes ou d'autres médecins. Posez une question, partagez un doute, relâchez la pression entre confrères.",
        visual: "/imgs/placeholder-confreres-chat.png",
        ctaLabel: "Continuer",
      },
    ],
  };
}

function formatAgendaSpecialties(cabinetSpecialties: string[] = []): string {
  const cleaned = cabinetSpecialties
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return "votre spécialité";
  }

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  if (cleaned.length === 2) {
    return `${cleaned[0]} et ${cleaned[1]}`;
  }

  return `${cleaned.slice(0, -1).join(", ")} et ${cleaned[cleaned.length - 1]}`;
}

function buildOnboardingFlow(
  selectedPainPointIds: string[],
  specialty?: string,
  cabinetSpecialties: string[] = []
): OnboardingScreen[] {
  const bricksByPainPoint: Record<string, OnboardingBrick> = {
    mail_delay: mailBrick,
    post_acte: buildPostActeBrick(specialty),
    patient_files: buildPatientFilesBrick(),
    appointments: buildAppointmentsBrick(cabinetSpecialties),
    single_person: buildSinglePersonBrick(),
    peer_interaction: buildPeerInteractionBrick(),
  };

  const allBricks = Object.values(bricksByPainPoint)
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority);

  const flow: OnboardingScreen[] = [];

  allBricks.forEach((brick) => {
    const brickScreens = brick.screens.map((screen) => ({
      ...screen,
      brickId: brick.id,
    }));

    flow.push(...brickScreens);
  });

  flow.push({
    id: "final_paywall",
    type: "paywall",
    title: "Activez votre secrétaire médicale IA",
    subtitle: "Prenez appui sur Lisa pour libérer votre cabinet de l'administratif.",
    ctaLabel: "Démarrer mon essai gratuit",
    ctaSecondaryLabel: "Reprendre l’onboarding",
    allowResumeOnboarding: true,
  });

  return flow;
}



function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatDoctorWelcomeName(fullName: string) {
  const cleaned = String(fullName ?? "").trim().replace(/\s+/g, " ");

  if (!cleaned) return "Docteur";

  const alreadyStartsWithDoctor = /^(dr|docteur)\b\.?/i.test(cleaned);

  if (alreadyStartsWithDoctor) {
    return cleaned.replace(/^(dr|docteur)\b\.?\s*/i, "Dr ");
  }

  return `Dr ${cleaned}`;
}

type DashboardShellProps = {
  children: React.ReactNode;
  userDisplayName: string;
  userInitials: string;
  cabinetName: string;
  publicUserId: string;
  cabinetAccountId: string;
  cabinetSpecialties: string[];
  initialBillingStatus: string | null;
  initialStripeUrl: string | null;
};

type OnboardingFooterConfig = {
  show: boolean;
  showBack: boolean;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryClassName?: string;
  secondaryClassName?: string;
  onPrimaryClick: () => void;
  secondaryLabel: string;
  onSecondaryClick: () => void;
  secondaryVariant?: "default" | "blue";
  progressWidth: string;
};

type PatientFilesChartPoint = {
  patients: number;
  risk: number;
};

const PATIENT_FILES_CHART_MAX_RISK = 15;
const PATIENT_FILES_CHART_X_MIN = 1;
const PATIENT_FILES_CHART_X_MAX = 100;
const PATIENT_FILES_CHART_WIDTH = 520;
const PATIENT_FILES_CHART_HEIGHT = 280;

function scalePatientFilesX(patients: number): number {
  const ratio =
    (patients - PATIENT_FILES_CHART_X_MIN) /
    (PATIENT_FILES_CHART_X_MAX - PATIENT_FILES_CHART_X_MIN);

  return ratio * PATIENT_FILES_CHART_WIDTH;
}

function scalePatientFilesY(risk: number): number {
  const clampedRisk = Math.max(0, Math.min(PATIENT_FILES_CHART_MAX_RISK, risk));
  const ratio = clampedRisk / PATIENT_FILES_CHART_MAX_RISK;

  return PATIENT_FILES_CHART_HEIGHT - ratio * PATIENT_FILES_CHART_HEIGHT;
}

function buildPatientFilesCurvePath(points: PatientFilesChartPoint[]): string {
  if (points.length < 2) return "";

  const scaledPoints = points.map((point) => ({
    x: scalePatientFilesX(point.patients),
    y: scalePatientFilesY(point.risk),
  }));

  let path = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;

  for (let i = 0; i < scaledPoints.length - 1; i++) {
    const current = scaledPoints[i];
    const next = scaledPoints[i + 1];

    const dx = next.x - current.x;

    const controlX1 = current.x + dx * 0.42;
    const controlY1 = current.y;

    const controlX2 = current.x + dx * 0.58;
    const controlY2 = next.y;

    path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildPatientFilesAreaPath(points: PatientFilesChartPoint[]): string {
  if (points.length < 2) return "";

  const scaled = points.map((p) => ({
    x: scalePatientFilesX(p.patients),
    y: scalePatientFilesY(p.risk),
  }));

  const baselineY = scalePatientFilesY(0);

  let path = `M ${scaled[0].x} ${baselineY}`;
  path += ` L ${scaled[0].x} ${scaled[0].y}`;

  for (let i = 0; i < scaled.length - 1; i++) {
    const current = scaled[i];
    const next = scaled[i + 1];

    const dx = next.x - current.x;

    const c1x = current.x + dx * 0.42;
    const c1y = current.y;

    const c2x = current.x + dx * 0.58;
    const c2y = next.y;

    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next.x} ${next.y}`;
  }

  const last = scaled[scaled.length - 1];

  path += ` L ${last.x} ${baselineY}`;
  path += ` Z`;

  return path;
}

function estimateWeeklyTimeSavedHours(dailyPatients: number): number {
  const minutesSavedPerPatient = 4;
  const workingDaysPerWeek = 5;

  const totalMinutes = dailyPatients * minutesSavedPerPatient * workingDaysPerWeek;
  return Math.round((totalMinutes / 60) * 10) / 10;
}

function getPatientFilesRiskTrend(dailyPatients: number) {
  const volumeFactor = Math.min(Math.max((dailyPatients - 1) / 99, 0), 1);

  const withoutLisa: PatientFilesChartPoint[] = [
    { patients: 1, risk: 2.2 },
    { patients: 10, risk: 1.9 },
    { patients: 25, risk: 3.8 + volumeFactor * 0.8 },
    { patients: 50, risk: 7.5 + volumeFactor * 1.8 },
    { patients: 100, risk: 11.5 + volumeFactor * 2.5 },
  ];

  const withLisa: PatientFilesChartPoint[] = [
    { patients: 1, risk: 2.2 },
    { patients: 10, risk: 2.0 },
    { patients: 25, risk: 1.4 - volumeFactor * 0.15 },
    { patients: 50, risk: 1.05 - volumeFactor * 0.1 },
    { patients: 100, risk: 0.85 - volumeFactor * 0.08 },
  ];

  return { withoutLisa, withLisa };
}


export default function DashboardShell({
  children,
  userDisplayName,
  userInitials,
  cabinetName,
  publicUserId,
  cabinetAccountId,
  cabinetSpecialties,
  initialBillingStatus,
  initialStripeUrl,
}: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(
    initialBillingStatus === "new_account"
  );
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const billingStatus = initialBillingStatus;
  const stripeUrl = initialStripeUrl;
  const billingLoaded = true;
  console.log("[HL onboarding gate]", {
    publicUserId,
    initialBillingStatus,
    shouldOpenOnboarding: initialBillingStatus === "new_account",
  });
  const supabase = createClient();

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("loading");
  const [selectedPainPointIds, setSelectedPainPointIds] = useState<string[]>([]);
  const [hoveredPainPointId, setHoveredPainPointId] = useState<string | null>(null);

  const [isBootstrappingOnboarding, setIsBootstrappingOnboarding] = useState(false);
  const [onboardingBootstrapProgress, setOnboardingBootstrapProgress] = useState(0);
  const [onboardingBootstrapLabel, setOnboardingBootstrapLabel] = useState(
    "Chargement de votre environnement médical…"
  );
  const [onboardingBootstrapData, setOnboardingBootstrapData] =
    useState<OnboardingBootstrapData | null>(null);

  const [isBootstrapFetchDone, setIsBootstrapFetchDone] = useState(false);

  const [generatedOnboardingFlow, setGeneratedOnboardingFlow] = useState<OnboardingScreen[]>([]);
  const [generatedOnboardingIndex, setGeneratedOnboardingIndex] = useState(0);

  const [sequenceProgressA, setSequenceProgressA] = useState(0);
  const [sequenceProgressB, setSequenceProgressB] = useState(0);
  const [setupAnswers, setSetupAnswers] = useState<Record<string, string>>({});
  const [setupEmailDraft, setSetupEmailDraft] = useState("");

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [selectedPaywallPlanId, setSelectedPaywallPlanId] = useState<"standard" | "premium">("standard");
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [onboardingResumeTarget, setOnboardingResumeTarget] = useState<
  "pain_points" | number | null
>(null);

  const normalizedSpecialties = useMemo(
    () =>
      Array.isArray(cabinetSpecialties)
        ? cabinetSpecialties.filter(Boolean)
        : [],
    [cabinetSpecialties]
  );

  const primarySpecialty = normalizedSpecialties[0] ?? null;
  const isMultiSpecialty = normalizedSpecialties.length > 1;

  console.log("[HL onboarding] specialties context", {
    cabinetSpecialties,
    normalizedSpecialties,
    primarySpecialty,
    isMultiSpecialty,
  });

  const [isProtocolPreviewOpen, setIsProtocolPreviewOpen] = useState(false);
  const [selectedMailProvider, setSelectedMailProvider] = useState<string | null>(null);
  const onboardingWelcomeName = formatDoctorWelcomeName(userDisplayName);

  useEffect(() => {
    if (!onboardingBootstrapData) return;
  
    const savedAnswers =
      onboardingBootstrapData.onboardingAnswers &&
      typeof onboardingBootstrapData.onboardingAnswers === "object"
        ? onboardingBootstrapData.onboardingAnswers
        : {};
  
    const savedPainPoints = Array.isArray(savedAnswers.pain_points)
      ? savedAnswers.pain_points.filter(Boolean)
      : [];
  
    const {
      pain_points,
      selected_mail_provider,
      ...savedSetupAnswers
    } = savedAnswers as Record<string, any>;
  
    setSelectedPainPointIds(savedPainPoints);
    setSetupAnswers(savedSetupAnswers);
  
    if (typeof selected_mail_provider === "string" && selected_mail_provider.trim()) {
      setSelectedMailProvider(selected_mail_provider);
    }
  }, [onboardingBootstrapData]);


  useEffect(() => {
    if (!onboardingBootstrapData) return;
    if (onboardingStep !== "pain_points") return;
  
    const savedAnswers =
      onboardingBootstrapData.onboardingAnswers &&
      typeof onboardingBootstrapData.onboardingAnswers === "object"
        ? onboardingBootstrapData.onboardingAnswers
        : {};
  
    const savedPainPoints = Array.isArray(savedAnswers.pain_points)
      ? savedAnswers.pain_points.filter(Boolean)
      : [];
  
    if (savedPainPoints.length === 0) return;
  
    const runtimeSpecialties =
      onboardingBootstrapData.cabinetSpecialties?.length
        ? onboardingBootstrapData.cabinetSpecialties
        : normalizedSpecialties;
  
    const runtimePrimarySpecialty =
      runtimeSpecialties[0] ?? primarySpecialty ?? undefined;
  
    const flow = buildOnboardingFlow(
      savedPainPoints,
      runtimePrimarySpecialty,
      runtimeSpecialties
    );
  
    const targetStepId = onboardingBootstrapData.onboardingLastStepId;
    const targetIndexFromId = targetStepId
      ? flow.findIndex((screen) => screen.id === targetStepId)
      : -1;
  
    const targetIndex =
      targetIndexFromId >= 0
        ? targetIndexFromId
        : typeof onboardingBootstrapData.onboardingLastStepIndex === "number" &&
          onboardingBootstrapData.onboardingLastStepIndex >= 0
        ? Math.min(
            onboardingBootstrapData.onboardingLastStepIndex,
            flow.length - 1
          )
        : -1;
  
    setGeneratedOnboardingFlow(flow);
  
    if (targetIndex >= 0) {
      setGeneratedOnboardingIndex(targetIndex);
      setOnboardingStep("generated_flow");
  
      console.log("[HL onboarding] resumed from DB", {
        targetStepId,
        targetIndex,
        savedPainPoints,
      });
    }
  }, [
    onboardingBootstrapData,
    onboardingStep,
    normalizedSpecialties,
    primarySpecialty,
  ]);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const showHardPaywall =
  billingLoaded &&
  (billingStatus === "suspended" || billingStatus === "canceled");
  console.log("[HL billing]", {
    billingLoaded,
    billingStatus,
    stripeUrl,
    showHardPaywall,
  });

  const shouldOpenOnboarding = billingStatus === "new_account";
  const shouldOpenReactivationPaywall =
  billingStatus === "suspended" || billingStatus === "canceled";

  console.log("[HL onboarding gate]", {
    publicUserId,
    billingStatus,
    shouldOpenOnboarding,
  });

  useEffect(() => {
    if (!isOnboardingModalOpen) return;
    if (!shouldOpenOnboarding) return;
  
    setOnboardingStep("loading");
  }, [isOnboardingModalOpen, pathname, shouldOpenOnboarding]);

  useEffect(() => {
    if (shouldOpenReactivationPaywall) {
      const runtimeSpecialties =
        onboardingBootstrapData?.cabinetSpecialties?.length
          ? onboardingBootstrapData.cabinetSpecialties
          : normalizedSpecialties;
  
      const runtimePrimarySpecialty =
        runtimeSpecialties[0] ?? primarySpecialty ?? undefined;
  
      const flow = buildOnboardingFlow([], runtimePrimarySpecialty, runtimeSpecialties);
  
      const paywallIndex = flow.findIndex((screen) => screen.id === "final_paywall");
  
      setGeneratedOnboardingFlow(flow);
      setGeneratedOnboardingIndex(
        paywallIndex >= 0 ? paywallIndex : flow.length - 1
      );
      setOnboardingStep("generated_flow");
      setIsOnboardingModalOpen(true);
      setIsSubscriptionModalOpen(false);
  
      console.log("[HL billing] forcing onboarding paywall for blocked account", {
        billingStatus,
        paywallIndex,
      });
  
      return;
    }
  
    const shouldOpenFromUrl = searchParams.get("subscribe") === "1";
  
    if (shouldOpenFromUrl) {
      setIsSubscriptionModalOpen(true);
    }
  }, [
    shouldOpenReactivationPaywall,
    searchParams,
    onboardingBootstrapData,
    normalizedSpecialties,
    primarySpecialty,
    billingStatus,
  ]);

  useEffect(() => {
    if (!isOnboardingModalOpen) return;
    if (!shouldOpenOnboarding) return;
    if (onboardingStep !== "loading") return;
  
    let isCancelled = false;
    let fetchDone = false;
    let progressDone = false;
  
    const MIN_LOADING_MS = 7000;
    const STEP_MS = 70; // 100 steps * 30ms = 3000ms
  
    setIsBootstrappingOnboarding(true);
    setIsBootstrapFetchDone(false);
    setOnboardingBootstrapProgress(0);
    setOnboardingBootstrapLabel("Chargement de votre environnement médical…");
  
    const maybeFinish = () => {
      if (isCancelled) return;
      if (!fetchDone || !progressDone) return;
  
      setOnboardingBootstrapLabel("Lisa est prête.");
  
      window.setTimeout(() => {
        if (isCancelled) return;
        setIsBootstrappingOnboarding(false);
        setOnboardingStep("pain_points");
      }, 180);
    };
  
    const progressTimer = window.setInterval(() => {
      setOnboardingBootstrapProgress((prev) => {
        const next = Math.min(prev + 1, 100);
  
        if (next >= 15) {
          setOnboardingBootstrapLabel("Récupération des informations du cabinet…");
        }
  
        if (next >= 45) {
          setOnboardingBootstrapLabel("Analyse de votre configuration médicale…");
        }
  
        if (next >= 75) {
          setOnboardingBootstrapLabel("Préparation de votre accompagnement personnalisé…");
        }
  
        if (next === 100 && !progressDone) {
          progressDone = true;
          window.clearInterval(progressTimer);
          maybeFinish();
        }
  
        return next;
      });
    }, STEP_MS);
  
    const controller = new AbortController();
  
    async function bootstrapOnboarding() {
      try {
        const response = await fetch(
          `/api/onboarding/bootstrap?publicUserId=${encodeURIComponent(publicUserId)}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          }
        );
  
        if (!response.ok) {
          throw new Error(`Bootstrap failed with status ${response.status}`);
        }
  
        const payload = await response.json();
  
        if (isCancelled) return;
  
        const nextData: OnboardingBootstrapData = {
          billingStatus: payload.billingStatus ?? null,
          onboardingCompleted: Boolean(payload.onboardingCompleted),
          onboardingCurrentStep:
            typeof payload.onboardingCurrentStep === "number"
              ? payload.onboardingCurrentStep
              : null,
          onboardingAnswers:
            payload.onboardingAnswers && typeof payload.onboardingAnswers === "object"
              ? payload.onboardingAnswers
              : {},
          onboardingLastStepId:
            typeof payload.onboardingLastStepId === "string"
              ? payload.onboardingLastStepId
              : null,
          onboardingLastStepIndex:
            typeof payload.onboardingLastStepIndex === "number"
              ? payload.onboardingLastStepIndex
              : null,
          cabinetName:
            typeof payload.cabinetName === "string" && payload.cabinetName.trim()
              ? payload.cabinetName.trim()
              : cabinetName,
          cabinetSpecialties: Array.isArray(payload.cabinetSpecialties)
            ? payload.cabinetSpecialties.filter(Boolean)
            : normalizedSpecialties,
        };
  
        console.log("[HL onboarding bootstrap] payload", nextData);
  
        setOnboardingBootstrapData(nextData);
        setIsBootstrapFetchDone(true);
  
        fetchDone = true;
        maybeFinish();
      } catch (error) {
        if (isCancelled) return;
  
        console.error("[HL onboarding bootstrap] failed", error);
  
        fetchDone = true;
        setIsBootstrapFetchDone(true);
        setOnboardingBootstrapLabel("Lisa est prête.");
        maybeFinish();
      }
    }
  
    bootstrapOnboarding();
  
    return () => {
      isCancelled = true;
      controller.abort();
      window.clearInterval(progressTimer);
    };
  }, [
    isOnboardingModalOpen,
    shouldOpenOnboarding,
    onboardingStep,
    publicUserId,
    cabinetName,
    normalizedSpecialties,
  ]);

  function handleTogglePainPoint(painPointId: string) {
    setSelectedPainPointIds((prev) => {
      if (prev.includes(painPointId)) {
        return prev.filter((id) => id !== painPointId);
      }

      if (prev.length >= 3) {
        return prev;
      }

      return [...prev, painPointId];
    });
  }

  async function handleStartGeneratedOnboarding() {
    const runtimeSpecialties =
      onboardingBootstrapData?.cabinetSpecialties?.length
        ? onboardingBootstrapData.cabinetSpecialties
        : normalizedSpecialties;
  
    const runtimePrimarySpecialty =
      runtimeSpecialties[0] ?? primarySpecialty ?? undefined;
  
    const flow = buildOnboardingFlow(
      selectedPainPointIds,
      runtimePrimarySpecialty,
      runtimeSpecialties
    );
  
    setGeneratedOnboardingFlow(flow);
    setGeneratedOnboardingIndex(0);
    setOnboardingStep("generated_flow");
  
    console.log("[HL onboarding] generated flow", flow);
  
    await persistOnboardingProgress({
      currentStepId: "pain_points",
      currentStepIndex: 0,
      completed: false,
    });
  }

  async function handleNextGeneratedScreen() {
    if (!currentGeneratedScreen) return;
  
    if (currentGeneratedScreen.id === "patient_files_setup_question") {
      console.log("[HL onboarding] setup response", {
        fieldKey: "patient_files_daily_volume",
        selectedOption: String(patientFilesDailyVolume),
      });
    } else if (
      currentGeneratedScreen.type === "setup_question" &&
      currentGeneratedScreen.fieldKey
    ) {
      const selectedOption = setupAnswers[currentGeneratedScreen.fieldKey];
  
      if (!selectedOption) return;
  
      console.log("[HL onboarding] setup response", {
        fieldKey: currentGeneratedScreen.fieldKey,
        selectedOption,
        validationEmail:
          selectedOption === "human_secretariat" ? setupEmailDraft.trim() : null,
      });
    }

    await persistOnboardingProgress({
      currentStepId: currentGeneratedScreen.id,
      currentStepIndex: generatedOnboardingIndex,
      completed: false,
    });
  
    if (isLastScreenOfFlow) {
      await persistOnboardingProgress({
        currentStepId: currentGeneratedScreen.id,
        currentStepIndex: generatedOnboardingIndex,
        completed: true,
      });
    
      console.log("[HL onboarding] end of flow -> open paywall/trial");
      setIsSubscriptionModalOpen(true);
      return;
    }
  
    if (isLastScreenOfBrick) {
      console.log("[HL onboarding] end of brick -> move to next brick", {
        currentBrickId: currentGeneratedScreen.brickId,
        nextBrickId: generatedOnboardingFlow[generatedOnboardingIndex + 1]?.brickId ?? null,
      });
    }
    setOnboardingResumeTarget(generatedOnboardingIndex);
    setGeneratedOnboardingIndex((prev) => prev + 1);
  }

  function isMobileViewport() {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 820;
  }

  function handlePainPointMouseEnter(painPointId: string) {
    if (isMobileViewport()) return;
    setHoveredPainPointId(painPointId);
  }

  function handlePainPointMouseLeave() {
    if (isMobileViewport()) return;
    setHoveredPainPointId(null);
  }

  function handleSelectSetupOption(fieldKey: string, optionId: string) {
    const needsSecretariatEmail =
      fieldKey === "mail_validation_workflow" &&
      (optionId === "human_secretariat" ||
        optionId === "doctor_and_secretariat");
  
    setSetupAnswers((prev) => {
      const next = {
        ...prev,
        [fieldKey]: optionId,
      };
  
      if (!needsSecretariatEmail) {
        delete next.mail_validation_contact_email;
      }
  
      return next;
    });
  
    if (!needsSecretariatEmail) {
      setSetupEmailDraft("");
    }
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function canContinueSetupQuestion(screen: OnboardingScreen | null) {
    if (!screen) return false;
  
    if (screen.id === "patient_files_setup_question") {
      return patientFilesDailyVolume >= 1;
    }
    
    if (screen.id === "single_person_dependency") {
      return Number(setupAnswers.cabinet_dependency_level ?? 0) >= 1;
    }

    if (screen.id === "single_person_staff") {
      return Boolean(setupAnswers.staff_count);
    }

    if (screen.id === "peer_interaction_vote") {
      return true;
    }
  
    if (!screen.fieldKey) return false;
  
    const selectedOption = setupAnswers[screen.fieldKey];
  
    if (!selectedOption) return false;
  
    const needsSecretariatEmail =
      selectedOption === "human_secretariat" ||
      selectedOption === "doctor_and_secretariat";
  
      if (needsSecretariatEmail) {
        return isValidEmail(
          String(setupAnswers.mail_validation_contact_email ?? "")
        );
      }
  
    return true;
  }

  function handleMailProviderSelect(providerId: string) {
    setSelectedMailProvider(providerId);
  
    console.log("[HL onboarding] mail provider selected", {
      providerId,
    });
  }
  
  function handleActivationContinue() {
    if (!selectedMailProvider) return;
  
    console.log("[HL onboarding] activation pending", {
      selectedMailProvider,
      message:
        "User will receive secure instructions by email to connect Lisa.",
    });
  
    handleNextGeneratedScreen();
  }

  function handleResumeOnboarding() {
    if (onboardingResumeTarget === "pain_points") {
      setOnboardingStep("pain_points");
      return;
    }
  
    if (typeof onboardingResumeTarget === "number") {
      setGeneratedOnboardingIndex(onboardingResumeTarget);
      setOnboardingStep("generated_flow");
      return;
    }
  
    const paywallIndex = generatedOnboardingFlow.findIndex(
      (screen) => screen.id === "final_paywall"
    );
  
    if (paywallIndex <= 0) return;
  
    setGeneratedOnboardingIndex(paywallIndex - 1);
  }

  function handlePreviousGeneratedScreen() {
    setGeneratedOnboardingIndex((prev) => Math.max(prev - 1, 0));
  }

  async function handleOpenPaywallDirectly() {
    const runtimeSpecialties =
      onboardingBootstrapData?.cabinetSpecialties?.length
        ? onboardingBootstrapData.cabinetSpecialties
        : normalizedSpecialties;
  
    const runtimePrimarySpecialty =
      runtimeSpecialties[0] ?? primarySpecialty ?? undefined;
  
    const flow = buildOnboardingFlow(
      selectedPainPointIds,
      runtimePrimarySpecialty,
      runtimeSpecialties
    );
  
    const paywallIndex = flow.findIndex((screen) => screen.id === "final_paywall");
  
    const resumeTarget =
      onboardingStep === "pain_points"
        ? "pain_points"
        : generatedOnboardingIndex;
  
    setOnboardingResumeTarget(resumeTarget);
    setGeneratedOnboardingFlow(flow);
    setGeneratedOnboardingIndex(
      paywallIndex >= 0 ? paywallIndex : flow.length - 1
    );
    setOnboardingStep("generated_flow");

    await persistOnboardingProgress({
      currentStepId: "final_paywall",
      currentStepIndex: paywallIndex >= 0 ? paywallIndex : flow.length - 1,
      completed: true,
    });
  
    console.log("[HL onboarding] direct paywall open", {
      paywallIndex,
      resumeTarget,
    });
  }

  function buildOnboardingFlowAnswers() {
    return {
      pain_points: selectedPainPointIds,
      ...setupAnswers,
      ...(selectedMailProvider
        ? { selected_mail_provider: selectedMailProvider }
        : {}),
    };
  }
  
  async function persistOnboardingProgress(params: {
    currentStepId: string;
    currentStepIndex: number;
    completed?: boolean;
  }) {
    if (!publicUserId || !cabinetAccountId) {
      console.warn("[HL onboarding] skip persist: missing ids", {
        publicUserId,
        cabinetAccountId,
      });
      return;
    }
  
    const completed = Boolean(params.completed);
    const completedAt = completed ? new Date().toISOString() : null;
  
    const payload = {
      userId: publicUserId,
      cabinetAccountId,
      currentStep: params.currentStepIndex + 1,
      flowLastStepId: params.currentStepId,
      flowLastStepIndex: params.currentStepIndex,
      flowVersion: ONBOARDING_FLOW_VERSION,
      completed,
      completedAt,
      flowAnswers: buildOnboardingFlowAnswers(),
      cabinetName,
      specialties: normalizedSpecialties,
    };
  
    console.log("[HL onboarding] persist progress payload", payload);
  
    const response = await fetch("/api/onboarding/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  
    const result = await response.json().catch(() => null);
  
    if (!response.ok) {
      console.error("[HL onboarding] persist progress error", {
        status: response.status,
        result,
      });
      return;
    }
  
    console.log("[HL onboarding] persist progress success", {
      currentStepId: params.currentStepId,
      currentStepIndex: params.currentStepIndex,
      completed,
    });
  }

  async function handleStartTrialCheckout() {
    const selectedPlan = PAYWALL_PLANS.find(
      (plan) => plan.id === selectedPaywallPlanId
    );
  
    if (!selectedPlan) return;
    if (isCreatingCheckout) return;
  
    try {
      setIsCreatingCheckout(true);
  
      console.log("[HL checkout] request start", {
        planId: selectedPlan.id,
        billingCycle,
      });
  
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
        }),
      });
  
      const result = await response.json().catch(() => null);
  
      if (!response.ok) {
        console.error("[HL checkout] route non-2xx status", {
          status: response.status,
          result,
        });
        throw new Error(result?.error || "Unable to create checkout session");
      }
  
      if (!result?.url || typeof result.url !== "string") {
        console.error("[HL checkout] invalid response payload", result);
        throw new Error("Stripe checkout URL missing");
      }
  
      console.log("[HL checkout] redirect", {
        url: result.url,
      });
  
      window.location.assign(result.url);
    } catch (error) {
      console.error("[HL checkout] start failed", error);
      alert("Impossible d’ouvrir Stripe pour le moment. Réessaie dans un instant.");
      setIsCreatingCheckout(false);
    }
  }

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      window.location.href = "https://heylisa.io/signup";
    } catch (error) {
      console.error("Logout error", error);
      setIsSigningOut(false);
    }
  }

  function handleCloseSubscriptionModal() {
    if (showHardPaywall) return;
  
    setIsSubscriptionModalOpen(false);
  
    if (searchParams.get("subscribe") === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("subscribe");
      const nextUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
  
      router.replace(nextUrl);
    }
  }

  const currentGeneratedScreen =
    onboardingStep === "generated_flow"
      ? generatedOnboardingFlow[generatedOnboardingIndex] ?? null
      : null;

      useEffect(() => {
        if (onboardingStep !== "generated_flow") return;
        if (!currentGeneratedScreen) return;
        if (currentGeneratedScreen.type !== "activation_cta") return;
      
        setSelectedMailProvider(null);
      }, [onboardingStep, currentGeneratedScreen?.id]);

      const isPeerInteractionReassurance =
      currentGeneratedScreen?.id === "peer_interaction_reassurance";

      const secretariatValidationEmail = String(
        setupAnswers.mail_validation_contact_email ?? ""
      );

  const isLastScreenOfFlow =
      generatedOnboardingIndex >= generatedOnboardingFlow.length - 1;
    
  const isLastScreenOfBrick = (() => {
      if (!currentGeneratedScreen?.brickId) return false;
    
      const nextScreen = generatedOnboardingFlow[generatedOnboardingIndex + 1];
    
      return !nextScreen || nextScreen.brickId !== currentGeneratedScreen.brickId;
    })();

  const patientFilesDailyVolume =
      Number(setupAnswers.patient_files_daily_volume ?? 10);
    
    const patientFilesSliderMin = 2;
    const patientFilesSliderMax = 40;
    
    const patientFilesSliderProgress = `${
      ((patientFilesDailyVolume - patientFilesSliderMin) /
        (patientFilesSliderMax - patientFilesSliderMin)) *
      100
    }%`;

      const isMailOutcomeScreen =
      currentGeneratedScreen?.type === "summary" &&
      currentGeneratedScreen?.id === "mail_outcome";
  
    const isPostActeOutcomeScreen =
      currentGeneratedScreen?.type === "summary" &&
      currentGeneratedScreen?.id === "post_acte_outcome";

    const isPatientFilesSetupScreen =
      currentGeneratedScreen?.type === "setup_question" &&
      currentGeneratedScreen?.id === "patient_files_setup_question";

    const isPatientFilesValueScreen =
      currentGeneratedScreen?.type === "summary" &&
      currentGeneratedScreen?.id === "patient_files_value";
    
    const isPatientFilesOutcomeScreen =
      currentGeneratedScreen?.type === "summary" &&
      currentGeneratedScreen?.id === "patient_files_outcome";

    const isAppointmentsReassuranceScreen =
      currentGeneratedScreen?.type === "reassurance" &&
      currentGeneratedScreen?.id === "appointments_reassurance";
    
    const isAppointmentsActivationScreen =
      currentGeneratedScreen?.type === "activation_cta" &&
      currentGeneratedScreen?.id === "appointments_activation";

    const isSinglePersonDependencyScreen =
      currentGeneratedScreen?.type === "setup_question" &&
      currentGeneratedScreen?.id === "single_person_dependency";

      const isSinglePersonStaffScreen =
      currentGeneratedScreen?.type === "setup_question" &&
      currentGeneratedScreen?.id === "single_person_staff";

      const isSinglePersonTestimonialScreen =
      currentGeneratedScreen?.type === "summary" &&
      currentGeneratedScreen?.id === "single_person_testimonial";

      const isFinalPaywallScreen =
      currentGeneratedScreen?.type === "paywall" &&
      currentGeneratedScreen?.id === "final_paywall";

      const isBlockedBillingState =
      billingStatus === "suspended" || billingStatus === "canceled";
    
    const finalPaywallTitle =
      billingStatus === "suspended"
        ? "Votre accès est suspendu"
        : billingStatus === "canceled"
        ? "Réactivez votre abonnement"
        : currentGeneratedScreen?.title ?? "Activez votre secrétaire médicale IA";
    
    const finalPaywallSubtitle =
      billingStatus === "suspended"
        ? "Votre abonnement est actuellement bloqué suite à un incident de paiement. Réactivez-le pour retrouver immédiatement l’accès à Lisa."
        : billingStatus === "canceled"
        ? "Votre abonnement n’est plus actif. Réactivez-le pour retrouver immédiatement l’accès à Lisa."
        : currentGeneratedScreen?.subtitle ??
          "Prenez appui sur Lisa pour libérer votre cabinet de l'administratif.";
    
    const finalPaywallPrimaryLabel =
      isBlockedBillingState
        ? "Réactiver mon abonnement"
        : currentGeneratedScreen?.ctaLabel ?? "Démarrer mon essai gratuit";
    
    const finalPaywallSecondaryLabel =
      isBlockedBillingState
        ? "Onboarding indisponible pendant la suspension"
        : currentGeneratedScreen?.ctaSecondaryLabel ?? "Reprendre l'onboarding";

    const finalPaywallMicroCopy = isBlockedBillingState
      ? "Le paiement est requis immédiatement pour réactiver votre accès à Lisa."
      : "Annulable à tout moment. Aucun débit aujourd’hui. L’abonnement démarre après 7 jours.";
    
    const staffCountValue = setupAnswers.staff_count ?? "0";
    
    const singlePersonScenarioCards =
      staffCountValue === "0"
        ? [
            {
              id: "solo",
              title: "Cabinet sans secrétariat",
              withLisaLabel: "Avec Lisa",
              withoutLisaLabel: "Sans Lisa",
              metrics: [
                {
                  label: "Productivité",
                  withLisa: 82,
                  withoutLisa: 34,
                },
                {
                  label: "Résilience opérationnelle",
                  withLisa: 78,
                  withoutLisa: 22,
                },
              ],
            },
          ]
        : [
            {
              id: "current_team",
              title:
                staffCountValue === "1"
                  ? "Cabinet avec 1 secrétaire"
                  : staffCountValue === "2"
                  ? "Cabinet avec 2 secrétaires"
                  : "Cabinet avec 3+ secrétaires",
              withLisaLabel: "Équipe avec Lisa",
              withoutLisaLabel: "Équipe seule",
              metrics: [
                {
                  label: "Productivité",
                  withLisa:
                    staffCountValue === "1"
                      ? 86
                      : staffCountValue === "2"
                      ? 88
                      : 90,
                  withoutLisa:
                    staffCountValue === "1"
                      ? 56
                      : staffCountValue === "2"
                      ? 64
                      : 70,
                },
                {
                  label: "Résilience opérationnelle",
                  withLisa:
                    staffCountValue === "1"
                      ? 84
                      : staffCountValue === "2"
                      ? 87
                      : 89,
                  withoutLisa:
                    staffCountValue === "1"
                      ? 48
                      : staffCountValue === "2"
                      ? 58
                      : 66,
                },
              ],
            },
          ];
    
    const estimatedWeeklyTimeSaved = estimateWeeklyTimeSavedHours(patientFilesDailyVolume);
    const patientFilesRiskTrend = getPatientFilesRiskTrend(patientFilesDailyVolume);

      useEffect(() => {
        if (onboardingStep !== "generated_flow") return;
        if (!currentGeneratedScreen) return;
        if (currentGeneratedScreen.type !== "loading_sequence") return;
    
        setSequenceProgressA(0);
        setSequenceProgressB(0);
    
        let progressA = 0;
        let progressB = 0;
        let intervalA: number | null = null;
        let intervalB: number | null = null;
        let autoNextTimeout: number | null = null;
    
        intervalA = window.setInterval(() => {
          progressA += 2;
    
          if (progressA >= 100) {
            progressA = 100;
            setSequenceProgressA(100);
    
            if (intervalA) {
              window.clearInterval(intervalA);
            }
    
            intervalB = window.setInterval(() => {
              progressB += 1;
    
              if (progressB >= 100) {
                progressB = 100;
                setSequenceProgressB(100);
    
                if (intervalB) {
                  window.clearInterval(intervalB);
                }
    
                autoNextTimeout = window.setTimeout(() => {
                  handleNextGeneratedScreen();
                }, 500);
              } else {
                setSequenceProgressB(progressB);
              }
            }, 70);
          } else {
            setSequenceProgressA(progressA);
          }
        }, 70);
    
        return () => {
          if (intervalA) window.clearInterval(intervalA);
          if (intervalB) window.clearInterval(intervalB);
          if (autoNextTimeout) window.clearTimeout(autoNextTimeout);
        };
      }, [onboardingStep, currentGeneratedScreen]);

    const showGeneratedBackButton =
      onboardingStep === "generated_flow" && generatedOnboardingIndex > 0;
    
    const generatedProgressWidth =
      generatedOnboardingFlow.length > 0
        ? `${((generatedOnboardingIndex + 1) / generatedOnboardingFlow.length) * 100}%`
        : "0%";

        const onboardingFooterConfig: OnboardingFooterConfig = (() => {
          if (onboardingStep === "pain_points") {
            return {
              show: true,
              showBack: false,
              primaryLabel: "Continuer",
              primaryDisabled: selectedPainPointIds.length === 0,
              primaryClassName: styles.onboardingPainPointsPrimaryBtn,
              secondaryClassName: styles.onboardingPainPointsSkip,
              onPrimaryClick: handleStartGeneratedOnboarding,
              secondaryLabel: "Passer directement à l’activation de Lisa",
              onSecondaryClick: handleOpenPaywallDirectly,
              secondaryVariant: "default",
              progressWidth: "13%",
            };
          }
        
          if (onboardingStep !== "generated_flow" || !currentGeneratedScreen) {
            return {
              show: false,
              showBack: false,
              primaryLabel: "Continuer",
              primaryDisabled: false,
              onPrimaryClick: () => {},
              secondaryLabel: "Passer directement à l’activation de Lisa",
              onSecondaryClick: () => {},
              secondaryVariant: "default",
              progressWidth: generatedProgressWidth,
            };
          }
        
          const isActivationScreen = currentGeneratedScreen.type === "activation_cta";
          const isPaywallScreen = currentGeneratedScreen.type === "paywall";
          const isLoadingSequenceScreen =
            currentGeneratedScreen.type === "loading_sequence";
        
          if (isPaywallScreen || isLoadingSequenceScreen) {
            return {
              show: false,
              showBack: false,
              primaryLabel: "Continuer",
              primaryDisabled: false,
              onPrimaryClick: () => {},
              secondaryLabel: "Passer directement à l’activation de Lisa",
              onSecondaryClick: () => {},
              secondaryVariant: "default",
              progressWidth: generatedProgressWidth,
            };
          }
        
          if (isActivationScreen) {
            return {
              show: true,
              showBack: generatedOnboardingIndex > 0,
              primaryLabel: currentGeneratedScreen.ctaLabel ?? "Continuer",
              primaryDisabled: !selectedMailProvider,
              onPrimaryClick: handleActivationContinue,
              secondaryLabel:
                currentGeneratedScreen.ctaSecondaryLabel ?? "Je le ferai plus tard",
              onSecondaryClick: handleNextGeneratedScreen,
              secondaryVariant: "blue",
              progressWidth: generatedProgressWidth,
            };
          }
        
          const isSetupQuestionScreen = currentGeneratedScreen.type === "setup_question";
        
          return {
            show: true,
            showBack: generatedOnboardingIndex > 0,
            primaryLabel: currentGeneratedScreen.ctaLabel ?? "Continuer",
            primaryDisabled: isSetupQuestionScreen
              ? !canContinueSetupQuestion(currentGeneratedScreen)
              : false,
            onPrimaryClick: handleNextGeneratedScreen,
            secondaryLabel: "Passer directement à l’activation de Lisa",
            onSecondaryClick: handleOpenPaywallDirectly,
            secondaryVariant: "default",
            progressWidth: generatedProgressWidth,
          };
        })();


        function renderOnboardingFooter(config: OnboardingFooterConfig) {
          if (!config.show) return null;
        
          return (
            <div className={styles.onboardingGeneratedFooterDock}>
              <div className={styles.onboardingGeneratedFooterTopRow}>
                <div className={styles.onboardingGeneratedFooterBackSlot}>
                  {config.showBack ? (
                    <button
                      type="button"
                      className={styles.onboardingGeneratedBackBtn}
                      onClick={handlePreviousGeneratedScreen}
                      aria-label="Revenir à l’étape précédente"
                    >
                      ←
                    </button>
                  ) : null}
                </div>
        
                <div className={styles.onboardingGeneratedActionsDock}>
                <button
                  type="button"
                  className={config.primaryClassName ?? styles.onboardingGeneratedPrimaryBtn}
                  onClick={config.onPrimaryClick}
                  disabled={config.primaryDisabled}
                >
                  {config.primaryLabel}
                </button>
        
                <button
                  type="button"
                  className={
                    config.secondaryClassName ??
                    (config.secondaryVariant === "blue"
                      ? styles.onboardingGeneratedSecondaryLinkBlue
                      : styles.onboardingGeneratedSecondaryLink)
                  }
                  onClick={config.onSecondaryClick}
                >
                  {config.secondaryLabel}
                </button>
                </div>
        
                <div className={styles.onboardingGeneratedFooterBackSlot} />
              </div>
        
              <div className={styles.onboardingGeneratedProgress}>
                <div className={styles.onboardingGeneratedProgressTrack}>
                  <div
                    className={styles.onboardingGeneratedProgressFill}
                    style={{ width: config.progressWidth }}
                  />
                </div>
              </div>
            </div>
          );
        }


  return (
    <>
      <main
        className={`${styles.dashboardShell} ${
          isOnboardingModalOpen ? styles.dashboardShellBlurred : ""
        }`}
      >
        <section className={styles.dashboard}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarInner}>
              <div className={styles.sidebarTop}>
                {topItems.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        styles.navItem,
                        styles[item.activeClass],
                        active ? styles.isActive : "",
                      ].join(" ")}
                    >
                      <span className={styles.navIconWrap}>
                        <span className={styles.navGlow} />
                        <img className={styles.navIcon} src={item.icon} alt="" />
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className={styles.sidebarBottom}>
                {bottomItems.map((item) => {
                  if (item.href === "/dashboard/invite") {
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => setIsInviteOpen(true)}
                        className={[styles.navItem, styles[item.activeClass]].join(" ")}
                      >
                        <span className={styles.navIconWrap}>
                          <span className={styles.navGlow} />
                          <img className={styles.navIcon} src={item.icon} alt="" />
                        </span>
                        <span className={styles.navLabel}>{item.label}</span>
                      </button>
                    );
                  }

                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        styles.navItem,
                        styles[item.activeClass],
                        active ? styles.isActive : "",
                      ].join(" ")}
                    >
                      <span className={styles.navIconWrap}>
                        <span className={styles.navGlow} />
                        <img className={styles.navIcon} src={item.icon} alt="" />
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className={styles.mainShell}>
            <header className={styles.topbar}>
              <div className={styles.topbarLeft}>
                <button className={styles.workspaceSwitcher} type="button">
                <span className={styles.workspaceName}>{cabinetName}</span>
                  <span className={styles.workspaceChevron} />
                </button>
              </div>

              <div className={styles.topbarCenter}>
                <div className={styles.searchWrap}>
                  <img className={styles.searchIcon} src="/imgs/search.png" alt="" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Rechercher"
                    autoComplete="off"
                  />
                  <span className={styles.searchAvatar}>
                    <img src="/imgs/Lisa_Avatar-min.webp" alt="" />
                  </span>
                </div>
              </div>

              <div className={styles.topbarRight}>
              <button
                className={styles.microBtn}
                type="button"
                aria-label="Ajouter une note vocale"
                onClick={() => router.push("/dashboard/chat?mic=1")}
              >
                <img src="/imgs/mic-notes.png" alt="" />
              </button>

                <div className={styles.profileMenuWrap} ref={profileMenuRef}>
                  <button
                    className={styles.profileBtn}
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                  >
                  <span className={styles.profileAvatar}>
                    {userInitials}
                    <span className={styles.profileOnlineDot} />
                  </span>
                  </button>

                  {isProfileMenuOpen && (
                  <div className={styles.profileDropdown} role="menu">
                    <div className={styles.profileDropdownHeader}>
                      <div className={styles.profileDropdownName}>{userDisplayName}</div>
                      <div className={styles.profileDropdownStatus}>En ligne</div>
                    </div>

                    <button
                      type="button"
                      className={styles.profileDropdownItem}
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                    >
                      {isSigningOut ? "Déconnexion..." : "Se déconnecter"}
                    </button>
                  </div>
                )}
                </div>
              </div>
            </header>

            <section className={styles.content}>
              <div className={styles.contentInner}>{children}</div>
            </section>
          </div>
        </section>
      </main>

      {isOnboardingModalOpen && (
        <div className={styles.onboardingOverlay}>
          <div className={styles.onboardingBackdrop} />

          <div
            className={`${styles.onboardingModal} ${
              onboardingStep === "pain_points" ? styles.onboardingModalLight : ""
            } ${
              onboardingStep === "generated_flow" &&
              currentGeneratedScreen?.type === "loading_sequence"
                ? styles.onboardingModalLoadingSequence
                : ""
            } ${
              onboardingStep === "generated_flow" &&
              currentGeneratedScreen?.type === "reassurance"
                ? styles.onboardingModalReassurance
                : ""
            } ${
              onboardingStep === "generated_flow" &&
              currentGeneratedScreen?.type === "setup_question"
                ? styles.onboardingModalSetupQuestion
                : ""
            } ${
              onboardingStep === "generated_flow" &&
              currentGeneratedScreen?.type === "activation_cta"
                ? styles.onboardingModalActivation
                : ""
              } ${
                isMailOutcomeScreen ||
                isPostActeOutcomeScreen ||
                isPatientFilesValueScreen ||
                isPatientFilesOutcomeScreen ||
                isSinglePersonTestimonialScreen ||
                isFinalPaywallScreen
                  ? styles.onboardingModalOutcome
                  : ""
              }`}
          >
            {onboardingStep === "loading" ? (
              <>
                <div className={styles.onboardingLoadingTop}>
                  <img
                    src="/imgs/Lisa_Avatar-min.webp"
                    alt="Lisa"
                    className={styles.onboardingLoadingAvatar}
                  />
                </div>

                <div className={styles.onboardingLoadingCenter}>
                  <h2 className={styles.onboardingLoadingTitle}>
                    Lisa prépare votre cockpit médical intelligent
                  </h2>

                  <div className={styles.onboardingLoadingBarBlock}>
                    <div className={styles.onboardingLoadingBarHeader}>
                      <span>{onboardingBootstrapLabel}</span>
                      <span>{onboardingBootstrapProgress}%</span>
                    </div>

                    <div className={styles.onboardingLoadingBarTrack}>
                      <div
                        className={styles.onboardingLoadingBarFill}
                        style={{ width: `${onboardingBootstrapProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.onboardingLoadingFooter}>
                  <div className={styles.onboardingLaurelStat}>
                    <img
                      src="/imgs/laurel_left.png"
                      alt=""
                      className={styles.onboardingLaurelSide}
                    />

                    <div className={styles.onboardingLaurelContent}>
                      <div className={styles.onboardingLaurelValue}>4.8</div>
                      <div className={styles.onboardingLaurelLabel}>Note Google</div>
                    </div>

                    <img
                      src="/imgs/laurel_right.png"
                      alt=""
                      className={styles.onboardingLaurelSide}
                    />
                  </div>

                  <div className={styles.onboardingLaurelStat}>
                    <img
                      src="/imgs/laurel_left.png"
                      alt=""
                      className={styles.onboardingLaurelSide}
                    />

                    <div className={styles.onboardingLaurelContent}>
                      <div className={styles.onboardingLaurelValue}>100+</div>
                      <div className={styles.onboardingLaurelLabel}>
                        médecins travaillent avec Lisa
                      </div>
                    </div>

                    <img
                      src="/imgs/laurel_right.png"
                      alt=""
                      className={styles.onboardingLaurelSide}
                    />
                  </div>
                </div>
              </>
            ) : onboardingStep === "pain_points" ? (
              <div className={styles.onboardingPainPointsScreen}>
                <div className={styles.onboardingPainPointsHeader}>
                  <div className={styles.onboardingPainPointsHeaderLeft}>
                    <img
                      src="/imgs/Lisa_Avatar-min.webp"
                      alt="Lisa"
                      className={styles.onboardingPainPointsHeaderAvatar}
                    />
                    <span className={styles.onboardingPainPointsHeaderBrand}>
                      HeyLisa
                    </span>
                  </div>

                  <div className={styles.onboardingPainPointsHeaderRight}>
                    Bienvenue, {onboardingWelcomeName}
                  </div>
                </div>

                <div className={styles.onboardingPainPointsMain}>
                  <h2 className={styles.onboardingPainPointsTitle}>
                    Qu’est ce qui vous pèse le plus sur le cabinet actuellement ?
                  </h2>

                  <p className={styles.onboardingPainPointsSubtitle}>
                    Vous pouvez choisir jusqu’à 3 sujets maximum, Lisa saura ainsi comment mieux vous accompagner.
                  </p>

                  <div className={styles.onboardingPainPointsGrid}>
                    {onboardingPainPoints.map((painPoint) => {
                      const isSelected = selectedPainPointIds.includes(painPoint.id);
                      const isHovered = hoveredPainPointId === painPoint.id;

                      return (
                        <div key={painPoint.id} className={styles.onboardingPainPointItem}>
                          <button
                            type="button"
                            className={`${styles.onboardingPainPointCard} ${
                              isSelected ? styles.onboardingPainPointCardSelected : ""
                            }`}
                            onClick={() => handleTogglePainPoint(painPoint.id)}
                            onMouseEnter={() => handlePainPointMouseEnter(painPoint.id)}
                            onMouseLeave={handlePainPointMouseLeave}
                          >
                            <span className={styles.onboardingPainPointRadio}>
                              {isSelected ? "●" : "○"}
                            </span>

                            <div className={styles.onboardingPainPointImageWrap}>
                              <img
                                src={painPoint.image}
                                alt=""
                                className={styles.onboardingPainPointImage}
                              />
                            </div>

                            <div className={styles.onboardingPainPointLabel}>
                              {painPoint.label}
                            </div>
                          </button>

                          {isHovered && (
                            <div className={styles.onboardingPainPointTooltip}>
                              {painPoint.description}
                            </div>
                          )}

                          {isSelected && (
                            <div className={styles.onboardingPainPointMobileDetail}>
                              {painPoint.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {renderOnboardingFooter(onboardingFooterConfig)}
              </div>
            ) : currentGeneratedScreen ? (
              currentGeneratedScreen.type === "loading_sequence" ? (
                <div
                  key={currentGeneratedScreen.id}
                  className={styles.onboardingGeneratedLoadingScreen}
                >
                  <div className={styles.onboardingGeneratedLoadingBrand}>
                    <img
                      src="/imgs/Lisa_Avatar-min.webp"
                      alt="Lisa"
                      className={styles.onboardingGeneratedLoadingBrandAvatar}
                    />
                    <span className={styles.onboardingGeneratedLoadingBrandText}>
                      HeyLisa
                    </span>
                  </div>

                  <div className={styles.onboardingGeneratedLoadingBody}>
                    <h2 className={styles.onboardingGeneratedLoadingTitle}>
                      {currentGeneratedScreen.title}
                    </h2>

                    <div className={styles.onboardingGeneratedLoadingPanel}>
                      <div className={styles.onboardingGeneratedLoadingRow}>
                        <div className={styles.onboardingGeneratedLoadingRowTop}>
                          <span>{currentGeneratedScreen.progressLabel ?? "Définition des priorités"}</span>
                          <span>{sequenceProgressA}%</span>
                        </div>

                        <div className={styles.onboardingGeneratedLoadingRowTrack}>
                          <div
                            className={styles.onboardingGeneratedLoadingRowFill}
                            style={{ width: `${sequenceProgressA}%` }}
                          />
                        </div>
                      </div>

                      {sequenceProgressA >= 100 && (
                        <div className={styles.onboardingGeneratedLoadingRow}>
                          <div className={styles.onboardingGeneratedLoadingRowTop}>
                            <span>
                              {currentGeneratedScreen.progressLabelSecondary ??
                                "Rédaction du protocole de gestion des flux patients"}
                            </span>
                            <span>{sequenceProgressB}%</span>
                          </div>

                          <div className={styles.onboardingGeneratedLoadingRowTrack}>
                            <div
                              className={`${styles.onboardingGeneratedLoadingRowFill} ${styles.onboardingGeneratedLoadingRowFillSecondary}`}
                              style={{ width: `${sequenceProgressB}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  ) : currentGeneratedScreen.type === "reassurance" ? (
                    <div className={styles.onboardingGeneratedReassuranceScreen}>
                      <div className={styles.onboardingGeneratedHeader}>
                        <div className={styles.onboardingGeneratedHeaderLeft}>
                          <img
                            src="/imgs/Lisa_Avatar-min.webp"
                            alt="Lisa"
                            className={styles.onboardingGeneratedHeaderAvatar}
                          />
                          <span className={styles.onboardingGeneratedHeaderBrand}>
                            HeyLisa
                          </span>
                        </div>
                      </div>

                      <div className={styles.onboardingGeneratedReassuranceBody}>
                        <h2 className={styles.onboardingGeneratedReassuranceTitle}>
                          {currentGeneratedScreen.title}
                        </h2>

                        {/* 🔥 NOUVEAU CAS PEER */}
                        {currentGeneratedScreen.id === "peer_interaction_reassurance" ? (
                          <>
                            {currentGeneratedScreen.subtitle && (
                              <p className={styles.onboardingGeneratedReassuranceSubtitleCentered}>
                                {currentGeneratedScreen.subtitle}
                              </p>
                            )}

                            <div className={styles.onboardingGeneratedCollabVisualWrap}>
                            <img
                              src="/imgs/collab-chat-preview.png"
                              alt="Espace de discussion entre confrères avec Lisa"
                              className={styles.onboardingGeneratedCollabVisual}
                            />
                            </div>
                          </>
                        ) : (
                          /* ✅ TON COMPORTEMENT ORIGINAL RESTAURÉ */
                          <>
                            {isAppointmentsReassuranceScreen ? (
                              <>
                                {currentGeneratedScreen.body && (
                                  <p className={styles.onboardingGeneratedReassuranceSubtitleSimple}>
                                    {currentGeneratedScreen.body}
                                  </p>
                                )}

                                <div className={styles.onboardingGeneratedAppointmentsProofWrap}>
                                  <img
                                    src="/imgs/appointments-proof-before-after.png"
                                    alt="Avant après de l’optimisation du planning médical par Lisa"
                                    className={styles.onboardingGeneratedAppointmentsProofImage}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={styles.onboardingGeneratedReassuranceVisualWrap}>
                                  <img
                                    src={currentGeneratedScreen.visual ?? "/imgs/placeholder-mail-proof.png"}
                                    alt=""
                                    className={styles.onboardingGeneratedReassuranceVisual}
                                  />
                                </div>

                                <div className={styles.onboardingGeneratedReassuranceFeatured}>
                                  HeyLisa a déjà retenu l’attention de :
                                </div>

                                <div className={styles.onboardingGeneratedReassuranceLogos}>
                                  <img src="/imgs/Tech-Crunch_logo.png" alt="TechCrunch" />
                                  <img src="/imgs/Forbes_logo.webp" alt="Forbes" />
                                  <img src="/imgs/Logo_Maddyness.png" alt="Maddyness" />
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {renderOnboardingFooter(onboardingFooterConfig)}
                    </div>

                    ) : currentGeneratedScreen.type === "paywall" ? (
                      <div className={styles.onboardingGeneratedOutcomeScreen}>
                        <div className={styles.onboardingGeneratedHeader}>
                          <div className={styles.onboardingGeneratedHeaderLeft}>
                            <img
                              src="/imgs/Lisa_Avatar-min.webp"
                              alt="Lisa"
                              className={styles.onboardingGeneratedHeaderAvatar}
                            />
                            <span className={styles.onboardingGeneratedHeaderBrand}>
                              HeyLisa
                            </span>
                          </div>
                        </div>

                        <div className={styles.onboardingGeneratedOutcomeBody}>
                          
                          {/* TITLE */}
                          <h2 className={styles.onboardingGeneratedOutcomeTitle}>
                            {finalPaywallTitle}
                          </h2>

                          <p className={styles.onboardingGeneratedOutcomeSubtitle}>
                            {finalPaywallSubtitle}
                          </p>

                          {/* TOGGLE */}
                          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                            <button
                              onClick={() => setBillingCycle("monthly")}
                              style={{
                                padding: "8px 14px",
                                borderRadius: 999,
                                border: "1px solid rgba(0,0,0,0.1)",
                                background: billingCycle === "monthly" ? "#111" : "#fff",
                                color: billingCycle === "monthly" ? "#fff" : "#111",
                                cursor: "pointer",
                              }}
                            >
                              Mensuel
                            </button>

                            <button
                              onClick={() => setBillingCycle("annual")}
                              style={{
                                padding: "8px 14px",
                                borderRadius: 999,
                                border: "1px solid rgba(0,0,0,0.1)",
                                background: billingCycle === "annual" ? "#111" : "#fff",
                                color: billingCycle === "annual" ? "#fff" : "#111",
                                cursor: "pointer",
                              }}
                            >
                              Annuel (-20%)
                            </button>
                          </div>

                          {/* PLANS */}
                          <div
                            style={{
                              marginTop: 30,
                              display: "grid",
                              gridTemplateColumns: "repeat(2, minmax(320px, 360px))",
                              gap: 18,
                              justifyContent: "center",
                              alignItems: "stretch",
                            }}
                          >
                            {PAYWALL_PLANS.map((plan) => {
                              const isSelected = selectedPaywallPlanId === plan.id;
                              const isPremium = plan.id === "premium";

                              const price =
                                billingCycle === "annual"
                                  ? plan.annualMonthlyPrice
                                  : plan.monthlyPrice;

                              return (
                                <button
                                  key={plan.id}
                                  type="button"
                                  onClick={() => setSelectedPaywallPlanId(plan.id)}
                                  style={{
                                    position: "relative",
                                    textAlign: "left",
                                    borderRadius: 26,
                                    padding: "22px 22px 20px",
                                    background: "#ffffff",
                                    border: isSelected
                                      ? "2px solid #111111"
                                      : "1px solid rgba(17,17,17,0.08)",
                                    boxShadow: isSelected
                                      ? "0 16px 38px rgba(17,17,17,0.08)"
                                      : "0 8px 24px rgba(17,17,17,0.04)",
                                    cursor: "pointer",
                                    transition: "all 0.18s ease",
                                    minHeight: 420,
                                  }}
                                >
                                  {isPremium && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: 14,
                                        right: 14,
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                        background: "#111111",
                                        color: "#ffffff",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        letterSpacing: "-0.01em",
                                      }}
                                    >
                                      Sur mesure
                                    </div>
                                  )}

                                  <div
                                    style={{
                                      fontSize: 22,
                                      fontWeight: 700,
                                      lineHeight: 1.1,
                                      color: "#111111",
                                      letterSpacing: "-0.03em",
                                    }}
                                  >
                                    {plan.name}
                                  </div>

                                  <div
                                    style={{
                                      marginTop: 8,
                                      fontSize: 14,
                                      lineHeight: 1.45,
                                      color: "rgba(17,17,17,0.56)",
                                      minHeight: 42,
                                    }}
                                  >
                                    {plan.description}
                                  </div>

                                  <div
                                    style={{
                                      marginTop: 18,
                                      display: "flex",
                                      alignItems: "flex-end",
                                      gap: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 52,
                                        lineHeight: 0.95,
                                        fontWeight: 700,
                                        color: "#111111",
                                        letterSpacing: "-0.06em",
                                      }}
                                    >
                                      {price}€
                                    </span>

                                    <span
                                      style={{
                                        fontSize: 18,
                                        lineHeight: 1.2,
                                        color: "rgba(17,17,17,0.62)",
                                        marginBottom: 7,
                                      }}
                                    >
                                      / mois
                                    </span>
                                  </div>

                                  {billingCycle === "annual" ? (
                                    <div
                                      style={{
                                        marginTop: 10,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        height: 28,
                                        padding: "0 10px",
                                        borderRadius: 999,
                                        background: "rgba(84, 190, 117, 0.14)",
                                        color: "#2c9b55",
                                        fontSize: 12,
                                        fontWeight: 600,
                                      }}
                                    >
                                      -20% facturés annuellement ({plan.annualTotalLabel})
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        marginTop: 10,
                                        fontSize: 12,
                                        color: "rgba(17,17,17,0.42)",
                                      }}
                                    >
                                      Essai gratuit 7 jours
                                    </div>
                                  )}

                                  <div
                                    style={{
                                      marginTop: 18,
                                      height: 1,
                                      background: "rgba(17,17,17,0.08)",
                                    }}
                                  />

                                  <div
                                    style={{
                                      marginTop: 18,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                    }}
                                  >
                                    {plan.features.map((feature, index) => (
                                      <div
                                        key={index}
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          gap: 9,
                                          fontSize: 14,
                                          lineHeight: 1.45,
                                          color: "rgba(17,17,17,0.78)",
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: "#54be75",
                                            fontWeight: 700,
                                            lineHeight: 1.2,
                                          }}
                                        >
                                          ✓
                                        </span>

                                        <span>
                                          {feature}
                                          {feature === "Gestion des appels entrants du cabinet" && (
                                            <span
                                              style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                marginLeft: 8,
                                                padding: "2px 7px",
                                                borderRadius: 999,
                                                background: "rgba(17,17,17,0.08)",
                                                color: "rgba(17,17,17,0.62)",
                                                fontSize: 11,
                                                fontWeight: 700,
                                                verticalAlign: "middle",
                                              }}
                                            >
                                              Bientôt
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* CTA */}
                          <button
                            onClick={handleStartTrialCheckout}
                            disabled={isCreatingCheckout}
                            className={styles.onboardingGeneratedPrimaryBtn}
                            style={{ marginTop: 32 }}
                          >
                            {isCreatingCheckout ? "Redirection vers Stripe..." : finalPaywallPrimaryLabel}
                          </button>

                          {/* MICRO COPY */}
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 12,
                              color: "rgba(0,0,0,0.5)",
                            }}
                          >
                            {finalPaywallMicroCopy}
                          </div>

                          {/* SECONDARY ACTION */}
                          <button
                            onClick={isBlockedBillingState ? undefined : handleResumeOnboarding}
                            disabled={isBlockedBillingState}
                            title={
                              isBlockedBillingState
                                ? "Indisponible tant que l’abonnement n’est pas réactivé"
                                : undefined
                            }
                            style={{
                              marginTop: 12,
                              background: "none",
                              border: "none",
                              color: isBlockedBillingState ? "rgba(92,124,255,0.35)" : "#5c7cff",
                              cursor: isBlockedBillingState ? "not-allowed" : "pointer",
                              fontSize: 13,
                              opacity: isBlockedBillingState ? 0.7 : 1,
                            }}
                          >
                            {finalPaywallSecondaryLabel}
                          </button>
                        </div>
                      </div>
                  ) : currentGeneratedScreen.type === "setup_question" ? (
                <div className={styles.onboardingGeneratedSetupScreen}>
                  <div className={styles.onboardingGeneratedHeader}>
                    <div className={styles.onboardingGeneratedHeaderLeft}>
                      <img
                        src="/imgs/Lisa_Avatar-min.webp"
                        alt="Lisa"
                        className={styles.onboardingGeneratedHeaderAvatar}
                      />
                      <span className={styles.onboardingGeneratedHeaderBrand}>
                        HeyLisa
                      </span>
                    </div>
                  </div>

                  {isPatientFilesSetupScreen ? (
                  <>
                    <div className={styles.onboardingGeneratedSetupBodyCentered}>
                      <h2 className={styles.onboardingGeneratedSetupTitleCentered}>
                        {currentGeneratedScreen.title}
                      </h2>

                      {currentGeneratedScreen.subtitle ? (
                        <p className={styles.onboardingGeneratedSetupSubtitleCentered}>
                          {currentGeneratedScreen.subtitle}
                        </p>
                      ) : null}

                      <div className={styles.onboardingPatientFilesSliderBlock}>
                        <div className={styles.onboardingPatientFilesSliderValue}>
                          {patientFilesDailyVolume}
                        </div>

                        <input
                          type="range"
                          min={patientFilesSliderMin}
                          max={patientFilesSliderMax}
                          step={1}
                          value={patientFilesDailyVolume}
                          onChange={(event) =>
                            handleSelectSetupOption(
                              "patient_files_daily_volume",
                              String(event.target.value)
                            )
                          }
                          className={styles.onboardingPatientFilesSlider}
                          style={
                            {
                              "--slider-progress": patientFilesSliderProgress,
                            } as React.CSSProperties
                          }
                        />

                        <div className={styles.onboardingPatientFilesSliderScale}>
                          <span>2</span>
                          <span>10</span>
                          <span>20</span>
                          <span>30</span>
                          <span>40+</span>
                        </div>
                      </div>

                      <div className={styles.onboardingPatientFilesInsightCard}>
                        <div className={styles.onboardingPatientFilesInsightTitle}>
                          Gain estimé avec Lisa
                        </div>
                        <div className={styles.onboardingPatientFilesInsightText}>
                          En automatisant la mise à jour des dossiers patients, Lisa peut
                          vous faire gagner environ{" "}
                          <strong>{estimatedWeeklyTimeSaved} heures par semaine</strong> sur
                          le cabinet.
                        </div>
                      </div>
                    </div>

                    {renderOnboardingFooter(onboardingFooterConfig)}
                  </>
                ) : isSinglePersonDependencyScreen ? (
                  <>
                    <div className={styles.onboardingGeneratedSetupBodyCentered}>
                      <h2 className={styles.onboardingGeneratedSetupTitleCentered}>
                        {currentGeneratedScreen.title}
                      </h2>

                      {currentGeneratedScreen.subtitle ? (
                        <p className={styles.onboardingGeneratedSetupSubtitleCentered}>
                          {currentGeneratedScreen.subtitle}
                        </p>
                      ) : null}

                      <div className={styles.onboardingDependencyScale}>
                        {Array.from({ length: 10 }, (_, index) => {
                          const value = index + 1;
                          const selectedValue = Number(setupAnswers.cabinet_dependency_level ?? 0);
                          const isActive = value <= selectedValue;

                          return (
                            <button
                              key={value}
                              type="button"
                              className={`${styles.onboardingDependencyScaleItem} ${
                                isActive ? styles.onboardingDependencyScaleItemActive : ""
                              }`}
                              onClick={() =>
                                handleSelectSetupOption("cabinet_dependency_level", String(value))
                              }
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>

                      <div className={styles.onboardingDependencyScaleLegend}>
                        <span>Pas du tout</span>
                        <span>Complètement sur vous</span>
                      </div>
                    </div>

                    {renderOnboardingFooter(onboardingFooterConfig)}
                  </>
                  ) : isSinglePersonStaffScreen ? (

                  <>
                    <div className={styles.onboardingGeneratedSetupBodyCentered}>
                      <h2 className={styles.onboardingGeneratedSetupTitleCentered}>
                        {currentGeneratedScreen.title}
                      </h2>

                      <div className={styles.onboardingStaffGrid}>
                        {[
                          { id: "0", label: "0", sub: "Vous gérez seul(e)" },
                          { id: "1", label: "1", sub: "1 personne dédiée" },
                          { id: "2", label: "2", sub: "Organisation déjà structurée" },
                          { id: "3_plus", label: "3+", sub: "Cabinet bien staffé" },
                        ].map((option) => {
                          const selected = setupAnswers.staff_count === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={`${styles.onboardingStaffCard} ${
                                selected ? styles.onboardingStaffCardSelected : ""
                              }`}
                              onClick={() =>
                                handleSelectSetupOption("staff_count", option.id)
                              }
                            >
                              <div className={styles.onboardingStaffValue}>
                                {option.label}
                              </div>

                              <div className={styles.onboardingStaffText}>
                                {option.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {renderOnboardingFooter(onboardingFooterConfig)}
                  </>

                ) : (
                  <>
                    <div className={styles.onboardingGeneratedSetupBody}>
                      <h2 className={styles.onboardingGeneratedSetupTitle}>
                        {currentGeneratedScreen.title}
                      </h2>

                      {currentGeneratedScreen.subtitle ? (
                        <p className={styles.onboardingGeneratedSetupSubtitle}>
                          {currentGeneratedScreen.subtitle}
                        </p>
                      ) : null}

                      {currentGeneratedScreen.id === "peer_interaction_vote" ? (
                        <div className={styles.onboardingGeneratedEmojiWrapper}>
                          <div className={styles.onboardingGeneratedEmojiRow}>
                            {(currentGeneratedScreen.options ?? []).map((option) => {
                              console.log("option debug", option);
                              const selected =
                                setupAnswers[currentGeneratedScreen.fieldKey!] === option.id;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={`${styles.onboardingEmojiCard} ${
                                    selected ? styles.onboardingEmojiCardSelected : ""
                                  }`}
                                  onClick={() => {
                                    handleSelectSetupOption(
                                      currentGeneratedScreen.fieldKey!,
                                      option.id
                                    );
                                  
                                    setTimeout(() => {
                                      handleNextGeneratedScreen();
                                    }, 300);
                                  }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>

                          <div className={styles.onboardingGeneratedEmojiLegend}>
                            <span>Pas du tout d’accord</span>
                            <span>Totalement d’accord</span>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.onboardingGeneratedSetupOptions}>
                          {(currentGeneratedScreen.options ?? []).map((option) => {
                            const selected =
                              currentGeneratedScreen.fieldKey
                                ? setupAnswers[currentGeneratedScreen.fieldKey] === option.id
                                : false;

                            return (
                              <button
                                key={option.id}
                                type="button"
                                className={`${styles.onboardingGeneratedSetupOption} ${
                                  selected ? styles.onboardingGeneratedSetupOptionSelected : ""
                                }`}
                                onClick={() =>
                                  currentGeneratedScreen.fieldKey &&
                                  handleSelectSetupOption(
                                    currentGeneratedScreen.fieldKey,
                                    option.id
                                  )
                                }
                              >
                            <div className={styles.onboardingGeneratedSetupOptionContent}>
                            <div className={styles.onboardingGeneratedSetupOptionTitleRow}>
                              <span className={styles.onboardingGeneratedSetupOptionLabel}>
                                {option.label}
                              </span>

                              {option.id === "doctor_and_secretariat" ? (
                                <span className={styles.onboardingGeneratedSetupRecommendedBadge}>
                                  Recommandé
                                </span>
                              ) : null}
                            </div>

                              {option.helperText ? (
                                <div className={styles.onboardingGeneratedSetupOptionHelper}>
                                  {option.helperText}
                                </div>
                              ) : null}
                            </div>

                                <span className={styles.onboardingGeneratedSetupOptionRadio}>
                                  {selected ? "●" : "○"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentGeneratedScreen.fieldKey &&
                        (
                          setupAnswers[currentGeneratedScreen.fieldKey] === "human_secretariat" ||
                          setupAnswers[currentGeneratedScreen.fieldKey] === "doctor_and_secretariat"
                        ) && (
                          <div className={styles.onboardingGeneratedSetupHelperBox}>
                            <p className={styles.onboardingGeneratedSetupHelperText}>
                              Lisa pourra écrire à ce contact si des informations sont manquantes,
                              puis lui transmettre les mails préparés pour validation avant envoi.
                            </p>

                            <input
                              type="email"
                              value={secretariatValidationEmail}
                              onChange={(event) => {
                                const nextValue = event.target.value;

                                setSetupEmailDraft(nextValue);
                                setSetupAnswers((prev) => ({
                                  ...prev,
                                  mail_validation_contact_email: nextValue,
                                }));
                              }}
                              placeholder="Email du secrétariat"
                              className={styles.onboardingGeneratedSetupInput}
                              autoComplete="email"
                            />
                          </div>
                        )}
                    </div>

                    {renderOnboardingFooter(onboardingFooterConfig)}
                  </>
                )}
                </div>
              ) : currentGeneratedScreen.type === "activation_cta" ? (
                <div className={styles.onboardingGeneratedActivationScreen}>
                  <div className={styles.onboardingGeneratedHeader}>
                    <div className={styles.onboardingGeneratedHeaderLeft}>
                      <img
                        src="/imgs/Lisa_Avatar-min.webp"
                        alt="Lisa"
                        className={styles.onboardingGeneratedHeaderAvatar}
                      />
                      <span className={styles.onboardingGeneratedHeaderBrand}>
                        HeyLisa
                      </span>
                    </div>
                  </div>

                  <div className={styles.onboardingGeneratedActivationBody}>
                    <h2 className={styles.onboardingGeneratedActivationTitle}>
                      {currentGeneratedScreen.title}
                    </h2>

                    {currentGeneratedScreen.subtitle ? (
                      <p className={styles.onboardingGeneratedActivationSubtitle}>
                        {currentGeneratedScreen.subtitle}
                      </p>
                    ) : null}

                    <div className={styles.onboardingGeneratedActivationContentRow}>
                    <div className={styles.onboardingGeneratedActivationProviders}>
                        {isAppointmentsActivationScreen ? (
                          <>
                            <button
                              type="button"
                              className={`${styles.onboardingGeneratedProviderCard} ${
                                selectedMailProvider === "doctolib"
                                  ? styles.onboardingGeneratedProviderCardSelected
                                  : ""
                              }`}
                              onClick={() => handleMailProviderSelect("doctolib")}
                            >
                              <div className={styles.onboardingGeneratedProviderIconWrap}>
                                <img
                                  src="/imgs/doctolib.png"
                                  alt=""
                                  className={styles.onboardingGeneratedProviderIcon}
                                />
                              </div>

                              <div className={styles.onboardingGeneratedProviderContent}>
                                <div className={styles.onboardingGeneratedProviderTitle}>
                                  Se connecter avec Doctolib
                                </div>
                                <div className={styles.onboardingGeneratedProviderText}>
                                  Synchroniser l’agenda Doctolib du cabinet
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              className={`${styles.onboardingGeneratedProviderCard} ${
                                selectedMailProvider === "google_calendar"
                                  ? styles.onboardingGeneratedProviderCardSelected
                                  : ""
                              }`}
                              onClick={() => handleMailProviderSelect("google_calendar")}
                            >
                              <div className={styles.onboardingGeneratedProviderIconWrap}>
                                <img
                                  src="/imgs/google_agenda.png"
                                  alt=""
                                  className={styles.onboardingGeneratedProviderIcon}
                                />
                              </div>

                              <div className={styles.onboardingGeneratedProviderContent}>
                                <div className={styles.onboardingGeneratedProviderTitle}>
                                  Se connecter avec Google Agenda
                                </div>
                                <div className={styles.onboardingGeneratedProviderText}>
                                  Synchroniser le calendrier Google du cabinet
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              className={`${styles.onboardingGeneratedProviderCard} ${
                                selectedMailProvider === "microsoft_calendar"
                                  ? styles.onboardingGeneratedProviderCardSelected
                                  : ""
                              }`}
                              onClick={() => handleMailProviderSelect("microsoft_calendar")}
                            >
                              <div className={styles.onboardingGeneratedProviderIconWrap}>
                                <img
                                  src="/imgs/microsoft-calendar.png"
                                  alt=""
                                  className={styles.onboardingGeneratedProviderIcon}
                                />
                              </div>

                              <div className={styles.onboardingGeneratedProviderContent}>
                                <div className={styles.onboardingGeneratedProviderTitle}>
                                  Se connecter avec Microsoft Calendar
                                </div>
                                <div className={styles.onboardingGeneratedProviderText}>
                                  Synchroniser le calendrier Microsoft du cabinet
                                </div>
                              </div>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`${styles.onboardingGeneratedProviderCard} ${styles.onboardingGeneratedProviderGmail} ${
                                selectedMailProvider === "gmail"
                                  ? styles.onboardingGeneratedProviderCardSelected
                                  : ""
                              }`}
                              onClick={() => handleMailProviderSelect("gmail")}
                            >
                              <div className={styles.onboardingGeneratedProviderIconWrap}>
                                <img
                                  src="/imgs/placeholder-gmail.png"
                                  alt=""
                                  className={styles.onboardingGeneratedProviderIcon}
                                />
                              </div>

                              <div className={styles.onboardingGeneratedProviderContent}>
                                <div className={styles.onboardingGeneratedProviderTitle}>
                                  Se connecter avec Gmail
                                </div>
                                <div className={styles.onboardingGeneratedProviderText}>
                                  Le mail du cabinet est hébergé chez Google
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              className={`${styles.onboardingGeneratedProviderCard} ${styles.onboardingGeneratedProviderOutlook} ${
                                selectedMailProvider === "outlook"
                                  ? styles.onboardingGeneratedProviderCardSelected
                                  : ""
                              }`}
                              onClick={() => handleMailProviderSelect("outlook")}
                            >
                              <div className={styles.onboardingGeneratedProviderIconWrap}>
                                <img
                                  src="/imgs/placeholder-outlook.png"
                                  alt=""
                                  className={styles.onboardingGeneratedProviderIcon}
                                />
                              </div>

                              <div className={styles.onboardingGeneratedProviderContent}>
                                <div className={styles.onboardingGeneratedProviderTitle}>
                                  Se connecter avec Outlook
                                </div>
                                <div className={styles.onboardingGeneratedProviderText}>
                                  Le mail du cabinet est hébergé chez Microsoft
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              className={`${styles.onboardingGeneratedProviderCard} ${styles.onboardingGeneratedProviderOther} ${
                                selectedMailProvider === "imap"
                                  ? styles.onboardingGeneratedProviderCardSelected
                                  : ""
                              }`}
                              onClick={() => handleMailProviderSelect("imap")}
                            >
                              <div className={styles.onboardingGeneratedProviderIconWrap}>
                                <img
                                  src="/imgs/placeholder-other-mail.png"
                                  alt=""
                                  className={styles.onboardingGeneratedProviderIcon}
                                />
                              </div>

                              <div className={styles.onboardingGeneratedProviderContent}>
                                <div className={styles.onboardingGeneratedProviderTitle}>
                                  Autre fournisseur mail
                                </div>
                                <div className={styles.onboardingGeneratedProviderText}>
                                  Connexion IMAP ou paramétrage accompagné
                                </div>
                              </div>
                            </button>
                          </>
                        )}
                      </div>

                      <div className={styles.onboardingGeneratedActivationNoticeSide}>
                        {selectedMailProvider ? (
                          <div className={styles.onboardingGeneratedActivationNotice}>
                            <strong>Parfait.</strong>{" "}
                            {isAppointmentsActivationScreen ? (
                              <>
                                Lisa va vous envoyer un mail pour finaliser la synchronisation sécurisée avec{" "}
                                {selectedMailProvider === "doctolib"
                                  ? "Doctolib"
                                  : selectedMailProvider === "google_calendar"
                                  ? "Google Agenda"
                                  : "Microsoft Calendar"}.
                              </>
                            ) : (
                              <>
                                Vous allez recevoir un email avec les instructions sécurisées pour connecter Lisa à votre messagerie{" "}
                                {selectedMailProvider === "gmail"
                                  ? "Gmail"
                                  : selectedMailProvider === "outlook"
                                  ? "Outlook"
                                  : "IMAP"}.
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {renderOnboardingFooter(onboardingFooterConfig)}
                </div>
                ) : isMailOutcomeScreen ? (
                <div className={styles.onboardingGeneratedOutcomeScreen}>
                  <div className={styles.onboardingGeneratedHeader}>
                    <div className={styles.onboardingGeneratedHeaderLeft}>
                      <img
                        src="/imgs/Lisa_Avatar-min.webp"
                        alt="Lisa"
                        className={styles.onboardingGeneratedHeaderAvatar}
                      />
                      <span className={styles.onboardingGeneratedHeaderBrand}>
                        HeyLisa
                      </span>
                    </div>
                  </div>

                  <div className={styles.onboardingGeneratedOutcomeBody}>
                    <h2 className={styles.onboardingGeneratedOutcomeTitle}>
                      {currentGeneratedScreen.title}
                    </h2>

                    {currentGeneratedScreen.subtitle ? (
                      <p className={styles.onboardingGeneratedOutcomeSubtitle}>
                        {currentGeneratedScreen.subtitle}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      className={styles.onboardingGeneratedProtocolBtn}
                      onClick={() => setIsProtocolPreviewOpen(true)}
                    >
                      Voir le protocole complet
                    </button>

                    <button
                      type="button"
                      className={styles.onboardingGeneratedOutcomeVisualWrap}
                      onClick={() => setIsProtocolPreviewOpen(true)}
                    >
                      <img
                        src={currentGeneratedScreen.visual ?? "/imgs/placeholder-protocole-mails-preview.png"}
                        alt=""
                        className={styles.onboardingGeneratedOutcomeVisual}
                      />
                    </button>

                    <div className={styles.onboardingGeneratedBenefits}>
                      <div className={styles.onboardingGeneratedBenefitItem}>
                        <div className={styles.onboardingGeneratedBenefitTitle}>
                          1. Les demandes ne s'accumulent plus
                        </div>
                        <div className={styles.onboardingGeneratedBenefitText}>
                          Les mails sont lus, triés et pris en charge dès leur arrivée.
                        </div>
                      </div>

                      <div className={styles.onboardingGeneratedBenefitItem}>
                        <div className={styles.onboardingGeneratedBenefitTitle}>
                          2. Fini la pression de tout lire et de bien répondre
                        </div>
                        <div className={styles.onboardingGeneratedBenefitText}>
                          Lisa collecte les informations utiles si besoin, prépare les réponses, puis les envoie après validation.
                        </div>
                      </div>

                      <div className={styles.onboardingGeneratedBenefitItem}>
                        <div className={styles.onboardingGeneratedBenefitTitle}>
                          3. Les réponses ne partent plus en retard ou dans l’urgence
                        </div>
                        <div className={styles.onboardingGeneratedBenefitText}>
                          Le cabinet retrouve un rythme fluide, lisible et rassurant pour les patients.
                        </div>
                      </div>

                      <div className={styles.onboardingGeneratedBenefitItem}>
                        <div className={styles.onboardingGeneratedBenefitTitle}>
                          4. Votre organisation devient vraiment robuste
                        </div>
                        <div className={styles.onboardingGeneratedBenefitText}>
                          Même avec un secrétariat en place, tout devient plus structuré, plus fiable et plus résilient face aux absences, aux pics d’activité ou aux imprévus.
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderOnboardingFooter(onboardingFooterConfig)}
                </div>
              ) : isPostActeOutcomeScreen ? (
              <div className={styles.onboardingGeneratedOutcomeScreen}>
                <div className={styles.onboardingGeneratedHeader}>
                  <div className={styles.onboardingGeneratedHeaderLeft}>
                    <img
                      src="/imgs/Lisa_Avatar-min.webp"
                      alt="Lisa"
                      className={styles.onboardingGeneratedHeaderAvatar}
                    />
                    <span className={styles.onboardingGeneratedHeaderBrand}>
                      HeyLisa
                    </span>
                  </div>
                </div>

                <div
                  className={`${styles.onboardingGeneratedOutcomeBody} ${styles.onboardingGeneratedOutcomeBodyPostActeTight}`}
                >
                  <h2 className={styles.onboardingGeneratedOutcomeTitle}>
                    {currentGeneratedScreen.title}
                  </h2>

                  {currentGeneratedScreen.subtitle ? (
                    <p className={styles.onboardingGeneratedOutcomeSubtitle}>
                      {currentGeneratedScreen.subtitle}
                    </p>
                  ) : null}

                  <div className={styles.onboardingGeneratedOutcomeSplit}>
                    <div className={styles.onboardingGeneratedOutcomeSplitVisual}>
                      <img
                        src="/imgs/post-acte-lisa-preview.png"
                        alt="Prévisualisation du travail de Lisa pour les suivis post-actes"
                        className={styles.onboardingGeneratedOutcomeSplitImage}
                      />
                    </div>

                    <div className={styles.onboardingGeneratedOutcomeSplitCompare}>
                      <div className={styles.onboardingGeneratedTextCompareItem}>
                        <div className={styles.onboardingGeneratedTextCompareLabelMuted}>
                          Avant
                        </div>
                        <div className={styles.onboardingGeneratedTextCompareText}>
                          Rédaction manuelle, oublis, retards, relances à refaire.
                        </div>
                      </div>

                      <div className={styles.onboardingGeneratedTextCompareItem}>
                        <div className={styles.onboardingGeneratedTextCompareLabelStrong}>
                          Après
                        </div>
                        <div className={styles.onboardingGeneratedTextCompareTextStrong}>
                          Lisa prépare les courriers. Vous relisez, validez… et c’est prêt.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {renderOnboardingFooter(onboardingFooterConfig)}
              </div>

              ) : isPatientFilesValueScreen ? (
                <div className={styles.onboardingGeneratedOutcomeScreen}>
                  <div className={styles.onboardingGeneratedHeader}>
                    <div className={styles.onboardingGeneratedHeaderLeft}>
                      <img
                        src="/imgs/Lisa_Avatar-min.webp"
                        alt="Lisa"
                        className={styles.onboardingGeneratedHeaderAvatar}
                      />
                      <span className={styles.onboardingGeneratedHeaderBrand}>
                        HeyLisa
                      </span>
                    </div>
                  </div>

                  <div className={styles.onboardingPatientFilesValueBody}>
                    <h2 className={styles.onboardingPatientFilesValueTitle}>
                      {currentGeneratedScreen.title}
                    </h2>

                    {currentGeneratedScreen.subtitle ? (
                      <p className={styles.onboardingPatientFilesValueSubtitle}>
                        Avec <strong>{patientFilesDailyVolume} patients par jour</strong>, quand le contexte
                        clinique est incomplet, le risque d’erreur augmente. Lisa remet
                        automatiquement les bonnes informations au bon moment pour faire
                        baisser ce risque.
                      </p>
                    ) : null}

                    <div className={styles.onboardingPatientFilesChartCard}>
                      <div className={styles.onboardingPatientFilesChartTop}>
                        <div className={styles.onboardingPatientFilesChartTopLabel}>
                          Risque de diagnostic avec contexte incomplet
                        </div>

                        <div className={styles.onboardingPatientFilesChartLegend}>
                          <div className={styles.onboardingPatientFilesChartLegendItem}>
                            <span className={styles.onboardingPatientFilesChartLegendDot} />
                            <span>Sans Lisa</span>
                          </div>

                          <div className={styles.onboardingPatientFilesChartLegendItemAlt}>
                            <span className={styles.onboardingPatientFilesChartLegendDotAlt} />
                            <span>Avec Lisa</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.onboardingPatientFilesChartCanvas}>
                        <div className={styles.onboardingPatientFilesChartFrame}>
                          <div className={styles.onboardingPatientFilesYAxis}>
                            <span>15%</span>
                            <span>10%</span>
                            <span>5%</span>
                            <span>0%</span>
                          </div>

                          <div className={styles.onboardingPatientFilesPlotArea}>
                            <svg
                              viewBox="0 0 520 280"
                              className={styles.onboardingPatientFilesChartSvg}
                              preserveAspectRatio="none"
                            >
                              <line x1="0" y1="40" x2="520" y2="40" className={styles.onboardingPatientFilesGrid} />
                              <line x1="0" y1="95" x2="520" y2="95" className={styles.onboardingPatientFilesGrid} />
                              <line x1="0" y1="150" x2="520" y2="150" className={styles.onboardingPatientFilesGrid} />
                              <line x1="0" y1="205" x2="520" y2="205" className={styles.onboardingPatientFilesGrid} />
                              <path
                                d={buildPatientFilesAreaPath(patientFilesRiskTrend.withoutLisa)}
                                className={styles.onboardingPatientFilesCurvePrimaryArea}
                              />
                              <path
                                d={buildPatientFilesCurvePath(patientFilesRiskTrend.withoutLisa)}
                                className={styles.onboardingPatientFilesCurvePrimary}
                              />
                              <path
                                id="patient-files-lisa-curve"
                                d={buildPatientFilesCurvePath(patientFilesRiskTrend.withLisa)}
                                className={styles.onboardingPatientFilesCurveSecondary}
                              />
                              <circle
                                r="5"
                                className={styles.onboardingPatientFilesFocusDot}
                              >
                                <animateMotion
                                  dur="1.45s"
                                  begin="0s"
                                  fill="freeze"
                                  keyPoints="0;1"
                                  keyTimes="0;1"
                                  calcMode="linear"
                                >
                                  <mpath href="#patient-files-lisa-curve" />
                                </animateMotion>
                              </circle>

                              <circle
                                r="10"
                                className={styles.onboardingPatientFilesFocusDotPulse}
                              >
                                <animateMotion
                                  dur="1.45s"
                                  begin="0s"
                                  fill="freeze"
                                  keyPoints="0;1"
                                  keyTimes="0;1"
                                  calcMode="linear"
                                >
                                  <mpath href="#patient-files-lisa-curve" />
                                </animateMotion>
                              </circle>
                            </svg>
                          </div>

                          <div className={styles.onboardingPatientFilesXAxis}>
                            <span>1</span>
                            <span>10</span>
                            <span>25</span>
                            <span>50</span>
                            <span className={styles.onboardingPatientFilesXAxisLast}>
                              100
                              <span className={styles.onboardingPatientFilesXAxisUnit}>Patients/jour</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.onboardingPatientFilesChartInsight}>
                        <div className={styles.onboardingPatientFilesInsightLogoBlock}>
                          <img
                            src="/imgs/logo-oms.png"
                            alt="OMS"
                            className={styles.onboardingPatientFilesInsightLogoImage}
                          />
                          <a
                            href="https://www.who.int/news-room/fact-sheets/detail/patient-safety"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.onboardingPatientFilesInsightSourceBtn}
                          >
                            Source
                          </a>
                        </div>

                        <div className={styles.onboardingPatientFilesChartInsightText}>
                          <strong>L’OMS</strong> indique que les erreurs diagnostics surviennent
                          dans 5 à 20% des interactions médecin-patient, et que la plupart des
                          gens connaîtront au moins une erreur diagnostic au cours de leur vie.
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderOnboardingFooter(onboardingFooterConfig)}
                </div>

                ) : isSinglePersonTestimonialScreen ? (
                  <div className={styles.onboardingGeneratedOutcomeScreen}>
                    <div className={styles.onboardingGeneratedHeader}>
                      <div className={styles.onboardingGeneratedHeaderLeft}>
                        <img
                          src="/imgs/Lisa_Avatar-min.webp"
                          alt="Lisa"
                          className={styles.onboardingGeneratedHeaderAvatar}
                        />
                        <span className={styles.onboardingGeneratedHeaderBrand}>
                          HeyLisa
                        </span>
                      </div>
                    </div>

                    <div className={styles.onboardingGeneratedOutcomeBody}>
                      <h2 className={styles.onboardingGeneratedOutcomeTitle}>
                        “Même avec deux secrétaires, Lisa a rendu notre cabinet beaucoup plus fluide et plus serein.”
                      </h2>

                      <p className={styles.onboardingGeneratedOutcomeSubtitle}>
                        Une équipe humaine reste précieuse. Lisa ajoute une couche d’exécution, de continuité et de fiabilité qui évite que tout repose encore sur une seule personne.
                      </p>

                      <div className={styles.onboardingSinglePersonTestimonialCard}>
                      <div className={styles.onboardingSinglePersonTestimonialHeader}>
                          <img
                            src="/imgs/dr-AmzraP.png"
                            alt=""
                            className={styles.onboardingSinglePersonTestimonialAvatar}
                          />

                          <div className={styles.onboardingSinglePersonTestimonialMeta}>
                            <div className={styles.onboardingSinglePersonTestimonialName}>
                              Dr Amzra M.
                            </div>
                            <div className={styles.onboardingSinglePersonTestimonialRole}>
                              Médecin généraliste
                            </div>
                          </div>

                          <div className={styles.onboardingSinglePersonTestimonialStars}>
                            <span>★</span>
                            <span>★</span>
                            <span>★</span>
                            <span>★</span>
                            <span>★</span>
                          </div>
                        </div>

                        <div className={styles.onboardingSinglePersonTestimonialText}>
                          “Je ne savais pas où commencer pour soulager mes équipes au secrétariat
                          puis j'ai essayé Lisa (secrétaire IA) avec beaucoup de réticence j'avoue. Mais quelle belle surprise ! 
                          Equipe au complet ou non, grosse semaine ou non, aujourd’hui le cabinet tourne beaucoup mieux.”
                        </div>
                      </div>

                      <div className={styles.onboardingSinglePersonScenarioGrid}>
                        {singlePersonScenarioCards.map((scenario) => (
                          <div
                            key={scenario.id}
                            className={styles.onboardingSinglePersonScenarioCard}
                          >
                            <div className={styles.onboardingSinglePersonScenarioTitle}>
                              {scenario.title}
                            </div>

                            <div className={styles.onboardingSinglePersonMetrics}>
                              {scenario.metrics.map((metric) => (
                                <div
                                  key={metric.label}
                                  className={styles.onboardingSinglePersonMetricBlock}
                                >
                                  <div className={styles.onboardingSinglePersonMetricLabel}>
                                    {metric.label}
                                  </div>

                                  <div className={styles.onboardingSinglePersonMetricRows}>
                                    <div className={styles.onboardingSinglePersonMetricRow}>
                                      <div className={styles.onboardingSinglePersonMetricRowTop}>
                                      <span style={{ opacity: 0.7 }}>{scenario.withoutLisaLabel}</span>
                                        <span>{metric.withoutLisa}%</span>
                                      </div>
                                      <div className={styles.onboardingSinglePersonMetricTrack}>
                                      <div
                                        className={`${styles.onboardingSinglePersonMetricBarMuted} ${styles.onboardingSinglePersonMetricBarAnimated}`}
                                        style={{ ["--target-width" as string]: `${metric.withoutLisa}%` }}
                                      />
                                      </div>
                                    </div>

                                    <div className={styles.onboardingSinglePersonMetricRow}>
                                      <div className={styles.onboardingSinglePersonMetricRowTop}>
                                        <span>{scenario.withLisaLabel}</span>
                                        <span>{metric.withLisa}%</span>
                                      </div>
                                      <div className={styles.onboardingSinglePersonMetricTrack}>
                                      <div
                                        className={`${styles.onboardingSinglePersonMetricBarStrong} ${styles.onboardingSinglePersonMetricBarAnimated}`}
                                        style={{ ["--target-width" as string]: `${metric.withLisa}%` }}
                                      />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {renderOnboardingFooter(onboardingFooterConfig)}
                  </div>

              ) : (

                <div className={styles.onboardingGeneratedScreen}>
                  <div className={styles.onboardingGeneratedHeader}>
                    <div className={styles.onboardingGeneratedHeaderLeft}>
                      <img
                        src="/imgs/Lisa_Avatar-min.webp"
                        alt="Lisa"
                        className={styles.onboardingGeneratedHeaderAvatar}
                      />
                      <span className={styles.onboardingGeneratedHeaderBrand}>
                        HeyLisa
                      </span>
                    </div>
                  </div>

                  <div className={styles.onboardingGeneratedBody}>
                    <h2 className={styles.onboardingGeneratedTitle}>
                      {currentGeneratedScreen.title}
                    </h2>

                    {currentGeneratedScreen.subtitle ? (
                      <p className={styles.onboardingGeneratedSubtitle}>
                        {currentGeneratedScreen.subtitle}
                      </p>
                    ) : null}
                  </div>

                  <div className={styles.onboardingGeneratedActions}>
                    <button
                      type="button"
                      className={styles.onboardingGeneratedPrimaryBtn}
                      onClick={handleNextGeneratedScreen}
                      disabled={generatedOnboardingIndex >= generatedOnboardingFlow.length - 1}
                    >
                      {currentGeneratedScreen.ctaLabel ?? "Continuer"}
                    </button>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}
      {isProtocolPreviewOpen && (
        <div className={styles.onboardingProtocolOverlay}>
          <div
            className={styles.onboardingProtocolBackdrop}
            onClick={() => setIsProtocolPreviewOpen(false)}
          />

          <div className={styles.onboardingProtocolModal}>
            <button
              type="button"
              className={styles.onboardingProtocolClose}
              onClick={() => setIsProtocolPreviewOpen(false)}
            >
              Fermer
            </button>

            <iframe
              src="https://heylisa.io/process-cabinet/"
              title="Protocole de gestion des mails"
              className={styles.onboardingProtocolFrame}
            />
          </div>
        </div>
      )}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen && !shouldOpenReactivationPaywall}
        mode="soft"
        onClose={handleCloseSubscriptionModal}
        onSelectAnnual={() => console.log("annual")}
        onSelectMonthly={() => console.log("monthly")}
      />
    </>
  );
}