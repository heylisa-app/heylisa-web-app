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

export async function PATCH(
    request: Request,
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
  
      const { admin, publicUserId, cabinetAccountId } = context;
      const { id } = await params;
  
      const noteId = String(id ?? "").trim();
  
      if (!noteId) {
        return NextResponse.json(
          { ok: false, error: "NOTE_ID_REQUIRED" },
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
  
      const interactionType = String(body?.interactionType ?? "").trim();
      const rawText = String(body?.rawText ?? "").trim();
  
      if (!["consultation", "exam", "operation"].includes(interactionType)) {
        return NextResponse.json(
          { ok: false, error: "INVALID_INTERACTION_TYPE" },
          { status: 400 }
        );
      }
  
      if (!rawText) {
        return NextResponse.json(
          { ok: false, error: "NOTE_TEXT_REQUIRED" },
          { status: 400 }
        );
      }
  
      const { data: existingNote, error: fetchError } = await admin
        .from("patient_notes")
        .select(`
          id,
          cabinet_account_id,
          public_user_id,
          note_type,
          followup_email_status
        `)
        .eq("id", noteId)
        .single();
  
      if (fetchError || !existingNote) {
        return NextResponse.json(
          { ok: false, error: "NOTE_NOT_FOUND" },
          { status: 404 }
        );
      }
  
      if (
        existingNote.cabinet_account_id !== cabinetAccountId ||
        existingNote.public_user_id !== publicUserId
      ) {
        return NextResponse.json(
          { ok: false, error: "FORBIDDEN" },
          { status: 403 }
        );
      }
  
      if (existingNote.note_type !== "text") {
        return NextResponse.json(
          { ok: false, error: "ONLY_TEXT_NOTES_CAN_BE_EDITED" },
          { status: 400 }
        );
      }
  
      if (existingNote.followup_email_status === "sent") {
        return NextResponse.json(
          { ok: false, error: "NOTE_LOCKED_BECAUSE_FOLLOWUP_SENT" },
          { status: 409 }
        );
      }
  
      const { data: updatedNote, error: updateError } = await admin
        .from("patient_notes")
        .update({
          interaction_type: interactionType,
          raw_text: rawText,
          clean_text: rawText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .select(`
          id,
          interaction_type,
          raw_text,
          clean_text,
          updated_at
        `)
        .single();
  
      if (updateError || !updatedNote) {
        return NextResponse.json(
          { ok: false, error: updateError?.message || "NOTE_UPDATE_FAILED" },
          { status: 500 }
        );
      }
  
      return NextResponse.json({
        ok: true,
        note: updatedNote,
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