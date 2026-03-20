import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PlanPageClient from "./PlanPageClient";

type BillingStatus =
  | "trial_active"
  | "trial_contacted"
  | "trial_expired_waiting_response"
  | "pending_payment"
  | "active_paid"
  | "grace_period"
  | "suspended"
  | "closed"
  | null;

export default async function DashboardPlanPage() {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  let billingStatus: BillingStatus = null;

  // -----------------------------
  // DEV MODE
  // -----------------------------
  if (isDev && devPublicUserId) {
    const admin = createAdminClient();

    const { data: billingRow, error: billingError } = await admin
      .from("user_billing_status")
      .select("billing_status")
      .eq("public_user_id", devPublicUserId)
      .maybeSingle();

    console.log("[HL Plan server][DEV]", {
      devPublicUserId,
      billingStatus: billingRow?.billing_status ?? null,
      billingError: billingError?.message ?? null,
    });

    billingStatus = (billingRow?.billing_status as BillingStatus) ?? null;

    return <PlanPageClient billingStatus={billingStatus} />;
  }

  // -----------------------------
  // NORMAL MODE
  // session auth -> users.id -> billing.public_user_id
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

  // IMPORTANT:
  // lookup billing via service role pour éviter qu'une policy RLS
  // fasse remonter null alors que la ligne existe bien
  const admin = createAdminClient();

  const { data: billingRow, error: billingError } = await admin
    .from("user_billing_status")
    .select("billing_status")
    .eq("public_user_id", userRow.id)
    .maybeSingle();

  console.log("[HL Plan server][PROD]", {
    authUserId: authUser.id,
    publicUserId: userRow.id,
    billingStatus: billingRow?.billing_status ?? null,
    billingError: billingError?.message ?? null,
  });

  billingStatus = (billingRow?.billing_status as BillingStatus) ?? null;

  return <PlanPageClient billingStatus={billingStatus} />;
}