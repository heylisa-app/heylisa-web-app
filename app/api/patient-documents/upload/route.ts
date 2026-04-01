//app/patient-documents/upload/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function getFileExt(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) return null;
  return parts.pop()?.toLowerCase() ?? null;
}

async function resolveUploadContext() {
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

export async function POST(request: Request) {
  try {
    const context = await resolveUploadContext();

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

    const formData = await request.formData();

    const file = formData.get("file");
    const patientIdRaw = String(formData.get("patientId") ?? "").trim();
    const isDemoRaw = String(formData.get("isDemo") ?? "false").trim();

    const requestedPatientId = patientIdRaw || null;
    const isDemo = isDemoRaw === "true";

    let resolvedPatientContactId: string | null = null;

    if (requestedPatientId) {
      const { data: patientRecord, error: patientRecordError } = await admin
        .from("patient_records")
        .select("id, patient_contact_id")
        .eq("id", requestedPatientId)
        .eq("cabinet_account_id", cabinetAccountId)
        .eq("public_user_id", publicUserId)
        .single();

      if (patientRecordError || !patientRecord) {
        return NextResponse.json(
          { ok: false, error: "PATIENT_RECORD_NOT_FOUND" },
          { status: 404 }
        );
      }

      if (!patientRecord.patient_contact_id) {
        return NextResponse.json(
          { ok: false, error: "PATIENT_CONTACT_MISSING" },
          { status: 400 }
        );
      }

      resolvedPatientContactId = patientRecord.patient_contact_id;
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "FILE_MISSING" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_FILE_TYPE" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    // -----------------------------
    // DEMO LIMIT = 1 DOC MAX
    // -----------------------------
    if (isDemo) {
      const { count, error: countError } = await admin
        .from("patient_documents")
        .select("*", { count: "exact", head: true })
        .eq("public_user_id", publicUserId)
        .eq("is_demo", true);

      if (countError) {
        return NextResponse.json(
          { ok: false, error: "DEMO_COUNT_FAILED" },
          { status: 500 }
        );
      }

      if ((count ?? 0) >= 1) {
        return NextResponse.json(
          { ok: false, error: "DEMO_DOCUMENT_LIMIT_REACHED" },
          { status: 400 }
        );
      }
    }

    const originalFileName = file.name || "document";
    const sanitizedFileName = sanitizeFileName(originalFileName);
    const fileExt = getFileExt(sanitizedFileName);

    const storagePath = [
      cabinetAccountId,
      publicUserId,
      isDemo ? "demo" : "real",
      `${crypto.randomUUID()}-${sanitizedFileName}`,
    ].join("/");

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("patient-documents")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: uploadError.message || "STORAGE_UPLOAD_FAILED" },
        { status: 500 }
      );
    }

    const { data: documentRow, error: insertError } = await admin
      .from("patient_documents")
      .insert({
        patient_id: resolvedPatientContactId,
        cabinet_account_id: cabinetAccountId,
        public_user_id: publicUserId,
        is_demo: isDemo,
        file_name: originalFileName,
        file_ext: fileExt,
        mime_type: file.type,
        file_size: file.size,
        storage_bucket: "patient-documents",
        storage_path: storagePath,
        upload_status: "uploaded",
        analysis_status: "not_started",
        source: "manual",
      })
      .select(
        `
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
      `
      )
      .single();

      if (insertError || !documentRow) {
        // rollback storage si insert DB KO
        await admin.storage.from("patient-documents").remove([storagePath]);
  
        return NextResponse.json(
          { ok: false, error: insertError?.message || "DOCUMENT_INSERT_FAILED" },
          { status: 500 }
        );
      }
  
      const qualificationWebhookPayload = [
        {
          document_id: documentRow.id,
          cabinet_account_id: documentRow.cabinet_account_id,
          patient_id: documentRow.patient_id,
          file_name: documentRow.file_name,
          mime_type: documentRow.mime_type,
          storage_bucket: documentRow.storage_bucket,
          storage_path: documentRow.storage_path,
        },
      ];
  
      void fetch("https://n8n.heylisa.io/webhook/qualify-shareable-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(qualificationWebhookPayload),
      }).catch((error) => {
        console.error("[HL Upload] qualify-shareable-document webhook failed:", error);
      });
  
      return NextResponse.json({
        ok: true,
        document: documentRow,
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