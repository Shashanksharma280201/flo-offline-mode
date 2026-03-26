import dotenv from "dotenv";
import connectDb from "./services/mongodb";
import LidarMap from "./models/lidarMapModel";
import logger from "./utils/logger";

dotenv.config();

const georefPoints = [
  {
    point_id: 1,
    timestamp: 1767967779.165,
    map_x: -0.002923191,
    map_y: -0.000016787,
    map_z: -0.028981667,
    map_yaw: 0.000046596,
    utm_x: 799060.375,
    utm_y: 1413460.75,
    utm_z: 0.0,
    utm_yaw: 2.330142177
  },
  {
    point_id: 2,
    timestamp: 1767967797.856,
    map_x: 8.656360626,
    map_y: 3.815798044,
    map_z: -0.363219082,
    map_yaw: 0.425277069,
    utm_x: 799051.5,
    utm_y: 1413462.5,
    utm_z: 0.0,
    utm_yaw: 2.883310004
  },
  {
    point_id: 3,
    timestamp: 1767967812.852,
    map_x: 17.257387161,
    map_y: 8.831051826,
    map_z: -0.327931762,
    map_yaw: 0.601545546,
    utm_x: 799041.5,
    utm_y: 1413463.375,
    utm_z: 0.0,
    utm_yaw: -3.141284262
  },
  {
    point_id: 4,
    timestamp: 1767967827.352,
    map_x: 25.626321793,
    map_y: 14.230302811,
    map_z: -0.573357522,
    map_yaw: 0.595219426,
    utm_x: 799031.4375,
    utm_y: 1413463.75,
    utm_z: 0.0,
    utm_yaw: 3.133545319
  },
  {
    point_id: 5,
    timestamp: 1767967855.046,
    map_x: 40.954322815,
    map_y: 23.324380875,
    map_z: -0.695567846,
    map_yaw: 0.527624595,
    utm_x: 799013.6875,
    utm_y: 1413464.875,
    utm_z: 0.0,
    utm_yaw: 3.073440557
  },
  {
    point_id: 6,
    timestamp: 1767967869.364,
    map_x: 49.111412048,
    map_y: 28.954713821,
    map_z: -0.835011363,
    map_yaw: 0.673866553,
    utm_x: 799003.8125,
    utm_y: 1413464.875,
    utm_z: 0.0,
    utm_yaw: -3.054737457
  },
  {
    point_id: 7,
    timestamp: 1767967883.548,
    map_x: 57.547939301,
    map_y: 34.175098419,
    map_z: -1.097468376,
    map_yaw: 0.570797243,
    utm_x: 798993.9375,
    utm_y: 1413465.375,
    utm_z: 0.0,
    utm_yaw: 3.087697964
  },
  {
    point_id: 8,
    timestamp: 1767967897.855,
    map_x: 66.019744873,
    map_y: 39.380386353,
    map_z: -1.250189543,
    map_yaw: 0.563032187,
    utm_x: 798983.75,
    utm_y: 1413465.875,
    utm_z: 0.0,
    utm_yaw: 3.089830328
  },
  {
    point_id: 9,
    timestamp: 1767967912.06,
    map_x: 74.822113037,
    map_y: 43.901348114,
    map_z: -1.472111702,
    map_yaw: 0.473028784,
    utm_x: 798974.125,
    utm_y: 1413467.125,
    utm_z: 0.0,
    utm_yaw: 3.000253566
  },
  {
    point_id: 10,
    timestamp: 1767967926.154,
    map_x: 83.558792114,
    map_y: 48.412055969,
    map_z: -1.76487112,
    map_yaw: 0.508907095,
    utm_x: 798964.1875,
    utm_y: 1413468.375,
    utm_z: 0.0,
    utm_yaw: 3.042225822
  }
];

const mapMetadata = {
  resolution: 0.05,
  origin: [-8.407282, -81.081612, 0.0],
  negate: 0,
  occupied_thresh: 0.65,
  free_thresh: 0.25,
  mode: "trinary"
};

const seedLidarMap = async () => {
  try {
    await connectDb();

    // Check if map already exists
    const existingMap = await LidarMap.findOne({ name: "sriram_2d_map_1" });

    if (existingMap) {
      logger.info("LIDAR map 'sriram_2d_map_1' already exists. Skipping.");
      process.exit(0);
    }

    // Create the map
    const lidarMap = await LidarMap.create({
      name: "sriram_2d_map_1",
      s3FolderPath: "sriram_2d_map_1",
      map3dFileName: "dlio_map.pcd",
      map2dPgmFileName: "dlio_map_2d.pgm",
      map2dYamlFileName: "dlio_map_2d.yaml",
      georefFileName: "georef_points.json",
      mapMetadata,
      georefPoints,
      status: "ready",
      fileSize: 69262783
    });

    logger.info("Successfully created LIDAR map:");
    logger.info(JSON.stringify(lidarMap, null, 2));

    process.exit(0);
  } catch (error) {
    logger.error("Error seeding LIDAR map:");
    logger.error(error);
    process.exit(1);
  }
};

seedLidarMap();
