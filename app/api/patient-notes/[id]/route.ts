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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await resolveNoteContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, cabinetAccountId } = context;
    const { id } = await params;

    const noteId = String(id ?? "").trim();

    if (!noteId) {
      return NextResponse.json(
        { ok: false, error: "NOTE_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const { data: noteRow, error: fetchError } = await admin
      .from("patient_notes")
      .select("id, cabinet_account_id")
      .eq("id", noteId)
      .single();

    if (fetchError || !noteRow) {
      return NextResponse.json(
        { ok: false, error: "NOTE_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (noteRow.cabinet_account_id !== cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await admin
      .from("patient_notes")
      .delete()
      .eq("id", noteId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message || "NOTE_DELETE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      deletedId: noteId,
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