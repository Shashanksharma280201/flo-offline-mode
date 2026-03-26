import math
import json
import yaml
import boto3
import io
import csv
import re
import os
import requests
import logging
from datetime import datetime
from downsample import downsample_points

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

EMAIL = "robotics@flomobility.com"
PASSWORD = "Robotics@1#"

STAGE_BASE_URL = "https://mc-dev.flomobility.com/api/v1"
PROD_BASE_URL = "https://fleet.flomobility.com/api/v1"

s3_client = boto3.client('s3')

# store previous latlng
# store total distance travelled

# when storing cache - no need to store neither latlng or total distance - because it is a variable in the function
# Question is what is distance between two latlng measured in?

# Triggered on every new object from firehose
def lambda_handler(event, context):
    data_to_send = {}

    battery = []
    mmr = []
    imu = []
    gnss = []
    payloadWeight = []
    distance = []
    data_to_send['timestamp'] = 0.0
    inital_energy = 0.0
    distance_travelled = 0.0 # Distance travelled
    final_energy = 0.0
    
    # Initialize batteryErrors directly in data_to_send
    data_to_send['batteryErrors'] = {
        "errorCode1": [],
        "errorCode2": [],
        "errorCode3": [],
        "errorCode4": [],
        "errorCode5": [],
        "errorCode6": [],
        "errorCode7": [],
        "errorCode8": []
    }
    
    previous_lat_lng = None # Distance travelled
    previous_ignition = None

    data_dump_bucket = 'iot-data-dump' # Cache
    bucket = event["Records"][0]["s3"]["bucket"]["name"]

    # 1. Update metadata
    path = event["Records"][0]["s3"]["object"]["key"]
    path_split = path.split('/')
    if len(path_split) != 2:
        logger.error(f"[INVALID_EVENT] Invalid S3 path format: {path}")
        return

    robot_id = path_split[0]  # robotid
    trigger_file = path_split[1] # mmr-firehose.json

    # Extract date from filename for logging prefix
    # File format: mmr_firehouse-1-2026-01-02-06-18-24-*.json
    file_date = "unknown"
    try:
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', trigger_file)
        if date_match:
            file_date = date_match.group(1)
    except Exception:
        pass

    # Create structured log prefix: robotId_date
    log_prefix = f"[{robot_id}_{file_date}]"

    logger.info(f"{log_prefix} Processing started - Bucket: {bucket}, File: {trigger_file}")

     # Distance travelled
    def distance_between_points(point1, point2):
        # point1 and point2 = [lat, lon] in degrees
        R = 6371_000  # Radius of Earth in meters
        lat1, lon1 = math.radians(point1[0]), math.radians(point1[1])
        lat2, lon2 = math.radians(point2[0]), math.radians(point2[1])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        return distance  # in meters

    def send_data(energy_consumed):
        # Send data to mongodb
        session_id = datetime.fromtimestamp(data_to_send['timestamp']/1000.0).strftime("%m-%d-%y-%H-%M-%S-%f")
        data_to_send['metadata'] = {
            'robotId': robot_id,
            # 'robotId': '+918951258990',
            'sessionId': session_id
        }

        data_to_send['sessionInfo'] = {
            'name': 'local-teleop',
            'distanceTravelled': distance_travelled,
            'sessionEndTimestamp': data_to_send['battery'][-1]['timestamp'],
            'operationTime': data_to_send['battery'][-1]['timestamp'] - data_to_send['timestamp'],
            'videos': [],
            'energyConsumed': energy_consumed
        }

        logger.info(f"{log_prefix} [SESSION:{session_id}] Preparing upload - Energy: {energy_consumed:.2f}Wh, Distance: {distance_travelled:.2f}m, Battery points: {len(data_to_send.get('battery', []))}, GNSS points: {len(data_to_send.get('gnss', []))}")

        # 8.0 get base url
        if bucket == "flo-mmr-iot":
            BASE_URL = PROD_BASE_URL
        else:
            BASE_URL = STAGE_BASE_URL

        logger.info(f"{log_prefix} [SESSION:{session_id}] Target: {BASE_URL}")

        # 8.1 get token
        req = {
            "email":  EMAIL,
            "password": PASSWORD
        }
        auth_url = f"{BASE_URL}/login"
        res = requests.post(url=auth_url, json=req)

        if res.status_code >= 400:
            logger.error(f"{log_prefix} [SESSION:{session_id}] Auth failed [{res.status_code}]: {res.json()}")
            return
        auth_token = res.json()['token']

        # 8.2 upload data
        header = {
            "Authorization": f"Bearer {auth_token}"
        }
        upload_url = f"{BASE_URL}/sensors/add"
        res = requests.post(upload_url, headers=header, json=data_to_send)
        if 200 <= res.status_code < 300:
            logger.info(f"{log_prefix} [SESSION:{session_id}] Upload SUCCESS - Data synced to MongoDB")
        else:
            logger.error(f"{log_prefix} [SESSION:{session_id}] Upload FAILED [{res.status_code}]: {res.text}")

    def reset_data():
        nonlocal battery, mmr, imu, gnss, payloadWeight, distance, distance_travelled, inital_energy, previous_lat_lng
        battery = []
        mmr = []
        imu = []
        gnss = []
        payloadWeight = []
        distance = []
        # Reset batteryErrors directly in data_to_send
        data_to_send['batteryErrors'] = {
            "errorCode1": [],
            "errorCode2": [],
            "errorCode3": [],
            "errorCode4": [],
            "errorCode5": [],
            "errorCode6": [],
            "errorCode7": [],
            "errorCode8": []
        }
        distance_travelled = 0.0  # Distance travelled
        previous_lat_lng = None  # Reset last GPS position for new session
        data_to_send['timestamp'] = 0.0
        inital_energy = 0.0
        logger.debug(f"{log_prefix} Session data reset completed")

    session_file = s3_client.list_objects_v2(Bucket=data_dump_bucket, Prefix=f'{robot_id}/session.json')
    # Is previous session stored?
    if 'Contents' in session_file:
        previous_session = True
        logger.info(f"{log_prefix} Previous session cache found in S3")
    else:
        previous_session = False
        logger.info(f"{log_prefix} No previous session cache")

    try:
        prefix=f'{robot_id}/{trigger_file}'
        logger.info(f"{log_prefix} Fetching S3 object: {prefix}")
        response = s3_client.get_object(Bucket=bucket, Key=f'{robot_id}/{trigger_file}')
        logger.info(f"{log_prefix} Successfully retrieved file from S3")

        data = response['Body'].read().decode('utf-8')
        lines = data.splitlines()
        combined_data = ''.join(line.strip() for line in lines)
        json_objects = combined_data.split('}{')
        json_objects = [f'{{{obj.strip("}{")}}}' for obj in json_objects]

        num_of_robot_data_points = len(json_objects)
        logger.info(f"{log_prefix} Parsing {num_of_robot_data_points} data points from file")
        
        for idx, obj in enumerate(json_objects):
            json_data = json.loads(obj) # One row of data
            if "data" in json_data:
                split_to_arr = json_data["data"].split(",")
                json_data["session"] =  int(split_to_arr[0])
                json_data["leftCytronTemp"] =  float(split_to_arr[1])
                json_data["rightCytronTemp"] =  float(split_to_arr[2])
                json_data["mmrVoltage"] =  float(split_to_arr[3])
                json_data["mmrCurrent"] =  float(split_to_arr[4])
                json_data["mmrPower"] =  float(split_to_arr[5])
                json_data["mmrPeakPower"] =  float(split_to_arr[6])
                json_data["throttle"] =  int(split_to_arr[7])
                json_data["steering"] =  int(split_to_arr[8])
                json_data["actuator"] =  int(split_to_arr[9])
                json_data["light"] =  int(split_to_arr[10])
                json_data["accelerationX"] =  float(split_to_arr[11])
                json_data["accelerationY"] =  float(split_to_arr[12])
                json_data["accelerationZ"] =  float(split_to_arr[13])
                json_data["batteryCumulativeVoltage"] =  float(split_to_arr[17])
                json_data["batteryCurrent"] =  float(split_to_arr[18])
                json_data["batteryRemainingCapacity"] =  float(split_to_arr[19])
                json_data["designCapacity"] =  float(split_to_arr[20] )
                json_data["batterySoc"] =  float(split_to_arr[21])
                json_data["batteryErrorCode1"] =  int(split_to_arr[23])
                json_data["batteryErrorCode2"] =  int(split_to_arr[24])
                json_data["batteryErrorCode3"] =  int(split_to_arr[25])
                json_data["batteryErrorCode4"] =  int(split_to_arr[26])
                json_data["batteryErrorCode5"] =  int(split_to_arr[27])
                json_data["batteryErrorCode6"] =  int(split_to_arr[28])
                json_data["batteryErrorCode7"] =  int(split_to_arr[29])
                json_data["batteryErrorCode8"] =  int(split_to_arr[30])
                json_data["bmpTemperature"] =  float(split_to_arr[35])
                json_data["bmpAltitude"] =  float(split_to_arr[36])
                json_data["ggaLatitude"] =  float(split_to_arr[39])
                json_data["ggaLatitudeDirection"] =  split_to_arr[40]
                json_data["ggaLongitude"] =  float(split_to_arr[41])
                json_data["ggaLongitudeDirection"] =  split_to_arr[42]
                json_data["rmcSpeed"] =  float(split_to_arr[49])
                json_data["rmcWeight"] =  float(split_to_arr[52])
                json_data["rmcDistance"] =  float(split_to_arr[53])

            if previous_ignition is None:
                previous_ignition = json_data['session']
                continue # Why are we skipping the first point? -  to compare the first with the second

            if previous_ignition == 0 and json_data['session'] == 0:
                # Ignition is off and continues to be so
                # If previous session was there - end that and delete that
                previous_ignition = json_data['session']
                if previous_session:
                    logger.info(f"{log_prefix} [STATE:0→0] Session ended - Uploading cached data to MongoDB")
                    response = s3_client.get_object(
                        Bucket=data_dump_bucket,
                        Key=f'{robot_id}/session.json'
                    )
                    session_data = response['Body'].read().decode('utf-8')
                    data = json.loads(session_data)
                    battery = data.get('battery', [])
                    gnss = data.get('gnss', [])
                    mmr = data.get('mmr', [])
                    imu = data.get('imu', [])
                    payloadWeight = data.get('payloadWeight', [])
                    distance = data.get('distance', [])
                    distance_travelled = data.get('distance_travelled', 0.0)  # Distance travelled
                    energy_consumed = data.get('energy_consumed', 0.0)
                    inital_energy = data.get('initial_energy', 0.0)
                    previous_lat_lng = data.get('previous_lat_lng', None)  # Load last GPS position
                    data_to_send['battery'] = battery
                    data_to_send['gnss'] = gnss
                    data_to_send['mmr'] = mmr
                    data_to_send['imu'] = imu
                    data_to_send['payloadWeight'] = payloadWeight
                    data_to_send['distance'] = distance
                    # Load battery errors from session data if available
                    if 'battery_errors' in data:
                        data_to_send['batteryErrors'] = data.get('battery_errors')
                    data_to_send['timestamp'] = data_to_send['battery'][0]['timestamp']

                    # Delete the temp session file as the session ended
                    s3_client.delete_object(Bucket=data_dump_bucket, Key=f'{robot_id}/session.json')

                    previous_session = False

                    # Push to mongodb as session ended
                    send_data(energy_consumed)
                    reset_data()

            elif previous_ignition == 1 and json_data['session'] == 1:
                # If ignition is on and continues to be so
                # If previous session was there - fetch it and append to it
                # Keep appending to the session
                # Corner case - check if it the last item - if so - store to temp
                previous_ignition = json_data['session']
                if previous_session:
                    logger.info(f"{log_prefix} [STATE:1→1] Continuing session - Loading cached data")
                    response = s3_client.get_object(
                        Bucket=data_dump_bucket,
                        Key=f'{robot_id}/session.json'
                    )
                    session_data = response['Body'].read().decode('utf-8')
                    data = json.loads(session_data)
                    battery = data.get('battery', [])
                    gnss = data.get('gnss', [])
                    mmr = data.get('mmr', [])
                    imu = data.get('imu', [])
                    payloadWeight = data.get('payloadWeight', [])
                    distance = data.get('distance', [])
                    energy_consumed = data.get('energy_consumed', 0.0)
                    distance_travelled = data.get('distance_travelled', 0.0)  # Distance travelled
                    inital_energy = data.get('initial_energy', 0.0)
                    previous_lat_lng = data.get('previous_lat_lng', None)  # Load last GPS position
                    data_to_send['battery'] = battery
                    data_to_send['gnss'] = gnss
                    data_to_send['mmr'] = mmr
                    data_to_send['imu'] = imu
                    data_to_send['payloadWeight'] = payloadWeight
                    data_to_send['distance'] = distance
                    # Load battery errors from session data if available
                    if 'battery_errors' in data:
                        data_to_send['batteryErrors'] = data.get('battery_errors')
                    # Update starting timestamp to the one from temp file
                    data_to_send['timestamp'] = data_to_send['battery'][0]['timestamp']
                    s3_client.delete_object(Bucket=data_dump_bucket, Key=f'{robot_id}/session.json')
                    previous_session = False

                    if int(json_data['epochTime'] * 1000) - data_to_send['battery'][-1]['timestamp'] > 5000:
                        # Q: If timestamp difference - assume that the session ended
                        logger.info(f"{log_prefix} [STATE:1→1] Large time gap detected (>5s) - Ending previous session")
                        send_data(energy_consumed)
                        reset_data()

                else:
                    # There is no previous session and we have a one - create one from scratch
                    if inital_energy == 0.0:
                        inital_energy = json_data['batteryCumulativeVoltage'] * json_data['batteryRemainingCapacity'] / 1000.0

                    final_energy = json_data['batteryCumulativeVoltage'] * json_data['batteryRemainingCapacity'] / 1000.0

                    battery.append({
                        'timestamp': int(json_data['epochTime'] * 1000),
                        'percentage': round(json_data['batterySoc'], 2),
                        "frameId": "battery",
                        "voltage": round(json_data['batteryCumulativeVoltage'], 2),
                        "current": round(json_data['batteryCurrent'], 2),
                        "charge": 0.0,
                        "capacity": round(json_data['batteryRemainingCapacity'], 2),
                        "designCapacity": round(json_data['designCapacity'], 2),
                        "powerSupplyStatus": 0,
                        "powerSupplyHealth": 0,
                        "powerSupplyTechnology": 0,
                        "present": True,
                        "cellVoltage": [],
                        "cellTemperature": []
                    })
                    
                    # Add battery errors only if present
                    for i in range(1, 9):
                        error_code_key = f"batteryErrorCode{i}"
                        error_value = json_data.get(error_code_key)

                        if error_value and error_value != 0:
                            data_to_send['batteryErrors'][f"errorCode{i}"].append({
                                "timestamp": int(json_data['epochTime'] * 1000),
                                "error": error_value
                            })
                        
                    mmr.append({
                        'timestamp': int(json_data['epochTime'] * 1000),
                        'leftCytronTemp': round(json_data['leftCytronTemp'], 2),
                        'rightCytronTemp': round(json_data['rightCytronTemp'], 2),
                        'mmrVoltage': round(json_data['mmrVoltage'], 2),
                        'mmrCurrent': round(json_data['mmrCurrent'], 2),
                        'mmrPower': round(json_data['mmrPower'], 2),
                        'mmrPeakPower': round(json_data['mmrPeakPower'], 2),
                        'throttle': int(json_data['throttle']),
                        'steering': int(json_data['steering']),
                        'actuator': int(json_data['actuator']),
                        'light': int(json_data['light']),
                        'baroTemperature': round(json_data['bmpTemperature'], 2),
                        'baroAltitude': round(json_data['bmpAltitude'], 2)
                    })
                    imu.append({
                        'timestamp': int(json_data['epochTime'] * 1000),
                        'orientation': {
                            'x': 0,
                            'y': 0,
                            'z': 0,
                            'w': 0
                        },
                        'orientationCovariance': [],
                        'angularVelocity': {
                        'x': round(json_data['accelerationX'], 2),
                        'y': round(json_data['accelerationY'], 2),
                        'z': round(json_data['accelerationZ'], 2)
                        },
                        'angularVelocityCovariance': [],
                        'linearAcceleration': {
                            'x': 0,
                            'y': 0,
                            'z': 0
                        },
                        'linearAccelerationCovariance': []
                    })
                    
                    #gnss
                    # Minimum distance threshold to filter GPS noise (in meters)
                    MIN_DISTANCE_THRESHOLD = 2.0
                    # Maximum distance threshold to filter GPS jumps/teleportation (in meters)
                    MAX_DISTANCE_THRESHOLD = 100.0

                    try:
                        lat = str(json_data['ggaLatitude'])
                        lon = str(json_data['ggaLongitude'])

                        if lat not in ['nan', '', '0', '0.0'] and lon not in ['nan', '', '0', '0.0']:
                            # Validate direction fields - latitude must be N/S, longitude must be E/W
                            if json_data['ggaLatitudeDirection'] in {'N', 'S'} and json_data['ggaLongitudeDirection'] in {'E', 'W'}:
                                # Parse NMEA format coordinates
                                # Latitude format: DDMM.MMMM (e.g., 1234.5678 = 12 degrees, 34.5678 minutes)
                                # Longitude format: DDDMM.MMMM (e.g., 07812.3456 = 078 degrees, 12.3456 minutes)

                                lat_value = float(lat)
                                lat_degrees = int(lat_value / 100)  # Extract DD part
                                lat_minutes = lat_value - (lat_degrees * 100)  # Extract MM.MMMM part
                                lat = lat_degrees + (lat_minutes / 60.0)  # Convert to decimal degrees

                                lon_value = float(lon)
                                lon_degrees = int(lon_value / 100)  # Extract DDD part
                                lon_minutes = lon_value - (lon_degrees * 100)  # Extract MM.MMMM part
                                lon = lon_degrees + (lon_minutes / 60.0)  # Convert to decimal degrees

                                # Apply direction (N=positive, S=negative, E=positive, W=negative)
                                lat = lat * (1 if json_data['ggaLatitudeDirection'] == 'N' else -1)
                                lon = lon * (1 if json_data['ggaLongitudeDirection'] == 'E' else -1)

                                # Validate coordinate ranges
                                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                                    logger.warning(f"{log_prefix} [GPS] Invalid coordinates out of range: lat={lat}, lon={lon}")
                                elif float(lat) == 0.0 and float(lon) == 0.0:
                                    logger.debug(f"{log_prefix} [GPS] Coordinates (0,0): No GPS lock")
                                else:
                                    # Determine if this GPS point should be included
                                    should_include_point = False

                                    if previous_lat_lng is None:
                                        # First valid GPS point - always include it
                                        should_include_point = True
                                        logger.debug(f"{log_prefix} [GPS] First valid point: lat={lat}, lon={lon}")
                                    else:
                                        # Calculate distance from previous valid point
                                        segment_distance = distance_between_points([lat, lon], previous_lat_lng)

                                        if segment_distance < MIN_DISTANCE_THRESHOLD:
                                            # GPS noise - too close to previous point
                                            logger.debug(f"{log_prefix} [GPS] Noise filtered: {segment_distance:.2f}m < {MIN_DISTANCE_THRESHOLD}m")
                                            should_include_point = False
                                        elif segment_distance > MAX_DISTANCE_THRESHOLD:
                                            # GPS jump/teleportation - too far from previous point
                                            logger.warning(f"{log_prefix} [GPS] Jump filtered: {segment_distance:.2f}m > {MAX_DISTANCE_THRESHOLD}m")
                                            should_include_point = False
                                        else:
                                            # Valid movement - include point and add to distance
                                            distance_travelled += segment_distance
                                            should_include_point = True

                                    # Only append to gnss array and update previous position if point is valid
                                    if should_include_point:
                                        previous_lat_lng = [lat, lon]
                                        gnss.append({
                                            'timestamp': int(json_data['epochTime'] * 1000),
                                            'latitude': lat,
                                            'longitude': lon,
                                            'speed': round(json_data['rmcSpeed'], 2)*1.852  # Convert knots to km/h
                                        })
                            else:
                                logger.warning(f"{log_prefix} [GPS] Invalid direction: lat_dir={json_data.get('ggaLatitudeDirection')}, lon_dir={json_data.get('ggaLongitudeDirection')}")
                    except (ValueError, IndexError, KeyError, ZeroDivisionError) as e:
                        logger.error(f"{log_prefix} [GPS] Parse error: {e}")

                    # Payload Weight
                    if 'rmcWeight' in json_data:
                        payloadWeight.append({
                            'data': round(json_data['rmcWeight'], 2),
                            'timestamp': int(json_data['epochTime'] * 1000)
                        })

                    # Distance (odometry sensor)
                    if 'rmcDistance' in json_data:
                        distance.append({
                            'data': round(json_data['rmcDistance'], 2),
                            'timestamp': int(json_data['epochTime'] * 1000)
                        })

                    if data_to_send['timestamp'] == 0.0:
                        data_to_send['timestamp'] = int(json_data['epochTime'] * 1000)
                        logger.info(f"{log_prefix} [STATE:1→1] New session started at {datetime.fromtimestamp(data_to_send['timestamp']/1000.0).strftime('%Y-%m-%d %H:%M:%S')}")
                    battery = downsample_points(battery, 1_000)
                    gnss = downsample_points(gnss, 1_000)
                    mmr = downsample_points(mmr, 1_000)
                    imu = downsample_points(imu, 1_000)
                    payloadWeight = downsample_points(payloadWeight, 1_000)
                    distance = downsample_points(distance, 1_000)

                    data_to_send['battery'] = battery
                    data_to_send['gnss'] = gnss
                    data_to_send['mmr'] = mmr
                    data_to_send['imu'] = imu
                    data_to_send['payloadWeight'] = payloadWeight
                    data_to_send['distance'] = distance
                    # print(f"data_to_send: {data_to_send}")
                    # print(f"{data_to_send}")
                    energy_consumed = inital_energy - final_energy

                    if idx == (num_of_robot_data_points - 1):
                        # It is the last point in the file and it is 1 - so store to temp
                        logger.info(f"{log_prefix} [STATE:1→1] Caching incomplete session to S3 (last point=1)")
                        session_data = {
                            'battery': battery,
                            'gnss': gnss,
                            'mmr': mmr,
                            'imu': imu,
                            'payloadWeight': payloadWeight,
                            'distance': distance,
                            'energy_consumed': energy_consumed,
                            'initial_energy': inital_energy,
                            'distance_travelled': distance_travelled, # Distance travelled
                            'battery_errors': data_to_send['batteryErrors'],  # Store battery errors
                            'previous_lat_lng': previous_lat_lng  # Store last GPS position for distance tracking
                        }
                        session_json = json.dumps(session_data, indent=4)

                        s3_client.put_object(
                            Bucket='iot-data-dump',
                            Key=f'{robot_id}/session.json',
                            Body=session_json,
                            ContentType='application/json'
                        )

            elif previous_ignition == 0 and json_data['session'] == 1:
                # Ignition just started
                # Check for previous session - if it exists - push to mongo - delete the temp file
                # If there is none - ignore as  1,1 gets triggered on the next iteration
                previous_ignition = json_data['session']

                if previous_session:
                    logger.info(f"{log_prefix} [STATE:0→1] Ignition ON - Uploading previous cached session")
                    response = s3_client.get_object(
                        Bucket=data_dump_bucket,
                        Key=f'{robot_id}/session.json'
                    )
                    session_data = response['Body'].read().decode('utf-8')
                    data = json.loads(session_data)
                    battery = data.get('battery', [])
                    gnss = data.get('gnss', [])
                    mmr = data.get('mmr', [])
                    imu = data.get('imu', [])
                    payloadWeight = data.get('payloadWeight', [])
                    distance = data.get('distance', [])
                    energy_consumed = data.get('energy_consumed', 0.0)
                    inital_energy = data.get('initial_energy', 0.0)
                    distance_travelled = data.get('distance_travelled', 0.0)  # Distance travelled
                    previous_lat_lng = data.get('previous_lat_lng', None)  # Load last GPS position
                    data_to_send['battery'] = battery
                    data_to_send['gnss'] = gnss
                    data_to_send['mmr'] = mmr
                    data_to_send['imu'] = imu
                    data_to_send['payloadWeight'] = payloadWeight
                    data_to_send['distance'] = distance
                    # Load battery errors from session data if available
                    if 'battery_errors' in data:
                        data_to_send['batteryErrors'] = data.get('battery_errors')
                    data_to_send['timestamp'] = data_to_send['battery'][0]['timestamp']
                    s3_client.delete_object(Bucket=data_dump_bucket, Key=f'{robot_id}/session.json')

                    previous_session = False
                    send_data(energy_consumed)
                    reset_data()

            elif previous_ignition == 1 and json_data['session'] == 0:
                # Ignition was on and just turned off
                # Check for previous session - if it exists - fetch, append and push to mongo - delete the temp file
                # If there isn't one - push the existing one?
                previous_ignition = json_data['session']
                if previous_session:
                    logger.info(f"{log_prefix} [STATE:1→0] Ignition OFF - Finalizing session from cache")
                    response = s3_client.get_object(
                        Bucket=data_dump_bucket,
                        Key=f'{robot_id}/session.json'
                    )
                    session_data = response['Body'].read().decode('utf-8')
                    data = json.loads(session_data)
                    battery = data.get('battery', [])
                    gnss = data.get('gnss', [])
                    mmr = data.get('mmr', [])
                    imu = data.get('imu', [])
                    payloadWeight = data.get('payloadWeight', [])
                    distance = data.get('distance', [])
                    energy_consumed = data.get('energy_consumed', 0.0)
                    inital_energy = data.get('initial_energy', 0.0)
                    distance_travelled = data.get('distance_travelled', 0.0)  # Distance travelled
                    previous_lat_lng = data.get('previous_lat_lng', None)  # Load last GPS position
                    data_to_send['battery'] = battery
                    data_to_send['gnss'] = gnss
                    data_to_send['mmr'] = mmr
                    data_to_send['imu'] = imu
                    data_to_send['payloadWeight'] = payloadWeight
                    data_to_send['distance'] = distance
                    # Load battery errors from session data if available
                    if 'battery_errors' in data:
                        data_to_send['batteryErrors'] = data.get('battery_errors')
                    data_to_send['timestamp'] = data_to_send['battery'][0]['timestamp']
                    s3_client.delete_object(Bucket=data_dump_bucket, Key=f'{robot_id}/session.json')
                    previous_session = False

                if battery != []:
                    logger.info(f"{log_prefix} [STATE:1→0] Uploading session data to MongoDB")
                    send_data(energy_consumed)
                    reset_data()

    except Exception as e:
        logger.error(f"{log_prefix} [ERROR] Exception in processing: {str(e)}", exc_info=True)
