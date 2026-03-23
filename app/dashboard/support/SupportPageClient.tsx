"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

function generateBookingToken() {
  return `support_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

type SupportAppointment = {
  id: string;
  event_name: string | null;
  status: string;
  scheduled_at: string | null;
  end_at: string | null;
  timezone: string | null;
  cancel_url: string | null;
  reschedule_url: string | null;
  calendly_event_uri: string | null;
  calendly_invitee_uri: string | null;
};

function formatAppointmentDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function isFutureAppointment(value: string | null) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() > Date.now();
}

export default function SupportPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointment, setAppointment] = useState<SupportAppointment | null>(null);
  const [isLoadingAppointment, setIsLoadingAppointment] = useState(true);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [bookingToken, setBookingToken] = useState<string | null>(null);

  const ACTIVE_APPOINTMENT_STATUSES = new Set(["scheduled", "confirmed"]);

  const hasConfirmedAppointment =
    appointment !== null &&
    ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
    isFutureAppointment(appointment.scheduled_at);

  const calendlyRef = useRef<HTMLDivElement | null>(null);
  const selectedDateTimeRef = useRef<{
    scheduledAt: string | null;
    endAt: string | null;
    timezone: string | null;
  } | null>(null);

  async function handleOpenModal() {
    try {
      const token = generateBookingToken();
      console.log("[HL Support] bookingToken:", token);
  
      const response = await fetch("/api/support/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_token: token,
          status: "pending",
          event_name: "Accompagnement personnalisé",
          raw_payload: {
            source: "support_modal_open",
            created_from: "webapp",
          },
        }),
      });
  
      const payload = await response.json();
  
      if (!response.ok || !payload?.ok || !payload?.appointment) {
        throw new Error(payload?.error || "Failed to initialize support appointment");
      }
  
      setBookingToken(token);
      setIsModalOpen(true);
    } catch (error) {
      console.error("[HL Support] open modal init error:", error);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadAppointment() {
      try {
        setIsLoadingAppointment(true);

        const response = await fetch("/api/support/appointments", {
          method: "GET",
          cache: "no-store",
        });

        const payload = await response.json();

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to load support appointment");
        }

        if (!isCancelled) {
          setAppointment(payload.appointment ?? null);
        }
      } catch (error) {
        console.error("[HL Support] load appointment error:", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingAppointment(false);
        }
      }
    }

    loadAppointment();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;

    let isCancelled = false;

    function initCalendly() {
      if (isCancelled) return;
      if (!calendlyRef.current) return;
      // @ts-ignore
      if (!window.Calendly) return;

      calendlyRef.current.innerHTML = "";

      // @ts-ignore
      window.Calendly.initInlineWidget({
        url: "https://calendly.com/quick-help-lisa/20min?hide_gdpr_banner=1",
        parentElement: calendlyRef.current,
        resize: true,
      });
    }

    const existingScript = document.querySelector(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      // @ts-ignore
      if (window.Calendly) {
        initCalendly();
      } else {
        existingScript.addEventListener("load", initCalendly, { once: true });
      }
    } else {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = initCalendly;
      document.body.appendChild(script);
    }

    return () => {
      isCancelled = true;
      if (calendlyRef.current) {
        calendlyRef.current.innerHTML = "";
      }
    };
  }, [isModalOpen]);

  useEffect(() => {
    async function handleCalendlyMessage(event: MessageEvent) {
      if (event.origin !== "https://calendly.com") return;
      if (!event?.data?.event || typeof event.data.event !== "string") return;
      if (!event.data.event.startsWith("calendly.")) return;
  
      const calendlyEventName = event.data.event;
      const payload = event.data.payload ?? {};
  
      // Debug utile tant qu’on stabilise l’intégration
      console.log("[HL Support][Calendly event]", calendlyEventName, payload);
  
      if (calendlyEventName === "calendly.date_and_time_selected") {
        selectedDateTimeRef.current = {
          scheduledAt:
            String(
              payload?.start_time ??
                payload?.event_start_time ??
                payload?.invitee_start_time ??
                ""
            ).trim() || null,
          endAt:
            String(
              payload?.end_time ??
                payload?.event_end_time ??
                payload?.invitee_end_time ??
                ""
            ).trim() || null,
          timezone:
            String(payload?.timezone ?? payload?.invitee_timezone ?? "").trim() || null,
        };
  
        return;
      }
  
      if (calendlyEventName !== "calendly.event_scheduled") return;
  
      try {
        setIsSavingAppointment(true);
  
        const invitee = payload.invitee ?? {};
        const calendlyEvent = payload.event ?? {};
        const selectedSlot = selectedDateTimeRef.current;
  
        const scheduledAt =
          String(
            payload?.scheduled_at ??
              payload?.start_time ??
              invitee?.start_time ??
              selectedSlot?.scheduledAt ??
              ""
          ).trim();
  
        const endAt =
          String(
            payload?.end_at ??
              payload?.end_time ??
              invitee?.end_time ??
              selectedSlot?.endAt ??
              ""
          ).trim() || null;
  
        const timezone =
          String(
            payload?.timezone ??
              invitee?.timezone ??
              selectedSlot?.timezone ??
              ""
          ).trim() || null;
  
        const response = await fetch("/api/support/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            calendly_event_uri: String(calendlyEvent.uri ?? "").trim(),
            calendly_invitee_uri: String(invitee.uri ?? "").trim(),
            event_name: String(calendlyEvent.name ?? "").trim() || "Accompagnement personnalisé",
            status: "scheduled",
            scheduled_at: scheduledAt,
            end_at: endAt,
            timezone,
            cancel_url: String(invitee.cancel_url ?? "").trim() || null,
            reschedule_url: String(invitee.reschedule_url ?? "").trim() || null,
            raw_payload: payload,
          }),
        });
  
        const savePayload = await response.json();
  
        if (!response.ok || !savePayload?.ok || !savePayload?.appointment) {
          throw new Error(savePayload?.error || "Failed to save appointment");
        }
  
        setAppointment(savePayload.appointment);
        setIsModalOpen(false);
        selectedDateTimeRef.current = null;
      } catch (error) {
        console.error("[HL Support] calendly save error:", error);
      } finally {
        setIsSavingAppointment(false);
      }
    }
  
    window.addEventListener("message", handleCalendlyMessage);
  
    return () => {
      window.removeEventListener("message", handleCalendlyMessage);
    };
  }, []);

  if (isLoadingAppointment) {
    return (
      <div className={styles.supportView}>
        <div className={styles.supportShell}>
          <div className={styles.supportEmptyState}>
            <img
              src="/imgs/Lisa_Avatar-min.webp"
              alt="Lisa"
              className={styles.supportAvatar}
            />

            <h1 className={styles.supportTitle}>
              Chargement du support…
            </h1>

            <p className={styles.supportSubtitle}>
              Je récupère les informations liées à votre rendez-vous.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.supportView}>
        <div className={styles.supportShell}>
        {!hasConfirmedAppointment ? (
            <div className={styles.supportEmptyState}>
              <img
                src="/imgs/Lisa_Avatar-min.webp"
                alt="Lisa"
                className={styles.supportAvatar}
              />

              <h1 className={styles.supportTitle}>
                Besoin d'un support humain ?
              </h1>

              <p className={styles.supportSubtitle}>
                Réservez un créneau avec l’équipe Support HeyLisa pour faire le point sur
                votre installation, vos questions prioritaires ou les prochains réglages à
                mettre en place dans le cabinet.
              </p>

              <button
                type="button"
                className={styles.supportButton}
                onClick={handleOpenModal}
              >
                Prendre rendez-vous
              </button>
            </div>
          ) : (
            <div className={styles.supportAppointmentState}>
              <img
                src="/imgs/Lisa_Avatar-min.webp"
                alt="Lisa"
                className={styles.supportAvatar}
              />

              <h1 className={styles.supportTitle}>
                Votre rendez-vous support est planifié
              </h1>

              <p className={styles.supportSubtitle}>
                Nous avons bien enregistré votre créneau. Vous trouverez ci-dessous les
                informations utiles pour le retrouver ou le reprogrammer.
              </p>

              <div className={styles.supportAppointmentCard}>
                <div className={styles.supportAppointmentRow}>
                  <span className={styles.supportAppointmentLabel}>Rendez-vous</span>
                  <span className={styles.supportAppointmentValue}>
                    {appointment.event_name || "Support HeyLisa"}
                  </span>
                </div>

                <div className={styles.supportAppointmentDivider} />

                <div className={styles.supportAppointmentRow}>
                  <span className={styles.supportAppointmentLabel}>Date</span>
                  <span className={styles.supportAppointmentValue}>
                    {appointment.scheduled_at
                      ? formatAppointmentDate(appointment.scheduled_at)
                      : "Confirmation en cours"}
                  </span>
                </div>

                {appointment.timezone && (
                  <>
                    <div className={styles.supportAppointmentDivider} />
                    <div className={styles.supportAppointmentRow}>
                      <span className={styles.supportAppointmentLabel}>Fuseau</span>
                      <span className={styles.supportAppointmentValue}>
                        {appointment.timezone}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.supportAppointmentActions}>
                {appointment.reschedule_url && (
                  <a
                    href={appointment.reschedule_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.supportButton}
                  >
                    Reprogrammer
                  </a>
                )}

                {appointment.cancel_url && (
                  <a
                    href={appointment.cancel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.supportButtonSecondary}
                  >
                    Annuler
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className={styles.supportModalOverlay}
          onClick={() => {
            if (!isSavingAppointment) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            className={styles.supportModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.supportModalClose}
              aria-label="Fermer"
              onClick={() => {
                if (!isSavingAppointment) {
                  setIsModalOpen(false);
                }
              }}
              disabled={isSavingAppointment}
            >
              ×
            </button>

            <div className={styles.supportModalHeader}>
              <img
                src="/imgs/Lisa_Avatar-min.webp"
                alt="Lisa"
                className={styles.supportModalAvatar}
              />

              <div className={styles.supportModalHeaderText}>
                <h2 className={styles.supportModalTitle}>
                  Prendre rendez-vous avec le support
                </h2>
                <p className={styles.supportModalSubtitle}>
                  Choisissez un créneau pour échanger avec nous.
                </p>
              </div>
            </div>

            <div className={styles.supportModalBody}>
              <div className={styles.supportCalendlyShell}>
                <div className={styles.supportCalendlyEmbed} ref={calendlyRef} />
              </div>

              {isSavingAppointment && (
                <div className={styles.supportSavingState}>
                  Enregistrement du rendez-vous…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}