import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveSupportUserContext() {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  // -----------------------------
  // DEV MODE
  // -----------------------------
  if (isDev && devPublicUserId) {
    const admin = createAdminClient();

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id, primary_company_id")
      .eq("id", devPublicUserId)
      .single();

    if (userError || !userRow?.id) {
      return {
        ok: false as const,
        status: 404,
        error: "DEV_USER_NOT_FOUND",
      };
    }

    return {
      ok: true as const,
      publicUserId: userRow.id,
      cabinetAccountId: userRow.primary_company_id ?? null,
      admin,
    };
  }

  // -----------------------------
  // PROD / NORMAL MODE
  // -----------------------------
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      ok: false as const,
      status: 401,
      error: "UNAUTHORIZED",
    };
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, primary_company_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (userError || !userRow?.id) {
    return {
      ok: false as const,
      status: 404,
      error: "USER_NOT_FOUND",
    };
  }

  return {
    ok: true as const,
    publicUserId: userRow.id,
    cabinetAccountId: userRow.primary_company_id ?? null,
    admin: createAdminClient(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bookingToken = String(body?.booking_token ?? "").trim() || null;
    const calendlyEventUri = String(body?.calendly_event_uri ?? "").trim() || null;
    const calendlyInviteeUri = String(body?.calendly_invitee_uri ?? "").trim() || null;
    const eventName = String(body?.event_name ?? "").trim() || null;
    const status = String(body?.status ?? "scheduled").trim() || "scheduled";
    const scheduledAt = String(body?.scheduled_at ?? "").trim() || null;
    const endAt = String(body?.end_at ?? "").trim() || null;
    const timezone = String(body?.timezone ?? "").trim() || null;
    const cancelUrl = String(body?.cancel_url ?? "").trim() || null;
    const rescheduleUrl = String(body?.reschedule_url ?? "").trim() || null;
    const rawPayload = body?.raw_payload ?? null;

    if (!bookingToken && !calendlyEventUri && !calendlyInviteeUri) {
        return NextResponse.json(
          { ok: false, error: "MISSING_REQUIRED_FIELDS" },
          { status: 400 }
        );
      }

    const context = await resolveSupportUserContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, publicUserId, cabinetAccountId } = context;

    const rowPayload = {
        public_user_id: publicUserId,
        cabinet_account_id: cabinetAccountId,
        booking_token: bookingToken,
        calendly_event_uri: calendlyEventUri,
        calendly_invitee_uri: calendlyInviteeUri,
        event_name: eventName,
        status,
        scheduled_at: scheduledAt,
        end_at: endAt,
        timezone,
        cancel_url: cancelUrl,
        reschedule_url: rescheduleUrl,
        raw_payload: rawPayload,
      };
      
      let data = null;
      let error = null;
      
      // -----------------------------
      // CASE 1: draft row before Calendly booking
      // -> simple insert
      // -----------------------------
      if (bookingToken && !calendlyInviteeUri && !calendlyEventUri) {
        const result = await admin
          .from("support_appointments")
          .insert(rowPayload)
          .select(
            "id, public_user_id, cabinet_account_id, booking_token, event_name, status, scheduled_at, end_at, timezone, cancel_url, reschedule_url, calendly_event_uri, calendly_invitee_uri, created_at, updated_at"
          )
          .single();
      
        data = result.data;
        error = result.error;
      } else {
        // -----------------------------
        // CASE 2: real Calendly callback save
        // -> upsert on calendly_invitee_uri
        // -----------------------------
        const result = await admin
          .from("support_appointments")
          .upsert(rowPayload, {
            onConflict: "calendly_invitee_uri",
          })
          .select(
            "id, public_user_id, cabinet_account_id, booking_token, event_name, status, scheduled_at, end_at, timezone, cancel_url, reschedule_url, calendly_event_uri, calendly_invitee_uri, created_at, updated_at"
          )
          .single();
      
        data = result.data;
        error = result.error;
        }

    if (error || !data) {
      return NextResponse.json(
        {
          ok: false,
          error: error?.message || "UPSERT_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      appointment: data,
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

export async function GET() {
  try {
    const context = await resolveSupportUserContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, publicUserId } = context;

    const { data, error } = await admin
      .from("support_appointments")
      .select(
        "id, public_user_id, cabinet_account_id, event_name, status, scheduled_at, end_at, timezone, cancel_url, reschedule_url, calendly_event_uri, calendly_invitee_uri, created_at, updated_at"
      )
      .eq("public_user_id", publicUserId)
      .in("status", ["scheduled", "confirmed"])
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      appointment: data ?? null,
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