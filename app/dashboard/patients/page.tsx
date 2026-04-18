//app/dashboard/patients/page.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PatientsPageClient from "./PatientsPageClient";

export default async function DashboardPatientsPage() {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  let publicUserId: string | null = null;
  let cabinetAccountId: string | null = null;

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
      redirect("https://heylisa.io/signup");
    }

    publicUserId = userRow.id;
    cabinetAccountId = userRow.primary_company_id ?? null;
  } else {
    // -----------------------------
    // PROD / NORMAL MODE
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
      .select("id, primary_company_id")
      .eq("auth_user_id", authUser.id)
      .single();

    if (userError || !userRow?.id) {
      redirect("https://heylisa.io/signup");
    }

    publicUserId = userRow.id;
    cabinetAccountId = userRow.primary_company_id ?? null;
  }

  if (!cabinetAccountId || !publicUserId) {
    redirect("https://heylisa.io/signup");
  }

  console.log("[HL Patients page] resolved ids", {
    publicUserId,
    cabinetAccountId,
  });

  return <PatientsPageClient initialCabinetAccountId={cabinetAccountId} />;
}