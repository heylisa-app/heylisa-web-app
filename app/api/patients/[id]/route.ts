import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type JsonObject = Record<string, unknown>;

type PatientRecordRow = {
  id: string;
  cabinet_account_id: string;
  public_user_id: string;
  patient_contact_id: string | null;
  is_demo: boolean;
  record_status: string | null;
  patient_code: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  age_display: string | null;
  primary_doctor_name: string | null;
  primary_doctor_email: string | null;
  primary_doctor_phone: string | null;
  trusted_contact_name: string | null;
  trusted_contact_phone: string | null;
  trusted_contact_email: string | null;
  trusted_contact_relation: string | null;
  followup_status: string | null;
  last_reason: string | null;
  last_consultation_at: string | null;
  next_followup_at: string | null;
  weight_kg: number | null;
  clinical_summary: string | null;
  medical_context: string | null;
  medical_context_long: string | null;
  vitale_card_status: string | null;
  insurance_status: string | null;
  attention_points_structured: unknown;
  medical_details: unknown;
  anatomy_state: unknown;
  lisa_summary: string | null;
  lisa_last_updated_at: string | null;
  structured_data: unknown;
  raw_payload: unknown;
};

type PatientContactRow = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  tags: string[] | null;
  notes: string | null;
};

type PatientNoteRow = {
  id: string;
  note_type: "text" | "audio";
  interaction_type: "consultation" | "exam" | "operation";
  raw_text: string | null;
  clean_text: string | null;
  audio_storage_bucket: string | null;
  audio_storage_path: string | null;
  audio_mime_type: string | null;
  audio_duration_seconds: number | null;
  transcription_status: "none" | "pending" | "processing" | "done" | "failed";
  followup_email_status:
    | "not_requested"
    | "to_prepare"
    | "draft_ready"
    | "pending_validation"
    | "sent"
    | "failed";
  followup_email_subject: string | null;
  followup_email_body: string | null;
  detected_intent: "consultation" | "exam" | "operation" | null;
  risk_flag: boolean;
  risk_summary: string | null;
  risk_items: string[] | null;
  created_at: string;
};

