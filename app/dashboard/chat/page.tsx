"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type ChatStatus = "idle" | "sending" | "error";

type Message =
  | {
      id: string;
      sender: "lisa";
      text: string;
      time: string;
      isThinking?: false;
    }
  | {
      id: string;
      sender: "lisa";
      text: "";
      time: "";
      isThinking: true;
    }
  | {
      id: string;
      sender: "user";
      text: string;
      time: string;
    };

const SEND_OFF = "/imgs/sendmsg-off.png";
const SEND_ON = "/imgs/sendmsg-on.png";
const LISA_AVATAR = "/imgs/Lisa_Avatar-min.webp";

function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function DashboardChatPage() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId("lisa"),
      sender: "lisa",
      text: "Bonjour Brice. Je suis prête.\nOn commence quand tu veux.",
      time: "7:15 PM",
    },
  ]);

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isSending = status === "sending";
  const hasText = input.trim().length > 0;
  const isSendActive = hasText && !isSending;

  async function sendMessageToLisa(text: string) {
    // MOCK TEMPORAIRE
    // On remplacera uniquement ce bloc par le vrai fetch backend
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
      ok: true,
      message: `Bien reçu : ${text}`,
    };
  }

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

  useEffect(() => {
    autoResizeTextarea();
  }, [input]);

  useEffect(() => {
    scrollChatToBottom();
  }, [messages]);

  const sendIconSrc = useMemo(() => {
    return isSendActive ? SEND_ON : SEND_OFF;
  }, [isSendActive]);

  async function handleSendMessage() {
    const text = input.trim();

    if (!text || isSending) return;

    const userMessage: Message = {
      id: generateId("user"),
      sender: "user",
      text,
      time: getCurrentTime(),
    };

    const thinkingMessage: Message = {
      id: generateId("thinking"),
      sender: "lisa",
      text: "",
      time: "",
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput("");
    setStatus("sending");

    try {
      const result = await sendMessageToLisa(text);

      if (!result?.ok || !result?.message) {
        throw new Error("Invalid Lisa response");
      }

      const lisaMessage: Message = {
        id: generateId("lisa"),
        sender: "lisa",
        text: result.message,
        time: getCurrentTime(),
      };

      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => !("isThinking" in msg && msg.isThinking));
        return [...withoutThinking, lisaMessage];
      });

      setStatus("idle");

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    } catch (error) {
      console.error("[HL Chat] send error:", error);

      const fallbackMessage: Message = {
        id: generateId("lisa"),
        sender: "lisa",
        text: "Je n’ai pas pu répondre pour le moment. Réessaie dans un instant.",
        time: getCurrentTime(),
      };

      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => !("isThinking" in msg && msg.isThinking));
        return [...withoutThinking, fallbackMessage];
      });

      setStatus("idle");

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
            <span className={styles.chatDayPill}>vendredi, mars 6</span>
            <span className={styles.chatDayLine} />
          </div>

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

            if ("isThinking" in message && message.isThinking) {
              return (
                <div key={message.id} className={styles.chatMessage}>
                  <div className={styles.chatMessageRow}>
                    <div className={styles.chatMessageAvatar}>
                      <img src={LISA_AVATAR} alt="Lisa" />
                    </div>

                    <div className={styles.chatMessageContent}>
                      <div className={styles.chatMessageMeta}>
                        <span className={styles.chatMessageAuthor}>Lisa</span>
                      </div>

                      <div className={styles.chatThinking}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className={styles.chatMessage}>
                <div className={styles.chatMessageRow}>
                  <div className={styles.chatMessageAvatar}>
                    <img src={LISA_AVATAR} alt="Lisa" />
                  </div>

                  <div className={styles.chatMessageContent}>
                    <div className={styles.chatMessageMeta}>
                      <span className={styles.chatMessageAuthor}>Lisa</span>
                      <span className={styles.chatMessageTime}>{message.time}</span>
                    </div>

                    <div className={styles.chatMessageText}>
                      {message.text.split("\n").map((line, index) => (
                        <span key={`${message.id}-${index}`}>
                          {line}
                          {index < message.text.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.chatComposerWrap}>
          <form className={styles.chatComposer} onSubmit={handleSubmit}>
            <div className={styles.chatComposerInner}>
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
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  disabled={isSending}
                />
              </div>

              <div className={styles.chatComposerActions}>
                <button
                  type="button"
                  className={styles.chatMicBtn}
                  aria-label="Message vocal"
                >
                  <img src="/imgs/mic-notes.png" alt="" />
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
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}