//app/dashboard/patients/PatientsDemoView.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type DemoUploadedDocument = {
  id: string;
  file_name: string;
  file_ext: string | null;
  mime_type: string;
  file_size: number;
  upload_status: string;
  analysis_status: string;
  analysis_text: string | null;
  analysis_json: {
    type_doc: string;
    resume: string;
    elements_cles: string[];
    alertes: string[];
    suites_recommandees: string[];
    references: Array<{
      source: string;
      extrait: string;
      lien: string;
    }>;
    confidence_score: number;
  } | null;
  created_at: string;
  storage_path?: string;
  storage_bucket?: string;
};

type DocumentListItem = {
  id: string;
  title: string;
  type: string;
  date: string;
  status: string;
  preview: string;
  isUploaded?: boolean;
  mime_type?: string;
  storage_path?: string;
  storage_bucket?: string;
  analysis_status?: string;
  analysis_text?: string | null;
  analysis_json?: DemoUploadedDocument["analysis_json"];
};

type PatientNoteRow = {
  id: string;
  patient_id: string | null;
  cabinet_account_id: string;
  public_user_id: string;
  is_demo: boolean;
  note_type: "text" | "audio";
  interaction_type: "consultation" | "exam" | "operation";
  raw_text: string | null;
  clean_text: string | null;
  audio_storage_bucket: string | null;
  audio_storage_path: string | null;
  audio_mime_type: string | null;
  audio_duration_seconds: number | null;
  audio_upload_status: "pending" | "uploaded" | "failed";
  transcription_status: "none" | "pending" | "processing" | "done" | "failed";
  transcription_raw: string | null;
  transcription_source: string | null;
  transcription_completed_at: string | null;
  prepare_followup_email: boolean;
  send_followup_email: boolean;
  send_without_validation: boolean;
  followup_email_status:
    | "not_requested"
    | "to_prepare"
    | "draft_ready"
    | "pending_validation"
    | "sent"
    | "failed";
  followup_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
  followup_email_subject: string | null;
  followup_email_body: string | null;
  detected_intent: "consultation" | "exam" | "operation" | null;
  risk_flag: boolean;
  risk_summary: string;
  risk_items: string[];
};

type PatientNoteItem = {
  id: string;
  title: string;
  summary: string;
  datetime: string;
  author: string;
  content: string;
  hasAudio: boolean;
  audioDuration: string | null;
  audioWaveform: number[];
  isFollowupSent: boolean;
  isDemoNote: boolean;
  followupEmailSubject?: string | null;
  followupEmailBody?: string | null;
  detectedIntent?: "consultation" | "exam" | "operation" | null;
  riskFlag?: boolean;
  riskSummary?: string;
  riskItems?: string[];
  audioStoragePath?: string | null;
  audioStorageBucket?: string | null;
  audioMimeType?: string | null;
  transcriptionStatus?: "none" | "pending" | "processing" | "done" | "failed";
};

type DemoPatientRecord = {
  id: string;
  patient_contact_id: string | null;
  is_demo: boolean;
  patient_code: string | null;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  age_display: string | null;
  primary_doctor_name: string | null;
  trusted_contact_name: string | null;
  trusted_contact_phone: string | null;
  trusted_contact_email: string | null;
  followup_status: string | null;
  current_reason: string | null;
  last_consultation_at: string | null;
  next_followup_at: string | null;
  weight_kg: number | null;
  clinical_summary: string | null;
  medical_context: string | null;
  medical_context_long: string | null;
  vitale_card_status: string | null;
  insurance_status: string | null;
  attention_points_structured: Array<{
    label: string;
    value: string;
    severity?: string;
  }> | null;
  medical_details: Array<{
    id: string;
    title: string;
    status: string;
    severity: "low" | "medium" | "high";
    meta: string;
    summary: string;
  }> | null;
  anatomy_state: {
    selected_detail_id?: string;
    zone?: string;
    severity?: "low" | "medium" | "high";
    label?: string;
    top?: string;
    left?: string;
    width?: string;
    height?: string;
    pointTop?: string;
    pointLeft?: string;
  } | null;
  lisa_summary: string | null;
  lisa_last_updated_at: string | null;
};

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

