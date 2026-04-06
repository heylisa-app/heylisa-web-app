"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type PatientListItem = {
  id: string;
  patientCode: string | null;
  fullName: string;
  ageDisplay: string | null;
  meta: string;
  status: "active" | "pending" | "urgent";
  followupStatus: string | null;
  nextFollowupAt: string | null;
  shortSummary: string;
  attentionTags: Array<{
    label: string;
    value: string;
    severity: string;
  }>;
  updatedAt: string;
};

type PatientDocumentItem = {
    id: string;
    title: string;
    type: string;
    date: string;
    status: string;
    isUploaded: boolean;
    mimeType: string;
    storagePath: string | null;
    storageBucket: string | null;
    analysisStatus: string | null;
    analysisText: string | null;
    documentFamily?: string | null;
    isOfficialMedicalDocument?: boolean | null;
    isShareableWithPatient?: boolean | null;
    isShareableWithDoctor?: boolean | null;
    sharingGuardReason?: string | null;
    analysisJson: {
      type_doc?: string;
      resume?: string;
      elements_cles?: string[];
      alertes?: string[];
      suites_recommandees?: string[];
      references?: Array<{
        source?: string;
        extrait?: string;
        lien?: string;
      }>;
      confidence_score?: number;
    } | null;
  };

type PatientsApiResponse = {
  ok: boolean;
  mode?: "demo" | "live";
  patients?: PatientListItem[];
  selectedPatientId?: string | null;
  error?: string;
  details?: string;
};

type PatientDetailResponse = {
    ok: boolean;
    patient?: {
      id: string;
      cabinetAccountId: string;
      patientCode: string | null;
      fullName: string;
      firstName: string | null;
      lastName: string | null;
      gender: string | null;
      dateOfBirth: string | null;
      ageDisplay: string | null;
      phone: string | null;
      email: string | null;
      primaryDoctorName: string | null;
      primaryDoctorEmail: string | null;
      primaryDoctorPhone: string | null;
      trustedContactName: string | null;
      trustedContactPhone: string | null;
      trustedContactEmail: string | null;
      trustedContactRelation: string | null;
      followupStatus: string | null;
      lastReason: string | null;
      lastConsultationAt: string | null;
      nextFollowupAt: string | null;
      weightKg: number | null;
      clinicalSummary: string | null;
      medicalContext: string | null;
      medicalContextLong: string | null;
      vitaleCardStatus: string | null;
      insuranceStatus: string | null;
      lisaSummary: string | null;
      lisaLastUpdatedAt: string | null;
      attentionPoints: Array<{
        label: string;
        value: string;
        severity: string;
      }>;
      medicalDetails: Array<{
        id: string;
        title: string;
        status: string;
        severity: "low" | "medium" | "high";
        meta: string;
        summary: string;
      }>;
      anatomyState: Record<string, unknown>;
    };
    notes?: Array<{
      id: string;
      title: string;
      summary: string;
      content: string;
      datetime: string;
      hasAudio: boolean;
      audioDurationSeconds: number | null;
      followupEmailStatus: string;
      followupEmailSubject: string | null;
      followupEmailBody: string | null;
      detectedIntent: string | null;
      riskFlag: boolean;
      riskSummary: string;
      riskItems: string[];
      audioStoragePath: string | null;
      audioStorageBucket: string | null;
      audioMimeType: string | null;
      transcriptionStatus: string;
    }>;
    documents?: PatientDocumentItem[];
    tasks?: Array<{
      id: string;
      label: string;
      reason: string;
      priority: string;
      taskType: string;
      status: string;
      dueAt: string | null;
      completedAt: string | null;
      createdAt: string | null;
      source: string;
      createdBy: string | null;
    }>;
    followupSuggestions?: Array<{
      id: string;
      label: string;
      reason: string;
      priority: string;
    }>;
    error?: string;
    details?: string;
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
    isFollowupSent: boolean;
    isFollowupDraftReady: boolean;
    followupEmailSubject?: string | null;
    followupEmailBody?: string | null;
    detectedIntent?: string | null;
    riskFlag?: boolean;
    riskSummary?: string;
    riskItems?: string[];
    sources?: Array<{
      type: string | null;
      label: string | null;
      interactionId: string | null;
      sourceRef: string | null;
      fileName: string | null;
      mimeType: string | null;
      storageBucket: string | null;
      storagePath: string | null;
      summary: string | null;
    }>;
    audioStoragePath?: string | null;
    audioStorageBucket?: string | null;
    audioMimeType?: string | null;
    transcriptionStatus?: string;
  };
  
  type SaveNoteResponse = {
    ok: boolean;
    note?: {
      id: string;
    };
    error?: string;
  };

export default function PatientsPageClient() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [patientNotes, setPatientNotes] = useState<NonNullable<PatientDetailResponse["notes"]>>([]);
  const [patientDocuments, setPatientDocuments] = useState<NonNullable<PatientDetailResponse["documents"]>>([]);
  const [patientDetailResponse, setPatientDetailResponse] = useState<PatientDetailResponse | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetailResponse["patient"] | null>(null);
  const [patientTasks, setPatientTasks] = useState<NonNullable<PatientDetailResponse["tasks"]>>([]);
  const [patientSuggestions, setPatientSuggestions] = useState<
    NonNullable<PatientDetailResponse["followupSuggestions"]>
  >([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [patientMainTab, setPatientMainTab] = useState<"notes" | "history" | "details">("notes");
  const [selectedDetailId, setSelectedDetailId] = useState("detail-1");
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteInteractionType, setNoteInteractionType] = useState<"consultation" | "exam" | "operation" | "lisa_followup">("consultation");
  const [noteTextValue, setNoteTextValue] = useState("");
  const [prepareFollowupEmail, setPrepareFollowupEmail] = useState(false);
  const [sendFollowupEmail, setSendFollowupEmail] = useState(false);
  const [sendWithoutValidation, setSendWithoutValidation] = useState(false);
  const [isFollowupInfoOpen, setIsFollowupInfoOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteModalError, setNoteModalError] = useState<string | null>(null);
  const [openSelectedNoteMenu, setOpenSelectedNoteMenu] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [isFollowupRequestModalOpen, setIsFollowupRequestModalOpen] = useState(false);
  const [isFollowupDraftModalOpen, setIsFollowupDraftModalOpen] = useState(false);
  const [isRequestingFollowup, setIsRequestingFollowup] = useState(false);
  const [isSendingDraftEmail, setIsSendingDraftEmail] = useState(false);
  const [followupRequestError, setFollowupRequestError] = useState<string | null>(null);
  const [followupDraftError, setFollowupDraftError] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<PatientDocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisDocument, setAnalysisDocument] = useState<PatientDocumentItem | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [tasksNow, setTasksNow] = useState(() => new Date());
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskTitle, setCreateTaskTitle] = useState("");
  const [createTaskDescription, setCreateTaskDescription] = useState("");
  const [createTaskPriority, setCreateTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [previewSource, setPreviewSource] = useState<{
    type: string | null;
    label: string | null;
    interactionId: string | null;
    sourceRef: string | null;
    fileName: string | null;
    mimeType: string | null;
    storageBucket: string | null;
    storagePath: string | null;
    summary: string | null;
  } | null>(null);
  
  const [emailSourcePreview, setEmailSourcePreview] = useState<{
    title: string | null;
    senderName: string | null;
    senderEmail: string | null;
    datetime: string | null;
    content: string | null;
    summary: string | null;
  } | null>(null);

  const [isBulkProcessOpen, setIsBulkProcessOpen] = useState(false);
  const [bulkSelectedIntent, setBulkSelectedIntent] = useState<string>("");
  const [bulkSelectedFiles, setBulkSelectedFiles] = useState<File[]>([]);
  const [optimisticPatients, setOptimisticPatients] = useState<any[]>([]);


  const [openDocumentMenuId, setOpenDocumentMenuId] = useState<string | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState<string | null>(null);
  const [isLaunchingDocumentAnalysis, setIsLaunchingDocumentAnalysis] = useState<string | null>(null);
  
  const [noteInputType, setNoteInputType] = useState<"text" | "audio">("text");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | null>(null);
  const [noteAudioError, setNoteAudioError] = useState<string | null>(null);
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [selectedNoteAudioUrl, setSelectedNoteAudioUrl] = useState<string | null>(null);
  const [isLoadingSelectedAudioUrl, setIsLoadingSelectedAudioUrl] = useState(false);
  
  const noteAudioInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [bulkStep, setBulkStep] = useState<1 | 2 | 3>(2);
  const [createPatientSuccessMessage, setCreatePatientSuccessMessage] = useState<string | null>(null);


  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioLabel, setRecordedAudioLabel] = useState<string | null>(null);

  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [editContactError, setEditContactError] = useState<string | null>(null);
  
  const [contactPhoneValue, setContactPhoneValue] = useState("");
  const [contactEmailValue, setContactEmailValue] = useState("");
  const [contactPrimaryDoctorNameValue, setContactPrimaryDoctorNameValue] = useState("");
  const [contactPrimaryDoctorPhoneValue, setContactPrimaryDoctorPhoneValue] = useState("");
  const [contactPrimaryDoctorEmailValue, setContactPrimaryDoctorEmailValue] = useState("");
  const [contactTrustedNameValue, setContactTrustedNameValue] = useState("");
  const [contactTrustedPhoneValue, setContactTrustedPhoneValue] = useState("");
  const [contactTrustedEmailValue, setContactTrustedEmailValue] = useState("");
  const [isBulkDragActive, setIsBulkDragActive] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);
  const [bulkSubmitError, setBulkSubmitError] = useState<string | null>(null);
  const [bulkProcessingResult, setBulkProcessingResult] = useState<any | null>(null);
  const [patientListView, setPatientListView] = useState<
  "all" | "today" | "recall" | "priority"
>("all");

const [isPatientsHelpOpen, setIsPatientsHelpOpen] = useState(false);
const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState(false);
const [createPatientFirstName, setCreatePatientFirstName] = useState("");
const [createPatientLastName, setCreatePatientLastName] = useState("");
const [createPatientBirthDate, setCreatePatientBirthDate] = useState("");
const [createPatientEmail, setCreatePatientEmail] = useState("");
const [createPatientPhone, setCreatePatientPhone] = useState("");
const [createPatientError, setCreatePatientError] = useState<string | null>(null);
const [isCreatingPatient, setIsCreatingPatient] = useState(false);
const [createPatientContext, setCreatePatientContext] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const isPatientsLoadCancelledRef = useRef(false);

  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkProcessingMessageIndex, setBulkProcessingMessageIndex] = useState(0);
  const [bulkRightPanelMode, setBulkRightPanelMode] = useState<"confirm" | "processing" | "review" | "done">("confirm");

  const [bulkSendPatientEmail, setBulkSendPatientEmail] = useState(true);
  const [bulkSendColleagueLetter, setBulkSendColleagueLetter] = useState(true);
  
  const [bulkPatientRecipientEmail, setBulkPatientRecipientEmail] = useState("");
  const [bulkColleagueRecipientEmail, setBulkColleagueRecipientEmail] = useState("");
  
  const [bulkEditingPreview, setBulkEditingPreview] = useState<"patient" | "colleague" | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditTarget, setBulkEditTarget] = useState<"patient" | "doctor" | null>(null);
  const [pathologyTab, setPathologyTab] = useState<
  "overview" | "findings" | "alerts" | "followup"
