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

function normalizeNullableString(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await resolveContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, publicUserId, cabinetAccountId } = context;
    const { id } = await params;

    const patientRecordId = String(id ?? "").trim();

    if (!patientRecordId) {
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

    const body = await request.json();

    const phone = normalizeNullableString(body?.phone);
    const email = normalizeNullableString(body?.email);
    const primaryDoctorName = normalizeNullableString(body?.primaryDoctorName);
    const primaryDoctorPhone = normalizeNullableString(body?.primaryDoctorPhone);
    const primaryDoctorEmail = normalizeNullableString(body?.primaryDoctorEmail);
    const trustedContactName = normalizeNullableString(body?.trustedContactName);
    const trustedContactPhone = normalizeNullableString(body?.trustedContactPhone);
    const trustedContactEmail = normalizeNullableString(body?.trustedContactEmail);

    const { data: recordRow, error: recordError } = await admin
      .from("patient_records")
      .select(`
        id,
        public_user_id,
        cabinet_account_id,
        patient_contact_id
      `)
      .eq("id", patientRecordId)
      .single();

    if (recordError || !recordRow?.id) {
      return NextResponse.json(
        { ok: false, error: "PATIENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (
      recordRow.public_user_id !== publicUserId ||
      recordRow.cabinet_account_id !== cabinetAccountId
    ) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (!recordRow.patient_contact_id) {
      return NextResponse.json(
        { ok: false, error: "PATIENT_CONTACT_MISSING" },
        { status: 400 }
      );
    }

    const { error: contactUpdateError } = await admin
      .from("patient_contacts")
      .update({
        phone,
        email,
      })
      .eq("id", recordRow.patient_contact_id);

    if (contactUpdateError) {
      return NextResponse.json(
        { ok: false, error: contactUpdateError.message || "PATIENT_CONTACT_UPDATE_FAILED" },
        { status: 500 }
      );
    }

    const { error: recordUpdateError } = await admin
      .from("patient_records")
      .update({
        primary_doctor_name: primaryDoctorName,
        primary_doctor_phone: primaryDoctorPhone,
        primary_doctor_email: primaryDoctorEmail,
        trusted_contact_name: trustedContactName,
        trusted_contact_phone: trustedContactPhone,
        trusted_contact_email: trustedContactEmail,
      })
      .eq("id", patientRecordId);

    if (recordUpdateError) {
      return NextResponse.json(
        { ok: false, error: recordUpdateError.message || "PATIENT_RECORD_UPDATE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
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