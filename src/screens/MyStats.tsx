// src/screens/MyStats.tsx
import React, { useMemo, useCallback } from "react";
import styled from "styled-components";
import { buildStatsSummary } from "../components/listeningStats";
import { clearHistory } from "../components/listeningHistory";

const Wrap = styled.div`
  padding: 16px;
  background: var(--surface, #0a0a0a);
  color: var(--text-primary, #fff);
  min-height: 100vh;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 16px 0 8px;
`;

const Card = styled.div`
  background: var(--card-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 4px 0;
  font-size: 0.9rem;
`;

const DangerButton = styled.button`
  background: #ff3b30;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 0.8rem;
  cursor: pointer;
`;

function formatDuration(sec: number) {
  // 초 -> "Xm Ys" 로 보기 좋게
  const minutes = Math.floor(sec / 60);
  const remain = sec % 60;
  return `${minutes}m ${remain}s`;
}

// YouTube 썸네일 헬퍼
function youtubeThumb(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default function MyStats() {
  const { totalSec, topTracks, buckets, history } = useMemo(() => {
    return buildStatsSummary();
  }, []);

  const handleClear = useCallback(() => {
    const ok = window.confirm(
      "정말로 청취 기록을 모두 삭제할까요?\n(이 데이터는 이 브라우저에만 저장되어 있습니다)"
    );
    if (!ok) return;
    clearHistory();
    window.location.reload();
  }, []);

  return (
    <Wrap>
      <SectionTitle>나의 청취 리포트</SectionTitle>
      <p style={{ fontSize: "0.8rem", opacity: 0.7, lineHeight: 1.4 }}>
        이 통계는 <strong>이 브라우저(이 기기)</strong>에만 저장된
        청취 기록을 기반으로 계산됩니다.
        {"\n"}다른 기기에서는 다른 결과가 나올 수 있어요.
      </p>

      <Card>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>
          총 재생 시간
        </h3>
        <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
          {formatDuration(totalSec)} 들었어요
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>
          많이 들은 곡 TOP 5
        </h3>
        {topTracks.length === 0 && (
          <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>
            아직 들은 곡 기록이 충분하지 않아요 🎧
          </div>
        )}

        {topTracks.map((t, i) => (
          <Row key={t.videoId}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img
                src={youtubeThumb(t.videoId)}
                alt={t.title}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  objectFit: "cover",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600 }}>
                  {i + 1}. {t.title}
                </span>
                {t.artist && (
                  <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                    {t.artist}
                  </span>
                )}
              </div>
            </div>

            <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>
              {formatDuration(t.totalSec)}
            </div>
          </Row>
        ))}
      </Card>

      <Card>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>
          언제 가장 많이 듣나요?
        </h3>
        <Row>
          <div>새벽 (0~5시)</div>
          <div>{formatDuration(buckets.night)}</div>
        </Row>
        <Row>
          <div>아침 (6~11시)</div>
          <div>{formatDuration(buckets.morning)}</div>
        </Row>
        <Row>
          <div>낮 (12~17시)</div>
          <div>{formatDuration(buckets.afternoon)}</div>
        </Row>
        <Row>
          <div>저녁 (18~23시)</div>
          <div>{formatDuration(buckets.evening)}</div>
        </Row>
      </Card>

      <Card>
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: 8,
            color: "#ff3b30",
          }}
        >
          기록 관리
        </h3>
        <p
          style={{
            fontSize: "0.8rem",
            lineHeight: 1.4,
            marginBottom: 12,
            opacity: 0.8,
          }}
        >
          지금까지 저장된 세션 수:{" "}
          <strong>{history.length}회</strong>
        </p>
        <DangerButton onClick={handleClear}>청취 기록 전체 삭제</DangerButton>
      </Card>
    </Wrap>
  );
}
