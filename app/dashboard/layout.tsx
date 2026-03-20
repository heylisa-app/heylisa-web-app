import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { createAdminClient } from "@/lib/supabase/admin";

function getInitials(fullName: string) {
  const cleaned = fullName.trim();
  if (!cleaned) return "HL";

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  if (isDev && devPublicUserId) {
    const supabase = createAdminClient();

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id, full_name, first_name, last_name, primary_company_id")
      .eq("id", devPublicUserId)
      .single();

    if (!userError && userRow) {
      const displayName =
        userRow.full_name?.trim() ||
        [userRow.first_name, userRow.last_name].filter(Boolean).join(" ").trim() ||
        "Utilisateur";

      let cabinetName = "Mon cabinet";

      if (userRow.primary_company_id) {
        const { data: cabinetRow } = await supabase
          .from("cabinet_accounts")
          .select("name")
          .eq("id", userRow.primary_company_id)
          .single();

        if (cabinetRow?.name?.trim()) {
          cabinetName = cabinetRow.name.trim();
        }
      }

      let initialBillingStatus: string | null = null;
      let initialStripeUrl: string | null = "/dashboard/plan";

      const { data: billingRow } = await supabase
        .from("user_billing_status")
        .select("billing_status, stripe_hosted_invoice_url, stripe_portal_url")
        .eq("public_user_id", userRow.id)
        .maybeSingle();

      if (billingRow) {
        initialBillingStatus = billingRow.billing_status ?? null;
        initialStripeUrl =
          billingRow.stripe_hosted_invoice_url ||
          billingRow.stripe_portal_url ||
          "/dashboard/plan";
      }

      const userInitials = getInitials(displayName);

      return (
        <DashboardShell
          userDisplayName={displayName}
          userInitials={userInitials}
          cabinetName={cabinetName}
          publicUserId={userRow.id}
          initialBillingStatus={initialBillingStatus}
          initialStripeUrl={initialStripeUrl}
        >
          {children}
        </DashboardShell>
      );
    }
  }

  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  if (!authUser) {
    redirect("https://heylisa.io/signup");
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, full_name, first_name, last_name, primary_company_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (userError || !userRow) {
    redirect("https://heylisa.io/signup");
  }

  const displayName =
    userRow.full_name?.trim() ||
    [userRow.first_name, userRow.last_name].filter(Boolean).join(" ").trim() ||
    authUser.email ||
    "Utilisateur";

  let cabinetName = "Mon cabinet";

  if (userRow.primary_company_id) {
    const { data: cabinetRow } = await supabase
      .from("cabinet_accounts")
      .select("name")
      .eq("id", userRow.primary_company_id)
      .single();

    if (cabinetRow?.name?.trim()) {
      cabinetName = cabinetRow.name.trim();
    }
  }

  let initialBillingStatus: string | null = null;
  let initialStripeUrl: string | null = "/dashboard/plan";

  const { data: billingRow, error: billingError } = await admin
    .from("user_billing_status")
    .select("billing_status, stripe_hosted_invoice_url, stripe_portal_url")
    .eq("public_user_id", userRow.id)
    .maybeSingle();

  console.log("[HL billing layout][PROD]", {
    authUserId: authUser.id,
    publicUserId: userRow.id,
    billingStatus: billingRow?.billing_status ?? null,
    billingError: billingError?.message ?? null,
  });

  if (billingRow) {
    initialBillingStatus = billingRow.billing_status ?? null;
    initialStripeUrl =
      billingRow.stripe_hosted_invoice_url ||
      billingRow.stripe_portal_url ||
      "/dashboard/plan";
  }

  const userInitials = getInitials(displayName);

  return (
    <DashboardShell
      userDisplayName={displayName}
      userInitials={userInitials}
      cabinetName={cabinetName}
      publicUserId={userRow.id}
      initialBillingStatus={initialBillingStatus}
      initialStripeUrl={initialStripeUrl}
    >
      {children}
    </DashboardShell>
  );
}