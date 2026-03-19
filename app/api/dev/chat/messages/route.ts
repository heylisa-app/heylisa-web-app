import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "NOT_ALLOWED" }, { status: 403 });
  }

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

    const supabase = createAdminClient();

    const dedupeKey = `u:${conversationId}:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2, 10)}`;
  
      const { data, error } = await supabase
        .from("conversation_messages")
        .insert({
          conversation_id: conversationId,
          user_id: publicUserId,
          sender_type: "user",
          role: "user",
          content: text,
          dedupe_key: dedupeKey,
          metadata: {
            event_type: "frontend_user_message_dev",
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