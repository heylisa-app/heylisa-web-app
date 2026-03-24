//app/patient-documents/analyze/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveAnalyzeContext() {
  const isDev = process.env.NODE_ENV === "development";
  const devPublicUserId = process.env.DEV_PUBLIC_USER_ID;

  if (isDev && devPublicUserId) {
    const admin = createAdminClient();

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id, primary_company_id")
      .eq("id", devPublicUserId)
      .single();

    if (userError || !userRow?.id) {
      return {
        ok: false as const,
        status: 404,
        error: "DEV_USER_NOT_FOUND",
      };
    }

    return {
      ok: true as const,
      publicUserId: userRow.id,
      cabinetAccountId: userRow.primary_company_id ?? null,
      admin,
    };
  }

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      ok: false as const,
      status: 401,
      error: "UNAUTHORIZED",
    };
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, primary_company_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (userError || !userRow?.id) {
    return {
      ok: false as const,
      status: 404,
      error: "USER_NOT_FOUND",
    };
  }

  return {
    ok: true as const,
    publicUserId: userRow.id,
    cabinetAccountId: userRow.primary_company_id ?? null,
    admin: createAdminClient(),
  };
}

function buildMockAnalysis(documentName: string, mimeType: string) {
  const isPdf = mimeType === "application/pdf";

  return {
    summary: `Lisa a analysé le document "${documentName}".`,
    document_type: isPdf ? "pdf" : "image",
    key_points: [
      "Le document a bien été reçu et rattaché au dossier patient.",
      "Une vérification humaine du contenu clinique reste recommandée.",
      "Les éléments clés pourront ensuite être injectés dans le dossier structuré.",
    ],
    suggested_actions: [
      "Vérifier les informations médicales importantes.",
      "Confirmer si une synthèse doit être ajoutée aux notes.",
      "Décider si un suivi ou une relance patient est nécessaire.",
    ],
    confidence: "demo",
    generated_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const context = await resolveAnalyzeContext();

    if (!context.ok) {
      return NextResponse.json(
        { ok: false, error: context.error },
        { status: context.status }
      );
    }

    const { admin, cabinetAccountId } = context;

    if (!cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "CABINET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const documentId = String(body?.documentId ?? "").trim();

    if (!documentId) {
      return NextResponse.json(
        { ok: false, error: "DOCUMENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const { data: documentRow, error: fetchError } = await admin
      .from("patient_documents")
      .select(`
        id,
        cabinet_account_id,
        file_name,
        mime_type,
        analysis_status,
        updated_at
      `)
      .eq("id", documentId)
      .single();

    if (fetchError || !documentRow) {
      return NextResponse.json(
        { ok: false, error: "DOCUMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (documentRow.cabinet_account_id !== cabinetAccountId) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const normalizedAnalysisStatus = String(
      documentRow.analysis_status ?? "not_started"
    )
      .trim()
      .toLowerCase();
    
    const blockingStatuses = new Set(["pending", "processing", "done"]);
    const relaunchAllowedStatuses = new Set(["not_started", "failed", ""]);
    
    if (blockingStatuses.has(normalizedAnalysisStatus)) {
      const errorCode =
        normalizedAnalysisStatus === "done"
          ? "ANALYSIS_ALREADY_DONE"
          : "ANALYSIS_ALREADY_PENDING";
    
      return NextResponse.json(
        {
          ok: false,
          error: errorCode,
          details: {
            current_status: normalizedAnalysisStatus,
            document_id: documentId,
            updated_at: documentRow.updated_at ?? null,
          },
        },
        { status: 409 }
      );
    }
    
    if (!relaunchAllowedStatuses.has(normalizedAnalysisStatus)) {
      return NextResponse.json(
        {
          ok: false,
          error: "ANALYSIS_STATUS_NOT_SUPPORTED",
          details: {
            current_status: normalizedAnalysisStatus,
            document_id: documentId,
          },
        },
        { status: 400 }
      );
    }

    console.log("[patient-documents/analyze] relaunch accepted", {
      documentId,
      previous_status: normalizedAnalysisStatus,
    });

    const { error: pendingError } = await admin
    .from("patient_documents")
    .update({
      analysis_status: "pending",
      analysis_text: null,
      analysis_json: null,
    })
    .eq("id", documentId)
    .eq("cabinet_account_id", cabinetAccountId);

    if (pendingError) {
      return NextResponse.json(
        { ok: false, error: pendingError.message || "FAILED_TO_SET_PENDING" },
        { status: 500 }
      );
    }

    const webhookResponse = await fetch(
        "https://n8n.heylisa.io/webhook/medical-document/analysis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId,
            source: "patients_ui",
            triggeredBy: "user",
          }),
        }
      );
      
      const webhookPayload = await webhookResponse.json().catch(() => null);
      
      if (!webhookResponse.ok) {
        await admin
          .from("patient_documents")
          .update({
            analysis_status: "failed",
          })
          .eq("id", documentId);
      
        return NextResponse.json(
          {
            ok: false,
            error:
              webhookPayload?.error ||
              `N8N_WEBHOOK_FAILED_${webhookResponse.status}`,
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        ok: true,
        document: {
          id: documentId,
          analysis_status: "pending",
          analysis_text: null,
          analysis_json: null,
        },
      });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}