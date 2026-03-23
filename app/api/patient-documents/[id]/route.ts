import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveDeleteContext() {
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
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveDeleteContext();

    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: resolved.error },
        { status: resolved.status }
      );
    }

    const { cabinetAccountId, admin } = resolved;
    const { id } = await context.params;

    const { data: documentRow, error: fetchError } = await admin
      .from("patient_documents")
      .select("id, cabinet_account_id, storage_bucket, storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !documentRow) {
      return NextResponse.json(
        { ok: false, error: "DOCUMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (documentRow.cabinet_account_id !== cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { error: storageError } = await admin.storage
      .from(documentRow.storage_bucket)
      .remove([documentRow.storage_path]);

    if (storageError) {
      return NextResponse.json(
        { ok: false, error: storageError.message || "STORAGE_DELETE_FAILED" },
        { status: 500 }
      );
    }

    const { error: deleteError } = await admin
      .from("patient_documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message || "DOCUMENT_DELETE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
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