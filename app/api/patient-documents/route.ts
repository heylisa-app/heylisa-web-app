import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveDocumentsContext() {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  // -----------------------------
  // DEV MODE
  // -----------------------------
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

  // -----------------------------
  // PROD / NORMAL MODE
  // -----------------------------
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
    const context = await resolveDocumentsContext();

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

    const patientId = String(searchParams.get("patientId") ?? "").trim() || null;
    const isDemo = String(searchParams.get("isDemo") ?? "false").trim() === "true";

    let query = admin
      .from("patient_documents")
      .select(`
        id,
        patient_id,
        cabinet_account_id,
        public_user_id,
        is_demo,
        file_name,
        file_ext,
        mime_type,
        file_size,
        storage_bucket,
        storage_path,
        upload_status,
        analysis_status,
        analysis_text,
        analysis_json,
        source,
        created_at,
        updated_at
      `)
      .eq("cabinet_account_id", cabinetAccountId)
      .order("created_at", { ascending: false });

    if (isDemo) {
      query = query
        .eq("public_user_id", publicUserId)
        .eq("is_demo", true);
    } else {
      if (!patientId) {
        return NextResponse.json(
          { ok: false, error: "PATIENT_ID_REQUIRED" },
          { status: 400 }
        );
      }

      query = query
        .eq("patient_id", patientId)
        .eq("is_demo", false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "DOCUMENTS_FETCH_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      documents: data ?? [],
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