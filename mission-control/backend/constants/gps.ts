/**
 * GPS Validation Configuration Constants
 *
 * These constants control GPS data validation and outlier detection
 * for robot location tracking.
 */

export const GPS_VALIDATION_CONFIG = {
  /**
   * Maximum robot speed in kilometers per hour
   * Any GPS movement exceeding this speed will be flagged
   */
  MAX_ROBOT_SPEED_KMPH: 5,

  /**
   * Multiplier for extreme outlier detection
   * Points exceeding MAX_ROBOT_SPEED_KMPH * this value will be rejected entirely
   * Points between 1x-10x will be interpolated
   */
  EXTREME_OUTLIER_MULTIPLIER: 10,

  /**
   * Default geofence radius around site location in meters
   * GPS points outside this radius will be rejected as geofence violations
   */
  DEFAULT_GEOFENCE_RADIUS_METERS: 10000, // 10km

  /**
   * Minimum time difference between GPS points in seconds
   * Points closer than this will be accepted without speed validation
   * to avoid division by near-zero
   */
  MIN_TIME_DIFF_SECONDS: 0.36,

  /**
   * Valid latitude range (Earth's coordinate system)
   */
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,

  /**
   * Valid longitude range (Earth's coordinate system)
   */
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,

  /**
   * Absolute maximum speed for sanity checking (km/h)
   * Any speed value in GNSS data above this is clearly erroneous
   */
  MAX_SPEED_KMPH: 50,

  /**
   * Earth radius in meters (for haversine calculations)
   */
  EARTH_RADIUS_METERS: 6371008.8
} as const;

/**
 * GPS Correction Types
 */
export enum GPSCorrectionType {
  NONE = 'none',
  INTERPOLATED = 'interpolated',
  REJECTED = 'rejected',
  GEOFENCE_VIOLATION = 'geofence_violation'
}
