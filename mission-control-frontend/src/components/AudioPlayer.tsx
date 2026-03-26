import { useState, useRef, useEffect } from "react";
import { MdPlayArrow, MdPause, MdDownload } from "react-icons/md";

interface AudioPlayerProps {
    audioData: string;
    duration?: number;
}

export const AudioPlayer = ({ audioData, duration }: AudioPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setAudioDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("loadedmetadata", updateDuration);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = audioData;
        link.download = `audio-${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progress =
        audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    return (
        <div className="flex min-w-[200px] max-w-full items-center gap-2 rounded-lg border border-primary600/20 bg-primary600/10 px-2 py-2 sm:min-w-[250px] sm:px-3">
            <audio ref={audioRef} src={audioData} />

            <button
                type="button"
                onClick={togglePlayPause}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary600 text-black transition-colors hover:bg-primary700 sm:h-8 sm:w-8"
            >
                {isPlaying ? (
                    <MdPause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                    <MdPlayArrow className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
            </button>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary600/20">
                    <div
                        className="absolute h-full bg-primary600 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="truncate font-mono text-[10px] text-gray-400 sm:text-xs">
                    {formatTime(currentTime)} / {formatTime(audioDuration)}
                </span>
            </div>

            <button
                type="button"
                onClick={handleDownload}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-primary600 hover:bg-primary600/20 sm:h-8 sm:w-8"
                title="Download audio"
            >
                <MdDownload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
        </div>
    );
};
