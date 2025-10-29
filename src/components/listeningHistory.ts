// src/components/listeningHistory.ts
// 이 파일은 개별 청취 세션을 localStorage에 쌓아두는 역할입니다.

const HISTORY_KEY = "listening_history_v1";

// 한 번 들은 기록 한 건
export type HistoryItem = {
  videoId: string;      // YouTube 영상 ID (또는 트랙 고유 ID)
  title: string;        // 곡 제목
  artist?: string;      // 아티스트 / 채널명(있을 경우)
  tsStart: number;      // 언제 듣기 시작했는지 (Date.now() ms)
  durationSec: number;  // 실제로 들은 시간(초)
};

/** 현재까지의 히스토리 배열 불러오기 */
export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryItem[];
  } catch (err) {
    console.error("[listeningHistory] loadHistory failed:", err);
    return [];
  }
}

/** 히스토리에 새 기록 1건 추가하고 저장 */
export function appendHistory(item: HistoryItem) {
  const list = loadHistory();
  list.push(item);

  // 용량 관리: 너무 무한정 커지지 않도록 최근 1000개만 유지
  const MAX = 1000;
  const sliced = list.slice(-MAX);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(sliced));
}

/** 전체 히스토리 초기화 (사용자 '리셋' 버튼에서 호출할 수 있음) */
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
