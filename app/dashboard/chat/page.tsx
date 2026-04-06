//app/dashboard/chat/page.tsx

"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import styles from "./page.module.css";
import { insertUserMessage } from "@/lib/chat/messages";
import { streamChatIntro, streamChatMessage, type SseEvent } from "@/lib/chat/api";
import { parseLisaMessage } from "@/lib/chat/lisaFormat";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { useAudioRecorder } from "@/lib/chat/useAudioRecorder";

type ChatStatus = "idle" | "connecting" | "streaming" | "error";

type Message =
  | {
      id: string;
      sender: "lisa";
      text: string;
      time: string;
      status?: "thinking" | "typing" | "streaming" | "final";
    }
  | {
      id: string;
      sender: "user";
      text: string;
      time: string;
    };

type LisaMessage = Extract<Message, { sender: "lisa" }>;

const SEND_OFF = "/imgs/sendmsg-off.png";
const SEND_ON = "/imgs/sendmsg-on.png";
const LISA_AVATAR = "/imgs/Lisa_Avatar-min.webp";
const INTRO_STREAMING_ID = "intro-streaming-placeholder";
const MAIN_STREAMING_PREFIX = "lisa-streaming";

const DEV_PUBLIC_USER_ID =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_PUBLIC_USER_ID ?? ""
    : "";

const DEV_CONVERSATION_ID =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_CONVERSATION_ID ?? ""
    : "";

function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

