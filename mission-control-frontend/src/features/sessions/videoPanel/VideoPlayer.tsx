import { useEffect, useRef, useState } from "react";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { VideoUrl } from "./VideoPanel";
import { useRobotSessionsStore } from "@/stores/robotSessionsStore";
import dayjs from "dayjs";
import { MdSwitchVideo } from "react-icons/md";

type VideoPlayerProps = {
    videoTimestamps: string[];
    videoUrls: VideoUrl[][];
    isLoading: boolean;
};

const VideoPlayer = ({
    videoTimestamps,
    videoUrls,
    isLoading
}: VideoPlayerProps) => {
    const [selectedVideo, setSelectedVideo] = useState<{
        timestampIndex: number;
        videoIndex: number;
    }>({ timestampIndex: 0, videoIndex: 0 });
    const videoRef = useRobotSessionsStore((state) => state.videoRef);
    const [currentVideoState, setCurrentVideoState] = useState<{
        currentTime: number;
        paused: boolean;
        ended: boolean;
    }>({
        currentTime: 0,
        paused: false,
        ended: false
    });
    // const videoPlayerRef = useRef<HTMLVideoElement>(null);
    const videoChangeHandler = (timestampIndex: number) => {
        setSelectedVideo((prevVideo) => ({ ...prevVideo, timestampIndex }));
    };

    const switchVideoHandler = () => {
        const numberOfVideos = videoUrls[selectedVideo.timestampIndex].length;
        if (videoRef.current) {
            setCurrentVideoState({
                currentTime: videoRef?.current.currentTime,
                paused: videoRef?.current.paused,
                ended: videoRef?.current.ended
            });
        }
        setSelectedVideo((prevVideo) => ({
            ...prevVideo,
            videoIndex: (prevVideo.videoIndex + 1) % numberOfVideos
        }));
    };
    function formatDate(timestamp: string) {
        // Check if the timestamp is a string and not a valid date
        if (typeof timestamp === "string" && !isNaN(Date.parse(timestamp))) {
            // If it's a valid date string
            return dayjs(timestamp).format("DD/MM/YYYY[,] hh:mm:ss a");
        } else {
            // If it's a number or a string representing a number
            return dayjs(Number(timestamp)).format("DD/MM/YYYY[,] hh:mm:ss a");
        }
    }

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = currentVideoState.currentTime;
            if (currentVideoState.paused) {
                videoRef.current.pause();
            }
        }
    }, [currentVideoState]);

    return (
        <section className="flex w-full flex-col items-start justify-center">
            {isLoading ? (
                <div className="flex min-h-[34rem] w-full items-center justify-center rounded-md border border-border bg-backgroundGray">
                    <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                </div>
            ) : !videoTimestamps.length || !videoUrls.length ? (
                <div className="flex min-h-[34rem] w-full items-center justify-center rounded-md border border-border bg-backgroundGray">
                    No feed Data to display
                </div>
            ) : (
                <div className="relative flex w-full flex-col justify-start  overflow-hidden rounded-md border border-border">
                    <video
                        ref={videoRef}
                        controls
                        autoPlay
                        src={
                            videoUrls[selectedVideo.timestampIndex][
                                selectedVideo.videoIndex
                            ].videoUrl
                        }
                    ></video>
                    <div
                        onClick={switchVideoHandler}
                        className="absolute right-6 top-6 cursor-pointer rounded-md bg-backgroundGray bg-opacity-75 p-3 md:right-8 md:top-8"
                    >
                        <MdSwitchVideo className="h-5 w-5" />
                    </div>
                    <ul className="no-scrollbar flex flex-1 overflow-x-scroll rounded-md  bg-black ">
                        {videoTimestamps.length > 0 &&
                            videoTimestamps.map((timestamp, index) => {
                                return (
                                    <li
                                        className={`flex min-w-fit  cursor-pointer flex-col items-center gap-2  border-t-2 bg-black p-4 text-xs hover:border-white  ${
                                            timestamp ===
                                            videoTimestamps[
                                                selectedVideo.timestampIndex
                                            ]
                                                ? "border-white "
                                                : "border-transparent"
                                        }   `}
                                        onClick={(event) => {
                                            videoChangeHandler(index);
                                        }}
                                        key={index}
                                        title={
                                            videoUrls[
                                                selectedVideo.timestampIndex
                                            ][selectedVideo.videoIndex].part
                                        }
                                    >
                                        {formatDate(timestamp)}
                                    </li>
                                );
                            })}
                    </ul>
                </div>
            )}
        </section>
    );
};
export default VideoPlayer;
