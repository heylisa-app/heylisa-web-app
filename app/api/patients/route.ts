import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PatientRecordRow = {
  id: string;
  is_demo: boolean;
  record_status: string | null;
  patient_code: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  age_display: string | null;
  followup_status: string | null;
  last_reason: string | null;
  next_followup_at: string | null;
  clinical_summary: string | null;
  attention_points_structured:
    | Array<{
        label?: string;
        value?: string;
        severity?: string;
      }>
    | null;
  updated_at: string;
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

function buildPatientFullName(record: Pick<PatientRecordRow, "full_name" | "first_name" | "last_name">) {
  const fullName = record.full_name?.trim();
  if (fullName) return fullName;

  const firstName = record.first_name?.trim() ?? "";
  const lastName = record.last_name?.trim() ?? "";
  const combined = `${firstName} ${lastName}`.trim();

  return combined || "Patient sans nom";
}

function normalizePatientListStatus(
    followupStatus: string | null,
    nextFollowupAt: string | null
  ): "active" | "pending" | "urgent" {
    const normalized = String(followupStatus ?? "")
      .trim()
      .toLowerCase();
  
    if (normalized === "urgent") {
      return "urgent";
    }
  
    if (
      normalized === "followup_needed" ||
      normalized === "monitoring" ||
      normalized === "to_review"
    ) {
      return "pending";
    }
  
    if (nextFollowupAt) {
      const nextDate = new Date(nextFollowupAt);
      const now = new Date();
  
      if (!Number.isNaN(nextDate.getTime()) && nextDate.getTime() <= now.getTime()) {
        return "pending";
      }
    }
  
    return "active";
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
  
  function buildPatientStatusExplanation(
    followupStatus: string | null,
    nextFollowupAt: string | null
  ) {
    const normalized = String(followupStatus ?? "")
      .trim()
      .toLowerCase();
  
    switch (normalized) {
      case "urgent":
        return "Dossier prioritaire nécessitant une action rapide.";
      case "followup_needed":
        return "Un suivi ou une relance doit être organisé.";
      case "monitoring":
        return "Le dossier est sous surveillance active.";
      case "to_review":
        return "Le dossier contient des éléments à relire ou valider.";
      case "stable":
        return "Le dossier ne présente pas d’action urgente immédiate.";
      default:
        if (nextFollowupAt) {
          return "Le dossier reste actif avec une échéance de suivi à surveiller.";
        }
        return "Le dossier est actif sans signal prioritaire immédiat.";
    }
  }

function buildPatientMeta(record: Pick<PatientRecordRow, "age_display" | "last_reason" | "followup_status">) {
  const age = record.age_display?.trim();
  const reason = record.last_reason?.trim();

  if (age && reason) return `${age} · ${reason}`;
  if (age) return age;
  if (reason) return reason;

  switch (record.followup_status) {
    case "urgent":
      return "Suivi prioritaire";
    case "followup_needed":
      return "Suivi à organiser";
    case "monitoring":
      return "Sous surveillance";
    case "to_review":
      return "À relire";
    case "stable":
      return "Dossier stable";
    default:
      return "Dossier patient";
  }
}

function buildShortSummary(record: Pick<PatientRecordRow, "clinical_summary">) {
  const summary = record.clinical_summary?.replace(/\s+/g, " ").trim();

  if (!summary) return "";
  if (summary.length <= 120) return summary;

  return `${summary.slice(0, 120).trim()}...`;
}

function buildAttentionTags(
  attentionPoints:
    | Array<{
        label?: string;
        value?: string;
        severity?: string;
      }>
    | null
    | undefined
) {
  if (!Array.isArray(attentionPoints)) return [];

  return attentionPoints
    .slice(0, 3)
    .map((item) => ({
      label: item.label?.trim() || "Point d’attention",
      value: item.value?.trim() || "",
      severity: item.severity ?? "low",
    }));
}

export async function GET() {
  try {
    const context = await resolvePatientContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, cabinetAccountId, publicUserId } = context;

    if (!cabinetAccountId) {
      return NextResponse.json({
        ok: true,
        mode: "demo",
        patients: [],
        selectedPatientId: null,
      });
    }

    const { data, error } = await admin
      .from("patient_records")
      .select(`
        id,
        is_demo,
        record_status,
        patient_code,
        first_name,
        last_name,
        full_name,
        age_display,
        followup_status,
        last_reason,
        next_followup_at,
        clinical_summary,
        attention_points_structured,
        updated_at
      `)
      .eq("cabinet_account_id", cabinetAccountId)
      .eq("public_user_id", publicUserId)
      .eq("is_demo", false)
      .eq("record_status", "active")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "PATIENTS_FETCH_FAILED", details: error.message },
        { status: 500 }
      );
    }

    const records = (data ?? []) as PatientRecordRow[];

    if (records.length === 0) {
      return NextResponse.json({
        ok: true,
        mode: "demo",
        patients: [],
        selectedPatientId: null,
      });
    }

    const patients = records.map((record) => {
        const uiStatus = normalizePatientListStatus(
          record.followup_status,
          record.next_followup_at
        );
      
        return {
          id: record.id,
          patientCode: record.patient_code,
          fullName: buildPatientFullName(record),
          ageDisplay: record.age_display,
          meta: buildPatientMeta(record),
          status: uiStatus,
          followupStatus: buildFollowupStatusLabel(record.followup_status),
          statusExplanation: buildPatientStatusExplanation(
            record.followup_status,
            record.next_followup_at
          ),
          nextFollowupAt: record.next_followup_at,
          shortSummary: buildShortSummary(record),
          attentionTags: buildAttentionTags(record.attention_points_structured),
          updatedAt: record.updated_at,
        };
      });

    return NextResponse.json({
      ok: true,
      mode: "live",
      patients,
      selectedPatientId: patients[0]?.id ?? null,
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