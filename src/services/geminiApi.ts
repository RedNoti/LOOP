// src/services/geminiApi.ts
export type Track = { title: string; artist: string; note?: string };

export interface GeminiResult {
  success: boolean;
  recommendations: string; // 원문 텍스트
  tracks?: Track[];        // 파싱된 구조화 결과
  error?: string;
  detail?: string;
}

export async function callGeminiAPI(query: string): Promise<GeminiResult> {
  const res = await fetch("http://localhost:5000/api/ai-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.detail || data?.error || "Gemini API 호출 실패");
  }
  return data as GeminiResult;
}

export {};