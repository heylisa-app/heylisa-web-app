import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";

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
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

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

  let displayName =
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

  const userInitials = getInitials(displayName);

  return (
    <DashboardShell
      userDisplayName={displayName}
      userInitials={userInitials}
      cabinetName={cabinetName}
    >
      {children}
    </DashboardShell>
  );
}