import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveNoteContext() {
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

export async function GET(request: Request) {
    try {
      const context = await resolveNoteContext();
  
      if (!context.ok) {
        return NextResponse.json(
          { ok: false, error: context.error },
          { status: context.status }
        );
      }
  
      const { admin, publicUserId, cabinetAccountId } = context;
  
      if (!cabinetAccountId) {
        return NextResponse.json(
          { ok: false, error: "CABINET_NOT_FOUND" },
          { status: 400 }
        );
      }
  
      const { searchParams } = new URL(request.url);
      const patientId = String(searchParams.get("patientId") ?? "").trim();
      const isDemo = searchParams.get("isDemo") === "true";
  
      let query = admin
        .from("patient_notes")
        .select(`
          id,
          patient_id,
          cabinet_account_id,
          public_user_id,
          is_demo,
          note_type,
          interaction_type,
          raw_text,
          clean_text,
          prepare_followup_email,
          send_followup_email,
          send_without_validation,
          followup_email_status,
          followup_email_sent_at,
          followup_email_subject,
          followup_email_body,
          detected_intent,
          risk_flag,
          risk_summary,
          risk_items,
          created_at,
          updated_at
        `)
        .eq("cabinet_account_id", cabinetAccountId)
        .eq("public_user_id", publicUserId)
        .order("created_at", { ascending: false });
  
      if (patientId) {
        query = query.eq("patient_id", patientId);
      }
  
      if (isDemo) {
        query = query.eq("is_demo", true);
      }
  
      const { data, error } = await query;
  
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message || "NOTES_FETCH_FAILED" },
          { status: 500 }
        );
      }
  
      return NextResponse.json({
        ok: true,
        notes: data ?? [],
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
    const context = await resolveNoteContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, publicUserId, cabinetAccountId } = context;

    if (!cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const patientId = String(body?.patientId ?? "").trim() || null;
    const isDemo = body?.isDemo === true;

    const noteType = String(body?.noteType ?? "").trim();
    const interactionType = String(body?.interactionType ?? "").trim();
    const rawText = String(body?.rawText ?? "").trim();

    const prepareFollowupEmail = body?.prepareFollowupEmail === true;
    const sendFollowupEmail = body?.sendFollowupEmail === true;
    const sendWithoutValidation = body?.sendWithoutValidation === true;

    if (noteType !== "text") {
      return NextResponse.json(
        { ok: false, error: "ONLY_TEXT_NOTES_SUPPORTED_FOR_NOW" },
        { status: 400 }
      );
    }

    if (!["consultation", "exam", "operation"].includes(interactionType)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INTERACTION_TYPE" },
        { status: 400 }
      );
    }

    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "NOTE_TEXT_REQUIRED" },
        { status: 400 }
      );
    }

    if (sendFollowupEmail && !prepareFollowupEmail) {
      return NextResponse.json(
        { ok: false, error: "SEND_REQUIRES_PREPARE" },
        { status: 400 }
      );
    }

    if (sendWithoutValidation && !sendFollowupEmail) {
      return NextResponse.json(
        { ok: false, error: "SEND_WITHOUT_VALIDATION_REQUIRES_SEND" },
        { status: 400 }
      );
    }

    if (!patientId) {
        return NextResponse.json(
          { ok: false, error: "PATIENT_ID_REQUIRED" },
          { status: 400 }
        );
      }
  
      const { data: patientRecord, error: patientError } = await admin
        .from("patient_records")
        .select("id, is_demo")
        .eq("id", patientId)
        .eq("cabinet_account_id", cabinetAccountId)
        .eq("public_user_id", publicUserId)
        .single();
  
      if (patientError || !patientRecord) {
        return NextResponse.json(
          { ok: false, error: "PATIENT_NOT_FOUND" },
          { status: 404 }
        );
      }
  
      if (patientRecord.is_demo !== isDemo) {
        return NextResponse.json(
          { ok: false, error: "PATIENT_MODE_MISMATCH" },
          { status: 400 }
        );
      }

    const followupEmailStatus = prepareFollowupEmail
      ? sendFollowupEmail
        ? sendWithoutValidation
          ? "to_prepare"
          : "pending_validation"
        : "to_prepare"
      : "not_requested";

      const { data: noteRow, error: insertError } = await admin
      .from("patient_notes")
      .insert({
        patient_id: patientId,
        cabinet_account_id: cabinetAccountId,
        public_user_id: publicUserId,
        is_demo: isDemo,
        note_type: "text",
        interaction_type: interactionType,
        raw_text: rawText,
        clean_text: rawText,
        prepare_followup_email: prepareFollowupEmail,
        send_followup_email: sendFollowupEmail,
        send_without_validation: sendWithoutValidation,
        followup_email_status: followupEmailStatus,
      })
      .select(
        `
        id,
        patient_id,
        cabinet_account_id,
        public_user_id,
        is_demo,
        note_type,
        interaction_type,
        raw_text,
        clean_text,
        prepare_followup_email,
        send_followup_email,
        send_without_validation,
        followup_email_status,
        followup_email_sent_at,
        followup_email_subject,
        followup_email_body,
        detected_intent,
        risk_flag,
        risk_summary,
        risk_items,
        created_at,
        updated_at
      `
      )
      .single();
    
    if (insertError || !noteRow) {
      return NextResponse.json(
        { ok: false, error: insertError?.message || "NOTE_INSERT_FAILED" },
        { status: 500 }
      );
    }
    
    // 👉 trigger uniquement si demandé
    if (noteRow.prepare_followup_email || noteRow.send_followup_email) {
      try {
        await fetch("https://n8n.heylisa.io/webhook/followup-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteId: noteRow.id,
            interactionType: noteRow.interaction_type,
            noteText: noteRow.clean_text || noteRow.raw_text,
            prepareOnly:
              noteRow.prepare_followup_email && !noteRow.send_followup_email,
            send: noteRow.send_followup_email,
            noValidation: noteRow.send_without_validation,
            source: "patients_ui",
          }),
        });
      } catch (e) {
        console.error("Follow-up webhook failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      note: noteRow,
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