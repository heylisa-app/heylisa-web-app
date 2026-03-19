export async function insertUserMessage(params: {
  conversationId: string;
  publicUserId: string;
  text: string;
}) {
  const response = await fetch("/api/dev/chat/messages", {
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