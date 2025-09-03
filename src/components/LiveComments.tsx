// src/components/LiveComments.tsx
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export type LiveComment = {
  id: string;
  userId?: string | null;
  nickname?: string | null;
  content: string;
  createdAt?: any; // Firestore Timestamp | number
  createdAtMs?: number; // 로컬 타임스탬프(ms)
  playbackTime?: number; // seconds (옵션)
};

type Props = { trackId: string | null; maxBubbles?: number };

const fadeInUp = keyframes`
  0% { opacity: 0; transform: translateY(12px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;
const fadeOut = keyframes`0% { opacity: 1; } 100% { opacity: 0; }`;

const Overlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 110px;
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 16px;
`;
const Bubble = styled.div`
  max-width: min(80vw, 520px);
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  padding: 10px 14px;
  border-radius: 999px;
  font-size: 14px;
  line-height: 1.25;
  white-space: pre-wrap;
  word-break: break-word;
  backdrop-filter: blur(3px);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.35);
  animation: ${fadeInUp} 180ms ease-out, ${fadeOut} 6s ease-in forwards;
`;

export default function LiveComments({ trackId, maxBubbles = 6 }: Props) {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [queue, setQueue] = useState<LiveComment[]>([]);
  const timerRef = useRef<number | null>(null);

  // Firestore 실시간 구독 (로컬 타임스탬프 정렬로 즉시 표시)
  useEffect(() => {
    if (!trackId) return;
    const q = query(
      collection(db, "tracks", trackId, "comments"),
      orderBy("createdAtMs", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs: LiveComment[] = [];
      snap.forEach((d) => {
        const x = d.data() as any;
        docs.push({
          id: d.id,
          userId: x.userId ?? null,
          nickname: x.nickname ?? null,
          content: x.content ?? "",
          createdAt: x.createdAt,
          createdAtMs: x.createdAtMs,
          playbackTime: x.playbackTime,
        });
      });
      // 최신→과거를 자연스럽게 보이도록 역순 큐
      setQueue(docs.reverse());
    });
    return () => unsub();
  }, [trackId]);

  // 큐에서 일정 간격으로 버블 흘려보내기
  useEffect(() => {
    if (!queue.length) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      setComments((prev) => {
        const next = [...prev, queue[i]];
        if (next.length > maxBubbles) next.splice(0, next.length - maxBubbles);
        return next;
      });
      i++;
      if (i >= queue.length && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 900) as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [queue, maxBubbles]);

  if (!trackId) return null;
  return (
    <Overlay aria-live="polite" aria-relevant="additions">
      {comments.map((c) => (
        <Bubble key={c.id} role="status">
          {c.content}
        </Bubble>
      ))}
    </Overlay>
  );
}
