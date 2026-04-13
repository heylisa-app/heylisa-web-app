//app/dashboard/page.tsx

import DashboardHomeContent from "./DashboardHomeContent";
import EmptyMailOnboarding from "./EmptyMailOnboarding";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAIL_INTEGRATION_KEYS = ["gmail", "outlook", "imap"] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return <EmptyMailOnboarding />;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("id, primary_company_id")
    .eq("auth_user_id", authUser.id)
    .single();

  const cabinetAccountId = userRow?.primary_company_id;

  if (!cabinetAccountId) {
    return <EmptyMailOnboarding />;
  }

  const admin = createAdminClient();

  const { data: integrations } = await admin
    .from("lisa_user_integrations")
    .select("integration_key, status")
    .eq("cabinet_account_id", cabinetAccountId)
    .in("integration_key", [...MAIL_INTEGRATION_KEYS])
    .eq("status", "active");

  const hasActiveMailIntegration = (integrations?.length ?? 0) > 0;

  if (!hasActiveMailIntegration) {
    return <EmptyMailOnboarding />;
  }

  return <DashboardHomeContent />;
}