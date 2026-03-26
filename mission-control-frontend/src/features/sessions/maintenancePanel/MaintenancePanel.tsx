import dayjs from "dayjs";
import { MdClose, MdLocationPin, MdPerson, MdWatchLater } from "react-icons/md";
import { MaintenanceStep } from "./MaintenanceStep";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNextButton,
    CarouselPreviousButton
} from "@/components/ui/Carousel";
import { useEffect, useState } from "react";
import { getSingleMaintenanceData } from "@/features/calendarView/services/robotCalendarService";
import { useMutation } from "react-query";
import { FaRobot } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { errorLogger } from "@/util/errorLogger";
import { ChromeSkeleton } from "@/components/ui/Skeleton";

const MaintenancePanel = () => {
    const { robotId, maintenanceId } = useParams();

    const [maintenanceData, setMaintenanceData] = useState<{
        [task: string]: { task: string; images: string[] };
    }>();
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    const [metadata, setMetadata] = useState<{
        robotName: string;
        operatorName: string;
        clientName: string;
        timestamp: string;
    }>();

    const closeFullScreenHandler = () => {
        setIsFullScreen(false);
    };

    const fetchSingleMaintenanceDataMutation = useMutation({
        mutationFn: ({
            robotId,
            submissionTimestamp
        }: {
            robotId: string;
            submissionTimestamp: number;
        }) => getSingleMaintenanceData(robotId, submissionTimestamp),
        onSuccess: ({
            metadata,
            maintenanceData
        }: {
            metadata: {
                robotName: string;
                operatorName: string;
                clientName: string;
                timestamp: string;
            };
            maintenanceData: {
                [task: string]: { task: string; images: string[] };
            };
        }) => {
            setMetadata(metadata);
            setMaintenanceData(maintenanceData);
        },
        onError: (error) => errorLogger(error)
    });

    useEffect(() => {
        if (robotId && maintenanceId) {
            fetchSingleMaintenanceDataMutation.mutate({
                robotId,
                submissionTimestamp: +maintenanceId
            });
        }
    }, []);

    if (!fetchSingleMaintenanceDataMutation.isLoading && !metadata) {
        return (
            <div className="flex justify-center p-6 text-xl">
                {" "}
                No maintenance data was found
            </div>
        );
    }

    return isFullScreen ? (
        <div className="fixed left-0 top-0 z-[2000] h-screen w-screen bg-background">
            <button
                onClick={closeFullScreenHandler}
                className="group absolute right-6 top-6 z-10 rounded-full bg-black p-2 backdrop-blur-md hover:bg-white"
            >
                <MdClose
                    size={24}
                    className="text-white group-hover:text-black"
                />
            </button>
            <Carousel className="relative h-screen w-screen">
                <CarouselContent style={{ height: "100vh" }}>
                    {selectedImages.map((image) => {
                        return (
                            <CarouselItem
                                key={image}
                                className="relative flex rounded-md"
                            >
                                <img
                                    src={image}
                                    className="h-full w-full rounded-md object-cover"
                                />
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
                <CarouselPreviousButton className="absolute bottom-0 left-0 top-0 m-auto rounded-full border-0 bg-black" />
                <CarouselNextButton className="absolute bottom-0 right-0 top-0 m-auto rounded-full border-0 bg-black" />
            </Carousel>
        </div>
    ) : (
        <div className="flex flex-col-reverse gap-6 py-6 sm:flex-row ">
            <div className="hidden basis-4/12 self-start md:block">
                <div className=" flex flex-col gap-3 rounded-md bg-backgroundGray/50 p-6">
                    <h2 className="text-2xl">Maintenance Steps</h2>
                    <ul className="flex flex-col gap-2">
                        {fetchSingleMaintenanceDataMutation.isLoading
                            ? Array.from({ length: 5 }, (_, i) => i).map(
                                  (x) => <ChromeSkeleton key={x} />
                              )
                            : maintenanceData &&
                              Object.keys(maintenanceData).map((taskId) => {
                                  const handleScroll = () => {
                                      const taskItem =
                                          document.getElementById(taskId);

                                      if (taskItem) {
                                          taskItem.scrollIntoView({
                                              behavior: "smooth"
                                          });
                                      }
                                  };
                                  return (
                                      <li
                                          key={taskId}
                                          onClick={handleScroll}
                                          className={`cursor-pointer text-sm text-slate-400`}
                                      >
                                          {"> "} {maintenanceData[taskId].task}
                                      </li>
                                  );
                              })}
                        {maintenanceData &&
                            Object.keys(maintenanceData).length === 0 && (
                                <span className="text-white">
                                    No maintenance steps found
                                </span>
                            )}
                    </ul>
                </div>
            </div>
            <div className="flex basis-6/12 flex-col gap-3 sm:basis-8/12 ">
                {fetchSingleMaintenanceDataMutation.isLoading ? (
                    <div className="flex flex-col gap-6">
                        {Array.from({ length: 3 }, (_, i) => i).map((x) => (
                            <FeedSkeleton key={x} />
                        ))}
                    </div>
                ) : (
                    maintenanceData &&
                    Object.keys(maintenanceData).map((taskId) => {
                        const fullScreenHandler = () => {
                            setSelectedImages(maintenanceData[taskId].images);
                            setIsFullScreen(true);
                        };

                        return (
                            <MaintenanceStep
                                key={taskId}
                                onFullScreenClick={fullScreenHandler}
                                taskId={taskId}
                                taskData={maintenanceData[taskId]}
                            />
                        );
                    })
                )}
            </div>
            <div className="basis-2/12 sm:basis-4/12">
                <div className="flex flex-col gap-3 rounded-md bg-backgroundGray/50 p-6">
                    <h2 className="text-2xl">Meta information</h2>
                    {fetchSingleMaintenanceDataMutation.isLoading ? (
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 3 }, (_, i) => i).map((x) => (
                                <ChromeSkeleton key={x} />
                            ))}
                        </div>
                    ) : metadata ? (
                        <div className="flex flex-col gap-2">
                            <h3 className="flex gap-3 text-slate-400">
                                <MdLocationPin size={24} color="white" />
                                <span>{metadata.clientName}</span>
                            </h3>
                            <h3 className="flex gap-3 text-slate-400">
                                <MdPerson size={24} color="white" />
                                <span>{metadata.operatorName}</span>
                            </h3>
                            <h3 className="flex gap-3 text-slate-400">
                                <FaRobot size={24} color="white" />
                                <span>{metadata.robotName}</span>
                            </h3>
                            <h3 className="flex gap-3 text-slate-400">
                                <MdWatchLater size={24} color="white" />
                                <span>
                                    {dayjs(metadata.timestamp).format(
                                        "D MMM, YYYY h:mm:ss A"
                                    )}
                                </span>
                            </h3>
                        </div>
                    ) : (
                        <span>No meta information available</span>
                    )}
                </div>
            </div>
        </div>
    );
};
export default MaintenancePanel;

const FeedSkeleton = () => {
    return (
        <div className="flex flex-col gap-4 rounded-md bg-backgroundGray/50 p-6">
            <div className="flex flex-col gap-2">
                <ChromeSkeleton className="h-6 w-[70%]" />
                <ChromeSkeleton className="h-5 w-[80%]" />
            </div>
            <ChromeSkeleton
                className="h-[400px]"
                chromeClassName="h-[400%] rotate-45"
            />
        </div>
    );
};
