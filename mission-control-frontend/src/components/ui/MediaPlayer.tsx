import React, { useState, useEffect, useCallback, useRef } from "react";
import { MdAudiotrack, MdClose } from "react-icons/md";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNextButton,
    CarouselPreviousButton
} from "./Carousel";
import { UseEmblaCarouselType } from "embla-carousel-react";

type MediaItem = File | { mediaType: string; url: string };

type MediaPlayerProps = {
    onClose: () => void;
    mediaItems: MediaItem[];
    scrollTo: number;
};

const MediaPlayer = React.memo(
    ({ onClose, mediaItems = [], scrollTo }: MediaPlayerProps) => {
        const [carouselApi, setCarouselApi] =
            useState<UseEmblaCarouselType[1]>();
        const [isPlaying, setIsPlaying] = useState(false);

        const handleScrollTo = useCallback(() => {
            if (carouselApi) {
                carouselApi.scrollTo(scrollTo);
            }
        }, [carouselApi, scrollTo]);

        useEffect(() => {
            handleScrollTo();
        }, [handleScrollTo]);

        const renderMediaItem = useCallback(
            (mediaItem: MediaItem, index: number) => {
                if ("type" in mediaItem) {
                    // Handle File type
                    if (mediaItem.type.includes("image")) {
                        return (
                            <img
                                key={index}
                                className="h-full w-full object-contain"
                                src={URL.createObjectURL(mediaItem)}
                                alt="Image attachment"
                            />
                        );
                    } else if (mediaItem.type.includes("video")) {
                        return (
                            <video
                                key={index}
                                controls
                                className="h-full w-full object-contain"
                                src={URL.createObjectURL(mediaItem)}
                            />
                        );
                    } else if (mediaItem.type.includes("audio")) {
                        return (
                            <audio
                                key={index}
                                controls
                                className="h-full w-full object-contain"
                            >
                                <source
                                    src={URL.createObjectURL(mediaItem)}
                                    type={mediaItem.type}
                                />
                            </audio>
                        );
                    }
                } else {
                    // Handle mediaItem with mediaType and url
                    const { mediaType, url } = mediaItem;
                    if (mediaType.includes("image")) {
                        return (
                            <img
                                key={index}
                                className="h-full w-full object-contain"
                                src={url}
                                alt="Image attachment"
                            />
                        );
                    } else if (mediaType.includes("video")) {
                        return (
                            <video
                                key={index}
                                controls
                                className="h-full w-full object-contain"
                                src={url}
                            />
                        );
                    } else if (mediaType.includes("audio")) {
                        return (
                            <div className="flex h-full w-full flex-col items-center justify-around">
                                <div className="relative flex h-72 w-72 items-center justify-center text-white">
                                    <MdAudiotrack className="h-56 w-56" />

                                    <div
                                        className={`absolute h-full w-full rounded-full bg-green-500 opacity-20  duration-1000 ${isPlaying ? "block animate-ping" : "hidden animate-none"}`}
                                    />
                                </div>

                                <audio
                                    onPlay={() => {
                                        setIsPlaying(true);
                                    }}
                                    onPause={() => {
                                        setIsPlaying(false);
                                    }}
                                    key={index}
                                    controls
                                    className="h-[20%] w-full object-contain"
                                >
                                    <source src={url} type={mediaType} />
                                </audio>
                            </div>
                        );
                    }
                }
            },
            [isPlaying]
        );

        return (
            <div className="fixed z-[10] flex h-screen w-screen items-center justify-center bg-background">
                <MdClose
                    onClick={onClose}
                    className="absolute right-6 top-6 z-[15] h-5 w-5 cursor-pointer text-white opacity-75 hover:opacity-100 md:right-8 md:top-8"
                />
                <Carousel
                    setApi={setCarouselApi}
                    className="flex h-full w-full flex-row items-center justify-center gap-6 p-6 md:gap-8 md:p-8"
                >
                    <CarouselPreviousButton className="rounded-full border border-border bg-backgroundGray p-2" />
                    <CarouselContent className="h-[80vh] w-[80vw]">
                        {mediaItems.map((mediaItem, index) => (
                            <CarouselItem className="h-full" key={index}>
                                {renderMediaItem(mediaItem, index)}
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselNextButton className="rounded-full border border-border bg-backgroundGray p-2" />
                </Carousel>
            </div>
        );
    }
);

export default MediaPlayer;
