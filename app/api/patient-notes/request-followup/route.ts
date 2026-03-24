import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type FollowupMode =
  | "draft"
  | "refresh_draft"
  | "with_validation"
  | "without_validation";

async function resolveContext() {
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

export async function POST(request: Request) {
  try {
    const context = await resolveContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, publicUserId, cabinetAccountId } = context;
    const body = await request.json();

    const noteId = String(body?.noteId ?? "").trim();
    const mode = String(body?.mode ?? "").trim() as FollowupMode;

    if (!noteId) {
      return NextResponse.json(
        { ok: false, error: "NOTE_ID_REQUIRED" },
        { status: 400 }
      );
    }

    if (
        !["draft", "refresh_draft", "with_validation", "without_validation"].includes(
          mode
        )
      ) {
        return NextResponse.json(
          { ok: false, error: "INVALID_MODE" },
          { status: 400 }
        );
      }

    const { data: noteRow, error: noteError } = await admin
      .from("patient_notes")
      .select(`
        id,
        public_user_id,
        cabinet_account_id,
        interaction_type,
        raw_text,
        clean_text,
        followup_email_status,
        followup_email_subject,
        followup_email_body
      `)
      .eq("id", noteId)
      .single();

    if (noteError || !noteRow?.id) {
      return NextResponse.json(
        { ok: false, error: "NOTE_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (noteRow.public_user_id !== publicUserId) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (
      cabinetAccountId &&
      noteRow.cabinet_account_id &&
      noteRow.cabinet_account_id !== cabinetAccountId
    ) {
      return NextResponse.json(
        { ok: false, error: "CABINET_MISMATCH" },
        { status: 403 }
      );
    }

    if (noteRow.followup_email_status === "sent") {
      return NextResponse.json(
        { ok: false, error: "FOLLOWUP_ALREADY_SENT" },
        { status: 400 }
      );
    }

    const hasExistingDraft =
    !!noteRow.followup_email_subject && !!noteRow.followup_email_body;
  
  if (mode === "draft" && hasExistingDraft) {
    return NextResponse.json(
      { ok: false, error: "FOLLOWUP_DRAFT_ALREADY_EXISTS" },
      { status: 400 }
    );
  }
  
  if (mode === "refresh_draft" && !hasExistingDraft) {
    return NextResponse.json(
      { ok: false, error: "FOLLOWUP_DRAFT_MISSING" },
      { status: 400 }
    );
  }

    const noteText = String(noteRow.clean_text || noteRow.raw_text || "").trim();

    if (!noteText) {
      return NextResponse.json(
        { ok: false, error: "NOTE_TEXT_NOT_READY" },
        { status: 400 }
      );
    }

    const prepare_followup_email = true;
    const send_followup_email =
      mode === "with_validation" || mode === "without_validation";
    const send_without_validation = mode === "without_validation";
    
    const followup_email_status =
      mode === "with_validation" ? "pending_validation" : "to_prepare";

      const { error: updateError } = await admin
      .from("patient_notes")
      .update({
        prepare_followup_email,
        send_followup_email,
        send_without_validation,
        followup_email_status,
        followup_email_subject: null,
        followup_email_body: null,
      })
      .eq("id", noteId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message || "NOTE_UPDATE_FAILED" },
        { status: 500 }
      );
    }

    const webhookPayload = {
      noteId,
      interactionType: noteRow.interaction_type,
      noteText,
      prepareOnly: mode === "draft" || mode === "refresh_draft",
      send: mode === "with_validation" || mode === "without_validation",
      noValidation: mode === "without_validation",
      source: "patients_ui",
    };

    try {
      await fetch("https://n8n.heylisa.io/webhook/followup-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });
    } catch (webhookError) {
      console.error("Follow-up webhook failed:", webhookError);
      return NextResponse.json(
        { ok: false, error: "FOLLOWUP_WEBHOOK_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode,
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