import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP = {
  standard: {
    monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY!,
    annual: process.env.STRIPE_PRICE_STANDARD_ANNUAL!,
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY!,
    annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL!,
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const isDev = process.env.NODE_ENV === "development";
    const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    const body = await request.json();
    const planId = body?.planId;
    const billingCycle = body?.billingCycle;

    if (!["standard", "premium"].includes(planId)) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

    if (!["monthly", "annual"].includes(billingCycle)) {
      return NextResponse.json({ error: "Invalid billingCycle" }, { status: 400 });
    }

    const priceId =
      PRICE_MAP[planId as "standard" | "premium"][
        billingCycle as "monthly" | "annual"
      ];

    if (!priceId) {
      return NextResponse.json({ error: "Price not found" }, { status: 400 });
    }

    let publicUserId: string | null = null;
    let cabinetAccountId: string | null = null;

    // 1) Cas standard : utilisateur authentifié
    if (!authError && authUser) {
      const { data: userRow, error: userError } = await admin
        .from("users")
        .select("id, primary_company_id")
        .eq("auth_user_id", authUser.id)
        .single();

      if (userError || !userRow) {
        return NextResponse.json(
          { error: "User not found from auth session" },
          { status: 404 }
        );
      }

      publicUserId = userRow.id;
      cabinetAccountId = userRow.primary_company_id ?? null;
    }

    // 2) Cas DEV bypass : fallback via env
    if (!publicUserId && isDev && devPublicUserId) {
      const { data: userRow, error: userError } = await admin
        .from("users")
        .select("id, primary_company_id")
        .eq("id", devPublicUserId)
        .single();

      if (userError || !userRow) {
        return NextResponse.json(
          { error: "User not found from DEV_PUBLIC_USER_ID" },
          { status: 404 }
        );
      }

      publicUserId = userRow.id;
      cabinetAccountId = userRow.primary_company_id ?? null;
    }

    // 3) Personne identifié = 401
    if (!publicUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: billingRow, error: billingError } = await admin
      .from("user_billing_status")
      .select("*")
      .eq("public_user_id", publicUserId)
      .maybeSingle();

    if (billingError) {
      return NextResponse.json({ error: billingError.message }, { status: 500 });
    }

    if (
      billingRow &&
      ["trial_active", "active_paid"].includes(billingRow.billing_status)
    ) {
      return NextResponse.json(
        { error: "Subscription already active" },
        { status: 400 }
      );
    }

    let stripeCustomerId = billingRow?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: {
          public_user_id: publicUserId,
          cabinet_account_id: cabinetAccountId ?? "",
        },
      });

      stripeCustomerId = customer.id;

      if (billingRow) {
        const { error: updateCustomerError } = await admin
          .from("user_billing_status")
          .update({
            stripe_customer_id: stripeCustomerId,
          })
          .eq("public_user_id", publicUserId);

        if (updateCustomerError) {
          return NextResponse.json(
            { error: updateCustomerError.message },
            { status: 500 }
          );
        }
      } else {
        const { error: insertBillingError } = await admin
          .from("user_billing_status")
          .insert({
            public_user_id: publicUserId,
            stripe_customer_id: stripeCustomerId,
            billing_status: "new_account",
          });

        if (insertBillingError) {
          return NextResponse.json(
            { error: insertBillingError.message },
            { status: 500 }
          );
        }
      }
    }

    const appBaseUrl = process.env.APP_BASE_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          public_user_id: publicUserId,
          cabinet_account_id: cabinetAccountId ?? "",
          plan_id: planId,
          billing_cycle: billingCycle,
          source: "heylisa_webapp_onboarding",
        },
      },
      metadata: {
        public_user_id: publicUserId,
        cabinet_account_id: cabinetAccountId ?? "",
        plan_id: planId,
        billing_cycle: billingCycle,
        source: "heylisa_webapp_onboarding",
      },
      client_reference_id: publicUserId,
      success_url: `${appBaseUrl}/dashboard/chat?stripe=success`,
      cancel_url: `${appBaseUrl}/dashboard?stripe=cancelled`,
    });

    const { error: billingUpdateError } = await admin
      .from("user_billing_status")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_price_id: priceId,
        billing_cycle: billingCycle,
      })
      .eq("public_user_id", publicUserId);

    if (billingUpdateError) {
      return NextResponse.json(
        { error: billingUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("[billing checkout route] error", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}