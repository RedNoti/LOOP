// 📄 YouTubeGlobalPlayer 컴포넌트 - 유튜브 음악을 전역에서 재생시키는 숨겨진 플레이어입니다.
import React, { useEffect } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useMusic, playerRef, playerReadyRef } from "./MusicFunction";

const YouTubeGlobalPlayer = () => {
  const { currentVideoId, onReady, onStateChange, onEnd } = useMusic();

  useEffect(() => {
    // 플레이어가 준비되었고 currentVideoId가 있을 때만 비디오 로드
    if (playerReadyRef.current && currentVideoId && playerRef.current) {
      try {
        playerRef.current.loadVideoById(currentVideoId);
      } catch (error) {
        console.error("비디오 로드 중 오류 발생:", error);
      }
    }
  }, [currentVideoId]);

  if (!currentVideoId) return null;

  return (
    // 🔚 컴포넌트의 JSX 반환 시작
    <div style={{ display: "none" }}>
      <YouTube
        videoId={currentVideoId}
        opts={{
          height: "0",
          width: "0",
          playerVars: {
            autoplay: 0, // 자동 재생 비활성화
            controls: 0,
            modestbranding: 1,
            rel: 0,
          },
        }}
        onReady={(e: YouTubeEvent<YouTubePlayer>) => {
          // 🔥 핵심: 여기에서 playerRef.current 설정해줘야 playPause()에서 작동함!
          playerRef.current = e.target;
          playerReadyRef.current = true;
          onReady(e);
        }}
        onStateChange={onStateChange}
        onEnd={onEnd}
        onError={(e: YouTubeEvent<YouTubePlayer>) => {
          console.error("YouTube 플레이어 에러:", e);
        }}
      />
    </div>
  );
};

export default YouTubeGlobalPlayer;