>("overview");

  
  
  const bulkProcessingMessages = [
    "Réception sécurisée des documents…",
    "Lecture du contenu médical en cours…",
    "Identification du type de document…",
    "Recherche d’un patient correspondant…",
    "Analyse du contexte clinique…",
    "Préparation des contenus à valider…",
    "Vérification des consignes du cabinet…",
    "Génération d’une proposition exploitable…",
  ];

  const bulkReviewItems = Array.isArray(bulkProcessingResult?.results)
  ? bulkProcessingResult.results
  : [];

  const currentBulkReviewItem = bulkReviewItems[0] ?? null;

  const currentPatientEmail = currentBulkReviewItem?.patient_email ?? null;
  const currentColleagueLetter = currentBulkReviewItem?.colleague_letter ?? null;
  const currentRisk = currentBulkReviewItem?.risk ?? null;
  
  const patientRecipientEmail =
    currentBulkReviewItem?.patient?.email?.trim() || "";
  
  const colleagueRecipientEmail =
    currentBulkReviewItem?.patient?.doctor_name?.trim() || "";
  
  const canSendPatientEmail =
    bulkSendPatientEmail &&
    !!currentPatientEmail?.available &&
    !!patientRecipientEmail.trim();
  
  const canSendColleagueLetter =
    bulkSendColleagueLetter &&
    !!currentColleagueLetter?.available &&
    !!colleagueRecipientEmail.trim();
  
  const canValidateBulkSend = canSendPatientEmail || canSendColleagueLetter;

  const patientPreview = currentBulkReviewItem?.patient_email ?? null;
  const colleaguePreview = currentBulkReviewItem?.colleague_letter ?? null;
  const riskPreview = currentBulkReviewItem?.risk ?? null;
  
  const [createTaskDueDate, setCreateTaskDueDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  
  const [isCreateTaskDatePickerOpen, setIsCreateTaskDatePickerOpen] = useState(false);

const reviewVariant =
  currentBulkReviewItem?.ui?.variant ||
  currentBulkReviewItem?.raw?.ui?.variant ||
  null;

  const isManualReviewDocument =
  reviewVariant === "manual_review_required" ||
  currentBulkReviewItem?.review_status === "human_review_required" ||
  currentBulkReviewItem?.qualification_status === "needs_human_review";

const isRejectedDocument =
  reviewVariant === "rejected_document" ||
  currentBulkReviewItem?.source_branch === "do_not_process" ||
  currentBulkReviewItem?.qualification_status === "irrelevant_document" ||
  isManualReviewDocument;

const rejectReason =
  currentBulkReviewItem?.ui?.reject_reason ||
  currentBulkReviewItem?.raw?.ui?.reject_reason ||
  currentBulkReviewItem?.requested_action?.instructions_for_specialist_agent ||
  "Ce document ne relève pas d’un traitement médical patient.";
  
  const hasPatientPreview = !!patientPreview?.available;
  const hasColleaguePreview = !!colleaguePreview?.available;
  const hasRiskItems =
    riskPreview?.flag === true ||
    (Array.isArray(riskPreview?.items) && riskPreview.items.length > 0);

  
  const rejectedSummaryText = isManualReviewDocument
    ? "Merci d’ajouter des précisions dans le champ d’instructions ou de renvoyer un document complet."
    : currentBulkReviewItem?.ui?.summary ||
      currentBulkReviewItem?.document?.summary ||
      "Ce document ne peut pas être traité par Lisa.";
  
  const rejectedReasonText = isManualReviewDocument
    ? currentBulkReviewItem?.ui?.reject_reason ||
      currentBulkReviewItem?.requested_action?.instructions_for_specialist_agent ||
      "Merci de compléter les informations manquantes avant de relancer le traitement."
    : currentBulkReviewItem?.ui?.reject_reason ||
      currentBulkReviewItem?.requested_action?.goal ||
      "Le document ne relève pas d’un traitement médical patient.";


    const isPatientRecordProcessed =
      currentBulkReviewItem?.source_branch === "patient_record" &&
      currentBulkReviewItem?.review_status === "processed_directly" &&
      currentBulkReviewItem?.send_to_processing === true;
    
    const patientRecordPreview = currentBulkReviewItem?.records_review ?? null;
    
    const patientRecordConfidence =
      typeof currentBulkReviewItem?.document?.confidence === "number"
        ? `${Math.round(currentBulkReviewItem.document.confidence * 100)}%`
        : "—";

    const isPathologyAnalysis =
      currentBulkReviewItem?.source_branch === "pathology_analysis" &&
      currentBulkReviewItem?.pathology_analysis?.available === true;
    
    const pathologyPreview = currentBulkReviewItem?.pathology_analysis ?? null;
    
    const pathologyKeyFindings = Array.isArray(pathologyPreview?.document_key_findings)
      ? pathologyPreview.document_key_findings
      : [];
    
    const pathologyAlerts = Array.isArray(pathologyPreview?.alertes)
      ? pathologyPreview.alertes
      : [];
    
    const pathologyFollowups = Array.isArray(pathologyPreview?.suites_recommandees)
      ? pathologyPreview.suites_recommandees
      : [];
    
    const pathologyReferences = Array.isArray(pathologyPreview?.references)
      ? pathologyPreview.references
      : [];
    
    const pathologyConfidence =
      typeof pathologyPreview?.confidence_score === "number"
        ? `${Math.round(pathologyPreview.confidence_score * 100)}%`
        : typeof currentBulkReviewItem?.document?.confidence === "number"
        ? `${Math.round(currentBulkReviewItem.document.confidence * 100)}%`
        : "—";




  const bulkActionOptions = [
    {
      id: "records",
      label: "Créer / mettre à jour des dossiers patients",
      icon: "↓",
    },
    {
      id: "pathology_review",
      label: "Analyser dossier pathologique",
      icon: "◔",
    },
    {
      id: "patient_letters",
      label: "Rédiger courrier patients & suivi confrères",
      icon: "⌘",
    },
  ] as const;
  
  const patientLetterSubOptions = [
    "Anapath",
    "Biologie",
    "Imagerie",
  ];
  
  const bulkHelperTextByIntent: Record<string, string> = {
    records:
      "Je vais analyser les documents chargés pour identifier les patients concernés, créer les dossiers manquants et enrichir ceux déjà existants. Vous pouvez préciser ici toute consigne particulière.",
    pathology_review:
      "Je vais analyser les dossiers pathologiques transmis, en structurant les éléments utiles au suivi médical. Vous pouvez ajouter ici des consignes d’analyse ou de restitution.",
    patient_letters:
      "Je vais rédiger des courriers patients et le suivi pour les médecins-traitants à partir des documents chargés. Ajoutez ici vos instructions complémentaires si besoin.",
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

  async function handleCompleteTask(taskId: string) {
    if (!selectedPatientId || !taskId) return;
  
    try {
      setUpdatingTaskIds((prev) => [...prev, taskId]);
  
      const response = await fetch(`/api/patients/${selectedPatientId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
        }),
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "TASK_UPDATE_FAILED");
      }
  
      await refreshSelectedPatientDetail(selectedPatientId);
    } catch (error) {
      console.error("[HL Patients] task update error:", error);
    } finally {
      setUpdatingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  }

  function resetCreateTaskModalState() {
    setCreateTaskTitle("");
    setCreateTaskDescription("");
    setCreateTaskPriority("medium");
    setCreateTaskError(null);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    
    setCreateTaskDueDate(`${year}-${month}-${day}`);
    setIsCreateTaskDatePickerOpen(false);
  }

  function resetCreatePatientModalState() {
    setCreatePatientFirstName("");
    setCreatePatientLastName("");
    setCreatePatientBirthDate("");
    setCreatePatientEmail("");
    setCreatePatientPhone("");
    setCreatePatientError(null);
    setCreatePatientContext("");
  }

  async function handleTogglePatientTask(taskId: string, nextStatus: "pending" | "completed") {
    if (!selectedPatientId) {
      console.log("[HL Tasks] abort: no selectedPatientId");
      return;
    }
  
    try {
      setUpdatingTaskId(taskId);
  
      const url = `/api/patients/${selectedPatientId}/tasks/${taskId}`;
      const body = { status: nextStatus };
  
      console.log("[HL Tasks] fetch:start", { url, body });
  
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
  
      console.log("[HL Tasks] fetch:response", {
        status: response.status,
        ok: response.ok,
      });
  
      const payload = await response.json();
  
      console.log("[HL Tasks] fetch:payload", payload);
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "PATIENT_TASK_UPDATE_FAILED");
      }
  
      console.log("[HL Tasks] refresh:start");
      await refreshSelectedPatientDetail(selectedPatientId);
      console.log("[HL Tasks] refresh:done");
    } catch (error) {
      console.error("[HL Patients] toggle task error:", error);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function formatCreateTaskDueDateLabel(value: string) {
    if (!value) return "Aujourd’hui";
  
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
  
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  
  function getTodayDateInputValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function handleCreateTask() {
    if (!selectedPatientId) {
      setCreateTaskError("Aucun patient sélectionné.");
      return;
    }
  
    if (!createTaskTitle.trim()) {
      setCreateTaskError("Le titre de la tâche est requis.");
      return;
    }
  
    try {
      setIsCreatingTask(true);
      setCreateTaskError(null);
  
      const response = await fetch(`/api/patients/${selectedPatientId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: createTaskTitle,
          description: createTaskDescription,
          priority: createTaskPriority,
          dueDate: createTaskDueDate,
        }),
      });
  
      const rawResponseText = await response.text();

      console.log("[HL Tasks] create raw response:", rawResponseText);
      
      let payload: any = null;
      
      try {
        payload = rawResponseText ? JSON.parse(rawResponseText) : null;
      } catch (parseError) {
        console.error("[HL Tasks] create parse error:", parseError);
        throw new Error("TASK_CREATE_INVALID_JSON_RESPONSE");
      }
      
      console.log("[HL Tasks] create payload:", payload);
      
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "TASK_CREATE_FAILED");
      }
  
      await refreshSelectedPatientDetail(selectedPatientId);
      setIsCreateTaskModalOpen(false);
      resetCreateTaskModalState();
    } catch (error) {
      console.error("[HL Patients] create task error:", error);
  
      const rawMessage =
        error instanceof Error ? error.message : "Une erreur est survenue.";
  
      let finalMessage = "Impossible de créer la tâche pour le moment.";
  
      if (rawMessage === "PATIENT_NOT_FOUND") {
        finalMessage = "Le patient sélectionné est introuvable.";
      } else if (rawMessage === "TASK_TITLE_REQUIRED") {
        finalMessage = "Le titre de la tâche est requis.";
      } else if (rawMessage === "INVALID_PRIORITY") {
        finalMessage = "La priorité sélectionnée est invalide.";
      }
  
      setCreateTaskError(finalMessage);
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function loadPatients() {
    try {
      setIsLoading(true);
      setLoadError(null);
  
      const response = await fetch("/api/patients", {
        method: "GET",
        cache: "no-store",
      });
  
      const payload = (await response.json()) as PatientsApiResponse;
  
      if (!response.ok || !payload?.ok || !Array.isArray(payload.patients)) {
        throw new Error(payload?.details || payload?.error || "PATIENTS_LOAD_FAILED");
      }
  
      if (isPatientsLoadCancelledRef.current) return;
  
      setPatients(payload.patients);
      setOptimisticPatients((prev) =>
        prev.filter((optimisticPatient) => {
          const optimisticFullName = String(optimisticPatient.fullName ?? "")
            .trim()
            .toLowerCase();
      
          const hasRealMatch = payload.patients?.some((realPatient) => {
            const realFullName = String(realPatient.fullName ?? "")
              .trim()
              .toLowerCase();
      
            return optimisticFullName && realFullName === optimisticFullName;
          });
      
          return !hasRealMatch;
        })
      );
      setSelectedPatientId(
        payload.selectedPatientId ?? payload.patients[0]?.id ?? null
      );
    } catch (error) {
      if (isPatientsLoadCancelledRef.current) return;
  
      console.error("[HL Patients] load patients error:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les patients."
      );
    } finally {
      if (!isPatientsLoadCancelledRef.current) {
        setIsLoading(false);
      }
    }
  }
  
  useEffect(() => {
    isPatientsLoadCancelledRef.current = false;
  
    loadPatients();
  
    return () => {
      isPatientsLoadCancelledRef.current = true;
    };
  }, []);
  
  useEffect(() => {
    if (optimisticPatients.length === 0) return;
  
    const interval = window.setInterval(() => {
      loadPatients();
    }, 10000);
  
    return () => {
      window.clearInterval(interval);
    };
  }, [optimisticPatients.length]);


  const searchedPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
  
    if (!query) return patients;
  
    return patients.filter((patient) => {
      const haystack = [
        patient.fullName,
        patient.ageDisplay,
        patient.meta,
        patient.followupStatus,
        patient.shortSummary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
  
      return haystack.includes(query);
    });
  }, [patients, search]);
  
  const filteredPatients = useMemo(() => {
    if (patientListView === "priority") {
      return searchedPatients.filter((patient) => patient.status === "urgent");
    }
  
    if (patientListView === "today") {
      return [];
    }
  
    if (patientListView === "recall") {
      return [];
    }
  
    return searchedPatients;
  }, [searchedPatients, patientListView]);

  function isTaskVisible(task: NonNullable<PatientDetailResponse["tasks"]>[number]) {
    if (task.status !== "completed") return true;
    if (!task.completedAt) return true;
  
    const completedAt = new Date(task.completedAt);
    const todayStart = new Date(tasksNow);
    todayStart.setHours(0, 0, 0, 0);
  
    return completedAt >= todayStart;
  }
  
  const visiblePatientTasks = patientTasks.filter(isTaskVisible);
  const pendingTasksCount = visiblePatientTasks.filter(
    (task) => task.status !== "completed"
  ).length;

  const selectedPatient =
    filteredPatients.find((patient) => patient.id === selectedPatientId) ??
    patients.find((patient) => patient.id === selectedPatientId) ??
    filteredPatients[0] ??
    patients[0] ??
    null;

    useEffect(() => {
        let isCancelled = false;
      
        async function loadPatientDetail(patientId: string) {
          try {
            setIsDetailLoading(true);
            setDetailError(null);
      
            const response = await fetch(`/api/patients/${patientId}`, {
              method: "GET",
              cache: "no-store",
            });
      
            const payload = (await response.json()) as PatientDetailResponse;
      
            if (!response.ok || !payload?.ok || !payload.patient) {
              throw new Error(payload?.details || payload?.error || "PATIENT_DETAIL_LOAD_FAILED");
            }
      
            if (isCancelled) return;
      
            setPatientDetailResponse(payload);
            setPatientDetail(payload.patient);
            setPatientNotes(payload.notes ?? []);
            setPatientDocuments(payload.documents ?? []);
            setPatientTasks(payload.tasks ?? []);
            setPatientSuggestions(payload.followupSuggestions ?? []);
            setSelectedNoteId((current) => current || payload.notes?.[0]?.id || "");
          } catch (error) {
            if (isCancelled) return;
      
            console.error("[HL Patients] load patient detail error:", error);
            setDetailError(
              error instanceof Error
                ? error.message
                : "Impossible de charger le détail patient."
            );
            setPatientDetailResponse(null);
            setPatientDetail(null);
            setPatientNotes([]);
            setPatientDocuments([]);
            setPatientTasks([]);
            setPatientSuggestions([]);
            setSelectedNoteId("");
          } finally {
            if (!isCancelled) {
              setIsDetailLoading(false);
            }
          }
        }
      
        if (!selectedPatientId) {
            setPatientDetailResponse(null);
            setPatientDetail(null);
            setPatientNotes([]);
            setPatientDocuments([]);
            setPatientTasks([]);
            setPatientSuggestions([]);
            setSelectedNoteId("");
            return;
          }
      
        loadPatientDetail(selectedPatientId);
      
        return () => {
          isCancelled = true;
        };
      }, [selectedPatientId]);

  function renderStatusDot(status: PatientListItem["status"]) {
    if (status === "urgent") {
      return `${styles.patientStatusDot} ${styles.statusUrgent}`;
    }

    if (status === "pending") {
      return `${styles.patientStatusDot} ${styles.statusPending}`;
    }

    return `${styles.patientStatusDot} ${styles.statusActive}`;
  }

  function formatLongDate(value: string | null | undefined) {
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
  
  function formatBirthLabel(value: string | null | undefined) {
    if (!value) return "Date inconnue";
  
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }
  
  function formatWeight(value: number | null | undefined) {
    if (value == null) return "—";
    return `${value} kg`;
  }

  function formatNoteDateTime(value: string | null | undefined) {
    if (!value) return "—";

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

  function formatTaskDueLabel(dueAt: string | null, isLate: boolean) {
    if (!dueAt) return null;
  
    const dueDate = new Date(dueAt);
    if (Number.isNaN(dueDate.getTime())) return null;
  
    if (isLate) return "Échéance dépassée";
  
    const now = new Date();
  
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
    if (dueDay.getTime() === today.getTime()) {
      return "Échéance : aujourd’hui";
    }
  
    if (dueDay.getTime() === tomorrow.getTime()) {
      return "Échéance : demain";
    }
  
    return `Échéance : ${dueDate.toLocaleDateString("fr-FR")}`;
  }

  function formatDocumentDate(value: string | null | undefined) {
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

  function getDocumentExtension(doc: PatientDocumentItem) {
    const rawFromType = String(doc.type ?? "").trim().toLowerCase();
    if (rawFromType) return rawFromType;

    const rawFromMime = String(doc.mimeType ?? "").trim().toLowerCase();

    if (rawFromMime === "application/pdf") return "pdf";
    if (rawFromMime === "image/jpeg") return "jpeg";
    if (rawFromMime === "image/jpg") return "jpg";
    if (rawFromMime === "image/png") return "png";
    if (rawFromMime === "image/webp") return "webp";

    const fileName = String(doc.title ?? "").trim().toLowerCase();
    const extension = fileName.includes(".")
      ? fileName.split(".").pop()?.toLowerCase() ?? ""
      : "";

    return extension;
  }

  function isPdfDocument(doc: PatientDocumentItem) {
    const extension = getDocumentExtension(doc);
    return extension === "pdf";
  }

  function getDocumentDisplayType(doc: PatientDocumentItem) {
    const extension = getDocumentExtension(doc);

    if (extension === "pdf") return "PDF";
    if (extension === "jpg" || extension === "jpeg") return "Image";
    if (extension === "png") return "Image";
    if (extension === "webp") return "Image";

    return doc.type || "Fichier";
  }

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
    label: "Zone abdominale",
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
    label: "Zone abdominale",
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
    label: "Zone surveillée",
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
    label: "Zone générale",
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
    label: "Alerte générale",
    top: "12%",
    left: "24%",
    width: "52%",
    height: "72%",
    pointTop: "30%",
    pointLeft: "52%",
  },
};

function getFallbackAnatomyFromIndex(index: number) {
  const fallbackIds = ["detail-1", "detail-2", "detail-3", "detail-4", "detail-5"];
  return anatomyMap[fallbackIds[index] ?? "detail-1"];
}



function getInteractionTitle(interactionType: string | null | undefined) {
    if (interactionType === "consultation") return "Post consultation";
    if (interactionType === "exam") return "Post examen";
    if (interactionType === "operation") return "Post opération";
    if (interactionType === "lisa_followup") return "Point de suivi Lisa";
    return "Note";
  }

  function buildNoteSummary(text: string) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned.length <= 88) return cleaned;
    return `${cleaned.slice(0, 88).trim()}...`;
  }

  function formatAudioDuration(value: number | null | undefined) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return null;
    }

    const minutes = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(value % 60)
      .toString()
      .padStart(2, "0");

    return `${minutes}:${seconds}`;
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
      "video/webm",
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
      setNoteInputType("text");
      return;
    }
  
    const validationError = validateSelectedAudioFile(file);
  
    if (validationError) {
      setSelectedAudioFile(null);
      setAudioDurationSeconds(null);
      setNoteAudioError(validationError);
      setNoteInputType("text");
      return;
    }
  
    setSelectedAudioFile(file);
    setNoteAudioError(null);
    setNoteInputType("audio");
  
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
      setNoteModalError(null);
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
      setNoteInputType("audio");
      setIsAudioMenuOpen(true);
  
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
  
      recorder.onerror = (event) => {
        console.error("[HL Patients] mediaRecorder error:", event);
        setNoteAudioError("Impossible d’enregistrer l’audio pour le moment.");
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
          "Impossible d’accéder au micro pour le moment. Vérifie les autorisations du navigateur."
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
  
  function handleNoteAudioInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    handleAudioSelection(file);
  
    if (noteAudioInputRef.current) {
      noteAudioInputRef.current.value = "";
    }
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

  function resetUploadState() {
    setSelectedUploadFile(null);
    setUploadError(null);
    setIsUploadingDocument(false);
    setUploadProgress(0);

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

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return "Le fichier est trop volumineux. Taille maximum autorisée : 15 MB.";
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

  async function handleUploadSelectedFile() {
    if (!selectedUploadFile) return;

    if (!selectedPatientId) {
      setUploadError("Aucun patient sélectionné.");
      return;
    }

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
      formData.append("isDemo", "false");
      formData.append("patientId", selectedPatientId);

      const response = await fetch("/api/patient-documents/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      window.clearInterval(progressTimer);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "UPLOAD_FAILED");
      }

      setUploadProgress(100);

      await refreshSelectedPatientDetail(selectedPatientId);

      setIsUploadModalOpen(false);
      resetUploadState();
    } catch (error) {
      console.error("[HL Patients] upload error:", error);

      const rawMessage =
        error instanceof Error ? error.message : "Une erreur est survenue.";

      let finalMessage = "Impossible d’ajouter le document pour le moment.";

      if (rawMessage === "INVALID_FILE_TYPE") {
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


  function resetNoteModalState() {
    setNoteInteractionType("consultation");
    setEditingNoteId(null);
    setIsEditingNote(false);
    setNoteInputType("text");
    setNoteTextValue("");
    setSelectedAudioFile(null);
    setAudioDurationSeconds(null);
    setNoteAudioError(null);
    setIsAudioMenuOpen(false);
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
    setRecordedAudioLabel(null);
    setPrepareFollowupEmail(false);
    setSendFollowupEmail(false);
    setSendWithoutValidation(false);
    setIsFollowupInfoOpen(false);
    setIsSavingNote(false);
    setNoteModalError(null);
    setSelectedNoteAudioUrl(null);
    setIsLoadingSelectedAudioUrl(false);
  
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
  
    if (noteAudioInputRef.current) {
      noteAudioInputRef.current.value = "";
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

  const notes: PatientNoteItem[] = (patientDetailResponse?.notes ?? []).map((note) => {
    const content = note.content?.trim() || "";
    const followupStatus = note.followupEmailStatus ?? "not_requested";
  
    return {
      id: note.id,
      title: note.title || getInteractionTitle(note.detectedIntent),
      summary: buildNoteSummary(content),
      datetime: formatNoteDateTime(note.datetime),
      author: "Lisa",
      content,
      hasAudio: note.hasAudio,
      audioDuration: formatAudioDuration(note.audioDurationSeconds),
      isFollowupSent: followupStatus === "sent",
      isFollowupDraftReady:
        followupStatus === "draft_ready" || followupStatus === "pending_validation",
      followupEmailSubject: note.followupEmailSubject ?? null,
      followupEmailBody: note.followupEmailBody ?? null,
      detectedIntent: note.detectedIntent ?? null,
      riskFlag: note.riskFlag === true,
      riskSummary: note.riskSummary ?? "",
      riskItems: Array.isArray(note.riskItems) ? note.riskItems : [],
      sources: Array.isArray((note as any).sources) ? (note as any).sources : [],
      audioStoragePath: note.audioStoragePath ?? null,
      audioStorageBucket: note.audioStorageBucket ?? null,
      audioMimeType: note.audioMimeType ?? null,
      transcriptionStatus: note.transcriptionStatus,
    };
  });

  const selectedNote =
    notes.find((note) => note.id === selectedNoteId) ?? notes[0] ?? null;

    const selectedNoteHasDraft =
    !!selectedNote?.followupEmailSubject && !!selectedNote?.followupEmailBody;

    const canRefreshDraft =
    !!selectedNoteHasDraft && !selectedNote?.isFollowupSent;
  
  const patientHasEmail = !!patientDetail?.email?.trim();
  
  const followupEmailDisabledReason = patientHasEmail
    ? ""
    : "Veuillez ajouter le mail du patient pour activer cette fonctionnalité";
  
    const documentsForDisplay = patientDocuments.map((doc) => ({
      ...doc,
      displayDate: formatDocumentDate(doc.date),
      displayType: getDocumentDisplayType(doc),
      isPdf: isPdfDocument(doc),
      showShareIcons:
        doc.isShareableWithPatient === true || doc.isShareableWithDoctor === true,
    }));

  const selectedAnatomy =
  anatomyMap[selectedDetailId] ??
  getFallbackAnatomyFromIndex(0);

    useEffect(() => {
        if (!selectedNote?.hasAudio) {
          setSelectedNoteAudioUrl(null);
          return;
        }
      
        loadSelectedNoteAudioUrl(selectedNote);
      }, [selectedNoteId, selectedNote?.hasAudio]);

    async function refreshSelectedPatientDetail(patientId: string) {
        const response = await fetch(`/api/patients/${patientId}`, {
          method: "GET",
          cache: "no-store",
        });
      
        const payload = (await response.json()) as PatientDetailResponse;
      
        if (!response.ok || !payload?.ok || !payload.patient) {
          throw new Error(payload?.details || payload?.error || "PATIENT_DETAIL_LOAD_FAILED");
        }
      
        setPatientDetail(payload.patient);
        setPatientNotes(payload.notes ?? []);
        setPatientDocuments(payload.documents ?? []);
        setPatientTasks(payload.tasks ?? []);
        setPatientSuggestions(payload.followupSuggestions ?? []);
        setPatientDetailResponse(payload);
      
        setSelectedNoteId((current) => {
          const nextNotes = payload.notes ?? [];
      
          if (nextNotes.length === 0) return "";
          if (current && nextNotes.some((note) => note.id === current)) return current;
      
          return nextNotes[0]?.id ?? "";
        });
      
        return payload;
      }

      useEffect(() => {
        if (!selectedPatientId) return;
      
        const interval = window.setInterval(() => {
          refreshSelectedPatientDetail(selectedPatientId).catch((error) => {
            console.error("[HL Patients] polling refresh error:", error);
          });
        }, 5000);
      
        return () => {
          window.clearInterval(interval);
        };
      }, [selectedPatientId]);

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

  useEffect(() => {
    function handleCloseDocumentMenu(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
  
      if (target?.closest(`.${styles.documentsMoreWrap}`)) {
        return;
      }
  
      setOpenDocumentMenuId(null);
    }
  
    document.addEventListener("mousedown", handleCloseDocumentMenu);
  
    return () => {
      document.removeEventListener("mousedown", handleCloseDocumentMenu);
    };
  }, []);

  useEffect(() => {
    if (isPathologyAnalysis) {
      setPathologyTab("overview");
    }
  }, [isPathologyAnalysis, currentBulkReviewItem?.result_id]);

  useEffect(() => {
    function scheduleNextMidnightRefresh() {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
  
      const delay = nextMidnight.getTime() - now.getTime();
  
      const timeout = window.setTimeout(() => {
        setTasksNow(new Date());
  
        const interval = window.setInterval(() => {
          setTasksNow(new Date());
        }, 60 * 1000);
  
        (window as any).__hlTasksMidnightInterval = interval;
      }, delay);
  
      return timeout;
    }
  
    const timeout = scheduleNextMidnightRefresh();
  
    return () => {
      window.clearTimeout(timeout);
  
      const existingInterval = (window as any).__hlTasksMidnightInterval;
      if (existingInterval) {
        window.clearInterval(existingInterval);
        delete (window as any).__hlTasksMidnightInterval;
      }
    };
  }, []);

  function handleOpenEditNote(note: PatientNoteItem) {
    const interactionType =
      note.detectedIntent === "exam" ||
      note.detectedIntent === "operation" ||
      note.detectedIntent === "lisa_followup"
        ? note.detectedIntent
        : "consultation";
  
    setEditingNoteId(note.id);
    setIsEditingNote(true);
    setNoteInteractionType(interactionType);
    setNoteTextValue(note.content ?? "");
    setSelectedAudioFile(null);
    setAudioDurationSeconds(null);
    setNoteAudioError(null);
    setNoteInputType("text");
    setIsAudioMenuOpen(false);
    setNoteModalError(null);
    setIsNoteModalOpen(true);
  }

  async function handleSaveTextNote() {
    const cleanedText = noteTextValue.trim();

    if (!cleanedText) {
      setNoteModalError("Merci de saisir une note avant d’enregistrer.");
      return;
    }

    if (!selectedPatientId) {
      setNoteModalError("Aucun patient sélectionné.");
      return;
    }

    try {
      setIsSavingNote(true);
      setNoteModalError(null);

      const endpoint = editingNoteId
      ? `/api/patient-notes/${editingNoteId}`
      : "/api/patient-notes";
    
    const method = editingNoteId ? "PATCH" : "POST";
    
    const payloadBody = editingNoteId
      ? {
          interactionType: noteInteractionType,
          rawText: cleanedText,
        }
      : {
          patientId: selectedPatientId,
          isDemo: false,
          noteType: "text",
          interactionType: noteInteractionType,
          rawText: cleanedText,
          prepareFollowupEmail,
          sendFollowupEmail,
          sendWithoutValidation,
        };
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadBody),
    });

      const payload = (await response.json()) as SaveNoteResponse;

      if (!response.ok || !payload?.ok || !payload?.note) {
        throw new Error(payload?.error || "NOTE_SAVE_FAILED");
      }

      const refreshed = await refreshSelectedPatientDetail(selectedPatientId);

      if (editingNoteId) {
        setSelectedNoteId(editingNoteId);
      } else {
        setSelectedNoteId(payload.note.id || refreshed.notes?.[0]?.id || "");
      }
      
      setPatientMainTab("notes");
      setIsNoteModalOpen(false);
      resetNoteModalState();
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Une erreur est survenue.";

      let finalMessage = "Impossible d’enregistrer la note pour le moment.";

      if (rawMessage === "NOTE_TEXT_REQUIRED") {
        finalMessage = "Merci de saisir une note avant d’enregistrer.";
      } else if (rawMessage === "PATIENT_NOT_FOUND") {
        finalMessage = "Le patient sélectionné est introuvable.";
      } else if (rawMessage === "PATIENT_MODE_MISMATCH") {
        finalMessage = "Impossible d’enregistrer cette note sur ce dossier.";
      } else if (rawMessage === "NOTE_LOCKED_BECAUSE_FOLLOWUP_SENT") {
        finalMessage = "Cette note ne peut plus être modifiée car le mail de suivi a déjà été envoyé.";
      } else if (rawMessage === "ONLY_TEXT_NOTES_CAN_BE_EDITED") {
        finalMessage = "Seules les notes texte peuvent être modifiées.";
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
  
    if (!selectedPatientId) {
      setNoteModalError("Aucun patient sélectionné.");
      return;
    }
  
    try {
      setIsSavingNote(true);
      setNoteModalError(null);
      setNoteAudioError(null);
  
      const formData = new FormData();
      formData.append("audio", selectedAudioFile);
      formData.append("patientId", selectedPatientId);
      formData.append("isDemo", "false");
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
  
      const refreshed = await refreshSelectedPatientDetail(selectedPatientId);
      setSelectedNoteId(payload.note.id || refreshed.notes?.[0]?.id || "");
      setPatientMainTab("notes");
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


  async function handleDeleteSelectedNote() {
    if (!selectedNote?.id) return;
  
    const confirmed = window.confirm("Supprimer cette note ?");
    if (!confirmed) return;
  
    try {
      setIsDeletingNote(true);
      setOpenSelectedNoteMenu(false);
  
      const response = await fetch(`/api/patient-notes/${selectedNote.id}`, {
        method: "DELETE",
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "DELETE_NOTE_FAILED");
      }
  
      if (!selectedPatientId) return;
  
      const refreshed = await refreshSelectedPatientDetail(selectedPatientId);
      const refreshedNotes = refreshed.notes ?? [];
  
      if (refreshedNotes.length > 0) {
        setSelectedNoteId(refreshedNotes[0].id);
      } else {
        setSelectedNoteId("");
      }
    } catch (error) {
      console.error("[HL Patients] delete note error:", error);
    } finally {
      setIsDeletingNote(false);
    }
  }

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
  
      if (!selectedPatientId) return;
  
      const refreshed = await refreshSelectedPatientDetail(selectedPatientId);
      const refreshedNotes = refreshed.notes ?? [];
      const refreshedSelectedNote =
        refreshedNotes.find((note) => note.id === selectedNote.id) ?? refreshedNotes[0];
  
      setSelectedNoteId(refreshedSelectedNote?.id ?? "");
      setIsFollowupRequestModalOpen(false);
      setFollowupRequestError(null);
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
  
      if (!selectedPatientId) return;
  
      const refreshed = await refreshSelectedPatientDetail(selectedPatientId);
      const refreshedNotes = refreshed.notes ?? [];
      const refreshedSelectedNote =
        refreshedNotes.find((note) => note.id === selectedNote.id) ?? refreshedNotes[0];
  
      setSelectedNoteId(refreshedSelectedNote?.id ?? "");
      setFollowupDraftError(null);
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

  async function handleRefreshDraftEmail() {
    if (!selectedNote?.id) return;
  
    try {
      setIsRequestingFollowup(true);
      setFollowupDraftError(null);
      setFollowupRequestError(null);
  
      const response = await fetch("/api/patient-notes/request-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noteId: selectedNote.id,
          mode: "refresh_draft",
        }),
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "REFRESH_DRAFT_FAILED");
      }
  
      if (!selectedPatientId) return;
  
      const refreshed = await refreshSelectedPatientDetail(selectedPatientId);
      const refreshedNotes = refreshed.notes ?? [];
      const refreshedSelectedNote =
        refreshedNotes.find((note) => note.id === selectedNote.id) ?? refreshedNotes[0];
  
      setSelectedNoteId(refreshedSelectedNote?.id ?? "");
      setIsFollowupDraftModalOpen(false);
      setOpenSelectedNoteMenu(false);
    } catch (error) {
      console.error("[HL Patients] refresh draft error:", error);
  
      const rawMessage =
        error instanceof Error ? error.message : "Une erreur est survenue.";
  
      let finalMessage = "Impossible d’actualiser le brouillon pour le moment.";
  
      if (rawMessage === "FOLLOWUP_ALREADY_SENT") {
        finalMessage = "Le mail a déjà été envoyé. Le brouillon ne peut plus être actualisé.";
      } else if (rawMessage === "FOLLOWUP_DRAFT_MISSING") {
        finalMessage = "Aucun brouillon existant à actualiser.";
      } else if (rawMessage === "NOTE_TEXT_NOT_READY") {
        finalMessage = "Le contenu de la note n’est pas encore prêt.";
      }
  
      setFollowupDraftError(finalMessage);
      setFollowupRequestError(finalMessage);
    } finally {
      setIsRequestingFollowup(false);
    }
  }

  async function handleOpenNoteSource(source: NonNullable<PatientNoteItem["sources"]>[number]) {
    if (!source) return;
  
    const normalizedType = String(source.type ?? "").trim().toLowerCase();
    const isDocumentSource =
      normalizedType === "pdf" ||
      normalizedType === "image" ||
      (!!source.storageBucket && !!source.storagePath);
  
    if (isDocumentSource && source.storageBucket && source.storagePath) {
      const syntheticDocument: PatientDocumentItem = {
        id: `source-${source.interactionId ?? source.fileName ?? Date.now()}`,
        title: source.fileName || source.label || "Document",
        type:
          normalizedType === "pdf"
            ? "PDF"
            : normalizedType === "image"
            ? "Image"
            : "Document",
        date: selectedNote?.datetime || new Date().toISOString(),
        status: "Source",
        isUploaded: true,
        mimeType:
          source.mimeType ||
          (normalizedType === "pdf"
            ? "application/pdf"
            : normalizedType === "image"
            ? "image/jpeg"
            : "application/octet-stream"),
        storagePath: source.storagePath,
        storageBucket: source.storageBucket,
        analysisStatus: null,
        analysisText: null,
        analysisJson: null,
        documentFamily: null,
        isOfficialMedicalDocument: null,
        isShareableWithPatient: null,
        isShareableWithDoctor: null,
        sharingGuardReason: null,
      };
  
      setPreviewSource(source);
      setEmailSourcePreview(null);
      await handleOpenPreview(syntheticDocument);
      return;
    }
  
    if (normalizedType === "email") {
      setPreviewDocument(null);
      setPreviewUrl(null);
      setIsPreviewLoading(false);
      setPreviewSource(source);
  
      setEmailSourcePreview({
        title: source.subject || "Email",
        senderName: source.senderName || "Expéditeur inconnu",
        senderEmail: source.senderEmail || null,
        datetime: source.date || null,
        content: source.contentText || source.contentHtml || "Contenu indisponible.",
        summary: source.summary || null,
      });
  
      return;
    }
  }


  async function handleOpenPreview(doc: PatientDocumentItem) {
    setPreviewDocument(doc);
  
    if (!doc.isUploaded || !doc.storagePath || !doc.storageBucket) {
      setPreviewUrl(null);
      return;
    }
  
    try {
      setIsPreviewLoading(true);
  
      const response = await fetch(
        `/api/patient-documents/signed-url?path=${encodeURIComponent(doc.storagePath)}&bucket=${encodeURIComponent(doc.storageBucket)}`
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
    setPreviewSource(null);
    setEmailSourcePreview(null);
  }

  function resetEditContactModalState() {
    setEditContactError(null);
    setIsSavingContact(false);
    setContactPhoneValue("");
    setContactEmailValue("");
    setContactPrimaryDoctorNameValue("");
    setContactPrimaryDoctorPhoneValue("");
    setContactPrimaryDoctorEmailValue("");
    setContactTrustedNameValue("");
    setContactTrustedPhoneValue("");
    setContactTrustedEmailValue("");
  }
  
  function handleOpenEditContactModal() {
    setContactPhoneValue(patientDetail?.phone ?? "");
    setContactEmailValue(patientDetail?.email ?? "");
    setContactPrimaryDoctorNameValue(patientDetail?.primaryDoctorName ?? "");
    setContactPrimaryDoctorPhoneValue(patientDetail?.primaryDoctorPhone ?? "");
    setContactPrimaryDoctorEmailValue(patientDetail?.primaryDoctorEmail ?? "");
    setContactTrustedNameValue(patientDetail?.trustedContactName ?? "");
    setContactTrustedPhoneValue(patientDetail?.trustedContactPhone ?? "");
    setContactTrustedEmailValue(patientDetail?.trustedContactEmail ?? "");
    setEditContactError(null);
    setIsEditContactModalOpen(true);
  }
  
  async function handleSavePatientContact() {
    if (!selectedPatientId) {
      setEditContactError("Aucun patient sélectionné.");
      return;
    }
  
    try {
      setIsSavingContact(true);
      setEditContactError(null);
  
      const response = await fetch(`/api/patients/${selectedPatientId}/contact`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: contactPhoneValue,
          email: contactEmailValue,
          primaryDoctorName: contactPrimaryDoctorNameValue,
          primaryDoctorPhone: contactPrimaryDoctorPhoneValue,
          primaryDoctorEmail: contactPrimaryDoctorEmailValue,
          trustedContactName: contactTrustedNameValue,
          trustedContactPhone: contactTrustedPhoneValue,
          trustedContactEmail: contactTrustedEmailValue,
        }),
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "PATIENT_CONTACT_UPDATE_FAILED");
      }
  
      await refreshSelectedPatientDetail(selectedPatientId);
      setIsEditContactModalOpen(false);
      resetEditContactModalState();
    } catch (error) {
      console.error("[HL Patients] save contact error:", error);
  
      const rawMessage =
        error instanceof Error ? error.message : "Une erreur est survenue.";
  
      let finalMessage = "Impossible d’enregistrer les coordonnées pour le moment.";
  
      if (rawMessage === "PATIENT_NOT_FOUND") {
        finalMessage = "Le patient sélectionné est introuvable.";
      } else if (rawMessage === "PATIENT_CONTACT_MISSING") {
        finalMessage = "Aucune fiche contact n’est rattachée à ce patient.";
      }
  
      setEditContactError(finalMessage);
    } finally {
      setIsSavingContact(false);
    }
  }

  function handleOpenDocumentAnalysis(doc: PatientDocumentItem) {
    setAnalysisDocument(doc);
    setOpenDocumentMenuId(null);
  }
  
  async function handleDownloadDocument(doc: PatientDocumentItem) {
    if (!doc.isUploaded || !doc.storagePath || !doc.storageBucket) return;
  
    try {
      const response = await fetch(
        `/api/patient-documents/signed-url?path=${encodeURIComponent(doc.storagePath)}&bucket=${encodeURIComponent(doc.storageBucket)}`
      );
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok || !payload?.signedUrl) {
        throw new Error(payload?.error || "SIGNED_URL_FAILED");
      }
  
      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[HL Patients] download document error:", error);
    }
  }
  
  async function handleDeleteDocument(doc: PatientDocumentItem) {
    const confirmed = window.confirm("Supprimer ce document ?");
    if (!confirmed) return;
  
    try {
      setIsDeletingDocument(doc.id);
      setOpenDocumentMenuId(null);
  
      const response = await fetch(`/api/patient-documents/${doc.id}`, {
        method: "DELETE",
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "DELETE_DOCUMENT_FAILED");
      }
  
      if (!selectedPatientId) return;
  
      await refreshSelectedPatientDetail(selectedPatientId);
  
      if (previewDocument?.id === doc.id) {
        closePreviewModal();
      }
    } catch (error) {
      console.error("[HL Patients] delete document error:", error);
    } finally {
      setIsDeletingDocument(null);
    }
  }
  
  async function handleLaunchDocumentAnalysis(doc: PatientDocumentItem) {
    setOpenDocumentMenuId(null);
  
    const normalizedStatus = String(doc.analysisStatus ?? "")
      .trim()
      .toLowerCase();
  
    if (normalizedStatus === "done") {
      handleOpenDocumentAnalysis(doc);
      return;
    }
  
    if (normalizedStatus === "pending" || normalizedStatus === "processing") {
      return;
    }
  
    try {
      const response = await fetch("/api/patient-documents/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: doc.id,
        }),
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "DOCUMENT_ANALYZE_FAILED");
      }
  
      if (!selectedPatientId) return;
  
      const refreshed = await refreshSelectedPatientDetail(selectedPatientId);
      const refreshedDocuments = refreshed.documents ?? [];
      const refreshedDoc =
        refreshedDocuments.find((item) => item.id === doc.id) ?? null;
  
      if (refreshedDoc && refreshedDoc.analysisStatus === "done") {
        setAnalysisDocument(refreshedDoc);
      }
    } catch (error) {
      console.error("[HL Patients] launch document analysis error:", error);
    }
  }

  function handleBulkFilesSelection(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }
  
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
  
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
  
    const files = Array.from(fileList);
  
    const firstValidFile = files.find((file) => {
      const fileName = file.name.toLowerCase();
      const hasValidMime = allowedMimeTypes.includes(file.type);
      const hasValidExtension = allowedExtensions.some((ext) =>
        fileName.endsWith(ext)
      );
  
      return hasValidMime || hasValidExtension;
    });
  
    if (!firstValidFile) {
      setBulkUploadError("Format non pris en charge. Utilisez un PDF, JPG, JPEG, PNG ou WEBP.");
      return;
    }
  
    if (files.length > 1) {
      setBulkUploadError("Un seul fichier peut être traité à la fois pour le moment.");
    } else {
      setBulkUploadError(null);
    }
  
    setBulkSelectedFiles([firstValidFile]);
  }
  
  function handleRemoveBulkFile(fileToRemove: File) {
    setBulkSelectedFiles((prev) =>
      prev.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.size === fileToRemove.size &&
            file.lastModified === fileToRemove.lastModified
          )
      )
    );
  }

  function validateBulkFile(file: File) {
    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  
    if (!allowedTypes.has(file.type)) {
      return "Seuls les fichiers PDF, JPG, JPEG, PNG et WEBP sont autorisés.";
    }
  
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return "Le fichier est trop volumineux. Taille maximum autorisée : 15 MB.";
    }
  
    return null;
  }

  function normalizeBulkWebhookResponse(payload: any) {
    const root =
      Array.isArray(payload) && payload.length === 1
        ? payload[0]
        : payload;
  
    if (!root || typeof root !== "object") {
      return null;
    }
  
    const results = Array.isArray(root.results)
      ? root.results
      : [];
  
    return {
      ok: root.ok === true,
      count: typeof root.count === "number" ? root.count : results.length,
      results,
      debug: root.debug ?? null,
    };
  }

  function formatCoverage(value?: string | null) {
    if (!value || value === "unknown") return "Non fourni";
    return value;
  }

  async function handleLaunchBulkProcess() {
    try {
      if (!patientDetail?.cabinetAccountId) {
        console.error("cabinet_account_id introuvable.");
        return;
      }
  
      if (!bulkSelectedIntent) {
        console.error("Aucune intention sélectionnée.");
        return;
      }
  
      if (bulkSelectedFiles.length === 0) {
        console.error("Aucun fichier sélectionné.");
        return;
      }
  
      setIsBulkSubmitting(true);
      setBulkUploadError(null);
      setBulkSubmitError(null);
      setBulkProcessingResult(null);
      setBulkRightPanelMode("processing");

      const buildBulkFormData = () => {
        const fd = new FormData();
        fd.append("intent", bulkSelectedIntent);
        fd.append("instructions", bulkInstructions || "");
        fd.append("sub_options", JSON.stringify(bulkSelectedSubOptions));
        fd.append("cabinet_account_id", patientDetail.cabinetAccountId);

        bulkSelectedFiles.forEach((file) => {
          fd.append("files", file, file.name);
        });

        return fd;
      };
  
      const processFormData = buildBulkFormData();

      const response = await fetch("https://n8n.heylisa.io/webhook/bulk-process", {
        method: "POST",
        body: processFormData,
      });
  
      const rawText = await response.text();

      console.log("🟡 Bulk raw response text:", rawText);
      
      if (!response.ok) {
        console.error("🔴 Bulk HTTP error:", response.status, rawText);
        throw new Error(rawText || "BULK_PROCESS_FAILED");
      }
      
      let parsedPayload: any = null;
      
      try {
        parsedPayload = JSON.parse(rawText);
        console.log("🟢 Bulk parsed payload:", parsedPayload);
      } catch (error) {
        console.error("🔴 Réponse webhook non JSON :", rawText);
        throw new Error("INVALID_BULK_REVIEW_PAYLOAD");
      }
      
      const normalizedPayload = normalizeBulkWebhookResponse(parsedPayload);
      
      console.log("🟣 Bulk normalized payload:", normalizedPayload);
      
      if (!normalizedPayload) {
        console.error("🔴 normalizeBulkWebhookResponse a renvoyé null/undefined");
        throw new Error("INVALID_BULK_REVIEW_PAYLOAD");
      }
      
      if (!Array.isArray(normalizedPayload.results) || normalizedPayload.results.length === 0) {
        console.error("🔴 normalizedPayload.results vide ou invalide:", normalizedPayload);
        setBulkUploadError("Le traitement est terminé mais aucun résultat exploitable n’a été renvoyé.");
        setBulkRightPanelMode("confirm");
        return;
      }
      
      console.log("✅ Avant setState review:", {
        mode_before: bulkRightPanelMode,
        results_count: normalizedPayload.results.length,
        first_result: normalizedPayload.results[0],
      });
      
      setBulkProcessingResult(normalizedPayload);

      const firstResult = normalizedPayload.results?.[0] ?? null;
      const isDirectPatientRecordSuccess =
        firstResult?.source_branch === "patient_record" &&
        firstResult?.review_status === "processed_directly" &&
        firstResult?.send_to_processing === true;
      
      setBulkRightPanelMode(isDirectPatientRecordSuccess ? "done" : "review");
    } catch (error) {
      console.error("❌ Bulk process failed:", error);
      setBulkUploadError("Impossible de lancer le traitement pour le moment.");
      setBulkRightPanelMode("confirm");
    } finally {
      setIsBulkSubmitting(false);
    }
  }

  function normalizeBulkSendResponse(payload: any) {
    const ui = payload?.ui ?? {};
  
    return {
      ok: payload?.ok === true,
      status: payload?.status ?? "failed",
  
      cabinetAccountId: payload?.cabinet_account_id ?? null,
      patientRecordId: payload?.patient_record_id ?? null,
      patientContactId: payload?.patient_contact_id ?? null,
      sourceRef: payload?.source_ref ?? null,
      patientFullName: payload?.patient_full_name ?? null,
  
      sendSummary: {
        totalExpected: payload?.send_summary?.total_expected ?? 0,
        totalSent: payload?.send_summary?.total_sent ?? 0,
        patientEmailSent: payload?.send_summary?.patient_email_sent === true,
        doctorEmailSent: payload?.send_summary?.doctor_email_sent === true,
      },
  
      patientEmail: {
        sent: payload?.patient_email?.sent === true,
        interactionId: payload?.patient_email?.interaction_id ?? null,
        gmailMessageId: payload?.patient_email?.gmail_message_id ?? null,
        gmailThreadId: payload?.patient_email?.gmail_thread_id ?? null,
        to: payload?.patient_email?.to ?? null,
        subject: payload?.patient_email?.subject ?? null,
      },
  
      colleagueLetter: {
        sent: payload?.colleague_letter?.sent === true,
        interactionId: payload?.colleague_letter?.interaction_id ?? null,
        gmailMessageId: payload?.colleague_letter?.gmail_message_id ?? null,
        gmailThreadId: payload?.colleague_letter?.gmail_thread_id ?? null,
        to: payload?.colleague_letter?.to ?? null,
        subject: payload?.colleague_letter?.subject ?? null,
      },
  
      ui: {
        title: ui?.title ?? "Envoi terminé",
        badge: ui?.badge ?? "Terminé",
        summary: ui?.summary ?? "Traitement terminé.",
      },
  
      raw: payload,
    };
  }

  async function handleCreatePatient() {
    if (!canSubmitCreatePatient) {
      setCreatePatientError("Nom, prénom et au moins un contact sont requis.");
      return;
    }
  
    try {
      setIsCreatingPatient(true);
      setCreatePatientError(null);
  
      const firstName = createPatientFirstName.trim();
      const lastName = createPatientLastName.trim();
      const birthDate = createPatientBirthDate.trim();
      const email = createPatientEmail.trim();
      const phone = createPatientPhone.trim();
  
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          birthDate,
          email,
          phone,
          context: createPatientContext,
        }),
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "CREATE_PATIENT_FAILED");
      }
  
      const tempId = `temp-${Date.now()}`;
  
      setOptimisticPatients((prev) => [
        {
          id: tempId,
          fullName: `${firstName} ${lastName}`.trim(),
          meta: "Dossier en cours de création",
          status: "pending",
          isTemporary: true,
          birthDate: birthDate || null,
          email: email || null,
          phone: phone || null,
        },
        ...prev,
      ]);
  
      setCreatePatientSuccessMessage("Fiche créée, analyse en cours...");
  
      await new Promise((resolve) => setTimeout(resolve, 400));
  
      setIsCreatePatientModalOpen(false);
      resetCreatePatientModalState();
    } catch (error) {
      console.error("[HL Patients] create patient error:", error);
  
      const rawMessage =
        error instanceof Error ? error.message : "Impossible de créer le patient.";
  
      let finalMessage = "Impossible de créer le patient.";
  
      if (rawMessage === "FIRST_NAME_REQUIRED") {
        finalMessage = "Le prénom est requis.";
      } else if (rawMessage === "LAST_NAME_REQUIRED") {
        finalMessage = "Le nom est requis.";
      } else if (rawMessage === "PATIENT_DISCRIMINANT_REQUIRED") {
        finalMessage = "Ajoute au moins une date de naissance, un email ou un téléphone.";
      } else if (rawMessage === "INVALID_BIRTH_DATE") {
        finalMessage = "La date de naissance est invalide.";
      }
  
      setCreatePatientError(finalMessage);
    } finally {
      setIsCreatingPatient(false);
    }
  }

  async function handleValidateBulkSend() {
    try {
      if (!currentBulkReviewItem) {
        console.error("Aucun résultat bulk courant.");
        return;
      }
  
      if (!patientDetail?.cabinetAccountId) {
        console.error("cabinet_account_id introuvable.");
        return;
      }
  
      const patientRecordId =
        currentBulkReviewItem?.patient?.record_id ||
        currentBulkReviewItem?.records_review?.record_id ||
        null;
  
      const patientContactId =
        currentBulkReviewItem?.patient?.contact_id || null;
  
      const patientFullName =
        currentBulkReviewItem?.patient?.full_name || "Patient non identifié";
  
      const patientEmailPayload =
        sendPatient && patientEmail.trim() && currentBulkReviewItem?.patient_email?.available
          ? {
              to: patientEmail.trim(),
              subject: currentBulkReviewItem.patient_email.subject || "",
              html: currentBulkReviewItem.patient_email.body || "",
            }
          : null;
  
      const colleagueEmailPayload =
        sendColleague && colleagueEmail.trim() && currentBulkReviewItem?.colleague_letter?.available
          ? {
              to: colleagueEmail.trim(),
              subject: currentBulkReviewItem.colleague_letter.subject || "",
              html: currentBulkReviewItem.colleague_letter.body || "",
            }
          : null;
  
      if (!patientEmailPayload && !colleagueEmailPayload) {
        console.error("Aucun email valide à envoyer.");
        setBulkSubmitError("Merci de renseigner au moins un destinataire valide.");
        return;
      }
  
      const payload = {
        cabinet_account_id: patientDetail.cabinetAccountId,
        patient_record_id: patientRecordId,
        patient_contact_id: patientContactId,
      
        // 🔥 AJOUTS CLÉS
        interaction_id:
          currentBulkReviewItem?.interaction_id ||
          currentBulkReviewItem?.raw?.interaction_id ||
          currentBulkReviewItem?.raw?.id ||
          null,
      
        source_ref:
          currentBulkReviewItem?.source_ref ||
          currentBulkReviewItem?.raw?.source_ref ||
          null,
      
        result_id: currentBulkReviewItem?.result_id || null,
        source_branch:
          currentBulkReviewItem?.source_branch ||
          "followup_processing_result",
      
        send_patient_email: !!patientEmailPayload,
        send_colleague_letter: !!colleagueEmailPayload,
      
        patient: {
          full_name: patientFullName,
        },
      
        document_context: {
          label: currentBulkReviewItem?.document?.label || null,
          summary: currentBulkReviewItem?.document?.summary || null,
        },
      
        patient_email: patientEmailPayload,
        colleague_letter: colleagueEmailPayload,
      };
  
      console.log("🟡 Bulk send payload:", payload);
  
      setIsBulkSubmitting(true);
      setBulkSubmitError(null);
      setBulkUploadError(null);
      setBulkRightPanelMode("processing");
  
      const response = await fetch("/api/bulk-send-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      const rawText = await response.text();
      console.log("🟡 Bulk send raw response text:", rawText);
  
      if (!response.ok) {
        console.error("🔴 Bulk send HTTP error:", response.status, rawText);
        throw new Error(rawText || "BULK_SEND_FAILED");
      }
  
      let parsedPayload: any = null;
  
      try {
        parsedPayload = JSON.parse(rawText);
        console.log("🟢 Bulk send parsed payload:", parsedPayload);
      } catch (error) {
        console.error("🔴 Réponse webhook send non JSON :", rawText);
        throw new Error("INVALID_BULK_SEND_PAYLOAD");
      }
  
      const normalizedSendResult =
      parsedPayload?.results?.[0] ||
      parsedPayload?.data?.results?.[0] ||
      parsedPayload?.data ||
      (Array.isArray(parsedPayload) ? parsedPayload[0] : null) ||
      parsedPayload;
    
    console.log("🟣 Normalized bulk send result:", normalizedSendResult);
    
    setBulkProcessingResult(normalizedSendResult);
      setBulkRightPanelMode("done");
    } catch (error) {
      console.error("❌ Bulk send failed:", error);
      setBulkSubmitError("Impossible d’envoyer les courriers pour le moment.");
      setBulkRightPanelMode("review");
    } finally {
      setIsBulkSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isBulkSubmitting) {
      setBulkProcessingMessageIndex(0);
      return;
    }
  
    let currentIndex = 0;
  
    const interval = window.setInterval(() => {
      currentIndex += 1;
  
      setBulkProcessingMessageIndex((prev) => {
        if (prev >= bulkProcessingMessages.length - 1) {
          return prev; // bloque sur la dernière phrase
        }
        return prev + 1;
      });
    }, 6000); // 👈 6 secondes
  
    return () => {
      window.clearInterval(interval);
    };
  }, [isBulkSubmitting]);

  useEffect(() => {
    console.log("📦 Bulk UI state snapshot:", {
      isBulkProcessOpen,
      bulkStep,
      bulkRightPanelMode,
      isBulkSubmitting,
      bulkUploadError,
      bulkSubmitError,
      bulkProcessingResult,
      bulkReviewItems,
      currentBulkReviewItem,
    });
  }, [
    isBulkProcessOpen,
    bulkStep,
    bulkRightPanelMode,
    isBulkSubmitting,
    bulkUploadError,
    bulkSubmitError,
    bulkProcessingResult,
    bulkReviewItems,
    currentBulkReviewItem,
  ]);

  console.log("🎯 Render bulk review guards:", {
    bulkRightPanelMode,
    bulkReviewItemsLength: bulkReviewItems.length,
    currentBulkReviewItem,
  });

  console.log("BULK DEBUG", {
    bulkRightPanelMode,
    bulkProcessingResult,
    bulkReviewItemsLength: bulkReviewItems.length,
    currentBulkReviewItem,
  });

  const [sendPatient, setSendPatient] = useState(true);
  const [sendColleague, setSendColleague] = useState(true);
  
  const [patientEmail, setPatientEmail] = useState(patientRecipientEmail);
  const [colleagueEmail, setColleagueEmail] = useState("");
  
  const isPatientMatched = currentBulkReviewItem?.patient?.matched === true;
  
  // validité
  const isPatientValid = sendPatient && patientEmail.trim().length > 3;
  const isColleagueValid = sendColleague && colleagueEmail.trim().length > 3;
  
  const canValidate = isPatientValid || isColleagueValid;
  const doneResult = (() => {
    const src = bulkProcessingResult;
  
    if (!src) return null;
    if (Array.isArray(src)) return src[0] ?? null;
    if (Array.isArray(src.results)) return src.results[0] ?? null;
    if (src.data && Array.isArray(src.data.results)) return src.data.results[0] ?? null;
    if (src.data && typeof src.data === "object") return src.data;
    return src;
  })();
  
  const donePatientName =
    doneResult?.patient_full_name ||
    doneResult?.patient?.full_name ||
    "Patient non identifié";
  
  const doneTotalExpected =
    typeof doneResult?.send_summary?.total_expected === "number"
      ? doneResult.send_summary.total_expected
      : 0;
  
  const doneTotalSent =
    typeof doneResult?.send_summary?.total_sent === "number"
      ? doneResult.send_summary.total_sent
      : 0;
  
  const donePatientSent = doneResult?.patient_email?.sent === true;
  const doneDoctorSent = doneResult?.colleague_letter?.sent === true;
  
  const doneStatusLabel =
    doneResult?.status === "sent"
      ? "Envoyé"
      : doneTotalSent > 0
      ? "Partiel"
      : "À vérifier";
  
  const doneInteractionsCount =
    typeof doneResult?.debug?.inserted_rows_count === "number"
      ? doneResult.debug.inserted_rows_count
      : 0;

  const canSubmitCreatePatient =
      createPatientFirstName.trim().length > 0 &&
      createPatientLastName.trim().length > 0 &&
      (
        createPatientBirthDate.trim().length > 0 ||
        createPatientEmail.trim().length > 0 ||
        createPatientPhone.trim().length > 0
      );



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
        onClick={() => {
          setCreatePatientSuccessMessage(null);
          setIsCreatePatientModalOpen(true);
        }}
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
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    <div className={styles.patientsSidebarSection}>
      <div className={styles.patientsSidebarLabel}>Vue</div>

      <button
        type="button"
        className={`${styles.patientsSidebarTab} ${patientListView === "all" ? styles.isActive : ""}`}
        onClick={() => setPatientListView("all")}
      >
        Tous les patients
      </button>

      <button
        type="button"
        className={`${styles.patientsSidebarTab} ${patientListView === "today" ? styles.isActive : ""}`}
        onClick={() => setPatientListView("today")}
      >
        Aujourd’hui
      </button>

      <button
        type="button"
        className={`${styles.patientsSidebarTab} ${patientListView === "recall" ? styles.isActive : ""}`}
        onClick={() => setPatientListView("recall")}
      >
        À rappeler
      </button>

      <button
        type="button"
        className={`${styles.patientsSidebarTab} ${patientListView === "priority" ? styles.isActive : ""}`}
        onClick={() => setPatientListView("priority")}
      >
        Prioritaires
      </button>
    </div>

    <div className={`${styles.patientsSidebarSection} ${styles.patientsSidebarSectionList}`}>
      <div className={styles.patientsSidebarLabelRow}>
        <div className={styles.patientsSidebarLabel}>Liste patients</div>

        <button
          type="button"
          className={styles.patientsHelpButton}
          aria-label="Comprendre les priorités patients"
          onClick={() => setIsPatientsHelpOpen(true)}
        >
          <img src="/imgs/details.png" alt="" />
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
          Chargement des patients...
        </div>
      ) : loadError ? (
        <div style={{ color: "#ff8b8b", fontSize: 14 }}>
          {loadError}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
          Aucun patient trouvé.
        </div>
      ) : (
        <div className={styles.patientList}>
          {[...optimisticPatients, ...filteredPatients].map((patient) => (
            <button
              key={patient.id}
              type="button"
              className={`${styles.patientListItem} ${
                selectedPatient?.id === patient.id ? styles.isSelected : ""
              } ${patient.isTemporary ? styles.patientListItemPendingCreation : ""}`}
              onClick={() => {
                if (patient.isTemporary) return;
                setSelectedPatientId(patient.id);
              }}
            >
              <div className={styles.patientAvatar}>
                {patient.fullName.charAt(0).toUpperCase()}
              </div>

              <div className={styles.patientListContent}>
                <div className={styles.patientListName}>{patient.fullName}</div>
                <div className={styles.patientListMeta}>{patient.meta}</div>
              </div>

              <span className={renderStatusDot(patient.status)} />
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
</aside>

      <section className={styles.patientsMain}>
        <div className={styles.patientsMainInner}>
            {!selectedPatient ? (
                <div className={styles.liveStateBox}>Aucun patient sélectionné.</div>
            ) : isDetailLoading ? (
        <div className={styles.liveStateBox}>Chargement du dossier patient...</div>
            ) : detailError ? (
        <div className={`${styles.liveStateBox} ${styles.liveStateBoxError}`}>
        {detailError}
        </div>
            ) : !patientDetail ? (
        <div className={styles.liveStateBox}>Détail patient indisponible.</div>
            ) : (
            <>
                <header className={styles.patientHeader}>
                <div className={styles.patientHeaderIdentity}>
                    <div className={styles.patientHeaderAvatar}>
                    {patientDetail.fullName.charAt(0).toUpperCase()}
                    </div>

                    <div className={styles.patientHeaderText}>
                    <div className={styles.patientHeaderTitleRow}>
                        <h1 className={styles.patientHeaderName}>{patientDetail.fullName}</h1>

                        <div className={styles.patientHeaderBadges}>
                        {patientDetail.followupStatus && (
                            <span className={`${styles.patientHeaderBadge} ${styles.badgeFollow}`}>
                            <span className={styles.patientHeaderBadgeDot} />
                            {patientDetail.followupStatus}
                            </span>
                        )}

                        {patientDetail.lastReason && (
                            <span className={styles.patientHeaderBadge}>
                            {patientDetail.lastReason}
                            </span>
                        )}
                        </div>
                    </div>

                    <div className={styles.patientHeaderMeta}>
                        {(patientDetail.ageDisplay ?? "Âge inconnu")} · Né(e) le{" "}
                        {formatBirthLabel(patientDetail.dateOfBirth)} · Dossier #
                        {patientDetail.patientCode ?? "—"}
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
                onClick={() => {
                    setIsBulkProcessOpen(true);
                    setBulkStep(2);
                    setBulkRightPanelMode("confirm");
                  }}
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
                    <div
                        style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 18,
                        }}
                    >
                        <div className={styles.patientInfoCardTitle} style={{ marginBottom: 0 }}>
                        Coordonnées
                        </div>

                        <button
                        type="button"
                        onClick={handleOpenEditContactModal}
                        aria-label="Modifier les coordonnées"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.04)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                        >
                        ✎
                        </button>
                    </div>

                    <div className={styles.patientInfoRows}>
                        <div className={styles.patientInfoRow}>
                        <span className={styles.patientInfoLabel}>Téléphone</span>
                        <span className={styles.patientInfoValue}>
                            {patientDetail.phone ?? "—"}
                        </span>
                        </div>

                        <div className={styles.patientInfoRow}>
                        <span className={styles.patientInfoLabel}>Email</span>
                        <span className={styles.patientInfoValue}>
                            {patientDetail.email ?? "—"}
                        </span>
                        </div>

                        <div className={styles.patientInfoRow}>
                          <span className={styles.patientInfoLabel}>Médecin traitant</span>
                          <div className={styles.patientInfoStack}>
                            <span className={styles.patientInfoValue}>
                              {patientDetail.primaryDoctorName ?? "—"}
                            </span>
                            <span className={styles.patientInfoSubvalue}>
                              {patientDetail.primaryDoctorPhone ?? "—"}
                              {patientDetail.primaryDoctorEmail
                                ? ` · ${patientDetail.primaryDoctorEmail}`
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className={styles.patientInfoRow}>
                        <span className={styles.patientInfoLabel}>Proche de confiance</span>
                        <div className={styles.patientInfoStack}>
                            <span className={styles.patientInfoValue}>
                            {patientDetail.trustedContactName ?? "—"}
                            </span>
                            <span className={styles.patientInfoSubvalue}>
                            {patientDetail.trustedContactPhone ?? "—"}
                            {patientDetail.trustedContactEmail
                                ? ` · ${patientDetail.trustedContactEmail}`
                                : ""}
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
                        <span className={styles.patientKeyValue}>
                            {formatLongDate(patientDetail.lastConsultationAt)}
                        </span>
                        </div>

                        <div className={styles.patientKeyItem}>
                        <span className={styles.patientKeyLabel}>Prochain suivi suggéré</span>
                        <span className={styles.patientKeyValue}>
                            {formatLongDate(patientDetail.nextFollowupAt)}
                        </span>
                        </div>

                        <div className={styles.patientKeyItem}>
                        <span className={styles.patientKeyLabel}>Poids</span>
                        <span className={styles.patientKeyValue}>
                            {formatWeight(patientDetail.weightKg)}
                        </span>
                        </div>

                        <div className={styles.patientKeyItem}>
                        <span className={styles.patientKeyLabel}>Dernier motif</span>
                        <span className={styles.patientKeyValue}>
                            {patientDetail.lastReason ?? "—"}
                        </span>
                        </div>
                    </div>
                    </div>

                    <div className={styles.patientInfoCard}>
                    <div className={styles.patientInfoCardTitle}>Points d’attention</div>

                    <div className={styles.patientAlertList}>
                        {patientDetail.attentionPoints.length > 0 ? (
                        patientDetail.attentionPoints.map((point, index) => (
                            <div key={`${point.label}-${index}`} className={styles.patientAlertItem}>
                            <span className={styles.patientAlertTag}>{point.label}</span>
                            <span className={styles.patientAlertText}>{point.value || "—"}</span>
                            </div>
                        ))
                        ) : (
                        <div className={styles.patientContextText}>Aucun point d’attention.</div>
                        )}
                    </div>
                    </div>

                    <div className={styles.patientInfoCard}>
                    <div className={styles.patientInfoCardTitle}>Contexte médical</div>

                    <div className={styles.patientContextText}>
                        {patientDetail.medicalContextLong ??
                        patientDetail.medicalContext ??
                        patientDetail.clinicalSummary ??
                        "Aucun contexte médical disponible."}
                    </div>
                    </div>

                    <div className={styles.patientInfoCard}>
                    <div className={styles.patientInfoCardTitle}>Droits & couverture</div>

                    <div className={styles.patientCoverageGrid}>
                        <div className={styles.patientCoverageItem}>
                        <span className={styles.patientCoverageLabel}>Carte Vitale</span>
                        <span className={`${styles.patientCoverageBadge} ${styles.isCoverageOn}`}>
                        {formatCoverage(patientDetail.vitaleCardStatus)}
                        </span>
                        </div>

                        <div className={styles.patientCoverageItem}>
                        <span className={styles.patientCoverageLabel}>Mutuelle</span>
                        <span className={`${styles.patientCoverageBadge} ${styles.isCoverageOn}`}>
                        {formatCoverage(patientDetail.insuranceStatus)}
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
                            {notes.length > 0 ? (
                                notes.map((note) => (
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
                                        </div>

                                        <div className={styles.noteListItemBadges}>
                                        {note.isFollowupSent ? (
                                        <div className={styles.noteListItemFollowupBadge}>
                                            Suivi envoyé
                                        </div>
                                        ) : note.isFollowupDraftReady ? (
                                        <div className={styles.noteListItemFollowupBadge}>
                                            Brouillon prêt
                                        </div>
                                        ) : null}

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
                                ))
                            ) : (
                                <div style={{ padding: 18, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                Aucune note pour le moment.
                                </div>
                            )}
                            </div>

                            <div className={styles.noteDetailPane}>
                            {selectedNote ? (
                                <>
                                <div className={styles.noteDetailHeader}>
                                    <div>
                                    <div className={styles.noteDetailTitleRow}>
                                        <div className={styles.noteDetailTitle}>{selectedNote.title}</div>

                                        {selectedNote.isFollowupSent ? (
                                        <div className={styles.noteDetailFollowupBadge}>
                                            Suivi envoyé
                                        </div>
                                        ) : selectedNote.isFollowupDraftReady ? (
                                        <div className={styles.noteDetailFollowupBadge}>
                                            Brouillon prêt
                                        </div>
                                        ) : null}
                                    </div>

                                    <div className={styles.noteDetailMeta}>
                                        {selectedNote.author} · {selectedNote.datetime}
                                      </div>

                                      {Array.isArray(selectedNote?.sources) && selectedNote.sources.length > 0 && (
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: 8,
                                            flexWrap: "wrap",
                                            marginTop: 8,
                                          }}
                                        >
                                          {selectedNote.sources.map((source, index) => (
                                            <button
                                              key={`${source.label ?? "source"}-${index}`}
                                              type="button"
                                              onClick={() => handleOpenNoteSource(source)}
                                              style={{
                                                border: "1px solid rgba(255,255,255,0.10)",
                                                background: "rgba(255,255,255,0.04)",
                                                color: "rgba(255,255,255,0.78)",
                                                borderRadius: 999,
                                                padding: "4px 10px",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                letterSpacing: "0.02em",
                                                cursor: "pointer",
                                              }}
                                            >
                                              {source.label || "SOURCE"}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

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
                                        disabled={selectedNote.hasAudio || selectedNote.isFollowupSent}
                                        onClick={() => {
                                            handleOpenEditNote(selectedNote);
                                            setOpenSelectedNoteMenu(false);
                                        }}
                                        >
                                        Modifier
                                        </button>

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
                                            disabled={!canRefreshDraft}
                                            onClick={() => {
                                                handleRefreshDraftEmail();
                                            }}
                                            >
                                            Actualiser le brouillon
                                        </button>
                                        <button
                                        type="button"
                                        className={styles.noteDetailMenuItem}
                                        disabled
                                        >
                                        Compte-rendu médecin traitant
                                        </button>

                                        <button
                                            type="button"
                                            className={`${styles.noteDetailMenuItem} ${styles.noteDetailMenuItemDanger}`}
                                            onClick={handleDeleteSelectedNote}
                                            disabled={isDeletingNote}
                                        >
                                            {isDeletingNote ? "Suppression..." : "Supprimer"}
                                        </button>
                                        </div>
                                    )}
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
                                </>
                            ) : (
                                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                Aucune note sélectionnée.
                                </div>
                            )}
                            </div>
                        </div>
                        )}

                        {patientMainTab === "history" && (
                        <div className={styles.historyListView}>
                            <div style={{ padding: 18, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                            Historique bientôt branché.
                            </div>
                        </div>
                        )}

                        {patientMainTab === "details" && (
                        <div className={styles.detailsCardsView}>
                            {patientDetail.medicalDetails.length > 0 ? (
                            patientDetail.medicalDetails.map((detail) => (
                            <button
                            key={detail.id}
                            type="button"
                            onClick={() => setSelectedDetailId(detail.id)}
                            className={`${styles.detailMedicalCard} ${
                                detail.severity === "high"
                                ? styles.detailSeverityHigh
                                : detail.severity === "medium"
                                ? styles.detailSeverityMedium
                                : styles.detailSeverityLow
                            } ${selectedDetailId === detail.id ? styles.isDetailSelected : ""}`}
                            >
                                <div className={styles.detailMedicalCardTop}>
                                    <span
                                    className={`${styles.detailMedicalBadge} ${
                                        detail.status === "confirmed"
                                        ? styles.detailMedicalBadgeConfirmed
                                        : detail.status === "suspected"
                                        ? styles.detailMedicalBadgeSuspicion
                                        : styles.detailMedicalBadgeMonitoring
                                    }`}
                                    >
                                    {detail.status}
                                    </span>
                                </div>

                                <div className={styles.detailMedicalTitle}>{detail.title}</div>
                                <div className={styles.detailMedicalMeta}>{detail.meta}</div>
                                <div className={styles.detailMedicalSummary}>{detail.summary}</div>
                                </button>
                            ))
                            ) : (
                            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                                Aucun détail médical pour le moment.
                            </div>
                            )}
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
                        {patientDocuments.length === 0 ? (
                            <div style={{ padding: 18 }}>
                            <div
                                style={{
                                color: "white",
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                }}
                            >
                                Aucun document pour le moment
                            </div>
                            <div
                                style={{
                                color: "rgba(255,255,255,0.55)",
                                fontSize: 13,
                                }}
                            >
                                Les documents importés du patient apparaîtront ici avec leur analyse Lisa.
                            </div>
                            </div>
                        ) : (
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
                            {documentsForDisplay.map((doc) => (
                                <tr key={doc.id}>
                                    <td>
                                    <div className={styles.documentsNameCell}>
                                        <span className={styles.documentsFileDot}></span>

                                        <div className={styles.documentsNameContent}>
                                        <span className={styles.documentsFileName}>{doc.title}</span>

                                        {doc.showShareIcons && (
                                            <div className={styles.documentsShareIcons}>
                                            {doc.isShareableWithPatient === true && (
                                                <button
                                                type="button"
                                                className={styles.documentsShareIconBtn}
                                                aria-label="Partageable avec le patient"
                                                onClick={(e) => e.preventDefault()}
                                                >
                                                <span className={styles.tooltipWrap}>
                                                    <img
                                                    src="/imgs/share_patient_ok.png"
                                                    alt=""
                                                    className={styles.documentsShareIcon}
                                                    />
                                                    <span className={styles.tooltip}>
                                                    Partageable avec le patient
                                                    </span>
                                                </span>
                                                </button>
                                            )}

                                        {doc.isShareableWithDoctor === true && (
                                        <button
                                            type="button"
                                            className={styles.documentsShareIconBtn}
                                            aria-label="Partageable avec le médecin traitant"
                                            onClick={(e) => e.preventDefault()}
                                        >
                                            <span className={styles.tooltipWrap}>
                                            <img
                                                src="/imgs/share_doctor_ok.png"
                                                alt=""
                                                className={styles.documentsShareIcon}
                                            />
                                            <span className={styles.tooltip}>
                                                Partageable avec le médecin traitant
                                            </span>
                                            </span>
                                        </button>
                                        )}
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                    </td>

                                    <td>
                                    <span className={styles.documentsTypeText}>{doc.displayType}</span>
                                    </td>

                                    <td>
                                    <span className={styles.documentsDateText}>{doc.displayDate}</span>
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
                                            onClick={() =>
                                                setOpenDocumentMenuId((prev) => (prev === doc.id ? null : doc.id))
                                            }
                                            >
                                            ⋯
                                            </button>

                                            {openDocumentMenuId === doc.id && (
                                            <div className={styles.documentsMoreMenu}>

                                                <button
                                                type="button"
                                                className={styles.documentsMoreMenuItem}
                                                onClick={() => handleLaunchDocumentAnalysis(doc)}
                                                disabled={
                                                    doc.analysisStatus === "pending" ||
                                                    doc.analysisStatus === "processing"
                                                }
                                                >
                                                {doc.analysisStatus === "done"
                                                    ? "Voir l’analyse de Lisa"
                                                    : doc.analysisStatus === "pending" || doc.analysisStatus === "processing"
                                                    ? "Analyse en cours..."
                                                    : "Analyse de Lisa"}
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
                        )}
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
                          <div className={styles.nextAppointmentType}>
                            {patientDetail.nextFollowupAt ? "Suivi recommandé" : "Aucun rendez-vous planifié"}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={styles.nextAppointmentMoreBtn}
                          aria-label="Actions rendez-vous"
                        >
                          ⋯
                        </button>
                      </div>

                      <div className={styles.nextAppointmentDivider}></div>

                      <div className={styles.nextAppointmentMain}>
                        {patientDetail.nextFollowupAt ? (
                          <>
                            <div className={styles.nextAppointmentDateBlock}>
                              <div className={styles.nextAppointmentDay}>
                                {new Intl.DateTimeFormat("fr-FR", {
                                  day: "2-digit",
                                }).format(new Date(patientDetail.nextFollowupAt))}
                              </div>

                              <div className={styles.nextAppointmentMonthBlock}>
                                <div className={styles.nextAppointmentMonth}>
                                  {new Intl.DateTimeFormat("fr-FR", {
                                    month: "long",
                                  }).format(new Date(patientDetail.nextFollowupAt))}
                                </div>
                                <div className={styles.nextAppointmentYear}>
                                  {new Intl.DateTimeFormat("fr-FR", {
                                    year: "numeric",
                                  }).format(new Date(patientDetail.nextFollowupAt))}
                                </div>
                              </div>
                            </div>

                            <div className={styles.nextAppointmentMetaBlock}>
                              <div className={styles.nextAppointmentTime}>
                                {new Intl.DateTimeFormat("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(patientDetail.nextFollowupAt))}
                              </div>
                              <div className={styles.nextAppointmentDoctor}>
                                {patientDetail.primaryDoctorName ?? "Médecin à confirmer"}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className={styles.nextAppointmentDoctor}>
                            Aucun créneau enregistré pour ce patient.
                          </div>
                        )}
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
                        {patientDetail.lisaLastUpdatedAt
                          ? `Mis à jour le ${formatLongDate(patientDetail.lisaLastUpdatedAt)}`
                          : "Analyse disponible"}
                      </div>
                    </div>

                    {patientSuggestions.length > 0 ? (
                      <div className={styles.lisaSuggestionsList}>
                        {patientSuggestions.map((item, index) => (
                          <div key={item.id} className={styles.lisaSuggestionItem}>
                            <div
                              className={`${styles.lisaSuggestionIcon} ${
                                index === 1 ? styles.lisaSuggestionRed : styles.lisaSuggestionPurple
                              }`}
                            >
                              {index === 1 ? "!" : "⌁"}
                            </div>

                            <div className={styles.lisaSuggestionText}>
                              <strong>{item.label}</strong>
                              <br />
                              {item.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.lisaSuggestionText}>
                        Aucune suggestion pour le moment.
                      </div>
                    )}
                  </section>

                  <section className={styles.card}>
                  <div className={styles.tasksHeader}>
                    <div className={styles.tasksHeaderLeft}>
                      <div className={`${styles.cardTitle} ${styles.tasksHeaderTitle}`}>
                        Tâches en attente
                      </div>
                      <div className={styles.tasksCount}>{pendingTasksCount}</div>
                    </div>

                    <button
                      type="button"
                      className={styles.tasksAddBtn}
                      aria-label="Ajouter une tâche"
                      onClick={() => {
                        resetCreateTaskModalState();
                        setIsCreateTaskModalOpen(true);
                      }}
                    >
                      +
                    </button>
                  </div>

                  {visiblePatientTasks.length > 0 ? (
                      <div className={styles.tasksList}>
                        {visiblePatientTasks.map((task) => {
                          const isCompleted = task.status === "completed";
                          const isUpdating = updatingTaskId === task.id;
                          const hasDueAt = !!task.dueAt;
                          const isLate =
                            !isCompleted &&
                            !!task.dueAt &&
                            new Date(task.dueAt).getTime() < Date.now();

                          const isUrgent = task.priority === "high";
                          const dueLabel = formatTaskDueLabel(task.dueAt, isLate);

                          return (
                            <button
                              key={task.id}
                              type="button"
                              className={`${styles.taskItem} ${isCompleted ? styles.isTaskDone : ""}`}
                              onClick={() =>
                                handleTogglePatientTask(
                                  task.id,
                                  isCompleted ? "pending" : "completed"
                                )
                              }
                              disabled={isUpdating}
                              aria-label={
                                isCompleted
                                  ? "Marquer la tâche comme non faite"
                                  : "Marquer la tâche comme faite"
                              }
                            >
                              <span
                                className={`${styles.taskCheckbox} ${isCompleted ? styles.isChecked : ""}`}
                              >
                                {isCompleted ? "✓" : ""}
                              </span>

                              <span className={styles.taskContent}>
                                <span className={styles.taskTitleRow}>
                                  <span className={styles.taskLabel}>{task.label}</span>

                                  {isUrgent && (
                                    <span className={`${styles.taskBadge} ${styles.taskBadgeUrgent}`}>
                                      Urgent
                                    </span>
                                  )}

                                  {isLate && (
                                    <span className={`${styles.taskBadge} ${styles.taskBadgeLate}`}>
                                      En retard
                                    </span>
                                  )}
                                </span>

                                <span className={styles.taskMeta}>
                                  {task.reason}
                                </span>

                                {dueLabel && (
                                  <span className={styles.taskDueMeta}>
                                    {dueLabel}
                                  </span>
                                )}

                                {(task.createdBy || task.source) && (
                                  <span className={styles.taskCreator}>
                                    créé par {task.createdBy ?? (task.source === "lisa" ? "Lisa" : "Utilisateur")}
                                  </span>
                                )}
                              </span>
                              </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.taskMeta}>Aucune tâche en attente.</div>
                    )}
                  </section>
                </div>
                </div>
                </>
            )}

{isBulkProcessOpen && (
  <div className={styles.bulkProcessOverlay}>
    <div
    className={styles.bulkProcessModal}
    onClick={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
    >
    <input
    id="bulk-process-file-input"
    ref={bulkFileInputRef}
    type="file"
    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
    className={styles.bulkHiddenInput}
    onChange={(e) => {
        handleBulkFilesSelection(e.target.files);

        if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = "";
        }
    }}
    />

    <button
    type="button"
    className={styles.bulkProcessClose}
    aria-label="Fermer"
    onClick={() => {
        setIsBulkProcessOpen(false);
        setBulkStep(2);
      }}
    >
    ×
    </button>

      <div className={styles.bulkProcessLayout}>
        <div className={styles.bulkProcessCommandPanel}>
        <div className={styles.bulkProcessStep}>ÉTAPE 1 SUR 3</div>
            <h2 className={styles.bulkProcessTitle}>Traiter des dossiers</h2>

            <div className={styles.bulkProcessSectionLabel}>Que souhaitez-vous faire ?</div>

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

        {bulkStep === 2 && (
          <div className={styles.bulkProcessUploadPanel}>
            <div className={styles.bulkProcessUploadInner}>
              <div className={styles.bulkProcessStepCenter}>ÉTAPE 2 SUR 3</div>
              <h3 className={styles.bulkUploadTitle}>Chargez les fichiers à traiter</h3>

              <div className={styles.bulkUploadHint}>
                Déposez un document ici ou parcourez votre ordinateur (gestion simultanée de plusieurs fichiers bientôt disponible).
              </div>

              <label
                htmlFor="bulk-process-file-input"
                className={`${styles.bulkUploadDropzone} ${
                  isBulkDragActive ? styles.isBulkUploadDragActive : ""
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsBulkDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsBulkDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const relatedTarget = e.relatedTarget as Node | null;
                  if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                    setIsBulkDragActive(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsBulkDragActive(false);
                  handleBulkFilesSelection(e.dataTransfer.files);
                }}
              >
                <div className={styles.bulkUploadDropzoneText}>
                  Glisser-déposer des fichiers ici, ou{" "}
                  <span className={styles.bulkUploadBrowse}>parcourir</span>
                </div>
              </label>

              <div className={styles.bulkUploadFormats}>
                Formats pris en charge : PDF, JPG, JPEG, PNG, WEBP
              </div>

              {bulkUploadError && (
                <div className={styles.bulkUploadError}>
                  {bulkUploadError}
                </div>
              )}

              {bulkSelectedFiles.length > 0 && (
                <div className={styles.bulkSelectedFilesList}>
                  {bulkSelectedFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className={styles.bulkSelectedFileItem}
                    >
                      <div className={styles.bulkSelectedFileMeta}>
                        <div className={styles.bulkSelectedFileName}>{file.name}</div>
                        <div className={styles.bulkSelectedFileSize}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.bulkSelectedFileRemove}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveBulkFile(file);
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.bulkProcessFooter}>
            <button
            type="button"
            className={styles.bulkProcessBackBtn}
            onClick={() => {
                setIsBulkProcessOpen(false);
                setBulkStep(2);
            }}
            >
            Retour
            </button>

              <button
                type="button"
                className={styles.bulkProcessNextBtn}
                disabled={!bulkSelectedIntent || bulkSelectedFiles.length === 0}
                onClick={() => {
                    setBulkStep(3);
                    setBulkRightPanelMode("confirm");
                  }}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

{bulkStep === 3 && (
  <div className={styles.bulkProcessUploadPanel}>
    {bulkRightPanelMode === "confirm" && (
      <>
        <div className={styles.bulkProcessUploadInner}>
          <div className={styles.bulkProcessStepCenter}>ÉTAPE 3 SUR 3</div>
          <h3 className={styles.bulkUploadTitle}>Confirmation du traitement</h3>

          <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                Action sélectionnée
              </div>
              <div style={{ color: "white", fontWeight: 500 }}>
                {bulkActionOptions.find((o) => o.id === bulkSelectedIntent)?.label}
              </div>
            </div>

            <div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                Fichiers
              </div>
              <div style={{ color: "white", fontWeight: 500 }}>
                {bulkSelectedFiles.length} fichier(s)
              </div>
            </div>

            {bulkSelectedSubOptions.length > 0 && (
              <div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                  Options
                </div>
                <div style={{ color: "white", fontWeight: 500 }}>
                  {bulkSelectedSubOptions.join(", ")}
                </div>
              </div>
            )}

            {bulkInstructions && (
              <div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                  Instructions
                </div>
                <div style={{ color: "white" }}>
                  {bulkInstructions}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.bulkProcessFooter}>
          <button
            type="button"
            className={styles.bulkProcessBackBtn}
            onClick={() => setBulkStep(2)}
            disabled={isBulkSubmitting}
          >
            Retour
          </button>

          <button
            type="button"
            className={styles.bulkProcessNextBtn}
            onClick={handleLaunchBulkProcess}
            disabled={isBulkSubmitting}
          >
            {isBulkSubmitting ? "Lancement..." : "Lancer le traitement →"}
          </button>
        </div>
      </>
    )}

    {bulkRightPanelMode === "processing" && (
      <div className={styles.bulkProcessingState}>
        <div className={styles.bulkProcessingSpinner} />

        <div className={styles.bulkProcessingMessage}>
          {bulkProcessingMessages[bulkProcessingMessageIndex]}
        </div>

        <div className={styles.bulkProcessingSubtext}>
          Lisa croise le document, le dossier patient et les règles du cabinet.
        </div>
      </div>
    )}

{bulkRightPanelMode === "done" && (
  <div className={styles.bulkProcessUploadInner}>
    <div className={styles.bulkProcessStepCenter}>TRAITEMENT TERMINÉ</div>
    <h3 className={styles.bulkUploadTitle}>Récapitulatif du traitement</h3>

    <div style={{ marginTop: 20, display: "grid", gap: 18, maxWidth: 900 }}>
      <div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
          Résultat
        </div>
        <div style={{ color: "white", fontWeight: 500, marginTop: 4 }}>
          {doneResult?.ui?.title || "Envoi terminé"}
        </div>
      </div>

      <div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
          Résumé
        </div>
        <div style={{ color: "white", marginTop: 4, lineHeight: 1.6 }}>
          {doneResult?.ui?.summary || "Traitement terminé."}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        }}
      >
        <div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            Patient
          </div>
          <div style={{ color: "white", fontWeight: 500, marginTop: 4 }}>
            {donePatientName}
          </div>
        </div>

        <div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            Emails prévus
          </div>
          <div style={{ color: "white", fontWeight: 500, marginTop: 4 }}>
            {doneTotalExpected}
          </div>
        </div>

        <div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            Emails envoyés
          </div>
          <div style={{ color: "white", fontWeight: 500, marginTop: 4 }}>
            {doneTotalSent}
          </div>
        </div>

        <div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            Statut
          </div>
          <div style={{ color: "white", fontWeight: 500, marginTop: 4 }}>
            {doneStatusLabel}
          </div>
        </div>
      </div>

    </div>

    <div className={styles.bulkProcessFooter}>
      <button
        type="button"
        className={styles.bulkProcessBackBtn}
        onClick={() => setBulkStep(2)}
      >
        Retour
      </button>

      <button
        type="button"
        className={styles.bulkProcessNextBtn}
        onClick={() => {
          setIsBulkProcessOpen(false);
          setBulkStep(2);
          setBulkRightPanelMode("confirm");
          setBulkProcessingResult(null);
        }}
      >
        Terminer
      </button>
    </div>
  </div>
)}

    {bulkRightPanelMode === "review" && (
      <div className={`${styles.bulkStepWorkspace} ${bulkEditOpen ? styles.isEditOpen : ""}`}>
        <div className={styles.bulkStepWorkspaceMain}>
          <div className={styles.bulkReviewState}>
            {bulkReviewItems.length === 0 || !currentBulkReviewItem ? (
              <div className={styles.bulkProcessingState}>
                <div className={styles.bulkProcessingHeadline}>Aucun résultat reçu.</div>
                <div className={styles.bulkProcessingSubline}>
                  Le traitement est terminé mais aucun élément exploitable n’a été renvoyé.
                </div>
              </div>
) : (
    isRejectedDocument ? (
      <div
        className={`${styles.bulkRejectedCard} ${
          isManualReviewDocument ? styles.bulkManualReviewCard : ""
        }`}
      >
        <div className={styles.bulkReviewCardTop}>
          <div>
            <div className={styles.bulkReviewEyebrow}>RELECTURE</div>
            <h3 className={styles.bulkReviewTitle}>
              {currentBulkReviewItem?.ui?.title || "Document non exploitable médicalement"}
            </h3>
          </div>
  
          <div className={styles.bulkReviewBadge}>
            {currentBulkReviewItem?.ui?.badge || "Rejeté"}
          </div>
        </div>
  
        <div className={styles.bulkReviewSection}>
          <div className={styles.bulkReviewLabel}>Résumé</div>
          <div className={styles.bulkReviewText}>
            {isManualReviewDocument
              ? "Merci d’ajouter des précisions dans le champ d’instructions ou de renvoyer un document complet."
              : currentBulkReviewItem?.ui?.summary ||
                "Ce fichier ne correspond pas à un document patient ou à un document médical que je peux exploiter."}
          </div>
        </div>
  
        <div className={styles.bulkRejectedReasonBox}>
          <div className={styles.bulkReviewLabel}>Motif</div>
          <div className={styles.bulkRejectedReasonText}>
            {isManualReviewDocument
              ? currentBulkReviewItem?.ui?.reject_reason ||
                currentBulkReviewItem?.requested_action?.instructions_for_specialist_agent ||
                rejectReason
              : rejectReason}
          </div>
        </div>
  
        <div className={styles.bulkReviewFooter}>
          <div className={styles.bulkReviewFooterLeft}>
            <button
              type="button"
              className={styles.bulkProcessBackBtn}
              onClick={() => setBulkStep(2)}
            >
              Retour
            </button>
          </div>
  
          <div className={styles.bulkReviewFooterRight} />
        </div>
      </div>

  ) : isPathologyAnalysis ? (
    <div className={styles.bulkPathologyView}>
      <div className={styles.bulkPathologyHeader}>
        <div className={styles.bulkPathologyHeaderLeft}>
          <div className={styles.bulkReviewEyebrow}>RELECTURE</div>
          <h3 className={styles.bulkPathologyTitle}>
            {currentBulkReviewItem?.ui?.title ||
              pathologyPreview?.analysis_title ||
              "Analyse médicale"}
          </h3>
        </div>
  
        <div className={styles.bulkReviewBadge}>
          {currentBulkReviewItem?.ui?.badge || "À valider"}
        </div>
      </div>
  
      <div className={styles.bulkPathologyTabs}>
        <button
          type="button"
          className={`${styles.bulkPathologyTab} ${
            pathologyTab === "overview" ? styles.isActive : ""
          }`}
          onClick={() => setPathologyTab("overview")}
        >
          Aperçu
        </button>
  
        <button
          type="button"
          className={`${styles.bulkPathologyTab} ${
            pathologyTab === "findings" ? styles.isActive : ""
          }`}
          onClick={() => setPathologyTab("findings")}
        >
          Points clés
        </button>
  
        <button
          type="button"
          className={`${styles.bulkPathologyTab} ${
            pathologyTab === "alerts" ? styles.isActive : ""
          }`}
          onClick={() => setPathologyTab("alerts")}
        >
          Vigilances
        </button>
  
        <button
          type="button"
          className={`${styles.bulkPathologyTab} ${
            pathologyTab === "followup" ? styles.isActive : ""
          }`}
          onClick={() => setPathologyTab("followup")}
        >
          Suites & validation
        </button>
      </div>
  
      <div className={styles.bulkPathologyBody}>
        {pathologyTab === "overview" && (
          <div className={styles.bulkPathologyPane}>
            <div className={styles.bulkPathologySummary}>
              {currentBulkReviewItem?.ui?.summary ||
                pathologyPreview?.risk_summary ||
                pathologyPreview?.document_summary ||
                "Aucun résumé disponible."}
            </div>
  
            <div className={styles.bulkPathologyMetaRow}>
              <div className={styles.bulkPathologyMetaItem}>
                <span className={styles.bulkPathologyMetaLabel}>Patient</span>
                <span className={styles.bulkPathologyMetaValue}>
                  {currentBulkReviewItem?.patient?.full_name || "Patient non identifié"}
                </span>
              </div>
  
              <div className={styles.bulkPathologyMetaItem}>
                <span className={styles.bulkPathologyMetaLabel}>Statut</span>
                <span className={styles.bulkPathologyMetaValue}>
                  {currentBulkReviewItem?.ui?.patient_status_label ||
                    currentBulkReviewItem?.patient?.status_label ||
                    (currentBulkReviewItem?.patient?.matched
                      ? "Dossier à mettre à jour"
                      : currentBulkReviewItem?.patient?.identified
                      ? "Dossier à créer"
                      : "Patient à confirmer")}
                </span>
              </div>
  
              <div className={styles.bulkPathologyMetaItem}>
                <span className={styles.bulkPathologyMetaLabel}>Action</span>
                <span className={styles.bulkPathologyMetaValue}>
                  {currentBulkReviewItem?.ui?.action_label ||
                    currentBulkReviewItem?.document?.label ||
                    pathologyPreview?.type_doc ||
                    "Analyse médicale"}
                </span>
              </div>
  
              <div className={styles.bulkPathologyMetaItem}>
                <span className={styles.bulkPathologyMetaLabel}>Confiance</span>
                <span className={styles.bulkPathologyMetaValue}>
                  {pathologyConfidence}
                </span>
              </div>
            </div>
  
            <div className={styles.bulkPathologyTextBlock}>
              <div className={styles.bulkPathologyBlockLabel}>Analyse synthétique</div>
              <div className={styles.bulkPathologyParagraph}>
                {pathologyPreview?.document_summary || "Aucune analyse disponible."}
              </div>
            </div>
          </div>
        )}
  
        {pathologyTab === "findings" && (
          <div className={styles.bulkPathologyPane}>
            <div className={styles.bulkPathologyTextBlock}>
              <div className={styles.bulkPathologyBlockLabel}>Éléments clés</div>
  
              {pathologyKeyFindings.length > 0 ? (
                <div className={styles.bulkPathologyList}>
                  {pathologyKeyFindings.map((item: string, index: number) => (
                    <div key={`${item}-${index}`} className={styles.bulkPathologyListItem}>
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.bulkPathologyEmpty}>
                  Aucun élément clé disponible.
                </div>
              )}
            </div>
          </div>
        )}
  
        {pathologyTab === "alerts" && (
          <div className={styles.bulkPathologyPane}>
            <div className={styles.bulkPathologyTextBlock}>
              <div className={styles.bulkPathologyBlockLabel}>Alertes / points de vigilance</div>
  
              {pathologyPreview?.risk_summary && (
                <div className={styles.bulkPathologyParagraph}>
                  {pathologyPreview.risk_summary}
                </div>
              )}
  
              {pathologyAlerts.length > 0 ? (
                <div className={styles.bulkPathologyList}>
                  {pathologyAlerts.map((item: string, index: number) => (
                    <div key={`${item}-${index}`} className={styles.bulkPathologyListItem}>
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.bulkPathologyEmpty}>
                  Aucun point de vigilance détecté.
                </div>
              )}
            </div>
  
            <div className={styles.bulkPathologyTextBlock}>
              <div className={styles.bulkPathologyBlockLabel}>Analyse de cohérence</div>
              <div className={styles.bulkPathologyParagraph}>
                {pathologyPreview?.consistency_analysis ||
                  "Aucune analyse de cohérence disponible."}
              </div>
            </div>
          </div>
        )}
  
        {pathologyTab === "followup" && (
          <div className={styles.bulkPathologyPane}>
            <div className={styles.bulkPathologyTextBlock}>
              <div className={styles.bulkPathologyBlockLabel}>Suites recommandées</div>
  
              {pathologyFollowups.length > 0 ? (
                <div className={styles.bulkPathologyList}>
                  {pathologyFollowups.map((item: string, index: number) => (
                    <div key={`${item}-${index}`} className={styles.bulkPathologyListItem}>
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.bulkPathologyEmpty}>
                  Aucune suite recommandée.
                </div>
              )}
            </div>
  
            <div className={styles.bulkPathologyTextBlock}>
              <div className={styles.bulkPathologyBlockLabel}>Validation médecin</div>
              <div className={styles.bulkPathologyParagraph}>
                {pathologyPreview?.human_validation_note ||
                  "Aucune note de validation disponible."}
              </div>
            </div>
  
            {pathologyReferences.length > 0 && (
              <div className={styles.bulkPathologyTextBlock}>
                <div className={styles.bulkPathologyBlockLabel}>Références</div>
                <div className={styles.bulkPathologyList}>
                  {pathologyReferences.map((ref: any, index: number) => (
                    <div key={`ref-${index}`} className={styles.bulkPathologyListItem}>
                      {ref?.source || "Source"}
                      {ref?.extrait ? ` — ${ref.extrait}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  
      <div className={styles.bulkPathologyFooter}>
        <button
          type="button"
          className={styles.bulkProcessBackBtn}
          onClick={() => setBulkStep(2)}
        >
          Retour
        </button>
  
        <button
        type="button"
        className={styles.bulkReviewValidateBtn}
        onClick={() => {
            setIsBulkProcessOpen(false);
            setBulkStep(2);
            setBulkRightPanelMode("confirm");
            setBulkProcessingResult(null);
            setBulkUploadError(null);
            setBulkSubmitError(null);
            setBulkSelectedFiles([]);
            setBulkInstructions("");
            setBulkSelectedSubOptions([]);
            setPathologyTab("overview");
        }}
        >
        Fermer
        </button>
      </div>
    </div>
  ) : (
      <div className={styles.bulkReviewCard}>
        <div className={styles.bulkReviewCardTop}>
          <div>
            <div className={styles.bulkReviewEyebrow}>RELECTURE</div>
            <h3 className={styles.bulkReviewTitle}>
              {currentBulkReviewItem?.ui?.title ||
                currentBulkReviewItem?.requested_action?.goal ||
                "Résultat prêt à relire"}
            </h3>
          </div>
  
          <div className={styles.bulkReviewBadge}>
            {currentBulkReviewItem?.ui?.badge || "Prêt"}
          </div>
        </div>
  
        <div className={styles.bulkReviewSection}>
          <div className={styles.bulkReviewLabel}>Résumé</div>
          <div className={styles.bulkReviewText}>
            {currentBulkReviewItem?.ui?.summary ||
              currentBulkReviewItem?.document?.summary ||
              "Aucun résumé disponible."}
          </div>
        </div>
  
        <div className={styles.bulkReviewGrid}>
          <div className={styles.bulkReviewInfoBox}>
            <div className={styles.bulkReviewLabel}>Patient</div>
            <div className={styles.bulkReviewText}>
              {currentBulkReviewItem?.patient?.full_name || "Patient non identifié"}
            </div>
          </div>
  
          <div className={styles.bulkReviewInfoBox}>
            <div className={styles.bulkReviewLabel}>Statut patient</div>
            <div className={styles.bulkReviewText}>
              {currentBulkReviewItem?.ui?.patient_status_label ||
                currentBulkReviewItem?.patient?.status_label ||
                (currentBulkReviewItem?.patient?.matched
                  ? "Dossier à mettre à jour"
                  : currentBulkReviewItem?.patient?.identified
                  ? "Dossier à créer"
                  : "Patient à confirmer")}
            </div>
          </div>
  
          <div className={styles.bulkReviewInfoBox}>
            <div className={styles.bulkReviewLabel}>Action</div>
            <div className={styles.bulkReviewText}>
              {currentBulkReviewItem?.ui?.action_label ||
                currentBulkReviewItem?.requested_action?.display_label ||
                currentBulkReviewItem?.document?.label ||
                "—"}
            </div>
          </div>
  
          <div className={styles.bulkReviewInfoBox}>
            <div className={styles.bulkReviewLabel}>Confiance</div>
            <div className={styles.bulkReviewText}>
              {typeof currentBulkReviewItem?.document?.confidence === "number"
                ? `${Math.round(currentBulkReviewItem.document.confidence * 100)}%`
                : "—"}
            </div>
          </div>
        </div>
  
        <div className={styles.bulkReviewPreviewGrid}>
          <div className={styles.bulkPreviewCard}>
            <div className={styles.bulkPreviewCardHeader}>
              <div className={styles.bulkPreviewCardTitleRow}>
                <div
                  className={`${styles.bulkCheck} ${sendPatient ? styles.isChecked : ""}`}
                  onClick={() => setSendPatient((prev) => !prev)}
                >
                  {sendPatient && <span className={styles.bulkCheckIcon}>✓</span>}
                </div>
                <div>
                  <div className={styles.bulkReviewLabel}>Courrier patient</div>
                  <div className={styles.bulkPreviewSubject}>
                    {patientPreview?.subject || "Aucun courrier patient"}
                  </div>
                </div>
              </div>
  
              <button
                className={styles.bulkPreviewEditBtn}
                onClick={() => {
                  setBulkEditTarget("patient");
                  setBulkEditOpen(true);
                }}
              >
                Éditer
              </button>
            </div>
  
            <div className={styles.bulkPreviewRecipientBlock}>
              <div className={styles.bulkReviewLabel}>Destinataire</div>
              <input
                type="text"
                value={currentBulkReviewItem?.patient?.full_name || ""}
                readOnly
                className={styles.bulkPreviewRecipientInput}
              />
  
              <div className={styles.bulkReviewLabel}>Email d’envoi</div>
              <input
                type="text"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder="Ajouter l’email du patient"
                className={`${styles.bulkPreviewRecipientInput} ${
                  !isPatientMatched ? styles.isFieldAttention : ""
                }`}
              />
            </div>
  
            <div className={styles.bulkPreviewBody}>
              {patientPreview?.body ? (
                <div
                  className={styles.bulkPreviewHtml}
                  dangerouslySetInnerHTML={{ __html: patientPreview.body }}
                />
              ) : (
                <div className={styles.bulkPreviewEmpty}>
                  Aucun contenu patient disponible.
                </div>
              )}
            </div>
          </div>
  
          <div className={styles.bulkPreviewCard}>
            <div className={styles.bulkPreviewCardHeader}>
              <div className={styles.bulkPreviewCardTitleRow}>
                <div
                  className={`${styles.bulkCheck} ${sendColleague ? styles.isChecked : ""}`}
                  onClick={() => setSendColleague((prev) => !prev)}
                >
                  {sendColleague && <span className={styles.bulkCheckIcon}>✓</span>}
                </div>
                <div>
                  <div className={styles.bulkReviewLabel}>Courrier médecin</div>
                  <div className={styles.bulkPreviewSubject}>
                    {colleaguePreview?.subject || "Aucun courrier confrère"}
                  </div>
                </div>
              </div>
  
              <button
                className={styles.bulkPreviewEditBtn}
                onClick={() => {
                  setBulkEditTarget("doctor");
                  setBulkEditOpen(true);
                }}
              >
                Éditer
              </button>
            </div>
  
            <div className={styles.bulkPreviewRecipientBlock}>
              <div className={styles.bulkReviewLabel}>Destinataire</div>
              <input
                type="text"
                value={currentBulkReviewItem?.patient?.doctor_name || ""}
                readOnly
                className={styles.bulkPreviewRecipientInput}
              />
  
              <div className={styles.bulkReviewLabel}>Email d’envoi</div>
              <input
                type="text"
                value={colleagueEmail}
                onChange={(e) => setColleagueEmail(e.target.value)}
                placeholder="Ajouter email du médecin"
                className={`${styles.bulkPreviewRecipientInput} ${
                  !colleagueEmail ? styles.isFieldAttention : ""
                }`}
              />
            </div>
  
            <div className={styles.bulkPreviewBody}>
              {colleaguePreview?.body ? (
                <div
                  className={styles.bulkPreviewHtml}
                  dangerouslySetInnerHTML={{ __html: colleaguePreview.body }}
                />
              ) : (
                <div className={styles.bulkPreviewEmpty}>
                  Aucun contenu médecin disponible.
                </div>
              )}
            </div>
          </div>
        </div>
  
        <div className={styles.bulkReviewRiskBlock}>
          <div className={styles.bulkReviewRiskHeader}>
            <div className={styles.bulkReviewLabel}>Alertes / points de vigilance</div>
          </div>
  
          {hasRiskItems ? (
            <>
              {riskPreview?.summary && (
                <div className={styles.bulkReviewRiskSummary}>{riskPreview.summary}</div>
              )}
  
              {Array.isArray(riskPreview?.items) && riskPreview.items.length > 0 && (
                <div className={styles.bulkReviewRiskList}>
                  {riskPreview.items.map((item: string, index: number) => (
                    <div key={`${item}-${index}`} className={styles.bulkReviewRiskItem}>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.bulkPreviewEmpty}>
              Aucun point de vigilance détecté.
            </div>
          )}
        </div>
  
        <div className={styles.bulkReviewFooter}>
        <button
        type="button"
        disabled={!canValidate || isBulkSubmitting}
        className={`${styles.bulkReviewValidateBtn} ${
            !canValidate || isBulkSubmitting ? styles.isDisabled : ""
        }`}
        onClick={handleValidateBulkSend}
        >
        {isBulkSubmitting ? "Envoi..." : "Valider l’envoi"}
        </button>
        </div>
      </div>
    )
  )}
          </div>
        </div>
      </div>
    )}
  </div>
)}

      </div>
    </div>
    {bulkEditOpen && (
  <div
    className={styles.bulkExternalEditPanel}
    style={{
      width: 360,
      minWidth: 360,
      maxWidth: 360,
      flex: "0 0 360px",
    }}
  >
    <div className={styles.bulkEditChatMain}>
      <div className={styles.bulkEditChatHeader}>
        <div className={styles.bulkEditChatHeaderTitle}>
          Lisa · {bulkEditTarget === "doctor" ? "Courrier médecin" : "Courrier patient"}
        </div>

        <button
          type="button"
          className={styles.bulkEditCloseBtn}
          onClick={() => setBulkEditOpen(false)}
        >
          ×
        </button>
      </div>

      <div className={styles.bulkEditChatMessages}>
        <div className={styles.bulkEditChatDaySeparator}>
          <span className={styles.bulkEditChatDayLine} />
          <span className={styles.bulkEditChatDayPill}>Maintenant</span>
          <span className={styles.bulkEditChatDayLine} />
        </div>

        <div className={styles.bulkEditChatMessage}>
          <div className={styles.bulkEditChatMessageRow}>
            <div className={styles.bulkEditChatMessageAvatar}>
              <img src="/imgs/Lisa_Avatar-min.webp" alt="Lisa" />
            </div>

            <div className={styles.bulkEditChatMessageContent}>
              <div className={styles.bulkEditChatMessageMeta}>
                <span className={styles.bulkEditChatMessageAuthor}>Lisa</span>
                <span className={styles.bulkEditChatMessageTime}>maintenant</span>
              </div>

              <div className={styles.bulkEditChatMessageText}>
                Bonjour Docteur. Plutôt que de vous laisser modifier le brouillon
                directement, dites-moi ce que vous souhaitez améliorer et je vais
                l’ajuster pour cette fois, tout en retenant vos préférences pour les
                prochains courriers.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bulkEditChatComposerWrap}>
        <form className={styles.bulkEditChatComposer}>
          <div className={styles.bulkEditChatComposerInner}>
            <button
              type="button"
              className={styles.bulkEditChatPlusBtn}
              aria-label="Ajouter une pièce jointe"
            >
              <span className={styles.bulkEditChatPlusIcon} />
            </button>

            <div className={styles.bulkEditChatInputWrap}>
              <textarea
                className={styles.bulkEditChatInput}
                placeholder="Posez une question, créez, recherchez, @ pour mentionner"
                rows={1}
              />
            </div>

            <div className={styles.bulkEditChatComposerActions}>
              <button
                type="button"
                className={styles.bulkEditChatMicBtn}
                aria-label="Message vocal"
              >
                <img src="/imgs/mic-notes.png" alt="" />
              </button>

              <button
                type="submit"
                className={`${styles.bulkEditChatSendBtn} ${styles.bulkEditChatSendBtnActive}`}
                aria-label="Envoyer"
              >
                <img src="/imgs/sendmsg-on.png" alt="" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
)}
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
                    handleNoteAudioInputChange(event);

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

                        <div
                        className={styles.disabledActionWrap}
                        data-tooltip={!patientHasEmail ? followupEmailDisabledReason : ""}
                        >
                        <button
                            type="button"
                            className={`${styles.noteActionButton} ${
                            sendFollowupEmail ? styles.isSelected : ""
                            }`}
                            onClick={handleToggleSendFollowupEmail}
                            disabled={!patientHasEmail}
                        >
                            Envoyer le mail au patient
                        </button>
                        </div>
                    </div>

                    {selectedAudioFile && (
                    <div className={styles.noteSelectedAudioMeta}>
                        {recordedAudioLabel || selectedAudioFile.name}
                        {audioDurationSeconds !== null ? ` · ${audioDurationSeconds}s` : ""}
                    </div>
                    )}

                    {noteAudioError && (
                        <div className={styles.noteModalInlineError}>{noteAudioError}</div>
                    )}

                    {noteModalError && (
                        <div className={styles.noteModalError}>{noteModalError}</div>
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
                        {isSavingNote
                            ? "Enregistrement..."
                            : isEditingNote
                            ? "Enregistrer les modifications"
                            : "Enregistrer la note"}
                        </button>
                  </div>
                </div>
              </div>
            )}

{isFollowupDraftModalOpen && selectedNote && (
        <div
          className={styles.followupDraftOverlay}
          onClick={() => {
            if (isSendingDraftEmail) return;
            setIsFollowupDraftModalOpen(false);
            setFollowupDraftError(null);
          }}
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
                onClick={() => {
                  if (isSendingDraftEmail) return;
                  setIsFollowupDraftModalOpen(false);
                  setFollowupDraftError(null);
                }}
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
                    {selectedNote.riskSummary || "Aucun résumé disponible."}
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

                <div style={{ display: "flex", gap: 10 }}>
                <button
                    type="button"
                    className={styles.followupDraftSecondaryBtn}
                    onClick={() => {
                    if (isSendingDraftEmail || isRequestingFollowup) return;
                    setIsFollowupDraftModalOpen(false);
                    setFollowupDraftError(null);
                    }}
                >
                    Fermer
                </button>

                <button
                    type="button"
                    className={styles.followupDraftSecondaryBtn}
                    onClick={handleRefreshDraftEmail}
                    disabled={!canRefreshDraft || isRequestingFollowup || isSendingDraftEmail}
                >
                    {isRequestingFollowup ? "Actualisation..." : "Actualiser le brouillon"}
                </button>
                </div>

              <div
                className={styles.followupDraftPrimaryWrap}
                title={!patientHasEmail ? followupEmailDisabledReason : ""}
                >
                <button
                    type="button"
                    className={styles.followupDraftPrimaryBtn}
                    onClick={handleSendDraftEmail}
                    disabled={
                    isSendingDraftEmail ||
                    selectedNote.isFollowupSent ||
                    !patientHasEmail
                    }
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
                  Choisissez si Lisa doit préparer un brouillon ou lancer le suivi directement.
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
                onClick={() => handleRequestFollowupEmail("draft")}
              >
                <div className={styles.followupRequestOptionTitle}>
                  Préparer un brouillon
                </div>
                <div className={styles.followupRequestOptionText}>
                  Lisa prépare le mail de suivi sans l’envoyer.
                </div>
              </button>

              <div
                className={styles.followupRequestOptionWrap}
                title={!patientHasEmail ? followupEmailDisabledReason : ""}
                >
                <button
                    type="button"
                    className={styles.followupRequestOption}
                    disabled={isRequestingFollowup || !patientHasEmail}
                    onClick={() => handleRequestFollowupEmail("with_validation")}
                >
                    <div className={styles.followupRequestOptionTitle}>
                    Envoyer avec validation
                    </div>
                    <div className={styles.followupRequestOptionText}>
                    Lisa prépare le mail puis le médecin le valide avant envoi.
                    </div>
                </button>
                </div>

                <div
                className={styles.followupRequestOptionWrap}
                title={!patientHasEmail ? followupEmailDisabledReason : ""}
                >
                <button
                    type="button"
                    className={styles.followupRequestOption}
                    disabled={isRequestingFollowup || !patientHasEmail}
                    onClick={() => handleRequestFollowupEmail("without_validation")}
                >
                    <div className={styles.followupRequestOptionTitle}>
                    Envoyer sans validation
                    </div>
                    <div className={styles.followupRequestOptionText}>
                    Lisa prépare puis envoie directement le mail au patient.
                    </div>
                </button>
                </div>

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

{isUploadModalOpen && (
        <div
        className={styles.uploadModalOverlay}
        onClick={() => {
          if (isUploadingDocument) return;
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
                  if (isUploadingDocument) return;
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

                    {!isUploadingDocument && (
                      <button
                        type="button"
                        className={styles.uploadSelectedRemoveBtn}
                        onClick={resetUploadState}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>

                  {isUploadingDocument ? (
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
                  ) : (
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
              {analysisDocument.analysisStatus === "pending" ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  Analyse en cours… Revenez dans quelques secondes.
                </div>
              ) : analysisDocument.analysisStatus === "failed" ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  L’analyse n’a pas pu aboutir pour le moment.
                </div>
              ) : !analysisDocument.analysisJson ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  Aucune analyse disponible pour ce document.
                </div>
              ) : (
                <div className={styles.analysisLayout}>
                  <div className={styles.analysisTopbar}>
                    <div className={styles.analysisDocMeta}>
                      <span className={styles.analysisDocTypeBadge}>
                        {analysisDocument.analysisJson.type_doc ?? "Document"}
                      </span>
                    </div>

                    <div className={styles.analysisConfidencePill}>
                      Confiance :{" "}
                      <strong>
                        {Math.round(
                          ((analysisDocument.analysisJson.confidence_score ?? 0) as number) * 100
                        )}
                        %
                      </strong>
                    </div>
                  </div>

                  <div className={styles.analysisMainGrid}>
                    <div className={styles.analysisMainLeft}>
                      <section className={`${styles.analysisPanel} ${styles.analysisPanelHero}`}>
                        <div className={styles.analysisPanelLabel}>Résumé</div>
                        <div className={styles.analysisPanelText}>
                          {analysisDocument.analysisJson.resume ?? "Aucun résumé disponible."}
                        </div>
                      </section>

                      <section className={styles.analysisPanel}>
                        <div className={styles.analysisPanelLabel}>Éléments clés</div>
                        {analysisDocument.analysisJson.elements_cles?.length ? (
                          <ul className={styles.analysisPanelList}>
                            {analysisDocument.analysisJson.elements_cles.map((item, index) => (
                              <li key={`key-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className={styles.analysisPanelText}>
                            Aucun élément clé disponible.
                          </div>
                        )}
                      </section>
                    </div>

                    <div className={styles.analysisMainRight}>
                      <section className={`${styles.analysisPanel} ${styles.analysisPanelAlert}`}>
                        <div className={styles.analysisPanelLabel}>Alertes</div>
                        {analysisDocument.analysisJson.alertes?.length ? (
                          <ul className={styles.analysisPanelList}>
                            {analysisDocument.analysisJson.alertes.map((item, index) => (
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
                        {analysisDocument.analysisJson.suites_recommandees?.length ? (
                          <ul className={styles.analysisPanelList}>
                            {analysisDocument.analysisJson.suites_recommandees.map((item, index) => (
                              <li key={`next-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className={styles.analysisPanelText}>
                            Aucune suite recommandée.
                          </div>
                        )}
                      </section>
                    </div>
                  </div>

                  <section className={styles.analysisBottomPanel}>
                    <div className={styles.analysisPanelLabel}>Références complémentaires</div>

                    {analysisDocument.analysisJson.references?.length ? (
                      <div className={styles.analysisReferenceRow}>
                        {analysisDocument.analysisJson.references.map((ref, index) => (
                          <div key={`ref-${index}`} className={styles.analysisReferenceCard}>
                            <div className={styles.analysisReferenceSource}>
                              {ref.source ?? "Source"}
                            </div>
                            <div className={styles.analysisReferenceExcerpt}>
                              {ref.extrait ?? "Aucun extrait."}
                            </div>
                            <div className={styles.analysisReferenceLink}>
                              {ref.lien ?? ""}
                            </div>
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

{isEditContactModalOpen && (
  <div
    className={styles.uploadModalOverlay}
    onClick={() => {
      if (isSavingContact) return;
      setIsEditContactModalOpen(false);
      resetEditContactModalState();
    }}
  >
    <div
      className={styles.uploadModal}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.uploadModalHeader}>
        <div>
          <h3 className={styles.uploadModalTitle}>Modifier les coordonnées</h3>
          <p className={styles.uploadModalSubtitle}>
            Mets à jour les informations de contact du patient.
          </p>
        </div>

        <button
          type="button"
          className={styles.uploadModalClose}
          aria-label="Fermer"
          onClick={() => {
            if (isSavingContact) return;
            setIsEditContactModalOpen(false);
            resetEditContactModalState();
          }}
        >
          ×
        </button>
      </div>

      <div className={styles.uploadModalBody}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Téléphone
            </div>
            <input
              type="text"
              value={contactPhoneValue}
              onChange={(e) => setContactPhoneValue(e.target.value)}
              placeholder="Téléphone du patient"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Email
            </div>
            <input
              type="email"
              value={contactEmailValue}
              onChange={(e) => setContactEmailValue(e.target.value)}
              placeholder="Email du patient"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Médecin traitant
            </div>
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Nom du médecin traitant
            </div>
            <input
              type="text"
              value={contactPrimaryDoctorNameValue}
              onChange={(e) => setContactPrimaryDoctorNameValue(e.target.value)}
              placeholder="Nom du médecin traitant"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Téléphone du médecin traitant
            </div>
            <input
              type="text"
              value={contactPrimaryDoctorPhoneValue}
              onChange={(e) => setContactPrimaryDoctorPhoneValue(e.target.value)}
              placeholder="Téléphone du médecin traitant"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Email du médecin traitant
            </div>
            <input
              type="email"
              value={contactPrimaryDoctorEmailValue}
              onChange={(e) => setContactPrimaryDoctorEmailValue(e.target.value)}
              placeholder="Email du médecin traitant"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Proche de confiance
            </div>
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Proche de confiance
            </div>
            <input
              type="text"
              value={contactTrustedNameValue}
              onChange={(e) => setContactTrustedNameValue(e.target.value)}
              placeholder="Nom du proche de confiance"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Téléphone du proche
            </div>
            <input
              type="text"
              value={contactTrustedPhoneValue}
              onChange={(e) => setContactTrustedPhoneValue(e.target.value)}
              placeholder="Téléphone du proche de confiance"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Email du proche
            </div>
            <input
              type="email"
              value={contactTrustedEmailValue}
              onChange={(e) => setContactTrustedEmailValue(e.target.value)}
              placeholder="Email du proche de confiance"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {editContactError && (
          <div
            style={{
              marginTop: 14,
              color: "#ff8b8b",
              fontSize: 13,
            }}
          >
            {editContactError}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (isSavingContact) return;
              setIsEditContactModalOpen(false);
              resetEditContactModalState();
            }}
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSavePatientContact}
            disabled={isSavingContact}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 12,
              border: "none",
              background: "white",
              color: "#111",
              fontWeight: 600,
              cursor: "pointer",
              opacity: isSavingContact ? 0.7 : 1,
            }}
          >
            {isSavingContact ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
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
                {getDocumentDisplayType(previewDocument)} · {formatDocumentDate(previewDocument.date)}
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
                    Aperçu indisponible
                  </div>
                </div>
              ) : isPdfDocument(previewDocument) ? (
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
{emailSourcePreview && (
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
            {emailSourcePreview.title || "Email"}
          </h3>
          <p className={styles.documentPreviewSubtitle}>
            Mail reçu
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
  <div className={styles.emailPreviewShell}>
    <div className={styles.emailPreviewCard}>
      <div className={styles.emailPreviewTop}>
        <div className={styles.emailPreviewSubject}>
          {emailSourcePreview.title || "Email"}
        </div>

        <div className={styles.emailPreviewRow}>
          <div className={styles.emailPreviewLabel}>De</div>
          <div className={styles.emailPreviewValue}>
            {emailSourcePreview.senderName || "Expéditeur inconnu"}
            {emailSourcePreview.senderEmail
              ? ` <${emailSourcePreview.senderEmail}>`
              : ""}
          </div>
        </div>

        <div className={styles.emailPreviewRow}>
          <div className={styles.emailPreviewLabel}>Date</div>
          <div className={styles.emailPreviewValue}>
            {emailSourcePreview.datetime || "—"}
          </div>
        </div>
      </div>

      {emailSourcePreview.summary && (
        <div className={styles.emailPreviewSummary}>
          {emailSourcePreview.summary}
        </div>
      )}

      {emailSourcePreview.content?.includes("<") &&
      emailSourcePreview.content?.includes(">") ? (
        <div
          className={styles.emailPreviewBodyHtml}
          dangerouslySetInnerHTML={{ __html: emailSourcePreview.content }}
        />
      ) : (
        <div className={styles.emailPreviewBody}>
          {emailSourcePreview.content || "Contenu indisponible."}
        </div>
      )}
    </div>
  </div>
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
              {analysisDocument.analysisStatus === "pending" ||
              analysisDocument.analysisStatus === "processing" ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  Analyse en cours… Revenez dans quelques secondes.
                </div>
              ) : analysisDocument.analysisStatus === "failed" ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  L’analyse n’a pas pu aboutir pour le moment.
                </div>
              ) : !analysisDocument.analysisJson ? (
                <div className={styles.documentAnalysisPlaceholder}>
                  Aucune analyse disponible pour ce document.
                </div>
              ) : (
                <div className={styles.analysisLayout}>
                  <div className={styles.analysisTopbar}>
                    <div className={styles.analysisDocMeta}>
                      <span className={styles.analysisDocTypeBadge}>
                        {analysisDocument.analysisJson.type_doc ?? "Document"}
                      </span>
                    </div>

                    <div className={styles.analysisConfidencePill}>
                      Confiance :{" "}
                      <strong>
                        {Math.round(
                          ((analysisDocument.analysisJson.confidence_score ?? 0) as number) * 100
                        )}
                        %
                      </strong>
                    </div>
                  </div>

                  <div className={styles.analysisMainGrid}>
                    <div className={styles.analysisMainLeft}>
                      <section className={`${styles.analysisPanel} ${styles.analysisPanelHero}`}>
                        <div className={styles.analysisPanelLabel}>Résumé</div>
                        <div className={styles.analysisPanelText}>
                          {analysisDocument.analysisJson.resume ?? "—"}
                        </div>
                      </section>

                      <section className={styles.analysisPanel}>
                        <div className={styles.analysisPanelLabel}>Éléments clés</div>
                        {(analysisDocument.analysisJson.elements_cles ?? []).length > 0 ? (
                          <ul className={styles.analysisPanelList}>
                            {(analysisDocument.analysisJson.elements_cles ?? []).map((item, index) => (
                              <li key={`key-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className={styles.analysisPanelText}>Aucun élément clé.</div>
                        )}
                      </section>
                    </div>

                    <div className={styles.analysisMainRight}>
                      <section className={`${styles.analysisPanel} ${styles.analysisPanelAlert}`}>
                        <div className={styles.analysisPanelLabel}>Alertes</div>
                        {(analysisDocument.analysisJson.alertes ?? []).length > 0 ? (
                          <ul className={styles.analysisPanelList}>
                            {(analysisDocument.analysisJson.alertes ?? []).map((item, index) => (
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
                        {(analysisDocument.analysisJson.suites_recommandees ?? []).length > 0 ? (
                          <ul className={styles.analysisPanelList}>
                            {(analysisDocument.analysisJson.suites_recommandees ?? []).map((item, index) => (
                              <li key={`next-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className={styles.analysisPanelText}>
                            Aucune suite recommandée.
                          </div>
                        )}
                      </section>
                    </div>
                  </div>

                  <section className={styles.analysisBottomPanel}>
                    <div className={styles.analysisPanelLabel}>Références complémentaires</div>

                    {(analysisDocument.analysisJson.references ?? []).length > 0 ? (
                      <div className={styles.analysisReferenceRow}>
                        {(analysisDocument.analysisJson.references ?? []).map((ref, index) => (
                          <div key={`ref-${index}`} className={styles.analysisReferenceCard}>
                            <div className={styles.analysisReferenceSource}>
                              {ref.source ?? "Source"}
                            </div>
                            <div className={styles.analysisReferenceExcerpt}>
                              {ref.extrait ?? "—"}
                            </div>
                            <div className={styles.analysisReferenceLink}>
                              {ref.lien ?? "—"}
                            </div>
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
        </div>
      </section>
      {isCreateTaskModalOpen && (
  <div
    className={styles.uploadModalOverlay}
    onClick={() => {
      setIsCreateTaskModalOpen(false);
      resetCreateTaskModalState();
    }}
  >
    <div
      className={styles.uploadModal}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.uploadModalHeader}>
        <div>
          <h3 className={styles.uploadModalTitle}>Nouvelle tâche</h3>
          <p className={styles.uploadModalSubtitle}>
            Ajoute une tâche manuelle pour ce patient.
          </p>
        </div>

        <button
          type="button"
          className={styles.uploadModalClose}
          aria-label="Fermer"
          onClick={() => {
            setIsCreateTaskModalOpen(false);
            resetCreateTaskModalState();
          }}
        >
          ×
        </button>
      </div>

      <div className={styles.uploadModalBody}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Titre
            </div>
            <input
              type="text"
              value={createTaskTitle}
              onChange={(e) => setCreateTaskTitle(e.target.value)}
              placeholder="Ex : rappeler le patient"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Description
            </div>
            <textarea
              value={createTaskDescription}
              onChange={(e) => setCreateTaskDescription(e.target.value)}
              placeholder="Détail de la tâche"
              rows={4}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "12px 14px",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <div
  style={{
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 14,
    alignItems: "start",
  }}
>
  <div>
    <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
      Priorité
    </div>
    <select
      value={createTaskPriority}
      onChange={(e) =>
        setCreateTaskPriority(e.target.value as "low" | "medium" | "high")
      }
      style={{
        width: "100%",
        height: 44,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "#1b1b1b",
        color: "white",
        padding: "0 14px",
        outline: "none",
      }}
    >
      <option value="low">Basse</option>
      <option value="medium">Normale</option>
      <option value="high">Urgente</option>
    </select>
  </div>

  <div style={{ position: "relative" }}>
    <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
      Échéance
    </div>

    <button
      type="button"
      onClick={() =>
        setIsCreateTaskDatePickerOpen((prev) => !prev)
      }
      style={{
        width: "100%",
        height: 44,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "white",
        padding: "0 14px",
        outline: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        textAlign: "left",
      }}
    >
      <span>{formatCreateTaskDueDateLabel(createTaskDueDate)}</span>
      <span style={{ opacity: 0.7 }}>▾</span>
    </button>

    {isCreateTaskDatePickerOpen && (
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          zIndex: 30,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#111111",
          boxShadow: "0 16px 40px rgba(0,0,0,0.32)",
          padding: 12,
        }}
      >
        <input
          type="date"
          min={getTodayDateInputValue()}
          value={createTaskDueDate}
          onChange={(e) => {
            setCreateTaskDueDate(e.target.value);
            setIsCreateTaskDatePickerOpen(false);
          }}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#1b1b1b",
            color: "white",
            padding: "0 12px",
            outline: "none",
          }}
        />
      </div>
    )}
  </div>
</div>
        </div>

        {createTaskError && (
          <div
            style={{
              marginTop: 14,
              color: "#ff8b8b",
              fontSize: 13,
            }}
          >
            {createTaskError}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsCreateTaskModalOpen(false);
              resetCreateTaskModalState();
            }}
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleCreateTask}
            disabled={isCreatingTask}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 12,
              border: "none",
              background: "white",
              color: "#111",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isCreatingTask ? "Création..." : "Créer"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{isPatientsHelpOpen && (
        <div
          className={styles.patientsModalOverlay}
          onClick={() => setIsPatientsHelpOpen(false)}
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
                onClick={() => setIsPatientsHelpOpen(false)}
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
                onClick={() => setIsPatientsHelpOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
{isCreatePatientModalOpen && (
  <div
    className={styles.patientsModalOverlay}
    onClick={() => {
  setIsCreatePatientModalOpen(false);
  resetCreatePatientModalState();
}}
  >
    <div
      className={styles.patientsModal}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.patientsModalHeader}>
        <div>
          <h3 className={styles.patientsModalTitle}>Nouveau patient</h3>
          <p className={styles.patientsModalSubtitle}>
            Créer une nouvelle fiche patient.
          </p>
        </div>

        <button
          type="button"
          className={styles.patientsModalClose}
          aria-label="Fermer"
          onClick={() => {
  setIsCreatePatientModalOpen(false);
  resetCreatePatientModalState();
}}
        >
          ×
        </button>
      </div>

      <div className={styles.patientsModalBody}>
  <div className={styles.createPatientForm}>
    <div className={styles.createPatientGrid}>
      <div className={styles.createPatientField}>
        <label className={styles.createPatientLabel}>Prénom</label>
        <input
          type="text"
          className={styles.createPatientInput}
          value={createPatientFirstName}
          onChange={(e) => setCreatePatientFirstName(e.target.value)}
          placeholder="Ex : Julien"
        />
      </div>

      <div className={styles.createPatientField}>
        <label className={styles.createPatientLabel}>Nom</label>
        <input
          type="text"
          className={styles.createPatientInput}
          value={createPatientLastName}
          onChange={(e) => setCreatePatientLastName(e.target.value)}
          placeholder="Ex : Martin"
        />
      </div>
    </div>

    <div className={styles.createPatientGrid}>
      <div className={styles.createPatientField}>
        <label className={styles.createPatientLabel}>Date de naissance</label>
        <input
          type="date"
          className={styles.createPatientInput}
          value={createPatientBirthDate}
          onChange={(e) => setCreatePatientBirthDate(e.target.value)}
        />
      </div>

      <div className={styles.createPatientField}>
        <label className={styles.createPatientLabel}>Téléphone</label>
        <input
          type="text"
          className={styles.createPatientInput}
          value={createPatientPhone}
          onChange={(e) => setCreatePatientPhone(e.target.value)}
          placeholder="Ex : 0612345678"
        />
      </div>
    </div>

    <div className={styles.createPatientField}>
      <label className={styles.createPatientLabel}>Email</label>
      <input
        type="email"
        className={styles.createPatientInput}
        value={createPatientEmail}
        onChange={(e) => setCreatePatientEmail(e.target.value)}
        placeholder="Ex : julien.martin@email.com"
      />
    </div>

    <div className={styles.createPatientField} style={{ gridColumn: "1 / -1" }}>
      <label className={styles.createPatientLabel}>Contexte</label>
      <textarea
        className={styles.createPatientTextarea}
        value={createPatientContext}
        onChange={(e) => setCreatePatientContext(e.target.value)}
        placeholder="Toute information utile sur le contexte médical du patient ou ce qui justifie la création de son dossier..."
        rows={4}
      />
    </div>

    <div className={styles.createPatientHelper}>
      Nom et prénom sont obligatoires.  
      Au moins un des 3 autres champs est obligatoire (date de naissance, email ou téléphone).
    </div>

    {createPatientError && (
      <div className={styles.createPatientError}>{createPatientError}</div>
    )}
  </div>
</div>

<div className={styles.createPatientModalFooter}>
  <button
    type="button"
    className={styles.patientsModalSecondaryAction}
    onClick={() => {
      setIsCreatePatientModalOpen(false);
      resetCreatePatientModalState();
    }}
  >
    Annuler
  </button>

  <button
  type="button"
  className={styles.patientsModalAction}
  disabled={!canSubmitCreatePatient || isCreatingPatient}
  onClick={handleCreatePatient}
>
  {isCreatingPatient ? "Création en cours..." : "Créer"}
</button>
</div>
    </div>
  </div>
)}
    </div>
  );
}