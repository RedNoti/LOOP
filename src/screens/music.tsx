import React from "react";
import YouTube from "react-youtube";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "../components/MusicFunction";

const YouTubeMusicPlayer: React.FC = () => {
  const {
    playlist,
    isLoading,
    isPlaying,
    volume,
    currentTrack,
    onReady,
    onStateChange,
    nextTrack,
    prevTrack,
    playPause,
    changeVolume,
  } = useMusicPlayer();

  // 플레이리스트가 비어있으면 로딩 표시
  if (isLoading || playlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-900 text-white rounded-lg shadow-lg w-96 h-96 mx-auto mt-10">
        <div className="text-xl">Loading music...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 bg-gray-900 text-white rounded-lg shadow-lg w-96 mx-auto mt-10">
      {/* 앨범 아트 표시 */}
      <div className="w-64 h-64 mb-6 overflow-hidden rounded-lg shadow-lg">
        <img
          src={currentTrack.thumbnail}
          alt="Album art"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />
      </div>

      {/* 현재 곡 제목 표시 */}
      <p className="font-medium text-lg mb-4 text-center line-clamp-2">
        {currentTrack.title}
      </p>

      <YouTube
        videoId={currentTrack.id}
        opts={{
          height: "0",
          width: "0",
          playerVars: {
            autoplay: 1,
            controls: 0,
            showinfo: 0,
            modestbranding: 1,
            rel: 0,
          },
        }}
        onReady={onReady}
        onStateChange={onStateChange}
        onEnd={nextTrack}
      />

      <div className="flex gap-6 mt-4 w-full justify-center items-center">
        <button
          className="p-2 text-gray-300 hover:text-white transition"
          onClick={prevTrack}
          aria-label="Previous track"
        >
          <SkipBack size={24} />
        </button>
        <button
          className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition"
          onClick={playPause}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          className="p-2 text-gray-300 hover:text-white transition"
          onClick={nextTrack}
          aria-label="Next track"
        >
          <SkipForward size={24} />
        </button>
      </div>

      <div className="mt-6 w-full">
        <div className="flex justify-between items-center">
          <Volume2 size={16} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={changeVolume}
            className="mx-2 flex-grow"
          />
          <span className="text-xs text-gray-400">{volume}%</span>
        </div>
      </div>
    </div>
  );
};

export default YouTubeMusicPlayer;
