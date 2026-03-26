import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import VideoPlayer from "./VideoPlayer";
import { getVideoDataFn } from "../sensorService";
import { errorLogger } from "../../../util/errorLogger";

type VideoPanelProps = {
    robotId?: string;
    sessionId?: string;
};

export type VideoUrl = {
    name: string;
    part: string;
    videoUrl: string;
    startTimestamp: number;
    endTimestamp: number;
};

/**
 *
 * Video captured by the robot during the session
 *
 */
const VideoPanel = ({ robotId, sessionId }: VideoPanelProps) => {
    const [videoData, setVideoData] = useState<{
        [timestamp: string]: VideoUrl[];
    }>({});
    const [isFetched, setIsFetched] = useState(false);

    const { mutate: fetchVideoData, isLoading } = useMutation(
        ({ robotId, sessionId }: { robotId: string; sessionId: string }) =>
            getVideoDataFn(robotId, sessionId),
        {
            onSuccess: (data: VideoUrl[]) => {
                const videoData = data.reduce<{
                    [timestamp: string]: VideoUrl[];
                }>((prev, curr) => {
                    if (prev[curr.startTimestamp]) {
                        prev[curr.startTimestamp].push(curr);
                    } else {
                        prev[curr.startTimestamp] = [curr];
                    }
                    return prev;
                }, {});
                console.log({ video: data });
                setVideoData(videoData);
                setIsFetched(true);
            },
            onError: (error: any) => {
                errorLogger(error);
                setIsFetched(true);
            }
        }
    );

    useEffect(() => {
        if (robotId && sessionId) {
            fetchVideoData({
                robotId,
                sessionId
            });
        }
        return () => {
            setVideoData({});
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    if (isFetched && Object.keys(videoData).length === 0) {
        return null;
    }

    return (
        <div className="flex w-full flex-col gap-6 rounded-xl bg-slate-800 border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Video Panel</span>
                <span className="text-base text-neutral-400">
                    The video feeds for the selected session
                </span>
            </div>

            <VideoPlayer
                videoTimestamps={Object.keys(videoData)}
                videoUrls={Object.values(videoData)}
                isLoading={isLoading || !isFetched}
            />
        </div>
    );
};

export default VideoPanel;
