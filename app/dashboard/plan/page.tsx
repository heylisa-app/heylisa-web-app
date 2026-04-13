import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PlanPageClient from "./PlanPageClient";

type BillingStatus =
  | "new_account"
  | "trial_active"
  | "trial_contacted"
  | "trial_expired_waiting_response"
  | "pending_payment"
  | "active_paid"
  | "grace_period"
  | "suspended"
  | "closed"
  | null;

type PlanPageData = {
  billingStatus: BillingStatus;
  billingCycle: "monthly" | "annual" | null;
  stripePriceId: string | null;
};

export default async function DashboardPlanPage() {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  let pageData: PlanPageData = {
    billingStatus: null,
    billingCycle: null,
    stripePriceId: null,
  };

  // -----------------------------
  // DEV MODE
  // -----------------------------
  if (isDev && devPublicUserId) {
    const admin = createAdminClient();

    const { data: billingRow, error: billingError } = await admin
      .from("user_billing_status")
      .select("billing_status, billing_cycle, stripe_price_id")
      .eq("public_user_id", devPublicUserId)
      .maybeSingle();

    console.log("[HL Plan server][DEV]", {
      devPublicUserId,
      billingStatus: billingRow?.billing_status ?? null,
      billingCycle: billingRow?.billing_cycle ?? null,
      stripePriceId: billingRow?.stripe_price_id ?? null,
      billingError: billingError?.message ?? null,
    });

    pageData = {
      billingStatus: (billingRow?.billing_status as BillingStatus) ?? null,
      billingCycle:
        billingRow?.billing_cycle === "monthly" || billingRow?.billing_cycle === "annual"
          ? billingRow.billing_cycle
          : null,
      stripePriceId:
        typeof billingRow?.stripe_price_id === "string" && billingRow.stripe_price_id.trim()
          ? billingRow.stripe_price_id.trim()
          : null,
    };

    return <PlanPageClient {...pageData} />;
  }

  // -----------------------------
  // NORMAL MODE
  // -----------------------------
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("https://heylisa.io/signup");
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (userError || !userRow?.id) {
    console.error("[HL Plan server] users lookup failed", {
      authUserId: authUser.id,
      userError: userError?.message ?? null,
    });

    redirect("https://heylisa.io/signup");
  }

  const admin = createAdminClient();

  const { data: billingRow, error: billingError } = await admin
    .from("user_billing_status")
    .select("billing_status, billing_cycle, stripe_price_id")
    .eq("public_user_id", userRow.id)
    .maybeSingle();

  console.log("[HL Plan server][PROD]", {
    authUserId: authUser.id,
    publicUserId: userRow.id,
    billingStatus: billingRow?.billing_status ?? null,
    billingCycle: billingRow?.billing_cycle ?? null,
    stripePriceId: billingRow?.stripe_price_id ?? null,
    billingError: billingError?.message ?? null,
  });

  pageData = {
    billingStatus: (billingRow?.billing_status as BillingStatus) ?? null,
    billingCycle:
      billingRow?.billing_cycle === "monthly" || billingRow?.billing_cycle === "annual"
        ? billingRow.billing_cycle
        : null,
    stripePriceId:
      typeof billingRow?.stripe_price_id === "string" && billingRow.stripe_price_id.trim()
        ? billingRow.stripe_price_id.trim()
        : null,
  };

  return <PlanPageClient {...pageData} />;
}