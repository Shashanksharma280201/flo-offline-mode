import { model, Schema } from "mongoose";

type SystemMetrics = {
  sessionId: string;
  deviceId: string;
  metrics: {
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
  }[];
  gps: {
    timestamp: Date;
    latitude: number;
    longitude: number;
    speed: number;
  }[];
};

const metricEntrySchema = new Schema(
  {
    timestamp: { type: Date, required: true },
    cpuUsagePercent: { type: Number, required: true },
    gpuUsagePercent: { type: Number, required: true },
    memoryUsagePercent: { type: Number, required: true },
    diskUsagePercent: { type: Number, required: true },
    cpuTempCelsius: { type: Number, required: true },
    gpuTempCelsius: { type: Number, required: true },
    powerCpuWatts: { type: Number, required: true },
    powerGpuWatts: { type: Number, required: true },
    powerTotalWatts: { type: Number, required: true }
  },
  { _id: false }
);

const gpsEntrySchema = new Schema(
  {
    timestamp: { type: Date, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, required: true }
  },
  { _id: false }
);

const systemMetricsSchema = new Schema<SystemMetrics>({
  sessionId: {
    type: String,
    ref: "nissanSensor",
    required: true
  },
  deviceId: {
    type: String,
    ref: "robots",
    required: true
  },
  metrics: {
    type: [metricEntrySchema],
    required: true
  },
  gps: {
    type: [gpsEntrySchema],
    required: true
  }
});

const NissanSystemMetrics = model("nissanSystemMetric", systemMetricsSchema);
export default NissanSystemMetrics;
