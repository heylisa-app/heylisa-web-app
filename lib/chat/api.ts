import { createClient as createSupabaseClient } from "@/lib/supabase/client";

export type SseEvent =
  | { event: "ack"; data: any }
  | { event: "meta"; data: any }
  | { event: "delta"; data: any }
  | { event: "done"; data: any }
  | { event: "error"; data: any };

function getApiBaseUrl() {
  const isBrowser = typeof window !== "undefined";
  const isLocalBrowser =
    isBrowser &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const url = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (isLocalBrowser && !url) {
    return "http://localhost:8000";
  }

  if (!url) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is missing");
  }

  return url.replace(/\/+$/, "");
}

async function getAccessToken() {
  const supabase = createSupabaseClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("Missing Supabase access token");
  }

  return accessToken;
}

function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const complete = parts.slice(0, -1);
  const rest = parts[parts.length - 1] ?? "";

  const events: SseEvent[] = [];

  for (const block of complete) {
    const lines = block.split("\n");
    let eventName = "";
    let dataRaw = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataRaw += line.slice(5).trim();
      }
    }

    if (!eventName || !dataRaw) continue;

    try {
      events.push({
        event: eventName as SseEvent["event"],
        data: JSON.parse(dataRaw),
      });
    } catch {
      // ignore malformed chunk
    }
  }

  return { events, rest };
}

async function streamPost(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: SseEvent) => void
) {
  const apiBaseUrl = getApiBaseUrl();
  const accessToken = await getAccessToken();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;

    for (const event of parsed.events) {
      onEvent(event);
    }
  }
}

export async function streamChatIntro(
  conversationId: string,
  onEvent: (event: SseEvent) => void
) {
  return streamPost(
    "/v1/chat/intro",
    { conversation_id: conversationId },
    onEvent
  );
}

export async function streamChatMessage(
  conversationId: string,
  userMessageId: string,
  onEvent: (event: SseEvent) => void
) {
  return streamPost(
    "/v1/chat/message",
    {
      conversation_id: conversationId,
      user_message_id: userMessageId,
    },
    onEvent
  );
}