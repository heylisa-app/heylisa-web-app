import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const isDev = process.env.NODE_ENV === "development";
    const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;
    const appBaseUrl = process.env.APP_BASE_URL || "https://app.heylisa.io";

    let publicUserId: string | null = null;

    // -----------------------------
    // 1) session auth standard
    // -----------------------------
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (!authError && authUser) {
      const { data: userRow, error: userError } = await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", authUser.id)
        .single();

      if (userError || !userRow?.id) {
        return NextResponse.redirect(`${appBaseUrl}/dashboard/plan?portal_error=user_not_found`);
      }

      publicUserId = userRow.id;
    }

    // -----------------------------
    // 2) DEV fallback
    // -----------------------------
    if (!publicUserId && isDev && devPublicUserId) {
      publicUserId = devPublicUserId;
    }

    if (!publicUserId) {
      return NextResponse.redirect(`${appBaseUrl}/dashboard/plan?portal_error=unauthorized`);
    }

    const { data: billingRow, error: billingError } = await admin
      .from("user_billing_status")
      .select("stripe_customer_id, billing_status")
      .eq("public_user_id", publicUserId)
      .maybeSingle();

    if (billingError) {
      console.error("[HL portal profile] billing lookup error", billingError);
      return NextResponse.redirect(`${appBaseUrl}/dashboard/plan?portal_error=billing_lookup`);
    }

    const stripeCustomerId =
      typeof billingRow?.stripe_customer_id === "string" &&
      billingRow.stripe_customer_id.trim()
        ? billingRow.stripe_customer_id.trim()
        : null;

    if (!stripeCustomerId) {
      return NextResponse.redirect(`${appBaseUrl}/dashboard/plan?portal_error=no_customer`);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appBaseUrl}/dashboard/plan`,
      flow_data: {
        type: "payment_method_update",
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: `${appBaseUrl}/dashboard/plan?portal=payment_method_updated`,
          },
        },
      },
    });

    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("[HL portal profile] fatal error", error);
    return NextResponse.redirect("https://app.heylisa.io/dashboard/plan?portal_error=fatal");
  }
}