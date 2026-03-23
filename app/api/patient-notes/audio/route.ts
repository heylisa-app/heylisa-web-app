import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_AUDIO_MIME_TYPES = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/oga",
    "video/webm",
    "",
  ]);
  
  const ALLOWED_AUDIO_EXTENSIONS = new Set([
    "mp3",
    "m4a",
    "wav",
    "webm",
    "ogg",
    "oga",
    "mp4",
    "aac",
  ]);

const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

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

function isAllowedAudioFile(file: File) {
    const mimeType = file.type || "";
    const extension = getFileExt(file.name || "") || "";
  
    const isMimeAllowed = ALLOWED_AUDIO_MIME_TYPES.has(mimeType);
    const isExtensionAllowed = ALLOWED_AUDIO_EXTENSIONS.has(extension);
  
    return isMimeAllowed || isExtensionAllowed;
  }

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

export async function POST(request: Request) {
  try {
    const context = await resolveNoteContext();

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

    const audioFile = formData.get("audio");
    const patientId = String(formData.get("patientId") ?? "").trim() || null;
    const isDemo = String(formData.get("isDemo") ?? "false").trim() === "true";

    const interactionType = String(formData.get("interactionType") ?? "")
      .trim();

    const rawText = String(formData.get("rawText") ?? "").trim();

    const prepareFollowupEmail =
      String(formData.get("prepareFollowupEmail") ?? "false").trim() === "true";

    const sendFollowupEmail =
      String(formData.get("sendFollowupEmail") ?? "false").trim() === "true";

    const sendWithoutValidation =
      String(formData.get("sendWithoutValidation") ?? "false").trim() === "true";

    const audioDurationSecondsRaw = String(
      formData.get("audioDurationSeconds") ?? ""
    ).trim();

    const audioDurationSeconds = audioDurationSecondsRaw
      ? Number(audioDurationSecondsRaw)
      : null;

    if (!(audioFile instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "AUDIO_FILE_MISSING" },
        { status: 400 }
      );
    }

    if (!isAllowedAudioFile(audioFile)) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_AUDIO_TYPE",
            debug: {
              mimeType: audioFile.type || "",
              fileName: audioFile.name || "",
              extension: getFileExt(audioFile.name || ""),
            },
          },
          { status: 400 }
        );
      }

    if (audioFile.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "AUDIO_FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    if (!["consultation", "exam", "operation"].includes(interactionType)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INTERACTION_TYPE" },
        { status: 400 }
      );
    }

    if (sendFollowupEmail && !prepareFollowupEmail) {
      return NextResponse.json(
        { ok: false, error: "SEND_REQUIRES_PREPARE" },
        { status: 400 }
      );
    }

    if (sendWithoutValidation && !sendFollowupEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "SEND_WITHOUT_VALIDATION_REQUIRES_SEND",
        },
        { status: 400 }
      );
    }

    const originalFileName = audioFile.name || "note-audio";
    const sanitizedFileName = sanitizeFileName(originalFileName);
    const fileExt = getFileExt(sanitizedFileName) || "webm";

    const storagePath = [
      cabinetAccountId,
      publicUserId,
      isDemo ? "demo" : "real",
      "audio-notes",
      `${crypto.randomUUID()}-${sanitizedFileName}`,
    ].join("/");

    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("patient-notes-audio")
      .upload(storagePath, fileBuffer, {
        contentType: audioFile.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          ok: false,
          error: uploadError.message || "AUDIO_STORAGE_UPLOAD_FAILED",
        },
        { status: 500 }
      );
    }

    const followupEmailStatus = prepareFollowupEmail
      ? sendFollowupEmail
        ? sendWithoutValidation
          ? "to_prepare"
          : "pending_validation"
        : "to_prepare"
      : "not_requested";

    const { data: noteRow, error: insertError } = await admin
      .from("patient_notes")
      .insert({
        patient_id: patientId,
        cabinet_account_id: cabinetAccountId,
        public_user_id: publicUserId,
        is_demo: isDemo,
        note_type: "audio",
        interaction_type: interactionType,
        raw_text: rawText || null,
        clean_text: null,
        prepare_followup_email: prepareFollowupEmail,
        send_followup_email: sendFollowupEmail,
        send_without_validation: sendWithoutValidation,
        followup_email_status: followupEmailStatus,

        audio_storage_bucket: "patient-notes-audio",
        audio_storage_path: storagePath,
        audio_mime_type: audioFile.type || "audio/webm",
        audio_duration_seconds:
          Number.isFinite(audioDurationSeconds) && audioDurationSeconds !== null
            ? audioDurationSeconds
            : null,
        audio_upload_status: "uploaded",

        transcription_status: "pending",
        transcription_raw: null,
        transcription_source: null,
        transcription_completed_at: null,
      })
      .select(
        `
        id,
        patient_id,
        cabinet_account_id,
        public_user_id,
        is_demo,
        note_type,
        interaction_type,
        raw_text,
        clean_text,
        prepare_followup_email,
        send_followup_email,
        send_without_validation,
        followup_email_status,
        followup_email_sent_at,
        audio_storage_bucket,
        audio_storage_path,
        audio_mime_type,
        audio_duration_seconds,
        audio_upload_status,
        transcription_status,
        transcription_raw,
        transcription_source,
        transcription_completed_at,
        created_at,
        updated_at
      `
      )
      .single();

    if (insertError || !noteRow) {
      await admin.storage.from("patient-notes-audio").remove([storagePath]);

      return NextResponse.json(
        { ok: false, error: insertError?.message || "NOTE_INSERT_FAILED" },
        { status: 500 }
      );
    }

    // déclenchement asynchrone du flow audio
    try {
      await fetch("https://n8n.heylisa.io/webhook/patient-note-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noteId: noteRow.id,
          source: "patients_ui",
          flowMode: "audio_transcription",
        }),
      });
    } catch (webhookError) {
      console.error("Audio transcription webhook failed:", webhookError);
      // on ne bloque pas la réponse user : la note est déjà sauvée
    }

    return NextResponse.json({
      ok: true,
      note: noteRow,
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