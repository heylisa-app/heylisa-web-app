import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveSendDraftContext() {
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
    const context = await resolveSendDraftContext();

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
    const noteId = String(body?.noteId ?? "").trim();

    if (!noteId) {
      return NextResponse.json(
        { ok: false, error: "NOTE_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const { data: noteRow, error: noteError } = await admin
      .from("patient_notes")
      .select(`
        id,
        cabinet_account_id,
        public_user_id,
        followup_email_subject,
        followup_email_body,
        followup_email_status
      `)
      .eq("id", noteId)
      .eq("cabinet_account_id", cabinetAccountId)
      .eq("public_user_id", publicUserId)
      .single();

    if (noteError || !noteRow) {
      return NextResponse.json(
        { ok: false, error: "NOTE_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (
      !String(noteRow.followup_email_subject ?? "").trim() ||
      !String(noteRow.followup_email_body ?? "").trim()
    ) {
      return NextResponse.json(
        { ok: false, error: "DRAFT_NOT_READY" },
        { status: 400 }
      );
    }

    if (noteRow.followup_email_status === "sent") {
      return NextResponse.json(
        { ok: false, error: "FOLLOWUP_ALREADY_SENT" },
        { status: 409 }
      );
    }

    const webhookResponse = await fetch(
      "https://n8n.heylisa.io/webhook/followup-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noteId,
          source: "patients_ui",
          flowMode: "send_draft",
        }),
      }
    );

    const webhookPayload = await webhookResponse.json().catch(() => null);

    if (!webhookResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            webhookPayload?.error ||
            `N8N_WEBHOOK_FAILED_${webhookResponse.status}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      noteId,
      status: "send_triggered",
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