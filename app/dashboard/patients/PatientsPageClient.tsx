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

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);


  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioLabel, setRecordedAudioLabel] = useState<string | null>(null);

  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [editContactError, setEditContactError] = useState<string | null>(null);
  
  const [contactPhoneValue, setContactPhoneValue] = useState("");
  const [contactEmailValue, setContactEmailValue] = useState("");
  const [contactPrimaryDoctorNameValue, setContactPrimaryDoctorNameValue] = useState("");
  const [contactTrustedNameValue, setContactTrustedNameValue] = useState("");
  const [contactTrustedPhoneValue, setContactTrustedPhoneValue] = useState("");
  const [contactTrustedEmailValue, setContactTrustedEmailValue] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

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

        if (isCancelled) return;

        setPatients(payload.patients);
        setSelectedPatientId(payload.selectedPatientId ?? payload.patients[0]?.id ?? null);
      } catch (error) {
        if (isCancelled) return;

        console.error("[HL Patients] load patients error:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les patients."
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPatients();

    return () => {
      isCancelled = true;
    };
  }, []);


  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return patients;

    return patients.filter((patient) => {
      return (
        patient.fullName.toLowerCase().includes(query) ||
        (patient.meta ?? "").toLowerCase().includes(query) ||
        (patient.patientCode ?? "").toLowerCase().includes(query)
      );
    });
  }, [patients, search]);

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
  }

  function resetEditContactModalState() {
    setEditContactError(null);
    setIsSavingContact(false);
  }
  
  function handleOpenEditContactModal() {
    setContactPhoneValue(patientDetail?.phone ?? "");
    setContactEmailValue(patientDetail?.email ?? "");
    setContactPrimaryDoctorNameValue(patientDetail?.primaryDoctorName ?? "");
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.patientsSidebarSection}>
            <div className={styles.patientsSidebarLabel}>Liste patients</div>

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
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    className={`${styles.patientListItem} ${
                      selectedPatient?.id === patient.id ? styles.isSelected : ""
                    }`}
                    onClick={() => setSelectedPatientId(patient.id)}
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
                        <span className={styles.patientInfoValue}>
                            {patientDetail.primaryDoctorName ?? "—"}
                        </span>
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
                            {patientDetail.vitaleCardStatus ?? "unknown"}
                        </span>
                        </div>

                        <div className={styles.patientCoverageItem}>
                        <span className={styles.patientCoverageLabel}>Mutuelle</span>
                        <span className={`${styles.patientCoverageBadge} ${styles.isCoverageOn}`}>
                            {patientDetail.insuranceStatus ?? "unknown"}
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
                                        <span className={styles.documentsFileName}>{doc.title}</span>
                                    </div>
                                    </td>

                                    <td>
                                    <span className={styles.documentsTypeText}>{doc.type}</span>
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
                      <div className={styles.cardTitle}>Tâches en attente</div>
                      <div className={styles.tasksCount}>{patientTasks.length}</div>
                    </div>

                    {patientTasks.length > 0 ? (
                      <div className={styles.tasksList}>
                        {patientTasks.map((task) => (
                          <div key={task.id} className={styles.taskItem}>
                            <span className={styles.taskCheckbox} />

                            <span className={styles.taskContent}>
                              <span className={styles.taskTitleRow}>
                                <span className={styles.taskLabel}>{task.label}</span>

                                {task.priority === "high" && (
                                  <span className={`${styles.taskBadge} ${styles.taskBadgeUrgent}`}>
                                    Urgent
                                  </span>
                                )}
                              </span>

                              <span className={styles.taskMeta}>{task.reason}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.taskMeta}>Aucune tâche en attente.</div>
                    )}
                  </section>
                </div>
                </div>
                </>
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

          <div>
            <div style={{ color: "white", fontSize: 13, marginBottom: 6 }}>
              Médecin traitant
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
                {previewDocument.type} · {formatDocumentDate(previewDocument.date)}
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
              ) : previewDocument.mimeType === "application/pdf" ? (
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
    </div>
  );
}