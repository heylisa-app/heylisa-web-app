"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence?: number;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
  message?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

type VoiceStatus =
  | "idle"
  | "starting"
  | "listening"
  | "stopping"
  | "error"
  | "unsupported";

type UseWebSpeechToTextOptions = {
  lang?: string;
  onFinalTranscript?: (text: string) => void;
};

export function useWebSpeechToText(options?: UseWebSpeechToTextOptions) {
  const lang = options?.lang ?? "fr-FR";
  const onFinalTranscript = options?.onFinalTranscript;

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const manuallyStoppingRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const cleanupRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onstart = null;
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    errorRef.current = null;

    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;

    manuallyStoppingRef.current = true;
    setStatus("stopping");

    if (!recognition) {
      setStatus("idle");
      return;
    }

    try {
      recognition.stop();
    } catch {
      setStatus("idle");
    }
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;

    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      errorRef.current = "VOICE_UNSUPPORTED";
      setStatus("unsupported");
      setError("VOICE_UNSUPPORTED");
      return;
    }

    if (status === "starting" || status === "listening") {
      return;
    }

    cleanupRecognition();

    try {
      recognitionRef.current?.abort();
    } catch {}

    recognitionRef.current = null;

    resetTranscript();
    manuallyStoppingRef.current = false;

    const recognition = new RecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setStatus("listening");
      errorRef.current = null;
      setError(null);
    };

    recognition.onresult = (event) => {
      let nextFinal = "";
      let nextInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? "";

        if (!transcript) continue;

        if (result.isFinal) {
          nextFinal += transcript;
        } else {
          nextInterim += transcript;
        }
      }

      if (nextFinal) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${nextFinal}`.trim();
        setFinalTranscript(finalTranscriptRef.current);
      }

      const cleanInterim = nextInterim.trim();
      interimTranscriptRef.current = cleanInterim;
      setInterimTranscript(cleanInterim);
    };

    recognition.onerror = (event) => {
      const nextError = event?.error || "VOICE_UNKNOWN_ERROR";
      errorRef.current = nextError;
      setStatus("error");
      setError(nextError);
    };

    recognition.onend = () => {
      const finalValue = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();

      cleanupRecognition();
      recognitionRef.current = null;

      if (manuallyStoppingRef.current) {
        setStatus("idle");
      } else if (errorRef.current) {
        setStatus("error");
      } else {
        setStatus("idle");
      }

      setInterimTranscript("");
      interimTranscriptRef.current = "";

      if (finalValue) {
        finalTranscriptRef.current = finalValue;
        setFinalTranscript(finalValue);
        onFinalTranscript?.(finalValue);
      }

      manuallyStoppingRef.current = false;
    };

    recognitionRef.current = recognition;
    errorRef.current = null;
    setStatus("starting");
    setError(null);

    try {
      recognition.start();
    } catch {
      errorRef.current = "VOICE_START_FAILED";
      setStatus("error");
      setError("VOICE_START_FAILED");
    }
  }, [cleanupRecognition, lang, onFinalTranscript, resetTranscript, status]);

  const toggle = useCallback(() => {
    if (status === "listening" || status === "starting") {
      stop();
      return;
    }

    start();
  }, [start, status, stop]);

  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
    }
  }, [isSupported]);

  useEffect(() => {
    return () => {
      cleanupRecognition();

      try {
        recognitionRef.current?.abort();
      } catch {}

      recognitionRef.current = null;
    };
  }, [cleanupRecognition]);

  return {
    isSupported,
    status,
    error,
    interimTranscript,
    finalTranscript,
    isListening: status === "listening" || status === "starting",
    start,
    stop,
    toggle,
    resetTranscript,
  };
}