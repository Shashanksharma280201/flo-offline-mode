import { FC } from "react";
import { Gnss } from "@/data/types";
import { MapPanel } from "@/features/sessions/gpsPanel/GpsPanel";

interface RobotPathPanelProps {
    gnssData: Gnss[];
}

const RobotPathPanel: FC<RobotPathPanelProps> = ({ gnssData }) => {
    return (
        <MapPanel
            title="Robot GPS Path"
            description="Path travelled by the robot(s) based on GPS data"
            gpsData={gnssData}
            isLoading={false}
        />
    );
};

export default RobotPathPanel;
