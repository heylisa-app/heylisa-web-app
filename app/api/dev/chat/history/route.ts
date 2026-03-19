import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "NOT_ALLOWED" }, { status: 403 });
  }

  try {
    const conversationId = request.nextUrl.searchParams.get("conversation_id")?.trim();

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_CONVERSATION_ID" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("conversation_messages")
      .select("id, role, sender_type, content, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "HISTORY_FETCH_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      messages: data ?? [],
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