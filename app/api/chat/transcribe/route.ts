import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

function jsonError(error: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonError("OPENAI_API_KEY_MISSING", 500);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("FILE_REQUIRED", 400);
    }

    if (!file.size) {
      return jsonError("EMPTY_FILE", 400);
    }

    const supportedMimeTypes = new Set([
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/ogg",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mpga",
      "audio/m4a",
    ]);

    if (file.type && !supportedMimeTypes.has(file.type)) {
      return jsonError("UNSUPPORTED_AUDIO_TYPE", 415);
    }

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "gpt-4o-transcribe",
      language: "fr",
    });

    const text = String(transcription.text ?? "").trim();

    if (!text) {
      return jsonError("EMPTY_TRANSCRIPTION", 422);
    }

    return NextResponse.json({
      ok: true,
      text,
    });
  } catch (error) {
    console.error("[HL Chat] transcribe route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AUDIO_TRANSCRIPTION_FAILED",
      },
      { status: 500 }
    );
  }
}