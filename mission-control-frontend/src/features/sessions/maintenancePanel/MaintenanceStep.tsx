import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNextButton,
    CarouselPreviousButton
} from "@/components/ui/Carousel";
import { MdFullscreen } from "react-icons/md";

export const MaintenanceStep = ({
    onFullScreenClick,
    taskId,
    taskData
}: {
    onFullScreenClick: () => void;
    taskId: string;
    taskData: { task: string; images: string[] };
}) => {
    const taskIdFormatted = taskId.split("-").join(" ");
    return (
        <div
            id={taskId}
            className="flex w-full flex-col gap-6  rounded-md  bg-backgroundGray/50 px-4  py-4  md:px-4 "
        >
            <div>
                <h3 className="text-2xl text-white">
                    {taskIdFormatted.charAt(0).toUpperCase() +
                        taskIdFormatted.substring(1)}
                </h3>
                <h4 className="text-slate-400">{taskData.task}</h4>
            </div>
            <Carousel className="relative">
                <CarouselContent style={{ height: "75vh" }}>
                    {taskData.images.map((image) => {
                        return (
                            <CarouselItem
                                key={image}
                                className="relative flex rounded-md"
                            >
                                <img
                                    src={image}
                                    className="h-full w-full rounded-md object-cover"
                                />
                                <MdFullscreen
                                    size={24}
                                    color="white"
                                    onClick={onFullScreenClick}
                                    className="absolute right-2 top-2 md:hidden"
                                />
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
                <CarouselPreviousButton className="absolute bottom-0 left-0 top-0 m-auto mx-2 rounded-full border-0  bg-black/60 text-white backdrop-blur-md" />
                <CarouselNextButton className="absolute bottom-0 right-0 top-0 m-auto mx-2 rounded-full border-0  bg-black/60 text-white backdrop-blur-md " />
            </Carousel>
        </div>
    );
};
