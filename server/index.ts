// server/index.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 5000);
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || (isProd ? "https://your-frontend-domain.com" : "http://localhost:3000");

// Node 18+: fetch/AbortController 내장

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"], // OPTIONS 포함 (CORS preflight)
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

// 헬스체크
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, env: isProd ? "production" : "development", ts: new Date().toISOString() });
});

// GET으로 잘못 호출 시 405(JSON) 고정
app.get("/api/ai-search", (_req: Request, res: Response) => {
  res.status(405).json({ success: false, error: "method_not_allowed", message: "Use POST /api/ai-search" });
});

// 실제 AI 검색
app.post("/api/ai-search", async (req: Request, res: Response) => {
  try {
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY missing");
      return res.status(500).json({ success: false, error: "server_config_error" });
    }

    const { query } = (req.body ?? {}) as { query?: string };

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: "empty_query",
        message: "검색어를 입력해주세요.",
      });
    }
    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: "query_too_long",
        message: "검색어가 너무 깁니다.",
      });
    }

    const sanitized = query.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    const prompt = buildPrompt(sanitized);
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15_000);

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API 오류:", response.status, errorText);
      return res.status(502).json({ success: false, error: "gemini_error", detail: errorText });
    }

    const data: any = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const tracks = parseTracks(text);

    console.log("✅ Gemini API 응답 생성 완료");
    return res.json({ success: true, recommendations: text, tracks });
  } catch (error: any) {
    const aborted = error?.name === "AbortError";
    console.error("❌ 서버 오류:", aborted ? "timeout" : error?.message);
    return res.status(aborted ? 504 : 500).json({
      success: false,
      error: aborted ? "timeout" : "server_error",
      detail: error?.message,
    });
  }
});

// ---- helpers ----
function buildPrompt(query: string): string {
  return `당신은 LOOP 음악 앱의 AI 추천 전문가입니다. 사용자의 요청에 따라 YouTube에서 검색 가능한 구체적인 노래 제목과 아티스트를 추천해주세요.

사용자 요청: ${query}

형식(중요):
- 각 줄은 반드시 "노래 제목 - 아티스트명" 한 쌍만 포함
- 번호/불릿 허용 (예: "1) " 또는 "- "), 단 한 줄에 노래 1개만
- 노트(설명)는 곡명 뒤 괄호로 10자 이내 (선택)

예시:
- 밤편지 - 아이유 (포크 발라드)
- Blueming - 아이유 (팝 록)

주의: 실제로 존재하고 YouTube에서 검색 가능한 곡만.`;
}

function parseTracks(text: string) {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[\-\d\.\)]\s*/, "").trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?)-(.*?)(?:\s*\(([^()]*)\))?\s*$/);
      if (!m) return null;
      const title = m[1]?.trim();
      const artist = m[2]?.trim();
      const note = m[3]?.trim();
      if (!title || !artist) return null;
      return { title, artist, note };
    })
    .filter(Boolean) as Array<{ title: string; artist: string; note?: string }>;
}

// API 404는 항상 JSON(마지막에 배치)
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "not_found", message: "API route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 LOOP Gemini API 서버가 포트 ${PORT}에서 실행 중입니다. (${isProd ? "production" : "development"})`);
  console.log(`🌐 허용 Origin: ${FRONTEND_URL}`);
});
