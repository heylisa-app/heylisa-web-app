import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

function buildDemoAttentionPoints() {
  return [
    { label: "Allergie", value: "Pénicilline", severity: "high" },
    { label: "ALD", value: "Maladie de Crohn", severity: "medium" },
    { label: "Condition", value: "Mobilité réduite", severity: "low" },
  ];
}

function buildDemoMedicalDetails() {
  return [
    {
      id: "detail-1",
      title: "Maladie de Crohn",
      status: "confirmed",
      severity: "medium",
      meta: "Suivi digestif chronique · impact inflammatoire actif",
      summary:
        "Pathologie connue du dossier nécessitant une prise en compte systématique lors des consultations et des décisions de suivi.",
    },
    {
      id: "detail-2",
      title: "Poussée inflammatoire",
      status: "suspected",
      severity: "high",
      meta: "Investigation en cours · résultats biologiques à consolider",
      summary:
        "Hypothèse clinique actuellement surveillée à partir des symptômes récents et des examens en attente de validation.",
    },
    {
      id: "detail-3",
      title: "Contrôle résultats biologiques",
      status: "monitoring",
      severity: "medium",
      meta: "Action recommandée sous 14 jours",
      summary:
        "Vérification conseillée à court terme pour confirmer la stabilité du dossier et ajuster le suivi si nécessaire.",
    },
  ];
}

function buildDemoAnatomyState() {
  return {
    selected_detail_id: "detail-2",
    zone: "abdomen",
    severity: "high",
    label: "Abdomen · Suspicion inflammatoire",
    top: "34%",
    left: "37%",
    width: "26%",
    height: "20%",
    pointTop: "43%",
    pointLeft: "51%",
  };
}

async function findExistingDemoRecord(admin: ReturnType<typeof createAdminClient>, cabinetAccountId: string, publicUserId: string) {
  const { data, error } = await admin
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
      gender,
      date_of_birth,
      age_display,
      primary_doctor_name,
      trusted_contact_name,
      trusted_contact_phone,
      trusted_contact_email,
      followup_status,
      current_reason,
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
      created_at,
      updated_at
    `)
    .eq("cabinet_account_id", cabinetAccountId)
    .eq("public_user_id", publicUserId)
    .eq("is_demo", true)
    .single();

  if (error || !data) return null;
  return data;
}

async function findExistingDemoContact(admin: ReturnType<typeof createAdminClient>, cabinetAccountId: string) {
  const { data, error } = await admin
    .from("patient_contacts")
    .select("*")
    .eq("cabinet_id", cabinetAccountId)
    .eq("is_demo", true)
    .eq("email_normalized", "claire.martin@email.fr")
    .single();

  if (error || !data) return null;
  return data;
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
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const existingRecord = await findExistingDemoRecord(
      admin,
      cabinetAccountId,
      publicUserId
    );

    if (existingRecord) {
      return NextResponse.json({
        ok: true,
        mode: "existing",
        patientRecord: existingRecord,
      });
    }

    let patientContact = await findExistingDemoContact(admin, cabinetAccountId);

    if (!patientContact) {
      const { data: createdContact, error: contactError } = await admin
        .from("patient_contacts")
        .insert({
          cabinet_id: cabinetAccountId,
          first_name: "Claire",
          last_name: "Martin",
          email: "claire.martin@email.fr",
          email_normalized: "claire.martin@email.fr",
          phone: "06 12 34 56 78",
          date_of_birth: "1974-02-14",
          tags: ["demo", "gastro", "followup"],
          notes: "Patient démo HeyLisa",
        })
        .select("*")
        .single();

      if (contactError || !createdContact) {
        return NextResponse.json(
          { ok: false, error: "DEMO_CONTACT_CREATE_FAILED" },
          { status: 500 }
        );
      }

      patientContact = createdContact;
    }

    // 👉 création du patient_record démo
    const { data: createdRecord, error: recordError } = await admin
      .from("patient_records")
      .insert({
        cabinet_account_id: cabinetAccountId,
        public_user_id: publicUserId,
        patient_contact_id: patientContact.id,
        is_demo: true,

        // identité
        patient_code: "P-DEMO-001",
        first_name: "Claire",
        last_name: "Martin",
        gender: "female",
        date_of_birth: "1974-02-14",
        age_display: "52 ans",

        // relation médicale
        primary_doctor_name: "Dr Martin",
        trusted_contact_name: "Sophie Martin",
        trusted_contact_phone: "06 44 22 18 90",
        trusted_contact_email: "sophie.martin@email.fr",

        // suivi
        followup_status: "À suivre",
        current_reason: "Douleurs abdominales",
        last_consultation_at: new Date().toISOString(),
        next_followup_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        weight_kg: 64,

        // contenu clinique
        clinical_summary:
          "Patiente suivie pour douleurs abdominales récurrentes sur terrain inflammatoire chronique.",
        medical_context:
          "Maladie de Crohn connue. Surveillance recommandée.",
        medical_context_long:
          "Résultats biologiques récents en attente de relecture complète. Traitement de fond connu, surveillance recommandée à court terme selon évolution clinique.",

        // couverture
        vitale_card_status: "active",
        insurance_status: "active",

        // blocs UI
        attention_points_structured: buildDemoAttentionPoints(),
        medical_details: buildDemoMedicalDetails(),
        anatomy_state: buildDemoAnatomyState(),

        lisa_summary:
          "Synthèse automatique Lisa : situation stable, suivi recommandé.",
        lisa_last_updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (recordError || !createdRecord) {
      return NextResponse.json(
        { ok: false, error: "DEMO_RECORD_CREATE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "created",
      patientRecord: createdRecord,
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