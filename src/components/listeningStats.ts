// src/components/listeningStats.ts
// 청취 기록(listeningHistory)을 바탕으로 통계를 뽑는 계산 유틸들

import { loadHistory, type HistoryItem } from "./listeningHistory";

/** 전체 총 청취 시간(초) */
export function getTotalSeconds(items: HistoryItem[]): number {
  return items.reduce((sum, it) => sum + it.durationSec, 0);
}

/** 곡별 누적 시간 TOP N 반환 */
export function getTopTracks(items: HistoryItem[], topN = 5) {
  // videoId별로 durationSec 합산
  const map: Record<
    string,
    { title: string; artist?: string; totalSec: number }
  > = {};

  for (const it of items) {
    if (!map[it.videoId]) {
      map[it.videoId] = {
        title: it.title,
        artist: it.artist,
        totalSec: 0,
      };
    }
    map[it.videoId].totalSec += it.durationSec;
  }

  // 정렬 후 상위만 잘라서 반환
  const arr = Object.entries(map).map(([videoId, data]) => ({
    videoId,
    title: data.title,
    artist: data.artist,
    totalSec: data.totalSec,
  }));

  arr.sort((a, b) => b.totalSec - a.totalSec);

  return arr.slice(0, topN);
}

/** 시간대 버킷 (내가 언제 많이 듣는지) */
export function getTimeOfDayBuckets(items: HistoryItem[]) {
  // 시간대 구간을 4개로 나눕니다.
  const buckets = {
    night: 0,     // 0~5시
    morning: 0,   // 6~11시
    afternoon: 0, // 12~17시
    evening: 0,   // 18~23시
  };

  for (const it of items) {
    const d = new Date(it.tsStart);
    const hour = d.getHours(); // 0~23

    if (hour <= 5) buckets.night += it.durationSec;
    else if (hour <= 11) buckets.morning += it.durationSec;
    else if (hour <= 17) buckets.afternoon += it.durationSec;
    else buckets.evening += it.durationSec;
  }

  return buckets;
}

/** UI 컴포넌트에서 한 번에 쓰기 좋은 shape */
export function buildStatsSummary() {
  const history = loadHistory();

  const totalSec = getTotalSeconds(history);
  const topTracks = getTopTracks(history, 5);
  const buckets = getTimeOfDayBuckets(history);

  return {
    history,
    totalSec,
    topTracks,
    buckets,
  };
}
