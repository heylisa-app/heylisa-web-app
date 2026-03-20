import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const conversationId = String(body?.conversation_id ?? "").trim();
    const publicUserId = String(body?.public_user_id ?? "").trim();
    const text = String(body?.text ?? "").trim();

    if (!conversationId || !publicUserId || !text) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single();

    if (userError || !userRow?.id) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (userRow.id !== publicUserId) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN_PUBLIC_USER" },
        { status: 403 }
      );
    }

    const { data: conversationRow, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userRow.id)
      .single();

    if (conversationError || !conversationRow?.id) {
      return NextResponse.json(
        { ok: false, error: "CONVERSATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    const dedupeKey = `u:${conversationId}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const { data, error } = await admin
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        user_id: publicUserId,
        sender_type: "user",
        role: "user",
        content: text,
        dedupe_key: dedupeKey,
        metadata: {
          event_type: "frontend_user_message",
        },
      })
      .select("id, sent_at, content")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          ok: false,
          error: error?.message || "INSERT_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: data,
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