// src/components/CommentInputBar.tsx
import React, { useState } from "react";
import styled from "styled-components";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { playerRef } from "./MusicFunction";

type Props = { trackId: string | null };

const Bar = styled.form`
  position: static;
  width: 100%;
  max-width: 320px; /* ◀ 더 넓게 사용 (이전 260px) */
  display: flex;
  align-items: center;
  gap: 8px; /* ◀ 이모지 간격 약간 축소 */
  padding: 10px 12px;
  background: rgba(24, 24, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(6px);
`;

const Input = styled.input`
  flex: 1;
  min-width: 0; /* ◀ 텍스트 영역이 최대한 넓게 */
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 15px;

  ::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
`;

const Emoji = styled.button`
  flex: none;
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 6px; /* ◀ 컴팩트 */
  border-radius: 10px;
  &:active {
    transform: scale(0.94);
  }
`;

const Send = styled.button`
  flex: none;
  min-width: 60px; /* ◀ 버튼은 컴팩트하게 */
  height: 32px;
  padding: 0 10px;
  background: #ff5500;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default function CommentInputBar({ trackId }: Props) {
  const [text, setText] = useState("");
  const disabled = !trackId || !text.trim();

  const post = async (content: string) => {
    if (!trackId) return;
    const u = auth.currentUser;
    let playbackTime = 0;
    try {
      if (playerRef.current?.getCurrentTime) {
        playbackTime = Math.floor(playerRef.current.getCurrentTime());
      }
      await addDoc(collection(db, "tracks", trackId, "comments"), {
        userId: u?.uid ?? null,
        nickname: u?.displayName ?? "익명",
        content,
        playbackTime,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });
    } catch (e) {
      console.error("댓글 전송 실패:", e);
      alert("댓글 전송에 실패했어요. 로그인/네트워크/권한을 확인해 주세요.");
      throw e;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    await post(content);
  };

  const reactEmoji = async (emoji: string) => {
    await post(emoji);
  };

  return (
    <Bar onSubmit={onSubmit}>
      <Input
        placeholder="Drop a comment"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Emoji type="button" onClick={() => reactEmoji("🔥")}>
        🔥
      </Emoji>
      <Emoji type="button" onClick={() => reactEmoji("👏")}>
        👏
      </Emoji>
      <Emoji type="button" onClick={() => reactEmoji("🥹")}>
        🥹
      </Emoji>
      <Emoji type="button" onClick={() => reactEmoji("❤️")}>
        ❤️
      </Emoji>
      <Send type="submit" disabled={disabled}>
        Send
      </Send>
    </Bar>
  );
}
