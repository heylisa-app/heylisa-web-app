import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveSignedUrlContext() {
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

export async function GET(request: NextRequest) {
  try {
    const context = await resolveSignedUrlContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, cabinetAccountId } = context;

    const path = String(request.nextUrl.searchParams.get("path") ?? "").trim();
    const bucket = String(request.nextUrl.searchParams.get("bucket") ?? "patient-documents").trim();

    if (!path) {
      return NextResponse.json(
        { ok: false, error: "PATH_REQUIRED" },
        { status: 400 }
      );
    }

    const { data: documentRow, error: docError } = await admin
      .from("patient_documents")
      .select("id, cabinet_account_id, storage_path, storage_bucket")
      .eq("storage_path", path)
      .eq("storage_bucket", bucket)
      .single();

    if (docError || !documentRow) {
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

    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: error?.message || "SIGNED_URL_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      signedUrl: data.signedUrl,
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