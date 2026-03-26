import { AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import dayjs from "dayjs";
import { useState } from "react";

const MapMarkerWithTooltip = ({
    title,
    tooltipText,
    attendanceLocationWithTime,
    markerColor,
    glyphColor = "#FFFFFF"
}: {
    title: string;
    tooltipText: string;
    attendanceLocationWithTime: {
        location: {
            lat: number;
            lng: number;
        };
        time: string;
    };
    markerColor: string;
    glyphColor?: string;
}) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    return (
        <AdvancedMarker
            onClick={() => setIsTooltipVisible((prev) => !prev)}
            title={title}
            position={{
                lat: attendanceLocationWithTime.location.lat,
                lng: attendanceLocationWithTime.location.lng
            }}
        >
            <Pin
                background={markerColor}
                glyphColor={glyphColor}
                borderColor={markerColor}
            >
                {isTooltipVisible && (
                    <div className="absolute -left-12 -top-2  w-32 rounded-md bg-black p-2 text-center">
                        {tooltipText}{" "}
                        {dayjs(attendanceLocationWithTime.time).format(
                            "h:mm A"
                        )}
                    </div>
                )}
            </Pin>
        </AdvancedMarker>
    );
};
export default MapMarkerWithTooltip;
