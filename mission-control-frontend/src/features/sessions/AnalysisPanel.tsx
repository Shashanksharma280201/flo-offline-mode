import { MdCopyAll } from "react-icons/md";
import { toast } from "react-toastify";
import VideoPanel from "./videoPanel/VideoPanel";
import GpsPanel from "./gpsPanel/GpsPanel";
import DistancePanel from "./distancePanel/DistancePanel";
import BatteryPanel from "./batteryPanel/BatteryPanel";
import WeightPanel from "./weightPanel/WeightPanel";
import { Link, useOutletContext, useParams } from "react-router-dom";
import MMRPanel from "./mmrPanel/MMRPanel";
import IMUPanel from "./imuPanel/IMUPanel";
import { RobotType } from "@/data/types";
import NissanPanels from "./nissanPanels/NissanPanels";
import BatteryErrorPanel from "./batteryPanel/BatteryErrorPanel";
import { useState } from "react";
import ImagesView from "./nissanPanels/ImagesView";

const AnalysisPanel = () => {
    const { robotId, sessionId } = useParams();
    const robot = useOutletContext<RobotType>();
    const isNissan = robot.fleet?.name.toLowerCase().includes("nissan");
    const [isShowingImages, setIsShowingImages] = useState(false);

    return (
        <div className="flex min-h-full flex-col gap-6 py-6 md:mt-0 md:gap-8 md:py-8">
            <div className="relative flex items-center justify-center gap-2 rounded-md  bg-border/30 p-3">
                <span>Session Id:</span>
                <div className="flex items-center gap-1">
                    <span> {sessionId}</span>
                    <button
                        onClick={async () => {
                            if (sessionId && robotId) {
                                await navigator.clipboard.writeText(
                                    `${robotId}/${sessionId}`
                                );
                                toast.success("Copied to clipboard");
                            } else {
                                toast.error("No valid session found");
                            }
                        }}
                        className="hover:opacity-75"
                    >
                        <MdCopyAll className="h-4 w-4" />
                    </button>
                </div>
                {isNissan ? (
                    <button
                        onClick={() => setIsShowingImages((prev) => !prev)}
                        className="absolute right-10 text-white/60 hover:text-white"
                    >
                        {isShowingImages ? "View metrics" : "View images"}
                    </button>
                ) : null}
            </div>
            {isShowingImages ? (
                <ImagesView />
            ) : (
                <section className="flex min-h-full w-full flex-col gap-6 md:grid md:grid-cols-2 md:gap-8 ">
                    {isNissan ? (
                        <NissanPanels />
                    ) : (
                        <>
                            <VideoPanel
                                robotId={robotId}
                                sessionId={sessionId}
                            />
                            <GpsPanel robotId={robotId} sessionId={sessionId} />
                            <DistancePanel
                                robotId={robotId}
                                sessionId={sessionId}
                            />
                            <WeightPanel
                                robotId={robotId}
                                sessionId={sessionId}
                            />
                            <BatteryPanel
                                robotId={robotId}
                                sessionId={sessionId}
                            />
                            <MMRPanel robotId={robotId} sessionId={sessionId} />
                            <IMUPanel robotId={robotId} sessionId={sessionId} />
                            <BatteryErrorPanel
                                robotId={robotId}
                                sessionId={sessionId}
                            />
                        </>
                    )}
                </section>
            )}
        </div>
    );
};

export default AnalysisPanel;
