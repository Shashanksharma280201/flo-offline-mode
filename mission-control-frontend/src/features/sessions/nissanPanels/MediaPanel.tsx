import { useEffect, useState } from "react";
import { getNissanMediaFn } from "../sensorService";
import { errorLogger } from "@/util/errorLogger";
import { useMutation } from "react-query";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNextButton,
    CarouselPreviousButton
} from "@/components/ui/Carousel";

type MediaData = {
    images: string[];
    videos: string[];
};

const MediaPanel = ({
    robotId,
    sessionId
}: {
    robotId?: string;
    sessionId?: string;
}) => {
    const [mediaData, setMediaData] = useState<MediaData>();

    const { mutate: fetchMediaData, isLoading } = useMutation(
        ({ deviceId, sessionId }: { deviceId: string; sessionId: string }) =>
            getNissanMediaFn(deviceId, sessionId),
        {
            onSuccess: (data: MediaData) => {
                setMediaData(data);
            },
            onError: errorLogger
        }
    );

    useEffect(() => {
        if (robotId && sessionId) {
            fetchMediaData({
                deviceId: robotId,
                sessionId
            });
        }
        return () => {
            setMediaData(undefined);
        };
    }, []);

    return (
        <>
            <VideoPanel
                videoUrl={mediaData?.videos ? mediaData.videos[0] : ""}
            />
            <ImagesPanel images={mediaData?.images} />
        </>
    );
};

const VideoPanel = ({ videoUrl }: { videoUrl?: string }) => {
    return (
        <div className="flex w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Video Panel</span>
                <span className="text-base text-neutral-400">
                    The video feeds for the selected session
                </span>
            </div>
            {videoUrl ? (
                <video muted controls autoPlay src={videoUrl}></video>
            ) : (
                <div className="flex min-h-[25rem] w-full items-center justify-center rounded-md border border-border bg-backgroundGray">
                    No feed Data to display
                </div>
            )}
        </div>
    );
};

const ImagesPanel = ({ images }: { images?: string[] }) => {
    return (
        <div className="flex w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Images Panel</span>
                <span className="text-base text-neutral-400">
                    The images feeds for the selected session
                </span>
            </div>
            {images && images.length > 0 ? (
                <div className="flex w-full items-center justify-center rounded-md border border-border bg-backgroundGray">
                    <Carousel className="relative">
                        <CarouselContent style={{ height: "40vh" }}>
                            {images.map((image) => {
                                return (
                                    <CarouselItem
                                        key={image}
                                        className="relative flex rounded-md"
                                    >
                                        <img
                                            src={image}
                                            className="h-full w-full rounded-md object-contain"
                                        />
                                    </CarouselItem>
                                );
                            })}
                        </CarouselContent>
                        <CarouselPreviousButton className="absolute bottom-0 left-0 top-0 m-auto mx-2 rounded-full border-0  bg-black/60 text-white backdrop-blur-md" />
                        <CarouselNextButton className="absolute bottom-0 right-0 top-0 m-auto mx-2 rounded-full border-0  bg-black/60 text-white backdrop-blur-md " />
                    </Carousel>
                </div>
            ) : (
                <div className="flex min-h-[25rem] w-full items-center justify-center rounded-md border border-border bg-backgroundGray">
                    No feed Data to display
                </div>
            )}
        </div>
    );
};

export default MediaPanel;
