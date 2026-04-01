import { NextRequest, NextResponse } from "next/server";
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const resolved = await resolveContext();

    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: resolved.error },
        { status: resolved.status }
      );
    }

    const { admin, cabinetAccountId } = resolved;
    const { id, taskId } = await context.params;
    const body = await request.json();

    const nextStatus = String(body?.status ?? "").trim().toLowerCase();

    if (!id || !taskId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_IDS" },
        { status: 400 }
      );
    }

    if (!cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    if (!["pending", "completed"].includes(nextStatus)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    const { data: patientRecord, error: patientError } = await admin
      .from("patient_records")
      .select("id, patient_contact_id, cabinet_account_id")
      .eq("id", id)
      .eq("cabinet_account_id", cabinetAccountId)
      .single();

    if (patientError || !patientRecord?.id) {
      return NextResponse.json(
        { ok: false, error: "PATIENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    };

    const { data: updatedTask, error: updateError } = await admin
    .from("cabinet_tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("cabinet_id", cabinetAccountId)
    .eq("patient_id", patientRecord.patient_contact_id)
    .select("id, status, completed_at, patient_id, cabinet_id")
    .maybeSingle();
  
  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message || "TASK_UPDATE_FAILED" },
      { status: 500 }
    );
  }
  
  if (!updatedTask?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "TASK_NOT_FOUND_OR_NOT_UPDATED",
        debug: {
          taskId,
          cabinetAccountId,
          patientContactId: patientRecord.patient_contact_id,
        },
      },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    ok: true,
    task: updatedTask,
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