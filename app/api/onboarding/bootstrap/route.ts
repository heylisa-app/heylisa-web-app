import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const url = new URL(request.url);
    const publicUserIdFromQuery = url.searchParams.get("publicUserId");

    let publicUserId: string | null = null;
    let cabinetAccountId: string | null = null;

    // ----------------------------------------
    // 1) Cas standard : utilisateur authentifié
    // ----------------------------------------
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

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

    // ----------------------------------------
    // 2) Cas DEV bypass : fallback via query param
    // ----------------------------------------
    if (!publicUserId && publicUserIdFromQuery) {
      const { data: userRow, error: userError } = await admin
        .from("users")
        .select("id, primary_company_id")
        .eq("id", publicUserIdFromQuery)
        .single();

      if (userError || !userRow) {
        return NextResponse.json(
          { error: "User not found from publicUserId query" },
          { status: 404 }
        );
      }

      publicUserId = userRow.id;
      cabinetAccountId = userRow.primary_company_id ?? null;
    }

    // ----------------------------------------
    // 3) Personne identifié = 401
    // ----------------------------------------
    if (!publicUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [
      { data: billingRow },
      { data: onboardingRow },
      cabinetResult,
    ] = await Promise.all([
      admin
        .from("user_billing_status")
        .select("billing_status, billing_substatus, trial_started_at, trial_ends_at")
        .eq("public_user_id", publicUserId)
        .maybeSingle(),

      admin
        .from("user_onboarding_state")
        .select(
          "current_step, completed, specialties, cabinet_name, flow_answers, flow_last_step_id, flow_last_step_index"
        )
        .eq("user_id", publicUserId)
        .maybeSingle(),

      cabinetAccountId
        ? admin
            .from("cabinet_accounts")
            .select("name, specialties")
            .eq("id", cabinetAccountId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const cabinetRow = cabinetResult?.data ?? null;

    return NextResponse.json({
      ok: true,
      publicUserId,
      cabinetAccountId,
      billingStatus: billingRow?.billing_status ?? null,
      onboardingCompleted: Boolean(onboardingRow?.completed),
      onboardingCurrentStep:
        typeof onboardingRow?.current_step === "number"
          ? onboardingRow.current_step
          : null,
      onboardingLastStepId:
        typeof onboardingRow?.flow_last_step_id === "string"
          ? onboardingRow.flow_last_step_id
          : null,
      onboardingLastStepIndex:
        typeof onboardingRow?.flow_last_step_index === "number"
          ? onboardingRow.flow_last_step_index
          : null,
      onboardingAnswers:
        onboardingRow?.flow_answers && typeof onboardingRow.flow_answers === "object"
          ? onboardingRow.flow_answers
          : {},
      cabinetName:
        onboardingRow?.cabinet_name?.trim() ||
        cabinetRow?.name?.trim() ||
        "Mon cabinet",
      cabinetSpecialties: Array.isArray(cabinetRow?.specialties)
        ? cabinetRow.specialties.filter(Boolean)
        : Array.isArray(onboardingRow?.specialties)
        ? onboardingRow.specialties.filter(Boolean)
        : [],
    });
  } catch (error) {
    console.error("[HL onboarding bootstrap] route error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}