type PatientDocumentRow = {
    id: string;
    file_name: string;
    file_ext: string | null;
    mime_type: string;
    file_size: number | null;
    upload_status: string | null;
    analysis_status: string | null;
    analysis_text: string | null;
    analysis_json: {
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
    created_at: string;
    storage_path: string | null;
    storage_bucket: string | null;
  };

async function resolvePatientContext() {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  if (isDev && devPublicUserId) {
    const admin = createAdminClient();

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id, primary_company_id")
      .eq("id", devPublicUserId)
      .single();

    if (userError || !userRow?.id) {
      return {
        ok: false as const,
        status: 404,
        error: "DEV_USER_NOT_FOUND",
      };
    }

    return {
      ok: true as const,
      publicUserId: userRow.id,
      cabinetAccountId: userRow.primary_company_id ?? null,
      admin,
    };
  }

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      ok: false as const,
      status: 401,
      error: "UNAUTHORIZED",
    };
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, primary_company_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (userError || !userRow?.id) {
    return {
      ok: false as const,
      status: 404,
      error: "USER_NOT_FOUND",
    };
  }

  return {
    ok: true as const,
    publicUserId: userRow.id,
    cabinetAccountId: userRow.primary_company_id ?? null,
    admin: createAdminClient(),
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function buildFullName(record: PatientRecordRow, contact: PatientContactRow | null) {
  const recordFullName = record.full_name?.trim();
  if (recordFullName) return recordFullName;

  const recordCombined = `${record.first_name ?? ""} ${record.last_name ?? ""}`.trim();
  if (recordCombined) return recordCombined;

  const contactFullName = contact?.full_name?.trim();
  if (contactFullName) return contactFullName;

  const contactCombined = `${contact?.first_name ?? ""} ${contact?.last_name ?? ""}`.trim();
  if (contactCombined) return contactCombined;

  return "Patient sans nom";
}

function buildFollowupStatusLabel(status: string | null) {
    const normalized = String(status ?? "")
      .trim()
      .toLowerCase();
  
    switch (normalized) {
      case "urgent":
        return "Urgent";
      case "followup_needed":
        return "Suivi à organiser";
      case "monitoring":
        return "Sous surveillance";
      case "to_review":
        return "À relire";
      case "stable":
        return "Stable";
      default:
        return "Dossier actif";
    }
  }
  
  function buildLastReasonLabel(reason: string | null) {
    const normalized = String(reason ?? "")
      .trim()
      .toLowerCase();
  
    if (!normalized) return null;
  
    switch (normalized) {
      case "followup_needed":
        return "Suivi à organiser";
      case "monitoring":
        return "Sous surveillance";
      case "to_review":
        return "À relire";
      case "urgent":
        return "Urgent";
      case "stable":
        return "Stable";
      default:
        return reason;
    }
  }

  function pickAttentionPoints(record: PatientRecordRow) {
    const EXCLUDED_KEYWORDS = [
      "contact",
      "proche",
      "confiance",
      "téléphone",
      "email",
      "médecin",
      "docteur",
      "coordonnée",
    ];
  
    function isMedicalPoint(label?: string, value?: string) {
      const text = `${label ?? ""} ${value ?? ""}`.toLowerCase();
  
      return !EXCLUDED_KEYWORDS.some((keyword) => text.includes(keyword));
    }
  
    function normalize(items: Array<{ label?: string; value?: string; severity?: string }>) {
      return items
        .filter((item) => isMedicalPoint(item.label, item.value))
        .slice(0, 3)
        .map((item) => ({
          label: item.label ?? "Point d’attention",
          value: item.value ?? "",
          severity: item.severity ?? "low",
        }));
    }
  
    // 1. Source principale (projection propre)
    const direct = asArray<{ label?: string; value?: string; severity?: string }>(
      record.attention_points_structured
    );
  
    const cleanDirect = normalize(direct);
  
    if (cleanDirect.length > 0) {
      return cleanDirect;
    }
  
    // 2. Fallback (IA brute)
    const rawPayload = asObject(record.raw_payload);
    const analysis = asObject(rawPayload.last_record_analysis);
    const fallback = asArray<{ label?: string; value?: string; severity?: string }>(
      analysis.attention_points_structured
    );
  
    return normalize(fallback);
  }

function pickMedicalDetails(record: PatientRecordRow) {
  const direct = asArray<{
    id?: string;
    title?: string;
    status?: string;
    severity?: string;
    meta?: string;
    summary?: string;
  }>(record.medical_details);

  if (direct.length > 0) {
    return direct.map((item, index) => ({
      id: item.id ?? `detail-${index + 1}`,
      title: item.title ?? "Détail médical",
      status: item.status ?? "monitoring",
      severity: (item.severity as "low" | "medium" | "high") ?? "low",
      meta: item.meta ?? "",
      summary: item.summary ?? "",
    }));
  }

  const structuredData = asObject(record.structured_data);
  const rawPayload = asObject(record.raw_payload);
  const analysis = asObject(rawPayload.last_record_analysis);

  const fallbackStructured = asArray<{
    id?: string;
    title?: string;
    status?: string;
    severity?: string;
    meta?: string;
    summary?: string;
  }>(structuredData.medical_details);

  if (fallbackStructured.length > 0) {
    return fallbackStructured.map((item, index) => ({
      id: item.id ?? `detail-${index + 1}`,
      title: item.title ?? "Détail médical",
      status: item.status ?? "monitoring",
      severity: (item.severity as "low" | "medium" | "high") ?? "low",
      meta: item.meta ?? "",
      summary: item.summary ?? "",
    }));
  }

  const fallbackAnalysis = asArray<{
    id?: string;
    title?: string;
    status?: string;
    severity?: string;
    meta?: string;
    summary?: string;
  }>(analysis.medical_details);

  return fallbackAnalysis.map((item, index) => ({
    id: item.id ?? `detail-${index + 1}`,
    title: item.title ?? "Détail médical",
    status: item.status ?? "monitoring",
    severity: (item.severity as "low" | "medium" | "high") ?? "low",
    meta: item.meta ?? "",
    summary: item.summary ?? "",
  }));
}

function pickAnatomyState(record: PatientRecordRow) {
  const direct = asObject(record.anatomy_state);

  if (Object.keys(direct).length > 0) {
    return direct;
  }

  const rawPayload = asObject(record.raw_payload);
  const candidates = asArray<{
    zone?: string;
    label?: string;
    severity?: string;
    detail_id?: string;
  }>(rawPayload.last_anatomy_candidates);

  if (candidates.length === 0) return {};

  const first = candidates[0];

  return {
    selected_detail_id: first.detail_id ?? null,
    zone: first.zone ?? null,
    label: first.label ?? null,
    severity: first.severity ?? "low",
  };
}

function pickTasks(record: PatientRecordRow) {
  const structuredData = asObject(record.structured_data);
  const rawPayload = asObject(record.raw_payload);
  const analysis = asObject(rawPayload.last_record_analysis);

  const direct = asArray<{
    label?: string;
    reason?: string;
    priority?: string;
    task_type?: string;
  }>(structuredData.pending_tasks);

  if (direct.length > 0) {
    return direct.map((item, index) => ({
      id: `task-${index + 1}`,
      label: item.label ?? "Tâche",
      reason: item.reason ?? "",
      priority: item.priority ?? "medium",
      taskType: item.task_type ?? "general",
    }));
  }

  const fallback = asArray<{
    label?: string;
    reason?: string;
    priority?: string;
    task_type?: string;
  }>(analysis.pending_tasks);

  return fallback.map((item, index) => ({
    id: `task-${index + 1}`,
    label: item.label ?? "Tâche",
    reason: item.reason ?? "",
    priority: item.priority ?? "medium",
    taskType: item.task_type ?? "general",
  }));
}

function pickFollowupSuggestions(record: PatientRecordRow) {
  const structuredData = asObject(record.structured_data);
  const rawPayload = asObject(record.raw_payload);
  const analysis = asObject(rawPayload.last_record_analysis);

  const direct = asArray<{
    label?: string;
    reason?: string;
    priority?: string;
  }>(structuredData.followup_suggestions);

  if (direct.length > 0) {
    return direct.map((item, index) => ({
      id: `suggestion-${index + 1}`,
      label: item.label ?? "Suggestion",
      reason: item.reason ?? "",
      priority: item.priority ?? "medium",
    }));
  }

  const fallback = asArray<{
    label?: string;
    reason?: string;
    priority?: string;
  }>(analysis.followup_suggestions);

  return fallback.map((item, index) => ({
    id: `suggestion-${index + 1}`,
    label: item.label ?? "Suggestion",
    reason: item.reason ?? "",
    priority: item.priority ?? "medium",
  }));
}

function buildNoteTitle(interactionType: PatientNoteRow["interaction_type"]) {
  if (interactionType === "consultation") return "Post consultation";
  if (interactionType === "exam") return "Post examen";
  return "Post opération";
}

function buildNoteSummary(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 120) return cleaned;
  return `${cleaned.slice(0, 120).trim()}...`;
}

function mapNotes(rows: PatientNoteRow[]) {
  return rows.map((note) => {
    const content =
      note.clean_text?.trim() ||
      note.raw_text?.trim() ||
      (note.note_type === "audio"
        ? note.transcription_status === "failed"
          ? "Transcription indisponible pour le moment."
          : "Transcription en cours..."
        : "");

    return {
      id: note.id,
      title: buildNoteTitle(note.interaction_type),
      summary: buildNoteSummary(content),
      content,
      datetime: note.created_at,
      hasAudio: note.note_type === "audio",
      audioDurationSeconds: note.audio_duration_seconds,
      followupEmailStatus: note.followup_email_status,
      followupEmailSubject: note.followup_email_subject,
      followupEmailBody: note.followup_email_body,
      detectedIntent: note.detected_intent,
      riskFlag: note.risk_flag === true,
      riskSummary: note.risk_summary ?? "",
      riskItems: Array.isArray(note.risk_items) ? note.risk_items : [],
      audioStoragePath: note.audio_storage_path,
      audioStorageBucket: note.audio_storage_bucket,
      audioMimeType: note.audio_mime_type,
      transcriptionStatus: note.transcription_status,
    };
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolvePatientContext();

    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: resolved.error },
        { status: resolved.status }
      );
    }

    const { id } = await context.params;
    const { admin, publicUserId, cabinetAccountId } = resolved;

    if (!cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const { data: record, error: recordError } = await admin
      .from("patient_records")
      .select(`
        id,
        cabinet_account_id,
        public_user_id,
        patient_contact_id,
        is_demo,
        record_status,
        patient_code,
        first_name,
        last_name,
        full_name,
        gender,
        date_of_birth,
        age_display,
        primary_doctor_name,
        primary_doctor_email,
        primary_doctor_phone,
        trusted_contact_name,
        trusted_contact_phone,
        trusted_contact_email,
        trusted_contact_relation,
        followup_status,
        last_reason,
        last_consultation_at,
        next_followup_at,
        weight_kg,
        clinical_summary,
        medical_context,
        medical_context_long,
        vitale_card_status,
        insurance_status,
        attention_points_structured,
        medical_details,
        anatomy_state,
        lisa_summary,
        lisa_last_updated_at,
        structured_data,
        raw_payload
      `)
      .eq("id", id)
      .eq("cabinet_account_id", cabinetAccountId)
      .eq("public_user_id", publicUserId)
      .eq("is_demo", false)
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        {
          ok: false,
          error: "PATIENT_NOT_FOUND",
          details: recordError?.message ?? null,
        },
        { status: 404 }
      );
    }

    let contact: PatientContactRow | null = null;

    if (record.patient_contact_id) {
      const { data: contactRow } = await admin
        .from("patient_contacts")
        .select(`
          id,
          email,
          phone,
          full_name,
          first_name,
          last_name,
          date_of_birth,
          tags,
          notes
        `)
        .eq("id", record.patient_contact_id)
        .single();

      contact = (contactRow as PatientContactRow | null) ?? null;
    }

    const { data: noteRows, error: notesError } = await admin
      .from("patient_notes")
      .select(`
        id,
        note_type,
        interaction_type,
        raw_text,
        clean_text,
        audio_storage_bucket,
        audio_storage_path,
        audio_mime_type,
        audio_duration_seconds,
        transcription_status,
        followup_email_status,
        followup_email_subject,
        followup_email_body,
        detected_intent,
        risk_flag,
        risk_summary,
        risk_items,
        created_at
      `)
      .eq("patient_id", record.id)
      .eq("cabinet_account_id", cabinetAccountId)
      .order("created_at", { ascending: false });

    if (notesError) {
      return NextResponse.json(
        {
          ok: false,
          error: "PATIENT_NOTES_FETCH_FAILED",
          details: notesError.message,
        },
        { status: 500 }
      );
    }

    const { data: documentsData, error: documentsError } = await admin
    .from("patient_documents")
    .select(`
      id,
      file_name,
      file_ext,
      mime_type,
      file_size,
      upload_status,
      analysis_status,
      analysis_text,
      analysis_json,
      created_at,
      storage_path,
      storage_bucket
    `)
    .eq("patient_id", record.patient_contact_id)
    .order("created_at", { ascending: false });

    if (documentsError) {
        return NextResponse.json(
          {
            ok: false,
            error: "PATIENT_DOCUMENTS_FETCH_FAILED",
            details: documentsError.message,
          },
          { status: 500 }
        );
      }

      const documents = ((documentsData ?? []) as PatientDocumentRow[]).map((doc) => ({
        id: doc.id,
        title: doc.file_name,
        type:
          doc.mime_type === "application/pdf"
            ? "PDF"
            : doc.mime_type?.startsWith("image/")
            ? "Image"
            : "Document",
        date: doc.created_at,
        status:
          doc.analysis_status === "done"
            ? "Analysé"
            : doc.analysis_status === "pending"
            ? "Analyse en cours"
            : doc.analysis_status === "failed"
            ? "Analyse échouée"
            : "Non analysé",
        isUploaded: true,
        mimeType: doc.mime_type,
        storagePath: doc.storage_path,
        storageBucket: doc.storage_bucket,
        analysisStatus: doc.analysis_status,
        analysisText: doc.analysis_text,
        analysisJson: doc.analysis_json,
      }));

    const tasks = pickTasks(record as PatientRecordRow);
    const followupSuggestions = pickFollowupSuggestions(record as PatientRecordRow);
    const attentionPoints = pickAttentionPoints(record as PatientRecordRow);
    const medicalDetails = pickMedicalDetails(record as PatientRecordRow);
    const anatomyState = pickAnatomyState(record as PatientRecordRow);

    return NextResponse.json({
      ok: true,
      patient: {
        id: record.id,
        patientCode: record.patient_code,
        fullName: buildFullName(record as PatientRecordRow, contact),
        firstName: record.first_name,
        lastName: record.last_name,
        gender: record.gender,
        dateOfBirth: record.date_of_birth ?? contact?.date_of_birth ?? null,
        ageDisplay: record.age_display,
        phone: contact?.phone ?? null,
        email: contact?.email ?? null,
        primaryDoctorName: record.primary_doctor_name,
        primaryDoctorEmail: record.primary_doctor_email,
        primaryDoctorPhone: record.primary_doctor_phone,
        trustedContactName: record.trusted_contact_name,
        trustedContactPhone: record.trusted_contact_phone,
        trustedContactEmail: record.trusted_contact_email,
        trustedContactRelation: record.trusted_contact_relation,
        followupStatus: buildFollowupStatusLabel(record.followup_status),
        lastReason: buildLastReasonLabel(record.last_reason),
        lastConsultationAt: record.last_consultation_at,
        nextFollowupAt: record.next_followup_at,
        weightKg: record.weight_kg,
        clinicalSummary: record.clinical_summary,
        medicalContext: record.medical_context,
        medicalContextLong: record.medical_context_long,
        vitaleCardStatus: record.vitale_card_status,
        insuranceStatus: record.insurance_status,
        lisaSummary: record.lisa_summary,
        lisaLastUpdatedAt: record.lisa_last_updated_at,
        attentionPoints,
        medicalDetails,
        anatomyState,
      },
      notes: mapNotes((noteRows ?? []) as PatientNoteRow[]),
      documents,
      tasks,
      followupSuggestions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}