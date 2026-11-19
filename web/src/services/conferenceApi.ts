export interface ConferenceReply {
  answer: string;
  citations: Array<{
    code: string;
    code_title: string;
    article: string;
    lex_uz: string;
  }>;
  audio_base64: string | null;
  audio_mime_type: string | null;
  tts_provider: "openai" | "elevenlabs" | null;
  retrieval_mode?: string;
}

export async function askConferenceSpeaker(
  message: string,
  signal: AbortSignal,
): Promise<ConferenceReply> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null
      ? (payload as { error?: unknown }).error
      : null;
    throw new Error(typeof detail === "string" ? detail : "Javob olishda xatolik yuz berdi.");
  }
  if (
    typeof payload !== "object" || payload === null ||
    typeof (payload as { answer?: unknown }).answer !== "string"
  ) {
    throw new Error("Server javob formati noto‘g‘ri.");
  }
  return payload as ConferenceReply;
}
