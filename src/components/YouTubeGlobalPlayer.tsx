// 📄 YouTubeGlobalPlayer 컴포넌트 - 유튜브 음악을 전역에서 재생시키는 숨겨진 플레이어입니다.
import React from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useMusicPlayer, playerRef } from "./MusicFunction";

const YouTubeGlobalPlayer = () => {
  const { currentVideoId, onReady, onStateChange, onEnd } = useMusicPlayer();

  if (!currentVideoId) return null;

  return (  // 🔚 컴포넌트의 JSX 반환 시작
    <div style={{ display: "none" }}>
      <YouTube
        videoId={currentVideoId}
        opts={{
          height: "0",
          width: "0",
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
          },
        }}
        onReady={(e: YouTubeEvent<YouTubePlayer>) => {
          // 🔥 핵심: 여기에서 playerRef.current 설정해줘야 playPause()에서 작동함!
          playerRef.current = e.target;
          onReady(e);
        }}
        onStateChange={onStateChange}
        onEnd={onEnd}
      />
    </div>
  );
};

export default YouTubeGlobalPlayer;