import { Gnss } from "@/data/types";
import GpsTrack from "../gpsPanel/GpsTrack";
import dayjs from "dayjs";
import { NissanLineChart } from "./NissanLineChart";

const GnssPanels = ({ gpsData }: { gpsData: Gnss[] }) => {
    return (
        <>
            <MapPanel
                description="The path taken during the session"
                gpsData={gpsData}
                isLoading={false}
                title="GPS Panel"
            />
            <NissanLineChart
                allDates={gpsData.map((data) =>
                    dayjs(data.timestamp).valueOf()
                )}
                data={gpsData}
                dataKey="speed"
                description="Plot of speed timeseries data"
                emptyDataMessage="No speed data to display"
                title="Speed"
                tooltipKey="Speed: "
                units="kmph"
            />
        </>
    );
};

const MapPanel = ({
    gpsData,
    isLoading,
    title,
    description
}: {
    gpsData: Gnss[];
    isLoading: boolean;
    title: string;
    description: string;
}) => {
    return (
        <div className="flex min-h-[30rem] w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">{title}</span>
                <span className="text-base text-neutral-400">
                    {description}
                </span>
            </div>

            <GpsTrack coordinates={gpsData} />
        </div>
    );
};

export default GnssPanels;
