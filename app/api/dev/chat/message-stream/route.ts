import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "NOT_ALLOWED" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const conversationId = String(body?.conversation_id || "").trim();
    const userMessageId = String(body?.user_message_id || "").trim();

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_CONVERSATION_ID" },
        { status: 400 }
      );
    }

    if (!userMessageId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_USER_MESSAGE_ID" },
        { status: 400 }
      );
    }

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

    const publicUserId = process.env.DEV_PUBLIC_USER_ID?.trim();

    if (!publicUserId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_DEV_PUBLIC_USER_ID" },
        { status: 500 }
      );
    }

    const backendResponse = await fetch(
      `${apiBaseUrl.replace(/\/+$/, "")}/v1/chat/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-Dev-Public-User-Id": publicUserId,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_message_id: userMessageId,
        }),
      }
    );

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new NextResponse(
        errorText || `HTTP ${backendResponse.status}`,
        {
          status: backendResponse.status,
          headers: {
            "Content-Type":
              backendResponse.headers.get("content-type") || "text/plain",
          },
        }
      );
    }

    return new NextResponse(backendResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
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