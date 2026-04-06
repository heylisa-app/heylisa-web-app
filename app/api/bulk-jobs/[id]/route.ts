import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

async function resolveBulkJobContext() {
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveBulkJobContext();

    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: resolved.error },
        { status: resolved.status }
      );
    }

    const { id } = await context.params;
    const { admin, cabinetAccountId } = resolved;

    if (!cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const jobId = String(id ?? "").trim();

    if (!jobId) {
      return NextResponse.json(
        { ok: false, error: "BULK_JOB_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const { data: jobRow, error: jobError } = await admin
      .from("bulk_jobs")
      .select(`
        id,
        cabinet_account_id,
        public_user_id,
        source,
        intent,
        instructions,
        sub_options,
        status,
        total_files,
        processed_files,
        success_files,
        failed_files,
        current_step,
        error_message,
        started_at,
        completed_at,
        created_at,
        updated_at
      `)
      .eq("id", jobId)
      .eq("cabinet_account_id", cabinetAccountId)
      .single();

    if (jobError || !jobRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "BULK_JOB_NOT_FOUND",
          details: jobError?.message ?? null,
        },
        { status: 404 }
      );
    }

    const { data: itemRows, error: itemsError } = await admin
      .from("bulk_job_items")
      .select(`
        id,
        bulk_job_id,
        item_index,
        original_file_name,
        mime_type,
        storage_bucket,
        storage_path,
        status,
        source_branch,
        review_status,
        qualification_status,
        patient_record_id,
        patient_contact_id,
        result_payload,
        error_message,
        created_at,
        updated_at
      `)
      .eq("bulk_job_id", jobId)
      .order("item_index", { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        {
          ok: false,
          error: "BULK_JOB_ITEMS_FETCH_FAILED",
          details: itemsError.message,
        },
        { status: 500 }
      );
    }

    const items = (itemRows ?? []).map((row) => ({
      id: row.id,
      itemIndex: row.item_index,
      originalFileName: row.original_file_name,
      mimeType: row.mime_type,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      status: row.status,
      sourceBranch: row.source_branch,
      reviewStatus: row.review_status,
      qualificationStatus: row.qualification_status,
      patientRecordId: row.patient_record_id,
      patientContactId: row.patient_contact_id,
      resultPayload: asObject(row.result_payload),
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      ok: true,
      job: {
        id: jobRow.id,
        source: jobRow.source,
        intent: jobRow.intent,
        instructions: jobRow.instructions,
        subOptions: Array.isArray(jobRow.sub_options) ? jobRow.sub_options : [],
        status: jobRow.status,
        totalFiles: jobRow.total_files,
        processedFiles: jobRow.processed_files,
        successFiles: jobRow.success_files,
        failedFiles: jobRow.failed_files,
        currentStep: jobRow.current_step,
        errorMessage: jobRow.error_message,
        startedAt: jobRow.started_at,
        completedAt: jobRow.completed_at,
        createdAt: jobRow.created_at,
        updatedAt: jobRow.updated_at,
      },
      items,
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