export default function PatientsDemoView() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDocument, setUploadedDocument] = useState<DemoUploadedDocument | null>(null);
  const [demoDocuments, setDemoDocuments] = useState<DemoUploadedDocument[]>([]);
  const [isLoadingDemoDocuments, setIsLoadingDemoDocuments] = useState(true);
  const [patientMainTab, setPatientMainTab] = useState<"notes" | "history" | "details">("notes");
  const [isLaunchingAnalysis, setIsLaunchingAnalysis] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState("note-1");
  const [selectedDetailId, setSelectedDetailId] = useState("detail-1");
  const [previewDocument, setPreviewDocument] = useState<DocumentListItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isRefreshingAnalysis, setIsRefreshingAnalysis] = useState(false);
  const [openDocumentMenuId, setOpenDocumentMenuId] = useState<string | null>(null);
  const [analysisDocument, setAnalysisDocument] = useState<DocumentListItem | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteInteractionType, setNoteInteractionType] = useState<"consultation" | "exam" | "operation">("consultation");
  const [noteInputType, setNoteInputType] = useState<"text" | "audio">("text");
  const [noteTextValue, setNoteTextValue] = useState("");
  const [prepareFollowupEmail, setPrepareFollowupEmail] = useState(false);
  const [sendFollowupEmail, setSendFollowupEmail] = useState(false);
  const [sendWithoutValidation, setSendWithoutValidation] = useState(false);
  const [isFollowupInfoOpen, setIsFollowupInfoOpen] = useState(false);
  const [demoNotes, setDemoNotes] = useState<PatientNoteRow[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteModalError, setNoteModalError] = useState<string | null>(null);
  const [openSelectedNoteMenu, setOpenSelectedNoteMenu] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [demoPatientRecord, setDemoPatientRecord] = useState<DemoPatientRecord | null>(null);
  const [isLoadingDemoPatientRecord, setIsLoadingDemoPatientRecord] = useState(true);
  const [isFollowupDraftModalOpen, setIsFollowupDraftModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isSendingDraftEmail, setIsSendingDraftEmail] = useState(false);
  const [followupDraftError, setFollowupDraftError] = useState<string | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | null>(null);
  const [noteAudioError, setNoteAudioError] = useState<string | null>(null);
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioLabel, setRecordedAudioLabel] = useState<string | null>(null);
  const [selectedNoteAudioUrl, setSelectedNoteAudioUrl] = useState<string | null>(null);
  const [isLoadingSelectedAudioUrl, setIsLoadingSelectedAudioUrl] = useState(false);
  const [isFollowupRequestModalOpen, setIsFollowupRequestModalOpen] = useState(false);
  const [isRequestingFollowup, setIsRequestingFollowup] = useState(false);
  const [followupRequestError, setFollowupRequestError] = useState<string | null>(null);
  const [isBulkProcessOpen, setIsBulkProcessOpen] = useState(false);
  const [bulkSelectedIntent, setBulkSelectedIntent] = useState<string>("");


  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const noteAudioInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Supprimer cette note ?")) return;
  
    try {
      const res = await fetch(`/api/patient-notes/${noteId}`, {
        method: "DELETE",
      });
  
      const payload = await res.json();
  
      if (!res.ok) {
        console.error("Delete failed:", payload);
        return;
      }
  
      const refreshedNotes = await loadDemoNotes({ silent: true });
  
      if (selectedNoteId === noteId) {
        const nextDemoNote = refreshedNotes[0];
  
        if (nextDemoNote) {
          setSelectedNoteId(nextDemoNote.id);
        } else {
          setSelectedNoteId(staticNotes[0]?.id ?? "");
        }
      }
  
      setOpenSelectedNoteMenu(false);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };
  const staticNotes: PatientNoteItem[] = [
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
      isFollowupSent: false,
      isDemoNote: false,
      followupEmailSubject: null,
      followupEmailBody: null,
      detectedIntent: null,
      riskFlag: false,
      riskSummary: "",
      riskItems: [],
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
      isFollowupSent: false,
      isDemoNote: false,
      followupEmailSubject: null,
      followupEmailBody: null,
      detectedIntent: null,
      riskFlag: false,
      riskSummary: "",
      riskItems: [],
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
      isFollowupSent: false,
      isDemoNote: false,
      followupEmailSubject: null,
      followupEmailBody: null,
      detectedIntent: null,
      riskFlag: false,
      riskSummary: "",
      riskItems: [],
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

  const bulkActionOptions = [
    {
      id: "records",
      label: "Créer / mettre à jour des dossiers patients",
      icon: "↓",
    },
    {
      id: "colleague_letters",
      label: "Préparer comptes-rendus pour confrères",
      icon: "⟳",
    },
    {
      id: "pathology_review",
      label: "Analyser dossier pathologique",
      icon: "◔",
    },
    {
      id: "patient_letters",
      label: "Rédiger courrier patients",
      icon: "⌘",
    },
  ] as const;
  
  const patientLetterSubOptions = [
    "ANAPATH",
    "Biologie",
    "Imagerie",
  ];
  
  const bulkHelperTextByIntent: Record<string, string> = {
    records:
      "Je vais analyser les documents chargés pour identifier les patients concernés, créer les dossiers manquants et enrichir ceux déjà existants. Vous pouvez préciser ici toute consigne particulière.",
    colleague_letters:
      "Je vais préparer des comptes-rendus structurés à destination des confrères à partir des documents chargés. Vous pouvez préciser ici le ton, la longueur ou les éléments à mettre en avant.",
    pathology_review:
      "Je vais analyser les dossiers pathologiques transmis, en structurant les éléments utiles au suivi médical. Vous pouvez ajouter ici des consignes d’analyse ou de restitution.",
    patient_letters:
      "Je vais rédiger des courriers patients à partir des documents chargés. Sélectionnez si besoin un type de courrier ci-dessus et ajoutez ici vos instructions complémentaires.",
  };
  
  const bulkDefaultHelperText =
    "Choisissez l’action que vous souhaitez que j’effectue et n’hésitez pas à me communiquer toute information complémentaire que vous jugerez utile en me glissant un message ici.";
  
  const [bulkInstructions, setBulkInstructions] = useState("");
  const [bulkSelectedSubOptions, setBulkSelectedSubOptions] = useState<string[]>([]);
  
  const bulkHelperText =
    bulkSelectedIntent && bulkHelperTextByIntent[bulkSelectedIntent]
      ? bulkHelperTextByIntent[bulkSelectedIntent]
      : bulkDefaultHelperText;
  
  function handleSelectBulkIntent(intent: string) {
    setBulkSelectedIntent(intent);
  
    if (intent !== "patient_letters") {
      setBulkSelectedSubOptions([]);
    }
  }
  
  function handleToggleBulkSubOption(option: string) {
    setBulkSelectedSubOptions((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  }
  
  const notes: PatientNoteItem[] = [
    ...demoNotes.map((note) => {
      const content =
        note.clean_text?.trim() ||
        note.raw_text?.trim() ||
        (note.note_type === "audio"
          ? note.transcription_status === "failed"
            ? "Transcription indisponible pour le moment."
            : "Transcription en cours..."
          : "");
  
          const safeAudioDurationSeconds =
          typeof note.audio_duration_seconds === "number" &&
          Number.isFinite(note.audio_duration_seconds) &&
          note.audio_duration_seconds >= 0
            ? note.audio_duration_seconds
            : null;
        
        const formattedAudioDuration =
          note.note_type === "audio" && safeAudioDurationSeconds !== null
            ? `${Math.floor(safeAudioDurationSeconds / 60)
                .toString()
                .padStart(2, "0")}:${Math.floor(safeAudioDurationSeconds % 60)
                .toString()
                .padStart(2, "0")}`
            : "00:00";
  
      return {
        id: note.id,
        title: getInteractionTitle(note.interaction_type),
        summary: buildNoteSummary(content),
        datetime: formatNoteDateTime(note.created_at),
        author: "Dr Martin",
        content,
        hasAudio: note.note_type === "audio",
        audioDuration: formattedAudioDuration,
        audioWaveform: [],
        isFollowupSent: note.followup_email_status === "sent",
        isDemoNote: true,
        followupEmailSubject: note.followup_email_subject ?? null,
        followupEmailBody: note.followup_email_body ?? null,
        detectedIntent: note.detected_intent ?? null,
        riskFlag: note.risk_flag === true,
        riskSummary: note.risk_summary ?? "",
        riskItems: Array.isArray(note.risk_items) ? note.risk_items : [],
        audioStoragePath: note.audio_storage_path ?? null,
        audioStorageBucket: note.audio_storage_bucket ?? null,
        audioMimeType: note.audio_mime_type ?? null,
        transcriptionStatus: note.transcription_status,
      };
    }),
    ...staticNotes,
  ];
  
  const selectedNote =
    notes.find((note) => note.id === selectedNoteId) ?? notes[0];

  const selectedNoteHasDraft =
    !!selectedNote?.followupEmailSubject && !!selectedNote?.followupEmailBody;

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
  const patientFullName = buildPatientFullName(demoPatientRecord);
  const patientAgeDisplay = demoPatientRecord?.age_display ?? "52 ans";
  const patientBirthDate = demoPatientRecord?.date_of_birth
    ? formatShortDate(demoPatientRecord.date_of_birth)
    : "14/02/1974";
  const patientCode = demoPatientRecord?.patient_code ?? "P-001";
  const patientDoctorName = demoPatientRecord?.primary_doctor_name ?? "Dr Martin";
  const patientTrustedName =
    demoPatientRecord?.trusted_contact_name ?? "Sophie Martin";
  const patientTrustedPhone =
    demoPatientRecord?.trusted_contact_phone ?? "06 44 22 18 90";
  const patientTrustedEmail =
    demoPatientRecord?.trusted_contact_email ?? "sophie.martin@email.fr";
  const patientReason = demoPatientRecord?.current_reason ?? "Douleurs abdominales";
  const patientWeight = formatDisplayWeight(demoPatientRecord?.weight_kg);
  const patientLastConsultation = formatShortDate(
    demoPatientRecord?.last_consultation_at
  );
  const patientNextFollowup = formatShortDate(
    demoPatientRecord?.next_followup_at
  );
  const patientMedicalContext =
    demoPatientRecord?.medical_context_long ??
    "Patiente suivie pour douleurs abdominales récurrentes sur terrain inflammatoire chronique. Résultats biologiques récents en attente de relecture complète. Traitement de fond connu, surveillance recommandée à court terme selon évolution clinique.";
  const patientAttentionPoints =
    demoPatientRecord?.attention_points_structured ?? [];
  const patientMedicalDetails = demoPatientRecord?.medical_details ?? [];

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
    const staticDocuments = [
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
    
    const documents: DocumentListItem[] = [
      ...demoDocuments.map(mapDemoDocumentToListItem),
      ...staticDocuments,
    ];

    function resetUploadState() {
      setSelectedUploadFile(null);
      setUploadError(null);
      setIsUploadingDocument(false);
      setIsLaunchingAnalysis(false);
      setUploadProgress(0);
      setUploadedDocument(null);
    
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
    
    function validateSelectedFile(file: File) {
      const allowedTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);
    
      if (!allowedTypes.has(file.type)) {
        return "Seuls les fichiers PDF, JPG, JPEG, PNG et WEBP sont autorisés.";
      }
    
      return null;
    }
    
    function handleFileSelection(file: File | null) {
      if (!file) return;
    
      const validationError = validateSelectedFile(file);
    
      if (validationError) {
        setUploadError(validationError);
        setSelectedUploadFile(null);
    
        if (uploadInputRef.current) {
          uploadInputRef.current.value = "";
        }
    
        return;
      }
    
      setUploadError(null);
      setSelectedUploadFile(file);
    }

    function resetNoteModalState() {
      setNoteInteractionType("consultation");
      setNoteInputType("text");
      setNoteTextValue("");
      setSelectedAudioFile(null);
      setAudioDurationSeconds(null);
      setPrepareFollowupEmail(false);
      setSendFollowupEmail(false);
      setSendWithoutValidation(false);
      setIsFollowupInfoOpen(false);
      setIsSavingNote(false);
      setNoteModalError(null);
      setNoteAudioError(null);
      setIsAudioMenuOpen(false);
      setIsRecordingAudio(false);
      setRecordingSeconds(0);
      setRecordedAudioLabel(null);
    
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    
      mediaRecorderRef.current = null;
      mediaChunksRef.current = [];
    }

    function validateSelectedAudioFile(file: File) {
      const allowedTypes = new Set([
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/wav",
        "audio/x-wav",
        "audio/webm",
        "audio/ogg",
        "audio/oga",
        "video/webm", // certains MediaRecorder remontent ça même pour de l'audio
        "",
      ]);
    
      const allowedExtensions = new Set([
        "mp3",
        "m4a",
        "wav",
        "webm",
        "ogg",
        "oga",
        "mp4",
        "aac",
      ]);
    
      const fileName = file.name || "";
      const extension = fileName.includes(".")
        ? fileName.split(".").pop()?.toLowerCase() ?? ""
        : "";
    
      const isMimeAllowed = allowedTypes.has(file.type);
      const isExtensionAllowed = allowedExtensions.has(extension);
    
      if (!isMimeAllowed && !isExtensionAllowed) {
        return "Seuls les formats audio MP3, M4A, WAV, WEBM et OGG sont autorisés.";
      }
    
      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        return "Le fichier audio est trop volumineux. Taille maximum autorisée : 25 MB.";
      }
    
      return null;
    }
    
    function handleAudioSelection(file: File | null) {
      if (!file) {
        setSelectedAudioFile(null);
        setAudioDurationSeconds(null);
        setNoteAudioError(null);
        return;
      }
    
      const validationError = validateSelectedAudioFile(file);
    
      if (validationError) {
        setSelectedAudioFile(null);
        setAudioDurationSeconds(null);
        setNoteAudioError(validationError);
        return;
      }
    
      setSelectedAudioFile(file);
      setNoteAudioError(null);
    
      // durée optionnelle pour l’instant
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = URL.createObjectURL(file);
    
      audio.onloadedmetadata = () => {
        const duration = Number.isFinite(audio.duration)
          ? Math.round(audio.duration)
          : null;
    
        setAudioDurationSeconds(duration);
        URL.revokeObjectURL(audio.src);
      };
    
      audio.onerror = () => {
        setAudioDurationSeconds(null);
        URL.revokeObjectURL(audio.src);
      };
    }

    function triggerAudioFilePicker() {
      setIsAudioMenuOpen(false);
    
      window.setTimeout(() => {
        noteAudioInputRef.current?.click();
      }, 0);
    }

    async function handleStartAudioRecording() {
      try {
        setNoteAudioError(null);
        setRecordedAudioLabel(null);
    
        if (
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
          setNoteAudioError(
            "L’enregistrement micro n’est pas pris en charge sur ce navigateur."
          );
          return;
        }
    
        if (typeof MediaRecorder === "undefined") {
          setNoteAudioError(
            "L’enregistrement audio n’est pas disponible sur ce navigateur."
          );
          return;
        }
    
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
    
        mediaStreamRef.current = stream;
    
        const preferredMimeTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg",
        ];
    
        const supportedMimeType =
          preferredMimeTypes.find(
            (mime) =>
              typeof MediaRecorder !== "undefined" &&
              MediaRecorder.isTypeSupported &&
              MediaRecorder.isTypeSupported(mime)
          ) || "";
    
        const recorder = supportedMimeType
          ? new MediaRecorder(stream, { mimeType: supportedMimeType })
          : new MediaRecorder(stream);
    
        mediaRecorderRef.current = recorder;
        mediaChunksRef.current = [];
        setIsRecordingAudio(true);
        setRecordingSeconds(0);
    
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            mediaChunksRef.current.push(event.data);
          }
        };
    
        recorder.onerror = (event) => {
          console.error("[HL Patients] mediaRecorder error:", event);
          setNoteAudioError(
            "Impossible d’enregistrer l’audio pour le moment."
          );
          setIsRecordingAudio(false);
    
          if (recordingTimerRef.current) {
            window.clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
    
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
    
          mediaRecorderRef.current = null;
          mediaChunksRef.current = [];
        };
    
        recorder.onstop = () => {
          try {
            const finalMimeType =
              recorder.mimeType || mediaChunksRef.current[0]?.type || "audio/webm";
    
            const blob = new Blob(mediaChunksRef.current, { type: finalMimeType });
    
            let extension = "webm";
    
            if (finalMimeType.includes("ogg")) extension = "ogg";
            else if (finalMimeType.includes("mp4")) extension = "m4a";
            else if (finalMimeType.includes("mpeg")) extension = "mp3";
            else if (finalMimeType.includes("wav")) extension = "wav";
            else if (finalMimeType.includes("webm")) extension = "webm";
    
            const file = new File(
              [blob],
              `note-audio-${new Date().toISOString()}.${extension}`,
              { type: finalMimeType }
            );
    
            handleAudioSelection(file);
            setRecordedAudioLabel("Enregistrement micro");
            setIsRecordingAudio(false);
            setIsAudioMenuOpen(false);
    
            if (recordingTimerRef.current) {
              window.clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
    
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach((track) => track.stop());
              mediaStreamRef.current = null;
            }
    
            mediaRecorderRef.current = null;
            mediaChunksRef.current = [];
          } catch (error) {
            console.error("[HL Patients] audio finalize error:", error);
            setNoteAudioError(
              "L’enregistrement a échoué au moment de la finalisation."
            );
          }
        };
    
        recorder.start();
    
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("[HL Patients] audio recording start error:", error);
    
        const message =
          error instanceof Error ? error.message : "UNKNOWN_MIC_ERROR";
    
        if (
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("denied")
        ) {
          setNoteAudioError(
            "L’accès au micro a été refusé. Vérifie les autorisations du navigateur."
          );
        } else {
          setNoteAudioError(
            "Impossible d’accéder au micro pour le moment. Vérifie les autorisations de ton navigateur."
          );
        }
    
        setIsRecordingAudio(false);
      }
    }
    
    function handleStopAudioRecording() {
      try {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error("[HL Patients] audio recording stop error:", error);
        setNoteAudioError("Impossible d’arrêter correctement l’enregistrement.");
      }
    }

    async function handleUploadSelectedFile() {
      if (!selectedUploadFile) return;
    
      try {
        setUploadError(null);
        setIsUploadingDocument(true);
        setUploadProgress(12);
    
        const progressSteps = [24, 39, 57, 72, 84, 93];
        let stepIndex = 0;
    
        const progressTimer = window.setInterval(() => {
          setUploadProgress((prev) => {
            if (stepIndex >= progressSteps.length) return prev;
            const next = progressSteps[stepIndex];
            stepIndex += 1;
            return next;
          });
        }, 180);
    
        const formData = new FormData();
        formData.append("file", selectedUploadFile);
        formData.append("isDemo", "true");

        if (demoPatientRecord?.id) {
          formData.append("patientId", demoPatientRecord.id);
        }
    
        const response = await fetch("/api/patient-documents/upload", {
          method: "POST",
          body: formData,
        });
    
        const payload = await response.json();
    
        window.clearInterval(progressTimer);
    
        if (!response.ok || !payload?.ok || !payload?.document) {
          throw new Error(payload?.error || "UPLOAD_FAILED");
        }
    
        setUploadProgress(100);
        setUploadedDocument(payload.document);
        setDemoDocuments((prev) => [payload.document, ...prev]);
      } catch (error) {
        console.error("[HL Patients] upload error:", error);
    
        const rawMessage =
          error instanceof Error ? error.message : "Une erreur est survenue.";
    
        let finalMessage = "Impossible d’ajouter le document pour le moment.";
    
        if (rawMessage === "DEMO_DOCUMENT_LIMIT_REACHED") {
          finalMessage =
            "La vue démo est limitée à un seul document importé. Supprimez-le avant d’en ajouter un nouveau.";
        } else if (rawMessage === "INVALID_FILE_TYPE") {
          finalMessage =
            "Seuls les fichiers PDF, JPG, JPEG, PNG et WEBP sont autorisés.";
        } else if (rawMessage === "FILE_TOO_LARGE") {
          finalMessage =
            "Le fichier est trop volumineux. Taille maximum autorisée : 15 MB.";
        }
    
        setUploadError(finalMessage);
        setUploadProgress(0);
      } finally {
        setIsUploadingDocument(false);
      }
    }

    function formatDocumentDate(value: string) {
      try {
        return new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(new Date(value));
      } catch {
        return value;
      }
    }

    function formatNoteDateTime(value: string) {
      try {
        return new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(value));
      } catch {
        return value;
      }
    }
    
    function getInteractionTitle(interactionType: PatientNoteRow["interaction_type"]) {
      if (interactionType === "consultation") return "Post consultation";
      if (interactionType === "exam") return "Post examen";
      return "Post opération";
    }
    
    function buildNoteSummary(text: string) {
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (cleaned.length <= 88) return cleaned;
      return `${cleaned.slice(0, 88).trim()}...`;
    }

    function formatShortDate(value: string | null | undefined) {
      if (!value) return "—";
    
      try {
        return new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(new Date(value));
      } catch {
        return value;
      }
    }
    
    function formatDisplayWeight(value: number | null | undefined) {
      if (value == null) return "—";
      return `${value} kg`;
    }
    
    function buildPatientFullName(record: DemoPatientRecord | null) {
      if (!record) return "Claire Martin";
      return `${record.first_name ?? "Claire"} ${record.last_name ?? "Martin"}`.trim();
    }
    
    function getDocumentTypeLabel(doc: DemoUploadedDocument) {
      if (doc.mime_type === "application/pdf") return "PDF";
      if (doc.mime_type.startsWith("image/")) return "Image";
      return "Document";
    }
    
    function getDocumentAnalysisLabel(doc: DemoUploadedDocument) {
      if (doc.analysis_status === "done") return "Analysé";
      if (doc.analysis_status === "pending") return "Analyse en cours";
      if (doc.analysis_status === "failed") return "Analyse échouée";
      return "Non analysé";
    }

    function mapDemoDocumentToListItem(doc: DemoUploadedDocument): DocumentListItem {
      return {
        id: doc.id,
        title: doc.file_name,
        type: getDocumentTypeLabel(doc),
        date: formatDocumentDate(doc.created_at),
        status: getDocumentAnalysisLabel(doc),
        preview: "/imgs/placeholder.png",
        isUploaded: true,
        mime_type: doc.mime_type,
        storage_path: doc.storage_path,
        storage_bucket: doc.storage_bucket,
        analysis_status: doc.analysis_status,
        analysis_text: doc.analysis_text,
        analysis_json: doc.analysis_json,
      };
    }

    async function loadDemoDocuments(options?: { silent?: boolean }) {
      const silent = options?.silent === true;
    
      try {
        if (!silent) {
          setIsLoadingDemoDocuments(true);
        }
    
        const response = await fetch("/api/patient-documents?isDemo=true", {
          method: "GET",
          cache: "no-store",
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok || !Array.isArray(payload?.documents)) {
          throw new Error(payload?.error || "Failed to load demo documents");
        }
    
        setDemoDocuments(payload.documents);
        return payload.documents as DemoUploadedDocument[];
      } catch (error) {
        console.error("[HL Patients] demo documents load error:", error);
        return [] as DemoUploadedDocument[];
      } finally {
        if (!silent) {
          setIsLoadingDemoDocuments(false);
        }
      }
    }
    
    useEffect(() => {
      loadDemoPatientRecord();
      loadDemoDocuments();
    }, []);

    useEffect(() => {
      if (!demoPatientRecord?.id) return;
      loadDemoNotes();
    }, [demoPatientRecord?.id]);



    async function loadDemoPatientRecord(options?: { silent?: boolean }) {
      const silent = options?.silent === true;
    
      try {
        if (!silent) {
          setIsLoadingDemoPatientRecord(true);
        }
    
        const response = await fetch("/api/patients/demo-record", {
          method: "GET",
          cache: "no-store",
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok || !payload?.patientRecord) {
          throw new Error(payload?.error || "FAILED_TO_LOAD_DEMO_PATIENT");
        }
    
        setDemoPatientRecord(payload.patientRecord);
        return payload.patientRecord as DemoPatientRecord;
      } catch (error) {
        console.error("[HL Patients] demo patient load error:", error);
        return null;
      } finally {
        if (!silent) {
          setIsLoadingDemoPatientRecord(false);
        }
      }
    }

    async function loadDemoNotes(options?: { silent?: boolean }) {
      const silent = options?.silent === true;
    
      try {
        const patientId = demoPatientRecord?.id;
    
        if (!patientId) {
          return [] as PatientNoteRow[];
        }
    
        const response = await fetch(
          `/api/patient-notes?patientId=${encodeURIComponent(patientId)}&isDemo=true`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok || !Array.isArray(payload?.notes)) {
          throw new Error(payload?.error || "FAILED_TO_LOAD_DEMO_NOTES");
        }
    
        setDemoNotes(payload.notes);
        return payload.notes as PatientNoteRow[];
      } catch (error) {
        console.error("[HL Patients] demo notes load error:", error);
        return [] as PatientNoteRow[];
      }
    }

    useEffect(() => {
      if (!demoPatientRecord?.id) return;
    
      const interval = window.setInterval(() => {
        loadDemoNotes({ silent: true });
        loadDemoDocuments({ silent: true });
      }, 5000);
    
      return () => {
        window.clearInterval(interval);
      };
    }, [demoPatientRecord?.id]);

    useEffect(() => {
      function handleVisibilityChange() {
        if (document.visibilityState === "visible") {
          loadDemoNotes({ silent: true });
          loadDemoDocuments({ silent: true });
        }
      }
    
      document.addEventListener("visibilitychange", handleVisibilityChange);
    
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }, [demoPatientRecord?.id]);

    async function handleOpenPreview(doc: DocumentListItem) {
      setPreviewDocument(doc);
    
      if (!doc.isUploaded || !doc.storage_path || !doc.storage_bucket) {
        setPreviewUrl(null);
        return;
      }
    
      try {
        setIsPreviewLoading(true);
    
        const response = await fetch(
          `/api/patient-documents/signed-url?path=${encodeURIComponent(doc.storage_path)}&bucket=${encodeURIComponent(doc.storage_bucket)}`
        );
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok || !payload?.signedUrl) {
          throw new Error(payload?.error || "SIGNED_URL_FAILED");
        }
    
        setPreviewUrl(payload.signedUrl);
      } catch (error) {
        console.error("[HL Patients] preview signed url error:", error);
        setPreviewUrl(null);
      } finally {
        setIsPreviewLoading(false);
      }
    }
    
    function closePreviewModal() {
      setPreviewDocument(null);
      setPreviewUrl(null);
      setIsPreviewLoading(false);
    }

    useEffect(() => {
      function handleGlobalPointerDown(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
    
        if (target?.closest(`.${styles.documentsMoreWrap}`)) {
          return;
        }
    
        setOpenDocumentMenuId(null);
      }
    
      document.addEventListener("mousedown", handleGlobalPointerDown);
    
      return () => {
        document.removeEventListener("mousedown", handleGlobalPointerDown);
      };
    }, []);

    useEffect(() => {
      if (!analysisDocument?.isUploaded) return;
      if (analysisDocument.analysis_status !== "pending") return;
    
      let isCancelled = false;
    
      const interval = window.setInterval(async () => {
        const refreshedDocuments = await loadDemoDocuments({ silent: true });
    
        if (isCancelled) return;
    
        const refreshedDocument = refreshedDocuments.find(
          (item: DemoUploadedDocument) => item.id === analysisDocument.id
        );
    
        if (!refreshedDocument) return;
    
        const mappedDocument = mapDemoDocumentToListItem(refreshedDocument);
    
        setAnalysisDocument(mappedDocument);
    
        if (
          mappedDocument.analysis_status === "done" ||
          mappedDocument.analysis_status === "failed"
        ) {
          window.clearInterval(interval);
        }
      }, 2000);
    
      return () => {
        isCancelled = true;
        window.clearInterval(interval);
      };
    }, [analysisDocument]);
    
    useEffect(() => {
      function handleCloseSelectedNoteMenu(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
    
        if (target?.closest(`.${styles.noteDetailMenuWrap}`)) {
          return;
        }
    
        setOpenSelectedNoteMenu(false);
      }
    
      document.addEventListener("mousedown", handleCloseSelectedNoteMenu);
    
      return () => {
        document.removeEventListener("mousedown", handleCloseSelectedNoteMenu);
      };
    }, []);



    async function handleDownloadDocument(doc: DocumentListItem) {
      if (!doc.isUploaded || !doc.storage_path || !doc.storage_bucket) return;
    
      try {
        const response = await fetch(
          `/api/patient-documents/signed-url?path=${encodeURIComponent(doc.storage_path)}&bucket=${encodeURIComponent(doc.storage_bucket)}`
        );
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok || !payload?.signedUrl) {
          throw new Error(payload?.error || "SIGNED_URL_FAILED");
        }
    
        window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        console.error("[HL Patients] download error:", error);
      }
    }
    
    async function handleDeleteDocument(doc: DocumentListItem) {
      if (!doc.isUploaded) return;
    
      try {
        setIsDeletingDocument(doc.id);
    
        const response = await fetch(`/api/patient-documents/${doc.id}`, {
          method: "DELETE",
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "DELETE_FAILED");
        }
    
        setDemoDocuments((prev) => prev.filter((item) => item.id !== doc.id));
        setOpenDocumentMenuId(null);
    
        if (previewDocument?.id === doc.id) {
          closePreviewModal();
        }
    
        if (analysisDocument?.id === doc.id) {
          setAnalysisDocument(null);
        }
      } catch (error) {
        console.error("[HL Patients] delete error:", error);
      } finally {
        setIsDeletingDocument(null);
      }
    }

    async function handleFinalizeUploadAndLaunchAnalysis() {
      if (!uploadedDocument?.id) {
        setIsUploadModalOpen(false);
        resetUploadState();
        return;
      }
    
      try {
        setIsLaunchingAnalysis(true);
    
        const response = await fetch("/api/patient-documents/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: uploadedDocument.id,
          }),
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "ANALYZE_FAILED");
        }
    
        setDemoDocuments((prev) =>
          prev.map((doc) =>
            doc.id === uploadedDocument.id
              ? {
                  ...doc,
                  analysis_status: "pending",
                }
              : doc
          )
        );
    
        setIsUploadModalOpen(false);
        resetUploadState();
    
        setIsRefreshingAnalysis(true);
    
        let attempts = 0;
        const maxAttempts = 12;
    
        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
    
          const refreshedDocuments = await loadDemoDocuments({ silent: true });
          const refreshedDocument = refreshedDocuments.find(
            (doc: DemoUploadedDocument) => doc.id === uploadedDocument.id
          );
    
          if (refreshedDocument?.analysis_status === "done") {
            break;
          }
    
          if (refreshedDocument?.analysis_status === "failed") {
            break;
          }
    
          attempts += 1;
        }
      } catch (error) {
        console.error("[HL Patients] finalize analyze error:", error);
        setUploadError(
          "Le document a bien été ajouté, mais l’analyse Lisa n’a pas pu être lancée pour le moment."
        );
      } finally {
        setIsLaunchingAnalysis(false);
        setIsRefreshingAnalysis(false);
      }
    }

    async function handleSaveTextNote() {
      const cleanedText = noteTextValue.trim();
    
      if (!cleanedText) {
        setNoteModalError("Merci de saisir une note avant d’enregistrer.");
        return;
      }
    
      try {
        setIsSavingNote(true);
        setNoteModalError(null);
    
        const response = await fetch("/api/patient-notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            patientId: demoPatientRecord?.id ?? null,
            isDemo: true,
            noteType: "text",
            interactionType: noteInteractionType,
            rawText: cleanedText,
            prepareFollowupEmail,
            sendFollowupEmail,
            sendWithoutValidation,
          }),
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok || !payload?.note) {
          throw new Error(payload?.error || "NOTE_SAVE_FAILED");
        }
    
        await loadDemoNotes({ silent: true });
        setSelectedNoteId(payload.note.id);
        
        setIsNoteModalOpen(false);
        resetNoteModalState();
      } catch (error) {
        console.error("[HL Patients] save note error:", error);
    
        const rawMessage =
          error instanceof Error ? error.message : "Une erreur est survenue.";
    
        let finalMessage = "Impossible d’enregistrer la note pour le moment.";
    
        if (rawMessage === "NOTE_TEXT_REQUIRED") {
          finalMessage = "Merci de saisir une note avant d’enregistrer.";
        } else if (rawMessage === "DEMO_NOTE_LIMIT_REACHED") {
          finalMessage =
            "La vue démo est limitée à une seule note ajoutée. Supprimez-la avant d’en créer une nouvelle.";
        } else if (rawMessage === "ONLY_TEXT_NOTES_SUPPORTED_FOR_NOW") {
          finalMessage =
            "L’enregistrement audio sera branché à l’étape suivante.";
        }
    
        setNoteModalError(finalMessage);
      } finally {
        setIsSavingNote(false);
      }
    }

    async function handleSaveAudioNote() {
      if (!selectedAudioFile) {
        setNoteModalError("Merci d’ajouter un fichier audio avant d’enregistrer.");
        return;
      }
    
      try {
        setIsSavingNote(true);
        setNoteModalError(null);
        setNoteAudioError(null);
    
        const formData = new FormData();
        formData.append("audio", selectedAudioFile);
        formData.append("patientId", demoPatientRecord?.id ?? "");
        formData.append("isDemo", "true");
        formData.append("interactionType", noteInteractionType);
        formData.append("rawText", noteTextValue.trim());
        formData.append("prepareFollowupEmail", String(prepareFollowupEmail));
        formData.append("sendFollowupEmail", String(sendFollowupEmail));
        formData.append("sendWithoutValidation", String(sendWithoutValidation));
    
        if (audioDurationSeconds !== null) {
          formData.append("audioDurationSeconds", String(audioDurationSeconds));
        }
    
        const response = await fetch("/api/patient-notes/audio", {
          method: "POST",
          body: formData,
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok || !payload?.note) {
          throw new Error(payload?.error || "AUDIO_NOTE_SAVE_FAILED");
        }
    
        await loadDemoNotes({ silent: true });
        setSelectedNoteId(payload.note.id);
    
        setIsNoteModalOpen(false);
        resetNoteModalState();
      } catch (error) {
        console.error("[HL Patients] save audio note error:", error);
    
        const rawMessage =
          error instanceof Error ? error.message : "Une erreur est survenue.";
    
        let finalMessage = "Impossible d’enregistrer la note audio pour le moment.";
    
        if (rawMessage === "AUDIO_FILE_MISSING") {
          finalMessage = "Merci d’ajouter un fichier audio avant d’enregistrer.";
        } else if (rawMessage === "INVALID_AUDIO_TYPE") {
          finalMessage =
            "Seuls les formats audio MP3, M4A, WAV, WEBM et OGG sont autorisés.";
        } else if (rawMessage === "AUDIO_FILE_TOO_LARGE") {
          finalMessage =
            "Le fichier audio est trop volumineux. Taille maximum autorisée : 25 MB.";
        }
    
        setNoteModalError(finalMessage);
      } finally {
        setIsSavingNote(false);
      }
    }

    async function handleSendDraftEmail() {
      if (!selectedNote?.id) return;
    
      try {
        setIsSendingDraftEmail(true);
        setFollowupDraftError(null);
    
        const response = await fetch("/api/patient-notes/send-draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteId: selectedNote.id,
          }),
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "SEND_DRAFT_FAILED");
        }
    
        setIsFollowupDraftModalOpen(false);
        await loadDemoNotes({ silent: true });
        setSelectedNoteId(selectedNote.id);
    
        await loadDemoNotes({ silent: true });
      } catch (error) {
        console.error("[HL Patients] send draft email error:", error);
    
        const rawMessage =
          error instanceof Error ? error.message : "Une erreur est survenue.";
    
        let finalMessage = "Impossible d’envoyer le mail pour le moment.";
    
        if (rawMessage === "DRAFT_NOT_READY") {
          finalMessage = "Le brouillon de suivi n’est pas encore prêt.";
        } else if (rawMessage === "FOLLOWUP_ALREADY_SENT") {
          finalMessage = "Ce mail de suivi a déjà été envoyé.";
        }
    
        setFollowupDraftError(finalMessage);
      } finally {
        setIsSendingDraftEmail(false);
      }
    }

    function handleTogglePrepareFollowupEmail() {
      setPrepareFollowupEmail((prev) => {
        const next = !prev;
    
        if (!next) {
          setSendFollowupEmail(false);
          setSendWithoutValidation(false);
        }
    
        return next;
      });
    }
    
    function handleToggleSendFollowupEmail() {
      setSendFollowupEmail((prev) => {
        const next = !prev;
    
        if (next) {
          setPrepareFollowupEmail(true);
        } else {
          setSendWithoutValidation(false);
        }
    
        return next;
      });
    }
    
    function handleToggleSendWithoutValidation() {
      setSendWithoutValidation((prev) => {
        const next = !prev;
    
        if (next) {
          setSendFollowupEmail(true);
          setPrepareFollowupEmail(true);
        }
    
        return next;
      });
    }

    async function loadSelectedNoteAudioUrl(note: PatientNoteItem) {
      if (!note.hasAudio) {
        setSelectedNoteAudioUrl(null);
        return;
      }

      try {
        setIsLoadingSelectedAudioUrl(true);

        const response = await fetch(
          `/api/patient-notes/audio-signed-url?noteId=${encodeURIComponent(note.id)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const payload = await response.json();

        if (!response.ok || !payload?.ok || !payload?.signedUrl) {
          throw new Error(payload?.error || "SIGNED_URL_FAILED");
        }

        setSelectedNoteAudioUrl(payload.signedUrl);
      } catch (error) {
        console.error("[HL Patients] audio signed url error:", error);
        setSelectedNoteAudioUrl(null);
      } finally {
        setIsLoadingSelectedAudioUrl(false);
      }
    }

    useEffect(() => {
      if (!selectedNote?.hasAudio || !selectedNote?.isDemoNote) {
        setSelectedNoteAudioUrl(null);
        return;
      }
    
      loadSelectedNoteAudioUrl(selectedNote);
    }, [selectedNoteId, selectedNote?.hasAudio, selectedNote?.isDemoNote]);

    async function handleRequestFollowupEmail(
      mode: "draft" | "with_validation" | "without_validation"
    ) {
      if (!selectedNote?.id) return;
    
      try {
        setIsRequestingFollowup(true);
        setFollowupRequestError(null);
    
        const response = await fetch("/api/patient-notes/request-followup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteId: selectedNote.id,
            mode,
          }),
        });
    
        const payload = await response.json();
    
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "REQUEST_FOLLOWUP_FAILED");
        }
    
        setIsFollowupRequestModalOpen(false);
        await loadDemoNotes({ silent: true });
        setSelectedNoteId(selectedNote.id);
      } catch (error) {
        console.error("[HL Patients] request followup error:", error);
    
        const rawMessage =
          error instanceof Error ? error.message : "Une erreur est survenue.";
    
        let finalMessage = "Impossible de lancer le mail de suivi pour le moment.";
    
        if (rawMessage === "NOTE_NOT_FOUND") {
          finalMessage = "La note sélectionnée est introuvable.";
        } else if (rawMessage === "FOLLOWUP_ALREADY_SENT") {
          finalMessage = "Ce mail de suivi a déjà été envoyé.";
        } else if (rawMessage === "FOLLOWUP_DRAFT_ALREADY_EXISTS") {
          finalMessage = "Un brouillon de suivi existe déjà pour cette note.";
        } else if (rawMessage === "NOTE_TEXT_NOT_READY") {
          finalMessage = "Le contenu de la note n’est pas encore prêt pour lancer le suivi.";
        }
    
        setFollowupRequestError(finalMessage);
      } finally {
        setIsRequestingFollowup(false);
      }
    }


  return (
    <div className={styles.patientsView}>
      <aside className={styles.patientsSidebar}>
        <div className={styles.patientsSidebarInner}>
        <div className={styles.patientsSidebarHeader}>
            <h2 className={styles.patientsSidebarTitle}>Patients</h2>

            <button
                type="button"
                className={styles.patientsSidebarAddBtn}
                aria-label="Créer un nouveau patient"
            >
                +
            </button>
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
                <h1 className={styles.patientHeaderName}>{patientFullName}</h1>

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
                {patientAgeDisplay} · Née le {patientBirthDate} · Dossier #{patientCode}
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

            <button
              type="button"
              className={styles.patientActionBtn}
              onClick={() => setIsNoteModalOpen(true)}
            >
              <img
                src="/imgs/mic-notes.png"
                alt=""
                className={styles.patientActionIcon}
              />
              <span className={styles.patientActionText}>Laisser une note</span>
            </button>

            <button
              type="button"
              className={`${styles.patientActionBtn} ${styles.patientActionBtnWhite}`}
              onClick={() => setIsBulkProcessOpen(true)}
            >
              <span className={styles.patientActionText}>Traiter des dossiers</span>
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
                  <span className={styles.patientInfoValue}>{patientDoctorName}</span>
                </div>

                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel}>Proche de confiance</span>
                  <div className={styles.patientInfoStack}>
                    <span className={styles.patientInfoValue}>{patientTrustedName}</span>
                    <span className={styles.patientInfoSubvalue}>
                      {patientTrustedPhone} · {patientTrustedEmail}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.patientInfoCard}>
              <div className={styles.patientInfoCardTitle}>Suivi</div>

              <div className={styles.patientKeyGrid}>
                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Dernière consultation</span>
                  <span className={styles.patientKeyValue}>{patientLastConsultation}</span>
                </div>

                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Prochain suivi suggéré</span>
                  <span className={styles.patientKeyValue}>{patientNextFollowup}</span>
                </div>

                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Poids</span>
                  <span className={styles.patientKeyValue}>{patientWeight}</span>
                </div>

                <div className={styles.patientKeyItem}>
                  <span className={styles.patientKeyLabel}>Dernier motif</span>
                  <span className={styles.patientKeyValue}>{patientReason}</span>
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
                {patientMedicalContext}
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
                      <div className={styles.noteListItemTitleWrap}>
                        <div className={styles.noteListItemTitle}>{note.title}</div>

                        {note.riskFlag && (
                          <img
                            src="/imgs/risk_warning.png"
                            alt="Point de vigilance"
                            className={styles.noteListItemRiskIcon}
                          />
                        )}
                      </div>

                      <div className={styles.noteListItemBadges}>
                        {note.isFollowupSent && (
                          <div className={styles.noteListItemFollowupBadge}>
                            Suivi envoyé
                          </div>
                        )}

                        {note.hasAudio && (
                          <div className={styles.noteListItemAudioBadge}>
                            <span className={styles.noteListItemAudioDot}></span>
                            <span>Audio</span>
                          </div>
                        )}
                      </div>
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

                <div className={styles.noteDetailHeaderRight}>
                  {selectedNote.riskFlag && (
                    <button
                      type="button"
                      className={styles.noteDetailRiskBadge}
                      onClick={() => setIsRiskModalOpen(true)}
                    >
                      Point de vigilance
                    </button>
                  )}

                  {selectedNote.isFollowupSent && (
                    <div className={styles.noteDetailFollowupBadge}>
                      Suivi envoyé
                    </div>
                  )}

                  <div
                    className={styles.noteDetailMenuWrap}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={styles.noteDetailMenuBtn}
                      aria-label="Actions de la note"
                      onClick={() => setOpenSelectedNoteMenu((prev) => !prev)}
                    >
                      ⋯
                    </button>

                    {openSelectedNoteMenu && (
                      <div className={styles.noteDetailMenu}>
                        <button
                          type="button"
                          className={styles.noteDetailMenuItem}
                          disabled={selectedNote.isFollowupSent || selectedNoteHasDraft}
                          onClick={() => {
                            setFollowupRequestError(null);
                            setIsFollowupRequestModalOpen(true);
                            setOpenSelectedNoteMenu(false);
                          }}
                        >
                          Envoyer un mail de suivi
                        </button>

                        <button
                          type="button"
                          className={styles.noteDetailMenuItem}
                          disabled={!selectedNoteHasDraft}
                          onClick={() => {
                            setIsFollowupDraftModalOpen(true);
                            setOpenSelectedNoteMenu(false);
                          }}
                        >
                          Brouillon de suivi
                        </button>

                        <button
                          type="button"
                          className={styles.noteDetailMenuItem}
                          onClick={() => {
                            setEditingNoteId(selectedNote.id);
                            setOpenSelectedNoteMenu(false);
                          }}
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className={`${styles.noteDetailMenuItem} ${styles.noteDetailMenuItemDanger}`}
                          onClick={() => selectedNote && handleDeleteNote(selectedNote.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

                <div className={styles.noteDetailBody}>{selectedNote.content}</div>
                {selectedNote.hasAudio && (
  <div className={styles.noteDetailFooter}>
    <div className={styles.audioDock}>
      <div className={styles.audioDockInner}>
        <div className={styles.audioDockLeft} />

        <div className={styles.audioDockWave}>
          {isLoadingSelectedAudioUrl ? (
            <div className={styles.noteAudioLoading}>Chargement de l’audio…</div>
          ) : selectedNoteAudioUrl ? (
            <audio
              ref={audioPlayerRef}
              controls
              preload="none"
              className={styles.noteAudioPlayer}
              src={selectedNoteAudioUrl}
            />
          ) : (
            <div className={styles.noteAudioLoading}>Audio indisponible.</div>
          )}
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

                <button
                  type="button"
                  className={styles.documentsAddBtn}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  + Ajouter un document
                </button>
              </div>
              {isLoadingDemoDocuments && (
                <div className={styles.documentsLoadingState}>
                  Chargement des documents…
                </div>
              )}
              {isRefreshingAnalysis && (
                <div className={styles.documentsLoadingState}>
                  Analyse Lisa en cours…
                </div>
              )}
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
                        <button
                          type="button"
                          className={styles.documentsViewBtn}
                          onClick={() => handleOpenPreview(doc)}
                        >
                          Voir
                        </button>
                        </td>

                        <td>
                        <div
                          className={styles.documentsMoreWrap}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={styles.documentsMoreBtn}
                            aria-label="Actions document"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDocumentMenuId((prev) => (prev === doc.id ? null : doc.id));
                            }}
                          >
                            ⋯
                          </button>

                          {openDocumentMenuId === doc.id && (
                            <div className={styles.documentsMoreMenu}>
                              <button
                                type="button"
                                className={styles.documentsMoreMenuItem}
                                onClick={async () => {
                                  setOpenDocumentMenuId(null);
                                
                                  if (!doc.isUploaded) {
                                    setAnalysisDocument(doc);
                                    return;
                                  }
                                
                                  const refreshedDocuments = await loadDemoDocuments({ silent: true });
                                  const refreshedDocument = refreshedDocuments.find(
                                    (item: DemoUploadedDocument) => item.id === doc.id
                                  );
                                
                                  const currentDoc = refreshedDocument
                                    ? mapDemoDocumentToListItem(refreshedDocument)
                                    : doc;
                                
                                  // Si analyse déjà terminée ou en cours, on ouvre simplement la modale
                                  if (
                                    currentDoc.analysis_status === "done" ||
                                    currentDoc.analysis_status === "pending"
                                  ) {
                                    setAnalysisDocument(currentDoc);
                                    return;
                                  }
                                
                                  // Sinon on lance l'analyse maintenant
                                  try {
                                    setIsRefreshingAnalysis(true);
                                
                                    const response = await fetch("/api/patient-documents/analyze", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        documentId: currentDoc.id,
                                      }),
                                    });
                                
                                    const payload = await response.json();
                                
                                    if (!response.ok || !payload?.ok) {
                                      throw new Error(payload?.error || "ANALYZE_FAILED");
                                    }
                                
                                    setAnalysisDocument({
                                      ...currentDoc,
                                      analysis_status: "pending",
                                    });
                                
                                    let attempts = 0;
                                    const maxAttempts = 12;
                                
                                    while (attempts < maxAttempts) {
                                      await new Promise((resolve) => setTimeout(resolve, 2000));
                                
                                      const polledDocuments = await loadDemoDocuments({ silent: true });
                                      const polledDocument = polledDocuments.find(
                                        (item: DemoUploadedDocument) => item.id === currentDoc.id
                                      );
                                
                                      if (!polledDocument) break;
                                
                                      const mappedPolledDocument = mapDemoDocumentToListItem(polledDocument);
                                      setAnalysisDocument(mappedPolledDocument);
                                
                                      if (
                                        mappedPolledDocument.analysis_status === "done" ||
                                        mappedPolledDocument.analysis_status === "failed"
                                      ) {
                                        break;
                                      }
                                
                                      attempts += 1;
                                    }
                                  } catch (error) {
                                    console.error("[HL Patients] launch analysis from menu error:", error);
                                    setAnalysisDocument(currentDoc);
                                  } finally {
                                    setIsRefreshingAnalysis(false);
                                  }
                                }}
                              >
                                Analyse de Lisa
                              </button>

                              <button
                                type="button"
                                className={styles.documentsMoreMenuItem}
                                onClick={() => {
                                  handleDownloadDocument(doc);
                                  setOpenDocumentMenuId(null);
                                }}
                              >
                                Télécharger
                              </button>

                              <button
                                type="button"
                                className={`${styles.documentsMoreMenuItem} ${styles.documentsMoreMenuItemDanger}`}
                                onClick={() => handleDeleteDocument(doc)}
                                disabled={isDeletingDocument === doc.id}
                              >
                                {isDeletingDocument === doc.id ? "Suppression..." : "Supprimer"}
                              </button>
                            </div>
                          )}
                        </div>
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
      <div className={styles.demoModeBadge}>
        <div className={styles.demoModeBadgeTitle}>Mode Démo</div>
        <div className={styles.demoModeBadgeText}>
          Les données réelles seront affichées dès qu’un dossier patient aura été créé.
        </div>
      </div>
      {isUploadModalOpen && (
        <div
          className={styles.uploadModalOverlay}
          onClick={() => {
            setIsUploadModalOpen(false);
            resetUploadState();
          }}
        >
          <div
            className={styles.uploadModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.uploadModalHeader}>
              <div>
                <h3 className={styles.uploadModalTitle}>Ajouter un document</h3>
                <p className={styles.uploadModalSubtitle}>
                  Importez une image ou un PDF dans le dossier patient.
                </p>
              </div>

              <button
                type="button"
                className={styles.uploadModalClose}
                aria-label="Fermer"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  resetUploadState();
                }}
              >
                ×
              </button>
            </div>

            <div className={styles.uploadModalBody}>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className={styles.uploadHiddenInput}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  handleFileSelection(file);
                }}
              />

              {!selectedUploadFile ? (
                <div className={styles.uploadDropzone}>
                  <div className={styles.uploadDropzoneIconWrap}>
                    <div className={styles.uploadDropzoneIcon}>↑</div>
                  </div>

                  <div className={styles.uploadDropzoneTitle}>
                    Glissez-déposez vos fichiers ici
                  </div>

                  <div className={styles.uploadDropzoneText}>
                    ou sélectionnez un fichier depuis votre ordinateur
                  </div>

                  <button
                    type="button"
                    className={styles.uploadDropzoneButton}
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    Parcourir les fichiers
                  </button>

                  <div className={styles.uploadDropzoneHint}>
                    Formats autorisés : PDF, JPG, JPEG, PNG, WEBP
                  </div>

                  {uploadError && (
                    <div className={styles.uploadErrorMessage}>
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : (
              <div className={styles.uploadSelectedCard}>
                <div className={styles.uploadSelectedTop}>
                  <div className={styles.uploadSelectedFileMeta}>
                    <div className={styles.uploadSelectedFileIcon}>
                      {selectedUploadFile.type === "application/pdf" ? "PDF" : "IMG"}
                    </div>

                    <div className={styles.uploadSelectedFileText}>
                      <div className={styles.uploadSelectedFileName}>
                        {selectedUploadFile.name}
                      </div>
                      <div className={styles.uploadSelectedFileSubline}>
                        {(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>

                  {!uploadedDocument && (
                    <button
                      type="button"
                      className={styles.uploadSelectedRemoveBtn}
                      onClick={resetUploadState}
                      disabled={isUploadingDocument}
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                {isUploadingDocument && (
                  <div className={styles.uploadProgressBlock}>
                    <div className={styles.uploadProgressTopRow}>
                      <span className={styles.uploadProgressLabel}>Envoi du document…</span>
                      <span className={styles.uploadProgressValue}>{uploadProgress}%</span>
                    </div>

                    <div className={styles.uploadProgressBar}>
                      <div
                        className={styles.uploadProgressFill}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {!isUploadingDocument && !uploadedDocument && (
                  <>
                    <div className={styles.uploadSelectedPreviewNote}>
                      Fichier prêt à être importé dans le dossier patient.
                    </div>

                    <div className={styles.uploadSelectedFooter}>
                      <button
                        type="button"
                        className={styles.uploadImportButton}
                        onClick={handleUploadSelectedFile}
                      >
                        Importer le document
                      </button>
                    </div>
                  </>
                )}

                {!isUploadingDocument && uploadedDocument && (
                  <>
                    <div className={styles.uploadSelectedSuccessNote}>
                      Le document a bien été ajouté. Cliquez sur Terminer pour lancer l’analyse de Lisa.
                    </div>

                    <div className={styles.uploadSelectedFooter}>
                    <button
                      type="button"
                      className={styles.uploadDoneButton}
                      onClick={handleFinalizeUploadAndLaunchAnalysis}
                      disabled={isLaunchingAnalysis}
                    >
                      {isLaunchingAnalysis ? "Analyse en cours..." : "Terminer"}
                    </button>
                    </div>
                  </>
                )}

                {uploadError && (
                  <div className={styles.uploadErrorMessage}>
                    {uploadError}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

{previewDocument && (
        <div
          className={styles.documentPreviewOverlay}
          onClick={closePreviewModal}
        >
          <div
            className={styles.documentPreviewModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.documentPreviewHeader}>
              <div>
                <h3 className={styles.documentPreviewTitle}>
                  {previewDocument.title}
                </h3>
                <p className={styles.documentPreviewSubtitle}>
                  {previewDocument.type} · {previewDocument.date}
                </p>
              </div>

              <button
                type="button"
                className={styles.documentPreviewClose}
                onClick={closePreviewModal}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className={styles.documentPreviewBody}>
              {isPreviewLoading ? (
                <div className={styles.documentPreviewLoading}>
                  Chargement du document…
                </div>
              ) : !previewDocument.isUploaded || !previewUrl ? (
                <div className={styles.documentPreviewPlaceholder}>
                  <img
                    src="/imgs/placeholder.png"
                    alt=""
                    className={styles.documentPreviewPlaceholderImage}
                  />
                  <div className={styles.documentPreviewPlaceholderText}>
                    Aperçu de démonstration
                  </div>
                </div>
              ) : previewDocument.mime_type === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  className={styles.documentPreviewFrame}
                  title={previewDocument.title}
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={previewDocument.title}
                  className={styles.documentPreviewImage}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {analysisDocument && (
        <div
          className={styles.documentAnalysisOverlay}
          onClick={() => setAnalysisDocument(null)}
        >
          <div
            className={styles.documentAnalysisModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.documentAnalysisHeader}>
              <div>
                <h3 className={styles.documentAnalysisTitle}>
                  Analyse de Lisa
                </h3>
                <p className={styles.documentAnalysisSubtitle}>
                  {analysisDocument.title}
                </p>
              </div>

              <button
                type="button"
                className={styles.documentAnalysisClose}
                onClick={() => setAnalysisDocument(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className={styles.documentAnalysisBody}>
              {!analysisDocument.isUploaded ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  L’analyse Lisa n’est disponible que pour les documents réellement importés.
                </div>
              ) : analysisDocument.analysis_status === "pending" ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  Analyse en cours… Revenez dans quelques secondes.
                </div>
              ) : analysisDocument.analysis_status === "failed" ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  L’analyse n’a pas pu aboutir pour le moment.
                </div>
              ) : !analysisDocument.analysis_json ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  Aucune analyse disponible pour ce document.
                </div>
              ) : (
                  <div className={styles.analysisLayout}>
                    <div className={styles.analysisTopbar}>
                      <div className={styles.analysisDocMeta}>
                        <span className={styles.analysisDocTypeBadge}>
                          {analysisDocument.analysis_json.type_doc}
                        </span>
                      </div>

                      <div className={styles.analysisConfidencePill}>
                        Confiance :{" "}
                        <strong>
                          {Math.round((analysisDocument.analysis_json.confidence_score ?? 0) * 100)}%
                        </strong>
                      </div>
                    </div>

                    <div className={styles.analysisMainGrid}>
                      <div className={styles.analysisMainLeft}>
                        <section className={`${styles.analysisPanel} ${styles.analysisPanelHero}`}>
                          <div className={styles.analysisPanelLabel}>Résumé</div>
                          <div className={styles.analysisPanelText}>
                            {analysisDocument.analysis_json.resume}
                          </div>
                        </section>

                        <section className={styles.analysisPanel}>
                          <div className={styles.analysisPanelLabel}>Éléments clés</div>
                          <ul className={styles.analysisPanelList}>
                            {analysisDocument.analysis_json.elements_cles.map((item, index) => (
                              <li key={`key-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </section>
                      </div>

                      <div className={styles.analysisMainRight}>
                        <section className={`${styles.analysisPanel} ${styles.analysisPanelAlert}`}>
                          <div className={styles.analysisPanelLabel}>Alertes</div>
                          {analysisDocument.analysis_json.alertes.length > 0 ? (
                            <ul className={styles.analysisPanelList}>
                              {analysisDocument.analysis_json.alertes.map((item, index) => (
                                <li key={`alert-${index}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className={styles.analysisPanelText}>
                              Aucune alerte majeure identifiée.
                            </div>
                          )}
                        </section>

                        <section className={`${styles.analysisPanel} ${styles.analysisPanelAction}`}>
                          <div className={styles.analysisPanelLabel}>Suites recommandées</div>
                          <ul className={styles.analysisPanelList}>
                            {analysisDocument.analysis_json.suites_recommandees.map((item, index) => (
                              <li key={`next-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </section>
                      </div>
                    </div>

                    <section className={styles.analysisBottomPanel}>
                      <div className={styles.analysisPanelLabel}>Références complémentaires</div>

                      {analysisDocument.analysis_json.references.length > 0 ? (
                        <div className={styles.analysisReferenceRow}>
                          {analysisDocument.analysis_json.references.map((ref, index) => (
                            <div key={`ref-${index}`} className={styles.analysisReferenceCard}>
                              <div className={styles.analysisReferenceSource}>{ref.source}</div>
                              <div className={styles.analysisReferenceExcerpt}>{ref.extrait}</div>
                              <div className={styles.analysisReferenceLink}>{ref.lien}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.analysisPanelText}>
                          Aucune référence externe mobilisée.
                        </div>
                      )}
                    </section>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

{isBulkProcessOpen && (
  <div
    className={styles.bulkProcessOverlay}
    onClick={() => setIsBulkProcessOpen(false)}
  >
    <div
      className={styles.bulkProcessModal}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={styles.bulkProcessClose}
        aria-label="Fermer"
        onClick={() => setIsBulkProcessOpen(false)}
      >
        ×
      </button>

      <div className={styles.bulkProcessLayout}>
        <div className={styles.bulkProcessCommandPanel}>
        <div className={styles.bulkProcessStep}>ÉTAPE 1 SUR 3</div>
<h2 className={styles.bulkProcessTitle}>Traiter des dossiers</h2>

<div className={styles.bulkProcessSectionLabel}>Commandes</div>

<div className={styles.bulkIntentCommandList}>
  {bulkActionOptions.map((option) => (
    <button
      key={option.id}
      type="button"
      className={`${styles.bulkIntentCommandItem} ${
        bulkSelectedIntent === option.id ? styles.isBulkIntentActive : ""
      }`}
      onClick={() => handleSelectBulkIntent(option.id)}
    >
      <span className={styles.bulkIntentCommandLeft}>
        <span className={styles.bulkIntentCommandIcon}>{option.icon}</span>
        <span className={styles.bulkIntentCommandLabel}>{option.label}</span>
      </span>

      <span className={styles.bulkIntentCommandRadio}>
        {bulkSelectedIntent === option.id ? "●" : "○"}
      </span>
    </button>
  ))}
</div>

<div className={styles.bulkCommandComposer}>

  {bulkSelectedIntent === "patient_letters" && (
    <div className={styles.bulkSubOptionsRow}>
      {patientLetterSubOptions.map((option) => (
        <button
          key={option}
          type="button"
          className={`${styles.bulkSubOptionBadge} ${
            bulkSelectedSubOptions.includes(option)
              ? styles.isBulkSubOptionActive
              : ""
          }`}
          onClick={() => handleToggleBulkSubOption(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )}

  <div className={styles.bulkCommandInputWrap}>
  <img
  src="/imgs/Lisa_Avatar-min.webp"
  alt="Lisa"
  className={styles.bulkCommandAvatarImage}
/>

    <textarea
      className={styles.bulkCommandTextarea}
      value={bulkInstructions}
      onChange={(e) => setBulkInstructions(e.target.value)}
      placeholder={bulkHelperText}
    />
  </div>
</div>
        </div>

        <div className={styles.bulkProcessUploadPanel}>
          <div className={styles.bulkProcessUploadInner}>
          <div className={styles.bulkProcessStepCenter}>ÉTAPE 2 SUR 3</div>
          <h3 className={styles.bulkUploadTitle}>Chargez les fichiers à traiter</h3>

            <div className={styles.bulkUploadHint}>
              Déposez vos documents ici ou parcourez votre ordinateur.
            </div>

            <div className={styles.bulkUploadDropzone}>
              <div className={styles.bulkUploadDropzoneText}>
                Glisser-déposer des fichiers ici, ou parcourir
              </div>
            </div>

            <div className={styles.bulkUploadFormats}>
              Formats pris en charge : PDF, JPG, JPEG, PNG, WEBP
            </div>
          </div>

          <div className={styles.bulkProcessFooter}>
            <button
              type="button"
              className={styles.bulkProcessBackBtn}
              onClick={() => setIsBulkProcessOpen(false)}
            >
              Retour
            </button>

            <button
              type="button"
              className={styles.bulkProcessNextBtn}
              disabled={!bulkSelectedIntent}
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {isNoteModalOpen && (
        <div
          className={styles.noteModalOverlay}
          onClick={() => {
            setIsAudioMenuOpen(false);
            setIsNoteModalOpen(false);
            resetNoteModalState();
          }}
        >
        <div
          className={styles.noteModal}
          onClick={(e) => {
            e.stopPropagation();
            setIsAudioMenuOpen(false);
          }}
        >
            <input
              ref={noteAudioInputRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.oga,.mp4"
              className={styles.noteAudioUploadInput}
              onChange={(event) => {
                handleAudioSelection(event.target.files?.[0] ?? null);
                setRecordedAudioLabel(null);

                if (noteAudioInputRef.current) {
                  noteAudioInputRef.current.value = "";
                }
              }}
            />
            <button
              type="button"
              className={styles.noteModalClose}
              aria-label="Fermer"
              onClick={() => {
                setIsNoteModalOpen(false);
                resetNoteModalState();
              }}
            >
              ×
            </button>

            <div className={styles.noteModalTabs}>
              <button
                type="button"
                className={`${styles.noteModalTab} ${
                  noteInteractionType === "consultation" ? styles.isActive : ""
                }`}
                onClick={() => setNoteInteractionType("consultation")}
              >
                Post consultation
              </button>

              <button
                type="button"
                className={`${styles.noteModalTab} ${
                  noteInteractionType === "exam" ? styles.isActive : ""
                }`}
                onClick={() => setNoteInteractionType("exam")}
              >
                Post examen
              </button>

              <button
                type="button"
                className={`${styles.noteModalTab} ${
                  noteInteractionType === "operation" ? styles.isActive : ""
                }`}
                onClick={() => setNoteInteractionType("operation")}
              >
                Post opération
              </button>
            </div>

            <div className={styles.noteModalEditor}>
              {noteInputType === "text" ? (
                <textarea
                  className={styles.noteTextarea}
                  placeholder="Saisir la note ou cliquer sur le micro pour enregistrer une note vocale..."
                  value={noteTextValue}
                  onChange={(e) => setNoteTextValue(e.target.value)}
                />
              ) : (
                <div className={styles.noteAudioPlaceholder}>
                  <div className={styles.noteAudioPlaceholderText}>
                    Saisir la note ou cliquer sur le micro pour enregistrer une note vocale...
                  </div>
                </div>
              )}

              <div className={styles.noteActionButtons}>
                <button
                  type="button"
                  className={`${styles.noteActionButton} ${
                    prepareFollowupEmail ? styles.isSelected : ""
                  }`}
                  onClick={handleTogglePrepareFollowupEmail}
                >
                  Préparer un mail de suivi
                </button>

                <button
                  type="button"
                  className={`${styles.noteActionButton} ${
                    sendFollowupEmail ? styles.isSelected : ""
                  }`}
                  onClick={handleToggleSendFollowupEmail}
                >
                  Envoyer le mail au patient
                </button>
              </div>

              {selectedAudioFile && (
                <div className={styles.noteSelectedAudioMeta}>
                  {recordedAudioLabel || selectedAudioFile.name}
                  {audioDurationSeconds !== null ? ` · ${audioDurationSeconds}s` : ""}
                </div>
              )}

              {noteAudioError && (
                <div className={styles.noteModalInlineError}>
                  {noteAudioError}
                </div>
              )}

              {noteModalError && (
                <div className={styles.noteModalError}>
                  {noteModalError}
                </div>
              )}
            </div>

            <div className={styles.noteModalFooter}>
              <div className={styles.noteFooterLeft}>
                <button
                  type="button"
                  className={`${styles.noteFooterToggle} ${
                    sendWithoutValidation ? styles.isOn : ""
                  }`}
                  onClick={handleToggleSendWithoutValidation}
                  aria-label="Activer l’envoi sans validation"
                >
                  <span className={styles.noteFooterToggleKnob} />
                </button>

                <span className={styles.noteFooterText}>Envoi sans validation</span>

                <div
                  className={styles.noteInfoWrap}
                  onMouseEnter={() => setIsFollowupInfoOpen(true)}
                  onMouseLeave={() => setIsFollowupInfoOpen(false)}
                >
                  <button
                    type="button"
                    className={styles.noteInfoBtn}
                    onFocus={() => setIsFollowupInfoOpen(true)}
                    onBlur={() => setIsFollowupInfoOpen(false)}
                    aria-label="Informations sur l’envoi sans validation"
                  >
                    i
                  </button>

                  {isFollowupInfoOpen && (
                    <div className={styles.noteInfoTooltip}>
                      Si cette option est activée, Lisa pourra envoyer le mail de suivi
                      sans étape de validation humaine intermédiaire.
                    </div>
                  )}
                </div>
              </div>

              <div
                className={styles.noteMicWrap}
                onClick={(e) => e.stopPropagation()}
              >
              <button
                type="button"
                className={styles.noteMicBtn}
                aria-label="Options audio"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAudioMenuOpen((prev) => !prev);
                }}
              >
                  <img src="/imgs/mic-notes.png" alt="" />
                </button>

                {isAudioMenuOpen && (
                  <div
                    className={styles.noteAudioMenu}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isRecordingAudio ? (
                      <>
                        <button
                          type="button"
                          className={styles.noteAudioMenuItem}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={triggerAudioFilePicker}
                        >
                          Choisir un fichier
                        </button>

                        <button
                          type="button"
                          className={styles.noteAudioMenuItem}
                          onClick={handleStartAudioRecording}
                        >
                          Enregistrer un audio
                        </button>
                      </>
                    ) : (
                      <div className={styles.noteRecordingPanel}>
                        <div className={styles.noteRecordingTopRow}>
                          <div className={styles.noteRecordingDot} />
                          <div className={styles.noteRecordingText}>Enregistrement en cours</div>
                          <div className={styles.noteRecordingTimer}>
                            {Math.floor(recordingSeconds / 60)
                              .toString()
                              .padStart(2, "0")}
                            :
                            {(recordingSeconds % 60).toString().padStart(2, "0")}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={styles.noteRecordingStopBtn}
                          onClick={handleStopAudioRecording}
                        >
                          Stop
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={styles.noteSaveBtn}
                onClick={selectedAudioFile ? handleSaveAudioNote : handleSaveTextNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? "Enregistrement..." : "Enregistrer la note"}
              </button>
            </div>
          </div>
        </div>
      )}

{isFollowupDraftModalOpen && selectedNote && (
        <div
          className={styles.followupDraftOverlay}
          onClick={() => setIsFollowupDraftModalOpen(false)}
        >
          <div
            className={styles.followupDraftModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.followupDraftHeader}>
              <div>
                <h3 className={styles.followupDraftTitle}>Brouillon de suivi</h3>
                <p className={styles.followupDraftSubtitle}>
                  Prévisualisation du mail patient avant envoi
                </p>
              </div>

              <button
                type="button"
                className={styles.followupDraftClose}
                aria-label="Fermer"
                onClick={() => setIsFollowupDraftModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.followupDraftBody}>
              <div className={styles.followupDraftEmailShell}>
                <div className={styles.followupDraftEmailHeader}>
                  <div className={styles.followupDraftEmailLabel}>Objet</div>
                  <div className={styles.followupDraftEmailSubject}>
                    {selectedNote.followupEmailSubject || "Brouillon indisponible"}
                  </div>
                </div>

                <div className={styles.followupDraftEmailContent}>
                  {selectedNote.followupEmailBody || "Aucun contenu disponible."}
                </div>
              </div>

              {selectedNote.riskFlag && (
                <div className={styles.followupDraftRiskBox}>
                  <div className={styles.followupDraftRiskTitle}>
                    Point de vigilance détecté
                  </div>
                  <div className={styles.followupDraftRiskSummary}>
                    {selectedNote.riskSummary}
                  </div>

                  {selectedNote.riskItems && selectedNote.riskItems.length > 0 && (
                    <ul className={styles.followupDraftRiskList}>
                      {selectedNote.riskItems.map((item, index) => (
                        <li key={`risk-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className={styles.followupDraftFooter}>
              {followupDraftError && (
                <div className={styles.followupDraftError}>
                  {followupDraftError}
                </div>
              )}

              <button
                type="button"
                className={styles.followupDraftSecondaryBtn}
                onClick={() => setIsFollowupDraftModalOpen(false)}
              >
                Fermer
              </button>

              <button
                type="button"
                className={styles.followupDraftPrimaryBtn}
                onClick={handleSendDraftEmail}
                disabled={isSendingDraftEmail || selectedNote.isFollowupSent}
              >
                {selectedNote.isFollowupSent
                  ? "Mail déjà envoyé"
                  : isSendingDraftEmail
                  ? "Envoi en cours..."
                  : "Envoyer le mail"}
              </button>
            </div>
          </div>
        </div>
      )}

{isRiskModalOpen && selectedNote && (
        <div
          className={styles.followupDraftOverlay}
          onClick={() => setIsRiskModalOpen(false)}
        >
          <div
            className={styles.followupRiskModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.followupDraftHeader}>
              <div>
                <h3 className={styles.followupDraftTitle}>Point de vigilance</h3>
                <p className={styles.followupDraftSubtitle}>
                  Signal interne détecté par Lisa pour relecture médicale
                </p>
              </div>

              <button
                type="button"
                className={styles.followupDraftClose}
                aria-label="Fermer"
                onClick={() => setIsRiskModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.followupDraftBody}>
              <div className={styles.followupDraftRiskBox}>
                <div className={styles.followupDraftRiskTitle}>
                  Résumé
                </div>
                <div className={styles.followupDraftRiskSummary}>
                  {selectedNote.riskSummary || "Aucun résumé disponible."}
                </div>

                {selectedNote.riskItems && selectedNote.riskItems.length > 0 && (
                  <ul className={styles.followupDraftRiskList}>
                    {selectedNote.riskItems.map((item, index) => (
                      <li key={`risk-modal-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className={styles.followupDraftFooter}>
              <button
                type="button"
                className={styles.followupDraftSecondaryBtn}
                onClick={() => setIsRiskModalOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

{isFollowupRequestModalOpen && selectedNote && (
        <div
          className={styles.followupDraftOverlay}
          onClick={() => {
            if (isRequestingFollowup) return;
            setIsFollowupRequestModalOpen(false);
            setFollowupRequestError(null);
          }}
        >
          <div
            className={styles.followupRequestModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.followupDraftHeader}>
              <div>
                <h3 className={styles.followupDraftTitle}>Envoyer un mail de suivi</h3>
                <p className={styles.followupDraftSubtitle}>
                  Choisis si le brouillon doit être validé avant envoi ou partir directement.
                </p>
              </div>

              <button
                type="button"
                className={styles.followupDraftClose}
                aria-label="Fermer"
                onClick={() => {
                  if (isRequestingFollowup) return;
                  setIsFollowupRequestModalOpen(false);
                  setFollowupRequestError(null);
                }}
              >
                ×
              </button>
            </div>

            <div className={styles.followupRequestBody}>
              <button
                type="button"
                className={styles.followupRequestOption}
                disabled={isRequestingFollowup}
                onClick={async () => {
                  await handleRequestFollowupEmail("draft");
                }}
              >
                <div className={styles.followupRequestOptionTitle}>
                  Préparer un brouillon
                </div>
                <div className={styles.followupRequestOptionText}>
                  Lisa prépare le mail de suivi sans lancer l’envoi.
                </div>
              </button>

              <button
                type="button"
                className={styles.followupRequestOption}
                disabled={isRequestingFollowup}
                onClick={async () => {
                  await handleRequestFollowupEmail("with_validation");
                }}
              >
                <div className={styles.followupRequestOptionTitle}>
                  Envoyer avec validation
                </div>
                <div className={styles.followupRequestOptionText}>
                  Lisa prépare le mail puis le médecin le valide avant envoi.
                </div>
              </button>

              <button
                type="button"
                className={styles.followupRequestOption}
                disabled={isRequestingFollowup}
                onClick={async () => {
                  await handleRequestFollowupEmail("without_validation");
                }}
              >
                <div className={styles.followupRequestOptionTitle}>
                  Envoyer sans validation
                </div>
                <div className={styles.followupRequestOptionText}>
                  Lisa prépare puis envoie directement le mail au patient.
                </div>
              </button>

              {followupRequestError && (
                <div className={styles.followupDraftError}>
                  {followupRequestError}
                </div>
              )}
            </div>

            <div className={styles.followupDraftFooter}>
              <button
                type="button"
                className={styles.followupDraftSecondaryBtn}
                disabled={isRequestingFollowup}
                onClick={() => {
                  setIsFollowupRequestModalOpen(false);
                  setFollowupRequestError(null);
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

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