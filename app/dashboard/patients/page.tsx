import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PatientsDemoView from "./PatientsDemoView";

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
      return <PatientsDemoView />;
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

  if (!cabinetAccountId) {
    return <PatientsDemoView />;
  }

  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("patient_contacts")
    .select("*", { count: "exact", head: true })
    .eq("cabinet_account_id", cabinetAccountId);

  const hasRealPatients = !countError && (count ?? 0) > 0;

  if (!hasRealPatients) {
    return <PatientsDemoView />;
  }

  return (
    <div style={{ padding: "32px", color: "white" }}>
      Vue patients réelle à brancher
    </div>
  );
}