async function fetchChatHistory(conversationId: string) {
  const isDev = process.env.NODE_ENV === "development";
  const basePath = isDev ? "/api/dev/chat/history" : "/api/chat/history";

  const response = await fetch(
    `${basePath}?conversation_id=${encodeURIComponent(conversationId)}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const payload = await response.json();

  if (!response.ok || !payload?.ok || !Array.isArray(payload?.messages)) {
    throw new Error(payload?.error || "Failed to fetch chat history");
  }

  return payload.messages as Array<{
    id: string;
    role: string;
    sender_type: string;
    content: string;
    sent_at: string | null;
  }>;
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapDbMessagesToUi(
  dbMessages: Array<{
    id: string;
    role: string;
    sender_type: string;
    content: string;
    sent_at: string | null;
  }>
): Message[] {
  return dbMessages.map((msg) => {
    const date = msg.sent_at ? new Date(msg.sent_at) : null;
    const time = date
      ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
      : "";

    if (msg.role === "assistant" || msg.sender_type === "lisa") {
      return {
        id: msg.id,
        sender: "lisa",
        text: msg.content ?? "",
        time,
        status: "final" as const,
      };
    }

    return {
      id: msg.id,
      sender: "user",
      text: msg.content ?? "",
      time,
    };
  });
}

async function playIntroTypingEffect(
  fullText: string,
  onTick: (partial: string) => void,
  onDone: () => void
) {
  const normalized = String(fullText ?? "");
  const chunkSize = 3;
  const delayMs = 14;

  for (let i = 0; i < normalized.length; i += chunkSize) {
    const partial = normalized.slice(0, i + chunkSize);
    onTick(partial);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  onDone();
}

function renderLisaTextWithLinks(text: string) {
  const value = typeof text === "string" ? text : "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const INTERNAL_APP_HOSTS = new Set([
    "localhost:3000",
    "app.heylisa.io",
  ]);

  function isInternalAppUrl(urlString: string) {
    try {
      const url = new URL(urlString);
      return INTERNAL_APP_HOSTS.has(url.host);
    } catch {
      return false;
    }
  }

  function handleLisaLinkClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    urlString: string
  ) {
    if (!isInternalAppUrl(urlString)) return;

    e.preventDefault();
    window.location.assign(urlString);
  }

  return value.split(urlRegex).map((part, index) => {
    if (!part) return null;

    const isUrl = /^https?:\/\/[^\s]+$/.test(part);

    if (isUrl) {
      const cleanUrl = part.replace(/[.,;!?]+$/, "");
      const trailing = part.slice(cleanUrl.length);
      const shouldStayInApp = isInternalAppUrl(cleanUrl);

      return (
        <span key={`${cleanUrl}-${index}`}>
          <a
            href={cleanUrl}
            target={shouldStayInApp ? "_self" : "_blank"}
            rel={shouldStayInApp ? undefined : "noopener noreferrer"}
            className={styles.lisaInlineLink}
            onClick={(e) => handleLisaLinkClick(e, cleanUrl)}
          >
            {cleanUrl}
          </a>
          {trailing}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function renderLisaInlineText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    const isBold = /^\*\*.*\*\*$/.test(part);

    if (isBold) {
      return <strong key={index}>{renderLisaTextWithLinks(part.slice(2, -2))}</strong>;
    }

    return <span key={index}>{renderLisaTextWithLinks(part)}</span>;
  });
}

function renderLisaMultilineText(text: string) {
  return text.split("\n").map((line, index, arr) => (
    <span key={`${index}-${line.slice(0, 12)}`}>
      {renderLisaInlineText(line)}
      {index < arr.length - 1 && <br />}
    </span>
  ));
}

function triggerLisaNotification(message: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const preview = message.length > 120
    ? message.slice(0, 119) + "…"
    : message;

  const notif = new Notification("Lisa", {
    body: preview,
    icon: "/imgs/Lisa_Avatar-min.webp",
  });

  notif.onclick = () => {
    window.focus();
  };
}

function renderLisaMessageContent(messageText: string) {
  console.log("[Lisa RAW messageText]", messageText);
  const parsed = parseLisaMessage(messageText);
  console.log("[Lisa PARSED]", parsed);

  if (parsed.format === "prescription") {
    const titleBlock = parsed.blocks.find((block) => block.type === "title");
    const rxMetaBlock = parsed.blocks.find((block) => block.type === "rx_meta");
    const rxBlock = parsed.blocks.find((block) => block.type === "rx");
    const rxNotesBlock = parsed.blocks.find((block) => block.type === "rx_notes");
    const trailingParagraphs = parsed.blocks.filter((block) => block.type === "paragraph");

    return (
      <div data-lisa-format="prescription">
        {titleBlock && (
          <div
            style={{
              fontSize: "1.08rem",
              fontWeight: 800,
              margin: "0 0 14px 0",
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.98)",
              letterSpacing: "-0.01em",
            }}
          >
            {renderLisaMultilineText(titleBlock.content)}
          </div>
        )}

        <div
          style={{
            margin: "0 0 16px 0",
            background: "#ffffff",
            color: "#111111",
            borderRadius: "22px",
            overflow: "hidden",
            boxShadow:
              "0 20px 50px rgba(0,0,0,0.28), 0 2px 10px rgba(0,0,0,0.12)",
            border: "1px solid rgba(255,255,255,0.75)",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(17,17,17,0.08)",
              background:
                "linear-gradient(180deg, rgba(245,246,248,1) 0%, rgba(255,255,255,1) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(180deg, rgba(17,17,17,0.07) 0%, rgba(17,17,17,0.03) 100%)",
                  border: "1px solid rgba(17,17,17,0.08)",
                  fontSize: "1rem",
                  flexShrink: 0,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                }}
              >
                🩺
              </span>

              <div
                style={{
                  fontSize: "1.02rem",
                  fontWeight: 800,
                  color: "#111111",
                  letterSpacing: "-0.015em",
                  lineHeight: 1.2,
                }}
              >
                Ordonnance / conduite de prescription
              </div>
            </div>

            <div
              style={{
                fontSize: "0.76rem",
                color: "rgba(17,17,17,0.48)",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              Prescription
            </div>
          </div>

          <div style={{ padding: "20px 20px 22px 20px" }}>
            {rxMetaBlock && (
              <div
                style={{
                  margin: "0 0 18px 0",
                  padding: "0 0 18px 0",
                  borderBottom: "1px solid rgba(17,17,17,0.08)",
                  lineHeight: 1.8,
                  fontSize: "0.96rem",
                  color: "rgba(17,17,17,0.9)",
                }}
              >
                {renderLisaMultilineText(rxMetaBlock.content)}
              </div>
            )}

            {rxBlock && (
              <div
                style={{
                  margin: "0 0 18px 0",
                  lineHeight: 1.84,
                  fontSize: "0.98rem",
                  color: "#111111",
                }}
              >
                {renderLisaMultilineText(rxBlock.content)}
              </div>
            )}

            {rxNotesBlock && (
              <div
                style={{
                  margin: "2px 0 0 0",
                  padding: "16px 18px",
                  borderRadius: "18px",
                  background: "linear-gradient(180deg, rgba(17,17,17,0.035) 0%, rgba(17,17,17,0.02) 100%)",
                  border: "1px solid rgba(17,17,17,0.06)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
                  lineHeight: 1.84,
                  fontSize: "0.95rem",
                }}
              >
                {renderLisaMultilineText(rxNotesBlock.content)}
              </div>
            )}
          </div>
        </div>

        {trailingParagraphs.map((block, index) => (
          <p key={`rx-trailing-${index}`} style={{ margin: "0 0 12px 0", lineHeight: 1.7 }}>
            {renderLisaMultilineText(block.content)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div data-lisa-format={parsed.format}>
      {parsed.blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} style={{ margin: "0 0 12px 0", lineHeight: 1.65 }}>
              {renderLisaMultilineText(block.content)}
            </p>
          );
        }

        if (block.type === "title") {
          return (
            <div
              key={index}
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                margin: "0 0 12px 0",
                lineHeight: 1.35,
              }}
            >
              {renderLisaMultilineText(block.content)}
            </div>
          );
        }

        if (block.type === "list" || block.type === "key_points") {
          return (
            <div
              key={index}
              style={{
                margin: "0 0 14px 0",
                padding: "12px 14px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} style={{ marginBottom: itemIndex < block.items.length - 1 ? 8 : 0 }}>
                    {renderLisaInlineText(item)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (block.type === "section") {
          return (
            <div key={index} style={{ margin: "0 0 16px 0" }}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                {renderLisaInlineText(block.title)}
              </div>
              <div style={{ lineHeight: 1.65 }}>
                {renderLisaMultilineText(block.content)}
              </div>
            </div>
          );
        }

        if (block.type === "report_header") {
          return (
            <div key={index} className={styles.lisaReportHero}>
              <div className={styles.lisaReportHeroInner}>
                <div className={styles.lisaReportHeroBadge}>
                  <span className={styles.lisaReportHeroBadgeIcon}>📌</span>
                  <span className={styles.lisaReportHeroBadgeText}>Résumé exécutif</span>
                </div>

                <div className={styles.lisaReportHeroBody}>
                  {renderLisaMultilineText(block.content)}
                </div>
              </div>
            </div>
          );
        }

        if (block.type === "next_step") {
          return (
            <div
              key={index}
              data-lisa-block="next-step"
              style={{
                margin: "20px 0 18px 0",
                padding: "16px 18px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
                lineHeight: 1.75,
              }}
            >
              {renderLisaMultilineText(block.content)}
            </div>
          );
        }

        if (block.type === "rx_meta" || block.type === "rx" || block.type === "rx_notes") {
          return null;
        }

        return null;
      })}
    </div>
  );
}

export default function DashboardChatPage() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasBootstrappedIntro, setHasBootstrappedIntro] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const {
    isSupported: isAudioRecorderSupported,
    status: recorderStatus,
    error: recorderError,
    durationMs: recorderDurationMs,
    audioBlob,
    audioUrl,
    isArming,
    isRecording,
    start: startRecording,
    cancel: cancelRecording,
    confirm: confirmRecording,
  } = useAudioRecorder({
    armDelayMs: 2000,
  });

  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingAudioDurationMs, setPendingAudioDurationMs] = useState(0);
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [isAudioTranscribing, setIsAudioTranscribing] = useState(false);
  const [audioTranscriptionError, setAudioTranscriptionError] = useState<string | null>(null);
  const [publicUserId, setPublicUserId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [chatContextLoaded, setChatContextLoaded] = useState(false);
  

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const introBootstrapStartedRef = useRef(false);
  const streamedMessageIdsRef = useRef<Set<string>>(new Set());
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const messagesStateRef = useRef<Message[]>([]);
  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    let cancelled = false;
  
    async function loadChatContext() {
      try {
        // mode dev local conservé
        if (DEV_PUBLIC_USER_ID && DEV_CONVERSATION_ID) {
          if (cancelled) return;
          setPublicUserId(DEV_PUBLIC_USER_ID);
          setConversationId(DEV_CONVERSATION_ID);
          return;
        }
  
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
  
        if (authError) throw authError;
        if (!authUser) throw new Error("AUTH_USER_NOT_FOUND");
  
        const { data: userRow, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", authUser.id)
          .single();
  
        if (userError || !userRow?.id) {
          throw userError ?? new Error("PUBLIC_USER_NOT_FOUND");
        }
  
        const { data: conversationRow, error: conversationError } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", userRow.id)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();
  
        if (conversationError || !conversationRow?.id) {
          throw conversationError ?? new Error("CONVERSATION_NOT_FOUND");
        }
  
        if (cancelled) return;
  
        setPublicUserId(userRow.id);
        setConversationId(conversationRow.id);
      } catch (error) {
        console.error("[HL Chat] context load error:", error);
      } finally {
        if (!cancelled) {
          setChatContextLoaded(true);
        }
      }
    }
  
    loadChatContext();
  
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const isSending = status === "connecting" || status === "streaming";
  const isVoiceBusy = isArming || isRecording;
  const composerValue = input.trim().length > 0 ? input : "";
  const hasText = composerValue.trim().length > 0;
  const isSendActive = hasText && !isSending && !isVoiceBusy;
  const shouldShowInitialThinking =
    !historyLoaded &&
    messages.length === 0 &&
    !hasBootstrappedIntro;

  function autoResizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  function scrollChatToBottom() {
    const el = messagesRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }

  function upsertStreamingLisaMessage(
    messageId: string,
    patch: Partial<LisaMessage> & { id?: string }
  ) {
    setMessages((prev) => {
      const currentIndex = prev.findIndex(
        (msg) => msg.id === messageId && msg.sender === "lisa"
      );

      const targetId = patch.id ?? messageId;

      const existingTargetIndex = prev.findIndex(
        (msg) => msg.id === targetId && msg.sender === "lisa"
      );

      if (currentIndex === -1) {
        if (existingTargetIndex !== -1) {
          const existing = prev[existingTargetIndex];
          if (existing.sender !== "lisa") return prev;

          const merged: LisaMessage = {
            ...existing,
            ...patch,
            id: targetId,
            text: patch.text ?? existing.text,
            time: patch.time ?? existing.time,
            status: patch.status ?? existing.status,
          };

          const clone = [...prev];
          clone[existingTargetIndex] = merged;
          return clone;
        }

        const newMessage: LisaMessage = {
          id: targetId,
          sender: "lisa",
          text: patch.text ?? "",
          time: patch.time ?? "",
          status: patch.status ?? "streaming",
        };

        return [...prev, newMessage];
      }

      const current = prev[currentIndex];
      if (current.sender !== "lisa") return prev;

      const updated: LisaMessage = {
        ...current,
        ...patch,
        id: targetId,
        text: patch.text ?? current.text,
        time: patch.time ?? current.time,
        status: patch.status ?? current.status,
      };

      const clone = [...prev];

      if (existingTargetIndex !== -1 && existingTargetIndex !== currentIndex) {
        clone[currentIndex] = updated;
        const deduped = clone.filter(
          (msg, index) =>
            !(
              index === existingTargetIndex &&
              msg.sender === "lisa" &&
              msg.id === targetId
            )
        );
        return deduped;
      }

      clone[currentIndex] = updated;
      return clone;
    });
  }

  const upsertFinalMessageFromDb = useCallback((dbMessage: {
    id: string;
    role: string;
    sender_type: string;
    content: string;
    sent_at: string | null;
  }) => {
    const mapped = mapDbMessagesToUi([dbMessage])[0];
    if (!mapped) return;

    setMessages((prev) => {
      const alreadyExists = prev.some((msg) => msg.id === mapped.id);
      if (alreadyExists) {
        return prev.map((msg) => (msg.id === mapped.id ? mapped : msg));
      }

      return [...prev, mapped];
    });
  }, []);

  function appendLisaDelta(messageId: string, delta: string) {
    setMessages((prev) => {
      const index = prev.findIndex((msg) => msg.id === messageId && msg.sender === "lisa");

      if (index === -1) {
        return [
          ...prev,
          {
            id: messageId,
            sender: "lisa",
            text: delta,
            time: "",
            status: "streaming",
          },
        ];
      }

      const current = prev[index];
      if (current.sender !== "lisa") return prev;

      const clone = [...prev];
      clone[index] = {
        ...current,
        text: current.text + delta,
        status: "streaming",
      };
      return clone;
    });
  }

  async function playTypingEffect(
    messageId: string,
    finalText: string,
    finalMessageId?: string
  ) {
    const text = String(finalText || "");
    if (!text) {
      upsertStreamingLisaMessage(messageId, {
        id: finalMessageId ?? messageId,
        text: "",
        time: getCurrentTime(),
        status: "final",
      });
      return;
    }
  
    const totalLength = text.length;
  
    // vitesse adaptative : rapide, mais pas brutale
    let step = 2;
    let delay = 26;
    
    if (totalLength > 220) {
      step = 3;
      delay = 20;
    }
    
    if (totalLength > 420) {
      step = 4;
      delay = 16;
    }
  
    let current = 0;
  
    while (current < totalLength) {
      current = Math.min(current + step, totalLength);
  
      upsertStreamingLisaMessage(messageId, {
        text: text.slice(0, current),
        status: "typing",
      });
  
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
  
    upsertStreamingLisaMessage(messageId, {
      id: finalMessageId ?? messageId,
      text,
      time: getCurrentTime(),
      status: "final",
    });
  }

  async function handleStreamEvent(
    event: SseEvent,
    streamingMessageId: string,
    onDone?: () => void
  ) {
    const isIntroMessage = streamingMessageId === INTRO_STREAMING_ID;
  
    if (event.event === "ack") {
      setStatus("connecting");
      return;
    }
  
    if (event.event === "meta") {
      upsertStreamingLisaMessage(streamingMessageId, {
        status: isIntroMessage ? "thinking" : "streaming",
        text: "",
        time: "",
      });
      setStatus("streaming");
      return;
    }
  
    if (event.event === "delta") {
      if (isIntroMessage) {
        return;
      }
    
      streamedMessageIdsRef.current.add(streamingMessageId);
      appendLisaDelta(streamingMessageId, String(event.data?.text ?? ""));
      setStatus("streaming");
      return;
    }
  
    if (event.event === "done") {
      const assistantMessage = event.data?.assistant_message ?? {};
      const finalId = assistantMessage.id ?? streamingMessageId;
      const finalText = String(assistantMessage.content ?? "");
      const hadRealStream = streamedMessageIdsRef.current.has(streamingMessageId);
    
      const finalizeUi = () => {
        streamedMessageIdsRef.current.delete(streamingMessageId);
        setStatus("idle");
        onDone?.();
    
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      };
    
      if (isIntroMessage) {
        upsertStreamingLisaMessage(streamingMessageId, {
          id: finalId,
          text: "",
          time: "",
          status: "typing",
        });
    
        await playIntroTypingEffect(
          finalText,
          (partialText) => {
            upsertStreamingLisaMessage(streamingMessageId, {
              id: finalId,
              text: partialText,
              time: "",
              status: "typing",
            });
          },
          () => {
            upsertStreamingLisaMessage(streamingMessageId, {
              id: finalId,
              text: finalText,
              time: getCurrentTime(),
              status: "final",
            });
          }
        );
    
        finalizeUi();
        return;
      }
    
      if (hadRealStream) {
        upsertStreamingLisaMessage(streamingMessageId, {
          id: finalId,
          text: finalText,
          time: getCurrentTime(),
          status: "final",
        });
    
        finalizeUi();
        return;
      }
    
      upsertStreamingLisaMessage(streamingMessageId, {
        id: finalId,
        text: "",
        time: "",
        status: "typing",
      });
    
      await playTypingEffect(streamingMessageId, finalText, finalId);
      finalizeUi();
      return;
    }
  
    if (event.event === "error") {
      streamedMessageIdsRef.current.delete(streamingMessageId);
    
      upsertStreamingLisaMessage(streamingMessageId, {
        text: "Je n’ai pas pu répondre pour le moment. Réessaie dans un instant.",
        time: getCurrentTime(),
        status: "final",
      });
      setStatus("error");
    
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }

  async function bootstrapIntro() {
    if (!conversationId) {
      console.error("[HL Chat] Missing conversationId");
      return;
    }
  
    const streamingMessageId = INTRO_STREAMING_ID;
  
    setMessages((prev) => {
      const alreadyExists = prev.some((msg) => msg.id === streamingMessageId);
      if (alreadyExists) return prev;
  
      return [
        ...prev,
        {
          id: streamingMessageId,
          sender: "lisa",
          text: "",
          time: "",
          status: "thinking",
        },
      ];
    });
  
    try {
      setStatus("connecting");

      await streamChatIntro(conversationId, async (event) => {
        await handleStreamEvent(event, streamingMessageId, () => {
          setHasBootstrappedIntro(true);
        });
      });

      setHasBootstrappedIntro(true);
    } catch (error) {
      console.error("[HL Chat] intro stream error:", error);

      upsertStreamingLisaMessage(streamingMessageId, {
        text: "Je n’ai pas pu envoyer mon message d’accueil pour le moment.",
        time: getCurrentTime(),
        status: "final",
      });

      setStatus("error");
      setHasBootstrappedIntro(true);
    }
  }

  useEffect(() => {
    async function loadHistory() {
      if (!chatContextLoaded) return;
  
      if (!conversationId) {
        console.error("[HL Chat] Missing conversationId");
        setHistoryLoaded(true);
        return;
      }

      try {
        const dbMessages = await fetchChatHistory(conversationId);
        const uiMessages = mapDbMessagesToUi(dbMessages);
      
        setMessages(uiMessages);
      
        if (uiMessages.length > 0) {
          setHasBootstrappedIntro(true);
        }
      } catch (error) {
        console.error("[HL Chat] history load error:", error);
      } finally {
        setHistoryLoaded(true);
      }
    }

    loadHistory();
  }, [chatContextLoaded, conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
    .channel(`chat-conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (
          payload: {
            new: {
              id: string;
              role: string;
              sender_type: string;
              content: string;
              sent_at: string | null;
            };
          }
        ) => {
          const row = payload.new;
          const isLisa = row.role === "assistant" || row.sender_type === "lisa";
    
          const hasActiveLocalLisaPlaceholder = messagesStateRef.current.some(
            (msg) =>
              msg.sender === "lisa" &&
              (
                msg.status === "thinking" ||
                msg.status === "typing" ||
                msg.status === "streaming"
              )
          );
    
          if (isLisa && hasActiveLocalLisaPlaceholder) {
            console.log("[HL Chat realtime] skip lisa insert during local stream:", row.id);
            return;
          }
    
          upsertFinalMessageFromDb(row);
    
          if (isLisa && !isPageVisibleRef.current) {
            triggerLisaNotification(row.content ?? "");
          }
        }
      )
      .subscribe((status: string) => {
        console.log("[HL Chat realtime] status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, upsertFinalMessageFromDb, conversationId]);

  useEffect(() => {
    if (!chatContextLoaded) return;
    if (!historyLoaded) return;
    if (hasBootstrappedIntro) return;
    if (messages.length > 0) return;
    if (introBootstrapStartedRef.current) return;

    introBootstrapStartedRef.current = true;
    bootstrapIntro();
  }, [historyLoaded, hasBootstrappedIntro, messages.length]);

  useEffect(() => {
    autoResizeTextarea();
  }, [input]);

  useEffect(() => {
    scrollChatToBottom();
  }, [messages]);

  useEffect(() => {
    knownMessageIdsRef.current = new Set(messages.map((msg) => msg.id));
    messagesStateRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
  
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          console.log("[HL Notif] permission:", permission);
        });
      }
    }
  }, []);

  const isPageVisibleRef = useRef(true);

  useEffect(() => {
    function handleVisibilityChange() {
      isPageVisibleRef.current = document.visibilityState === "visible";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);


  const [, forceRecorderTick] = useState(0);

  useEffect(() => {
    if (!isRecording) return;

    const interval = window.setInterval(() => {
      forceRecorderTick((prev) => prev + 1);
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    if (recorderStatus !== "review") return;
    if (!audioUrl || !audioBlob) return;
  
    setPendingAudioUrl(audioUrl);
    setPendingAudioBlob(audioBlob);
    setPendingAudioDurationMs(recorderDurationMs);
    setAudioTranscriptionError(null);
  }, [recorderStatus, audioUrl, audioBlob, recorderDurationMs]);

  useEffect(() => {
    if (!pendingAudioUrl || !pendingAudioBlob) return;
    if (isAudioTranscribing) return;
  
    handleTranscribePendingAudio();
  }, [pendingAudioUrl, pendingAudioBlob]);

  const sendIconSrc = useMemo(() => {
    return isSendActive ? SEND_ON : SEND_OFF;
  }, [isSendActive]);

  async function handleSendMessage() {
    const text = input.trim();

    if (!text || isSending) return;
    if (!publicUserId || !conversationId) {
      console.error("[HL Chat] Missing publicUserId or conversationId");
      return;
    }

    const userMessageUiId = generateId("user");
    const streamingMessageId = `${MAIN_STREAMING_PREFIX}-${Date.now()}`;

    const userMessage: Message = {
      id: userMessageUiId,
      sender: "user",
      text,
      time: getCurrentTime(),
    };

    const lisaThinkingMessage: LisaMessage = {
      id: streamingMessageId,
      sender: "lisa",
      text: "",
      time: "",
      status: "thinking",
    };

    setMessages((prev) => [...prev, userMessage, lisaThinkingMessage]);
    setInput("");
    setStatus("connecting");

    try {
      const inserted = await insertUserMessage({
        conversationId,
        publicUserId,
        text,
      });

      await streamChatMessage(
        conversationId,
        inserted.id,
        async (event) => {
          await handleStreamEvent(event, streamingMessageId);
        }
      );

      if (status !== "error") {
        setStatus("idle");
      }
    } catch (error) {
      console.error("[HL Chat] send error:", error);

      upsertStreamingLisaMessage(streamingMessageId, {
        text: "Je n’ai pas pu répondre pour le moment. Réessaie dans un instant.",
        time: getCurrentTime(),
        status: "final",
      });

      setStatus("error");

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSendMessage();
  }

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function formatRecorderDuration(durationMs: number) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function handleConfirmRecording() {
    if (!isRecording) return;
    confirmRecording();
  }

  function handleDiscardPendingAudio() {
    setPendingAudioUrl(null);
    setPendingAudioBlob(null);
    setPendingAudioDurationMs(0);
    setAudioTranscriptionError(null);
    setIsAudioTranscribing(false);
  }

  async function handleTranscribePendingAudio() {
    if (!pendingAudioBlob) return;
    if (isAudioTranscribing) return;
  
    try {
      setIsAudioTranscribing(true);
      setAudioTranscriptionError(null);
  
      const formData = new FormData();
      formData.append("file", pendingAudioBlob, "voice-message.webm");
  
      const response = await fetch("/api/chat/transcribe", {
        method: "POST",
        body: formData,
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "AUDIO_TRANSCRIPTION_FAILED");
      }
  
      const transcript = String(payload?.text ?? "").trim();
  
      if (!transcript) {
        throw new Error("EMPTY_AUDIO_TRANSCRIPTION");
      }
  
      setInput((prev) => {
        const base = prev.trim();
        return base ? `${base} ${transcript}` : transcript;
      });
  
      setPendingAudioUrl(null);
      setPendingAudioBlob(null);
      setPendingAudioDurationMs(0);
      setAudioTranscriptionError(null);
  
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    } catch (error) {
      console.error("[HL Chat] audio transcription error:", error);
      setAudioTranscriptionError("Impossible de transcrire l’audio pour le moment.");
    } finally {
      setIsAudioTranscribing(false);
    }
  }

  async function handleStartRecording() {
    if (isSending) return;
    await startRecording();
  }

  


  return (
    <div className={styles.chatView}>
      <aside className={styles.chatSidebar}>
        <div className={styles.chatSidebarInner}>
          <div className={styles.chatSidebarHeader}>
            <h2 className={styles.chatSidebarTitle}>Chat</h2>
          </div>

          <div className={styles.chatSidebarSection}>
            <div className={styles.chatSidebarLabel}>Canaux</div>

            <a href="#" className={styles.chatRoom}>
              <span className={styles.chatRoomIcon}>
                <span className={styles.chatRoomHash}>#</span>
              </span>
              <span className={styles.chatRoomName}>Général</span>
            </a>

            <button className={styles.chatSidebarAction} type="button">
              <span className={styles.chatRoomPlus}>＋</span>
              <span>Ajouter un canal</span>
            </button>
          </div>

          <div className={`${styles.chatSidebarSection} ${styles.chatSidebarSectionPrivate}`}>
            <div className={styles.chatSidebarLabel}>Messages privés</div>

            <a href="#" className={`${styles.chatRoom} ${styles.chatRoomSelected}`}>
              <span className={`${styles.chatUserAvatar} ${styles.isOnline}`}>
                <img src={LISA_AVATAR} alt="Lisa" />
              </span>
              <span className={styles.chatRoomName}>Lisa</span>
            </a>

            <button className={styles.chatSidebarAction} type="button">
              <span className={styles.chatRoomPlus}>＋</span>
              <span>Nouveau message</span>
            </button>
          </div>
        </div>
      </aside>

      <section className={styles.chatMain}>
      <div className={styles.chatMessages} id="hlChatMessages" ref={messagesRef}>
        <div className={styles.chatDaySeparator}>
          <span className={styles.chatDayLine} />
          <span className={styles.chatDayPill}>Aujourd’hui</span>
          <span className={styles.chatDayLine} />
        </div>

        {shouldShowInitialThinking && (
          <div className={styles.chatMessage}>
            <div className={styles.chatMessageRow}>
              <div className={styles.chatMessageAvatar}>
                <img src={LISA_AVATAR} alt="Lisa" />
              </div>

              <div className={styles.chatMessageContent}>
                <div className={styles.chatMessageMeta}>
                  <span className={styles.chatMessageAuthor}>Lisa</span>
                  <span className={styles.chatMessageTime}>…</span>
                </div>

                <div className={styles.chatThinking}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        )}

          {messages.map((message) => {
            if (message.sender === "user") {
              return (
                <div key={message.id} className={styles.chatMessageUser}>
                  <div className={styles.chatUserBubble}>
                    <div className={styles.chatUserText}>{message.text}</div>
                    <div className={styles.chatUserTime}>{message.time}</div>
                  </div>
                </div>
              );
            }

            const isStreaming = message.status === "streaming";
            const isThinking = message.status === "thinking";
            const isTyping = message.status === "typing";

            return (
              <div key={message.id} className={styles.chatMessage}>
                <div className={styles.chatMessageRow}>
                  <div className={styles.chatMessageAvatar}>
                    <img src={LISA_AVATAR} alt="Lisa" />
                  </div>

                  <div className={styles.chatMessageContent}>
                    <div className={styles.chatMessageMeta}>
                      <span className={styles.chatMessageAuthor}>Lisa</span>
                      <span className={styles.chatMessageTime}>
                        {message.time || (isStreaming || isThinking || isTyping ? "…" : "")}
                      </span>
                    </div>

                    <div className={styles.chatMessageText}>
                      {renderLisaMessageContent(message.text)}
                    </div>

                    {(isThinking || (isStreaming && message.text.length === 0)) && (
                      <div className={styles.chatThinking}>
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.chatComposerWrap}>
          <form className={styles.chatComposer} onSubmit={handleSubmit}>
            <div className={styles.chatComposerInner}>
            {(isArming || isRecording) ? (
              <div className={styles.voiceRecordingBar}>
                <button
                  type="button"
                  className={styles.voiceRecordingGhostBtn}
                  onClick={cancelRecording}
                  aria-label="Annuler l’enregistrement"
                >
                  ✕
                </button>

                <div className={styles.voiceRecordingCenter}>
                  <div className={styles.voiceRecordingTimer}>
                    {isArming ? "00:00" : formatRecorderDuration(recorderDurationMs)}
                  </div>

                  <div className={styles.voiceRecordingHint}>
                    {isArming ? "Prépare-toi à parler…" : "Enregistrement en cours"}
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.voiceRecordingConfirmBtn}
                  onClick={handleConfirmRecording}
                  aria-label="Valider l’enregistrement"
                  disabled={!isRecording}
                >
                  ✓
                </button>
              </div>
            ) : pendingAudioUrl ? (
              <div className={styles.voicePendingBar}>
                <button
                  type="button"
                  className={styles.voicePendingPlayBtn}
                  aria-label={
                    isAudioTranscribing ? "Transcription en cours" : "Lire l’audio"
                  }
                  disabled={isAudioTranscribing}
                >
                  {isAudioTranscribing ? (
                    <span className={styles.voicePendingInlineSpinner} />
                  ) : (
                    "▶"
                  )}
                </button>

                <div className={styles.voicePendingWaveWrap}>
                  <div className={styles.voicePendingWave} />
                  {isAudioTranscribing && (
                    <div className={styles.voicePendingInlineText}>
                      Transcription en cours…
                    </div>
                  )}
                </div>

                <div className={styles.voicePendingMeta}>
                  {formatRecorderDuration(pendingAudioDurationMs)}
                </div>

                <button
                  type="button"
                  className={styles.voicePendingDeleteBtn}
                  onClick={handleDiscardPendingAudio}
                  aria-label="Supprimer l’audio"
                  disabled={isAudioTranscribing}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.chatPlusBtn}
                  aria-label="Ajouter une pièce jointe"
                >
                  <span className={styles.chatPlusIcon} />
                </button>

                <div className={styles.chatInputWrap}>
                  <textarea
                    id="hlChatInput"
                    ref={textareaRef}
                    className={styles.chatInput}
                    placeholder="Posez une question, créez, recherchez, @ pour mentionner"
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      if (isVoiceBusy) return;
                      setInput(e.target.value);
                    }}
                    disabled={isSending || isVoiceBusy || isAudioTranscribing}
                    onKeyDown={handleTextareaKeyDown}
                  />
                </div>

                <div className={styles.chatComposerActions}>
                  <button
                    type="button"
                    className={styles.chatMicBtn}
                    aria-label={
                      !isAudioRecorderSupported
                        ? "Enregistrement vocal non disponible"
                        : isVoiceBusy
                        ? "Enregistrement en cours"
                        : "Enregistrer un message vocal"
                    }
                    onClick={handleStartRecording}
                    disabled={!isAudioRecorderSupported || isSending || isVoiceBusy || isAudioTranscribing}
                    title={
                      !isAudioRecorderSupported
                        ? "Enregistrement vocal non disponible sur ce navigateur"
                        : isVoiceBusy
                        ? "Enregistrement en cours"
                        : "Enregistrer un message vocal"
                    }
                  >
                    <img
                      src="/imgs/mic-notes.png"
                      alt=""
                      style={{
                        opacity: !isAudioRecorderSupported || isSending || isAudioTranscribing ? 0.35 : 1,
                        filter:
                          isArming || isRecording
                            ? "brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(3280%) hue-rotate(343deg) brightness(103%) contrast(93%)"
                            : "none",
                      }}
                    />
                  </button>

                  <button
                    type="submit"
                    id="hlChatSendBtn"
                    className={`${styles.chatSendBtn} ${isSendActive ? styles.isActive : styles.isDisabled}`}
                    aria-label="Envoyer"
                    disabled={!isSendActive}
                  >
                    <img id="hlChatSendIcon" src={sendIconSrc} alt="" />
                  </button>
                </div>
              </>
            )}
            </div>
          </form>
          {audioTranscriptionError && (
            <div className={styles.voicePendingError}>
              {audioTranscriptionError}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}