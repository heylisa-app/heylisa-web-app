"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RecorderStatus =
  | "idle"
  | "arming"
  | "recording"
  | "review"
  | "uploading"
  | "error"
  | "unsupported";

type UseAudioRecorderOptions = {
  armDelayMs?: number;
  mimeType?: string;
};

type StartResult =
  | { ok: true }
  | { ok: false; error: string };

function pickSupportedMimeType(preferred?: string) {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    preferred,
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ].filter(Boolean) as string[];

  for (const mimeType of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    } catch {
      // ignore
    }
  }

  return "";
}

export function useAudioRecorder(options?: UseAudioRecorderOptions) {
  const armDelayMs = options?.armDelayMs ?? 2000;
  const preferredMimeType = options?.mimeType ?? "audio/webm;codecs=opus";

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const armTimeoutRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const isCancellingRef = useRef(false);

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    );
  }, []);

  const clearArmTimeout = useCallback(() => {
    if (armTimeoutRef.current !== null) {
      window.clearTimeout(armTimeoutRef.current);
      armTimeoutRef.current = null;
    }
  }, []);

  const clearDurationInterval = useCallback(() => {
    if (durationIntervalRef.current !== null) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const resetRecordingArtifacts = useCallback(() => {
    chunksRef.current = [];
    startedAtRef.current = null;
    setDurationMs(0);
    setAudioBlob(null);

    setAudioUrl((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev);
        } catch {
          // ignore
        }
      }
      return null;
    });
  }, []);

  const hardReset = useCallback(() => {
    clearArmTimeout();
    clearDurationInterval();

    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // ignore
    }

    mediaRecorderRef.current = null;
    stopTracks();
    resetRecordingArtifacts();
    setError(null);
    setStatus("idle");
  }, [clearArmTimeout, resetRecordingArtifacts, stopTracks]);

  const start = useCallback(async (): Promise<StartResult> => {
    if (!isSupported) {
      setStatus("unsupported");
      setError("AUDIO_RECORDER_UNSUPPORTED");
      return { ok: false, error: "AUDIO_RECORDER_UNSUPPORTED" };
    }

    if (status !== "idle" && status !== "review" && status !== "error") {
      return { ok: false, error: "RECORDER_BUSY" };
    }

    clearArmTimeout();
    stopTracks();
    resetRecordingArtifacts();
    setError(null);
    setStatus("arming");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;

      const mimeType = pickSupportedMimeType(preferredMimeType);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setStatus("error");
        setError("RECORDER_RUNTIME_ERROR");
        stopTracks();
      };

      recorder.onstop = () => {
        clearDurationInterval();
      
        // 👉 SI cancel → on ignore complètement
        if (isCancellingRef.current) {
          isCancellingRef.current = false;
          return;
        }
      
        const blobType =
          recorder.mimeType || mimeType || "audio/webm";
      
        const blob = new Blob(chunksRef.current, { type: blobType });
        const startedAt = startedAtRef.current;
        const nextDuration =
          typeof startedAt === "number" ? Math.max(0, Date.now() - startedAt) : 0;
      
        stopTracks();
      
        if (!blob.size) {
          setStatus("error");
          setError("EMPTY_AUDIO_BLOB");
          return;
        }
      
        setDurationMs(nextDuration);
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) {
            try {
              URL.revokeObjectURL(prev);
            } catch {}
          }
          return URL.createObjectURL(blob);
        });
      
        setStatus("review");
      };

      armTimeoutRef.current = window.setTimeout(() => {
        try {
            startedAtRef.current = Date.now();
            setDurationMs(0);
            recorder.start();
  
            clearDurationInterval();
            durationIntervalRef.current = window.setInterval(() => {
              if (startedAtRef.current) {
                setDurationMs(Math.max(0, Date.now() - startedAtRef.current));
              }
            }, 200);
  
            setStatus("recording");
        } catch {
          setStatus("error");
          setError("RECORDER_START_FAILED");
          stopTracks();
        }
      }, armDelayMs);

      return { ok: true };
    } catch (err) {
      stopTracks();
      setStatus("error");

      const message =
        err instanceof Error ? err.message : "MIC_PERMISSION_DENIED";

      setError(message || "MIC_PERMISSION_DENIED");
      return { ok: false, error: message || "MIC_PERMISSION_DENIED" };
    }
  }, [
    armDelayMs,
    clearArmTimeout,
    isSupported,
    preferredMimeType,
    resetRecordingArtifacts,
    status,
    stopTracks,
  ]);

  const cancel = useCallback(() => {
    if (status === "arming") {
      clearArmTimeout();
      stopTracks();
      mediaRecorderRef.current = null;
      resetRecordingArtifacts();
      setError(null);
      setStatus("idle");
      return;
    }

    if (status === "recording") {
        isCancellingRef.current = true;
      
        clearDurationInterval();
      
        try {
          mediaRecorderRef.current?.stop();
        } catch {
          // ignore
        }
      
        mediaRecorderRef.current = null;
        stopTracks();
        resetRecordingArtifacts();
        setError(null);
        setStatus("idle");
        return;
      }

    if (status === "review" || status === "error") {
      resetRecordingArtifacts();
      setError(null);
      setStatus("idle");
    }
  }, [clearArmTimeout, resetRecordingArtifacts, status, stopTracks]);

  const confirm = useCallback(() => {
    if (status !== "recording") return;

    try {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
    } catch {
      setStatus("error");
      setError("RECORDER_STOP_FAILED");
      stopTracks();
    }
  }, [status, stopTracks]);

  const setUploading = useCallback((value: boolean) => {
    setStatus((prev) => {
      if (value) return "uploading";
      if (prev === "uploading") return "idle";
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
    }
  }, [isSupported]);

  useEffect(() => {
    return () => {
      clearArmTimeout();
      clearDurationInterval();

      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }

      stopTracks();

      setAudioUrl((prev) => {
        if (prev) {
          try {
            URL.revokeObjectURL(prev);
          } catch {
            // ignore
          }
        }
        return null;
      });
    };
  }, [clearArmTimeout, clearDurationInterval, stopTracks]);

  return {
    isSupported,
    status,
    error,
    durationMs,
    audioBlob,
    audioUrl,
    isArming: status === "arming",
    isRecording: status === "recording",
    isReviewing: status === "review",
    isUploading: status === "uploading",
    start,
    cancel,
    confirm,
    setUploading,
    reset: hardReset,
  };
}