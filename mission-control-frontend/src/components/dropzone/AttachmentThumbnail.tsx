import { cn } from "@/lib/utils";
import { useState } from "react";
import { MdAudiotrack, MdVideocam } from "react-icons/md";
import { ChromeSkeleton, Skeleton } from "../ui/Skeleton";

type AttachmentThumbnailProps = {
    attachment: File | { mediaType: string; url: string };
    className?: string;
    onClick: React.MouseEventHandler | undefined;
};

const AttachmentThumbnail = ({
    attachment,
    className,
    onClick
}: AttachmentThumbnailProps) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const src =
        "url" in attachment ? attachment.url : URL.createObjectURL(attachment);
    const mediaType =
        "mediaType" in attachment ? attachment.mediaType : attachment.type;
    if (mediaType.includes("image")) {
        return (
            <>
                <Skeleton
                    className={`h-24 w-24 animate-pulse ${imageLoaded ? "h-0" : "flex"}`}
                />
                <img
                    onClick={onClick}
                    className={cn(
                        `h-full w-full cursor-pointer object-cover ${imageLoaded ? "visible" : "invisible"} `,
                        className
                    )}
                    src={src}
                    onLoad={() => setImageLoaded(true)}
                    alt="Image attachment"
                />
            </>
        );
    } else if (mediaType.includes("video")) {
        return (
            <div onClick={onClick} className="relative h-full w-full">
                <video
                    className={cn([
                        "h-full w-full cursor-pointer object-cover",
                        className
                    ])}
                    src={src}
                />
                <MdVideocam className="absolute left-1 top-1 h-4 w-4 text-white" />
            </div>
        );
    } else if (mediaType.includes("audio")) {
        return (
            <div
                onClick={onClick}
                className="relative flex h-full w-full cursor-pointer items-center justify-center"
            >
                <audio
                    className={cn(["h-full w-full object-cover ", className])}
                    src={src}
                />
                <MdAudiotrack className="absolute h-5 w-5 text-white" />
            </div>
        );
    }

    return null;
};
export default AttachmentThumbnail;
