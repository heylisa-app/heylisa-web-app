import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OnboardingProgressBody = {
  userId: string;
  cabinetAccountId: string;
  currentStep: number;
  flowLastStepId: string;
  flowLastStepIndex: number;
  flowVersion: string;
  completed: boolean;
  completedAt: string | null;
  flowAnswers: Record<string, unknown>;
  cabinetName?: string;
  specialties?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingProgressBody;

    if (!body.userId || !body.cabinetAccountId) {
      return NextResponse.json(
        {
          error: "Missing required ids",
          details: {
            userId: body.userId ?? null,
            cabinetAccountId: body.cabinetAccountId ?? null,
          },
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const row = {
      user_id: body.userId,
      cabinet_account_id: body.cabinetAccountId,
      current_step: body.currentStep,
      flow_last_step_id: body.flowLastStepId,
      flow_last_step_index: body.flowLastStepIndex,
      flow_version: body.flowVersion,
      flow_answers: body.flowAnswers ?? {},
      completed: Boolean(body.completed),
      completed_at: body.completed ? body.completedAt : null,
      cabinet_name: body.cabinetName ?? null,
      specialties: Array.isArray(body.specialties) ? body.specialties : [],
    };

    const { error } = await admin
      .from("user_onboarding_state")
      .upsert(row, { onConflict: "user_id" });

    if (error) {
      console.error("[HL onboarding API] upsert error", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return NextResponse.json(
        {
          error: "Failed to persist onboarding progress",
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[HL onboarding API] unexpected error", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}