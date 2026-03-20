import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const conversationId =
      request.nextUrl.searchParams.get("conversation_id")?.trim() ?? "";

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_CONVERSATION_ID" },
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

    const { data: messages, error: messagesError } = await supabase
      .from("conversation_messages")
      .select("id, role, sender_type, content, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { ok: false, error: messagesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      messages: messages ?? [],
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