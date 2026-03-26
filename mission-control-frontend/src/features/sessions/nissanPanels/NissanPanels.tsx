import { useParams } from "react-router-dom";
import SystemMetricsPanel from "./SystemMetricsPanel";
import { Gnss } from "@/data/types";
import { getNissanSystemMetrics } from "../sensorService";
import { useMutation } from "react-query";
import { useEffect, useState } from "react";
import { errorLogger } from "@/util/errorLogger";
import GnssPanels from "./GnssPanels";

export type SystemMetrics = {
    timestamp: Date;
    cpuUsagePercent: number;
    gpuUsagePercent: number;
    memoryUsagePercent: number;
    diskUsagePercent: number;
    cpuTempCelsius: number;
    gpuTempCelsius: number;
    powerCpuWatts: number;
    powerGpuWatts: number;
    powerTotalWatts: number;
};

const NissanPanels = () => {
    const { robotId, sessionId } = useParams();
    const [gpsData, setGpsData] = useState<Gnss[]>([]);
    const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
    const [isFetched, setIsFetched] = useState(false);

    const { mutate: fetchGpsData } = useMutation(
        ({ deviceId, sessionId }: { deviceId: string; sessionId: string }) =>
            getNissanSystemMetrics(deviceId, sessionId),
        {
            onSuccess: (data) => {
                console.log(data);
                const convertedData = data.gps.map((item: Gnss) => ({
                    timestamp: item.timestamp,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    speed: (item.speed * 1.852).toFixed(2)
                }));

                setGpsData(convertedData);
                setSystemMetrics(data.metrics);
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
            fetchGpsData({
                deviceId: robotId,
                sessionId
            });
        }
        return () => {
            setGpsData([]);
            setSystemMetrics([]);
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    if (!isFetched) return null;

    return (
        <>
            {gpsData.length > 0 && <GnssPanels gpsData={gpsData} />}
            {systemMetrics.length > 0 && <SystemMetricsPanel systemMetrics={systemMetrics} />}
        </>
    );
};

export default NissanPanels;
