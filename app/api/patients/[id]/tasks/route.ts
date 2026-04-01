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

function normalizeNullableString(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function buildDefaultDueAtIso() {
  const now = new Date();
  const dueAt = new Date(now);
  dueAt.setHours(23, 59, 0, 0);
  return dueAt.toISOString();
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveContext();

    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: resolved.error },
        { status: resolved.status }
      );
    }

    const { admin, cabinetAccountId, publicUserId } = resolved;
    const { id } = await context.params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "PATIENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    if (!cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const title = normalizeNullableString(body?.title);
    const description = normalizeNullableString(body?.description);
    const priority = normalizeNullableString(body?.priority) ?? "medium";

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "TASK_TITLE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!["low", "medium", "high"].includes(priority)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PRIORITY" },
        { status: 400 }
      );
    }

    const { data: patientRecord, error: patientError } = await admin
      .from("patient_records")
      .select("id, patient_contact_id, cabinet_account_id, public_user_id")
      .eq("id", id)
      .eq("cabinet_account_id", cabinetAccountId)
      .eq("public_user_id", publicUserId)
      .single();

    if (patientError || !patientRecord?.id) {
      return NextResponse.json(
        { ok: false, error: "PATIENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    function formatUserLabel(fullName: string | null) {
        if (!fullName) return "Utilisateur";
      
        const parts = fullName.trim().split(" ");
      
        if (parts.length === 1) return parts[0];
      
        const firstName = parts[0];
        const lastInitial = parts[1]?.charAt(0)?.toUpperCase() || "";
      
        return `${firstName} ${lastInitial}.`;
      }

      const { data: userRow } = await admin
      .from("users")
      .select("full_name")
      .eq("id", publicUserId)
      .single();
    
    const createdByLabel = formatUserLabel(userRow?.full_name ?? null);

    const { data: insertedTask, error: insertError } = await admin
      .from("cabinet_tasks")
      .insert({
        cabinet_id: cabinetAccountId,
        patient_id: patientRecord.patient_contact_id,
        created_by: publicUserId,
        task_type: "manual",
        title,
        description,
        status: "pending",
        priority,
        due_at: buildDefaultDueAtIso(),
        metadata: {
          source: "user",
          created_by_label: createdByLabel,
          source_record_id: patientRecord.id,
        },
      })
      .select("id")
      .single();

      if (insertError || !insertedTask?.id) {
        console.error("[HL Tasks API] insert error:", insertError);
      
        return NextResponse.json(
          {
            ok: false,
            error: insertError?.message || "TASK_CREATE_FAILED",
            details: insertError,
          },
          { status: 500 }
        );
      }

    return NextResponse.json({
      ok: true,
      task: {
        id: insertedTask.id,
      },
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