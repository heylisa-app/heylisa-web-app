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

type CreatePatientBody = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  context?: string;
};

type CreatePatientContactRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
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

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value: unknown) {
  return String(value ?? "").trim();
}

function isValidBirthDate(value: string) {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function buildCreatePatientFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}


function parseCreatePatientBody(body: CreatePatientBody) {
  const firstName = normalizeText(body.firstName);
  const lastName = normalizeText(body.lastName);
  const birthDate = normalizeText(body.birthDate);
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const contextText = normalizeText(body.context);

  const hasDiscriminant = Boolean(birthDate || email || phone);

  if (!firstName) {
    return { ok: false as const, error: "FIRST_NAME_REQUIRED" };
  }

  if (!lastName) {
    return { ok: false as const, error: "LAST_NAME_REQUIRED" };
  }

  if (!hasDiscriminant) {
    return { ok: false as const, error: "PATIENT_DISCRIMINANT_REQUIRED" };
  }

  if (birthDate && !isValidBirthDate(birthDate)) {
    return { ok: false as const, error: "INVALID_BIRTH_DATE" };
  }

  return {
    ok: true as const,
    data: {
      firstName,
      lastName,
      birthDate: birthDate || null,
      email: email || null,
      phone: phone || null,
      fullName: buildCreatePatientFullName(firstName, lastName),
      contextText: contextText || null,
    },
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

export async function POST(request: Request) {
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
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const rawBody = (await request.json()) as CreatePatientBody;
    const parsed = parseCreatePatientBody(rawBody);

    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: 400 }
      );
    }

    const { firstName, lastName, birthDate, email, phone, fullName, contextText } = parsed.data;

    const { data: patientContact, error: patientContactError } = await admin
      .from("patient_contacts")
      .insert({
        cabinet_id: cabinetAccountId,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email,
        phone,
        date_of_birth: birthDate,
        email_normalized: email || null,
        phone_normalized: phone || null,
        is_demo: false,
      })
      .select(`
        id,
        full_name,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth
      `)
      .single();

    if (patientContactError || !patientContact?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "PATIENT_CONTACT_CREATE_FAILED",
          details: patientContactError?.message ?? null,
        },
        { status: 500 }
      );
    }

    const interactionContent = [
      `Création manuelle d'une fiche patient.`,
      `Nom : ${fullName}`,
      birthDate ? `Date de naissance : ${birthDate}` : null,
      email ? `Email : ${email}` : null,
      phone ? `Téléphone : ${phone}` : null,
      contextText ? `Contexte : ${contextText}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { error: interactionError } = await admin
      .from("patient_interactions")
      .insert({
        cabinet_account_id: cabinetAccountId,
        patient_id: patientContact.id,
        source_kind: "manual",
        source_subtype: "patient_created",
        direction: "internal",
        status: "received",
        actor_name: "Cabinet",
        actor_email: null,
        title: "Création manuelle de fiche patient",
        content_text: interactionContent,
        content_excerpt: "Création manuelle de fiche patient",
        category: "patient_creation",
        urgency: "normal",
        needs_human_review: false,
        payload_json: {
          event: "patient_contact_created",
          created_from: "patients_sidebar_modal",
          public_user_id: publicUserId,
          patient_contact: {
            id: patientContact.id,
            full_name: patientContact.full_name,
            first_name: patientContact.first_name,
            last_name: patientContact.last_name,
            email: patientContact.email,
            phone: patientContact.phone,
            date_of_birth: patientContact.date_of_birth,
          },
          context: contextText,
        },
        attachments_json: [],
        detected_at: new Date().toISOString(),
      });

    if (interactionError) {
      return NextResponse.json(
        {
          ok: false,
          error: "PATIENT_INTERACTION_CREATE_FAILED",
          details: interactionError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      patientContact: {
        id: patientContact.id,
        fullName: patientContact.full_name,
        firstName: patientContact.first_name,
        lastName: patientContact.last_name,
        email: patientContact.email,
        phone: patientContact.phone,
        birthDate: patientContact.date_of_birth,
      },
      processing: {
        status: "queued",
        message: "Fiche patient créée. Le traitement aval va maintenant prendre le relais.",
      },
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