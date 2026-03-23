import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(request: Request) {
  try {
    const context = await resolveContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, publicUserId, cabinetAccountId } = context;

    const { searchParams } = new URL(request.url);
    const noteId = String(searchParams.get("noteId") ?? "").trim();

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
        public_user_id,
        cabinet_account_id,
        note_type,
        audio_storage_bucket,
        audio_storage_path
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

    if (noteRow.note_type !== "audio") {
      return NextResponse.json(
        { ok: false, error: "NOTE_IS_NOT_AUDIO" },
        { status: 400 }
      );
    }

    if (!noteRow.audio_storage_bucket || !noteRow.audio_storage_path) {
      return NextResponse.json(
        { ok: false, error: "AUDIO_FILE_NOT_AVAILABLE" },
        { status: 404 }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from(noteRow.audio_storage_bucket)
      .createSignedUrl(noteRow.audio_storage_path, 900);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: signedUrlError?.message || "SIGNED_URL_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      signedUrl: signedUrlData.signedUrl,
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