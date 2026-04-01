import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const N8N_BULK_SEND_URL = "https://n8n.heylisa.io/webhook/bulk-send-followup";

type BulkSendPayload = {
  cabinet_account_id: string | null;
  patient_record_id: string | null;
  patient_contact_id: string | null;
  interaction_id?: string | null;
  source_ref?: string | null;
  result_id?: string | null;
  source_branch?: string | null;
  send_patient_email?: boolean;
  send_colleague_letter?: boolean;
  patient?: {
    full_name?: string | null;
  } | null;
  document_context?: {
    label?: string | null;
    summary?: string | null;
  } | null;
  patient_email?: {
    to?: string | null;
    subject?: string | null;
    html?: string | null;
  } | null;
  colleague_letter?: {
    to?: string | null;
    subject?: string | null;
    html?: string | null;
  } | null;
};

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string | null): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkSendPayload;

    const cabinetAccountId = cleanText(body?.cabinet_account_id);
    const patientRecordId = cleanText(body?.patient_record_id);
    const patientContactId = cleanText(body?.patient_contact_id);

    if (!cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_CABINET_ACCOUNT_ID" },
        { status: 400 }
      );
    }

    const patientEmail = cleanText(body?.patient_email?.to)?.toLowerCase() ?? null;
    const doctorEmail = cleanText(body?.colleague_letter?.to)?.toLowerCase() ?? null;

    const supabase = createAdminClient();

    const updatesLog = {
      patient_contact_email_updated: false,
      primary_doctor_email_updated: false,
    };

    // 1) Sauvegarde email patient dans patient_contacts
    if (patientContactId && isValidEmail(patientEmail)) {
      const { error } = await supabase
        .from("patient_contacts")
        .update({
          email: patientEmail,
          email_normalized: patientEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patientContactId)
        .eq("cabinet_id", cabinetAccountId);

      if (error) {
        console.error("❌ Failed to update patient contact email:", error);
        return NextResponse.json(
          {
            ok: false,
            error: "PATIENT_CONTACT_EMAIL_UPDATE_FAILED",
            details: error.message,
          },
          { status: 500 }
        );
      }

      updatesLog.patient_contact_email_updated = true;
    }

    // 2) Sauvegarde email médecin traitant dans patient_records
    if (patientRecordId && isValidEmail(doctorEmail)) {
      const { error } = await supabase
        .from("patient_records")
        .update({
          primary_doctor_email: doctorEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patientRecordId)
        .eq("cabinet_account_id", cabinetAccountId);

      if (error) {
        console.error("❌ Failed to update primary doctor email:", error);
        return NextResponse.json(
          {
            ok: false,
            error: "PRIMARY_DOCTOR_EMAIL_UPDATE_FAILED",
            details: error.message,
          },
          { status: 500 }
        );
      }

      updatesLog.primary_doctor_email_updated = true;
    }

    // 3) Forward du payload inchangé vers n8n
    const n8nResponse = await fetch(N8N_BULK_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const rawText = await n8nResponse.text();

    if (!n8nResponse.ok) {
      console.error("❌ n8n bulk send failed:", n8nResponse.status, rawText);

      return new NextResponse(rawText || "N8N_BULK_SEND_FAILED", {
        status: n8nResponse.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // 4) On renvoie la réponse n8n telle quelle, enrichie avec un mini debug utile
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return new NextResponse(rawText, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return NextResponse.json({
        ...(parsed as Record<string, unknown>),
        contact_updates: updatesLog,
      });
    }

    return NextResponse.json({
      ok: true,
      data: parsed,
      contact_updates: updatesLog,
    });
  } catch (error) {
    console.error("❌ /api/bulk-send-followup POST failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "INTERNAL_BULK_SEND_PROXY_ERROR",
      },
      { status: 500 }
    );
  }
}