export async function insertUserMessage(params: {
  conversationId: string;
  publicUserId: string;
  text: string;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const path = isDev ? "/api/dev/chat/messages" : "/api/chat/messages";

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      public_user_id: params.publicUserId,
      text: params.text,
    }),
  });

  const payload = await response.json();

  if (!response.ok || !payload?.ok || !payload?.message) {
    throw new Error(payload?.error || "Failed to insert user message");
  }

  return payload.message;
}