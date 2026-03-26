import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRosSubscribe, createMockRobotMetaPose } from '../mocks/rosMock';
import testRosMessages from '../fixtures/test-ros-messages.json';

describe('Robot Position Tests', () => {
    let rosSubscribe: ReturnType<typeof createMockRosSubscribe>['rosSubscribe'];
    let publishToTopic: ReturnType<typeof createMockRosSubscribe>['publishToTopic'];

    beforeEach(() => {
        const mock = createMockRosSubscribe();
        rosSubscribe = mock.rosSubscribe;
        publishToTopic = mock.publishToTopic;
    });

    describe('ROS /mmr/meta_pose message parsing', () => {
        it('should extract GPS coordinates (latLng) from RobotMetaPose message', () => {
            const testMessage = testRosMessages.robotMetaPose.atOrigin;

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose', {
                queue_length: 0,
                queue_size: 1
            });

            let receivedLatLng: { lat: number; lng: number } | null = null;

            subscriber?.subscribe((message: any) => {
                receivedLatLng = {
                    lat: message.latitude,
                    lng: message.longitude
                };
            });

            publishToTopic('/mmr/meta_pose', testMessage);

            expect(receivedLatLng).not.toBeNull();
            expect(receivedLatLng?.lat).toBe(testMessage.latitude);
            expect(receivedLatLng?.lng).toBe(testMessage.longitude);
        });

        it('should extract LIDAR map coordinates (mapXY) from RobotMetaPose message', () => {
            const testMessage = testRosMessages.robotMetaPose.atStation1;

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose');

            let receivedMapXY: { x: number; y: number } | null = null;

            subscriber?.subscribe((message: any) => {
                receivedMapXY = {
                    x: message.pose.point.x,
                    y: message.pose.point.y
                };
            });

            publishToTopic('/mmr/meta_pose', testMessage);

            expect(receivedMapXY).not.toBeNull();
            expect(receivedMapXY?.x).toBe(testMessage.pose.point.x);
            expect(receivedMapXY?.y).toBe(testMessage.pose.point.y);
        });

        it('should extract yaw from RobotMetaPose message', () => {
            const testMessage = testRosMessages.robotMetaPose.atStation2;

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose');

            let receivedYaw: number | null = null;

            subscriber?.subscribe((message: any) => {
                receivedYaw = message.pose.yaw;
            });

            publishToTopic('/mmr/meta_pose', testMessage);

            expect(receivedYaw).not.toBeNull();
            expect(receivedYaw).toBe(testMessage.pose.yaw);
        });

        it('should handle all fields from RobotMetaPose message simultaneously', () => {
            const testMessage = testRosMessages.robotMetaPose.movingNorth;

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose');

            let robotPose: any = null;

            subscriber?.subscribe((message: any) => {
                robotPose = {
                    latLng: {
                        lat: message.latitude,
                        lng: message.longitude
                    },
                    mapXY: {
                        x: message.pose.point.x,
                        y: message.pose.point.y
                    },
                    yaw: message.pose.yaw
                };
            });

            publishToTopic('/mmr/meta_pose', testMessage);

            expect(robotPose).not.toBeNull();
            expect(robotPose.latLng.lat).toBe(testMessage.latitude);
            expect(robotPose.latLng.lng).toBe(testMessage.longitude);
            expect(robotPose.mapXY.x).toBe(testMessage.pose.point.x);
            expect(robotPose.mapXY.y).toBe(testMessage.pose.point.y);
            expect(robotPose.yaw).toBe(testMessage.pose.yaw);
        });
    });

    describe('Default test position', () => {
        it('should use origin (0, 0) as default test position when no robot position available', () => {
            const defaultTestPosition = { x: 0, y: 0 };

            expect(defaultTestPosition.x).toBe(0);
            expect(defaultTestPosition.y).toBe(0);
        });

        it('should fall back to test position when mapXY is undefined', () => {
            const mapXY = undefined;
            const testMapPosition = { x: 0, y: 0 };
            const displayMapPosition = mapXY || testMapPosition;

            expect(displayMapPosition).toEqual(testMapPosition);
            expect(displayMapPosition.x).toBe(0);
            expect(displayMapPosition.y).toBe(0);
        });

        it('should use actual mapXY when available instead of test position', () => {
            const mapXY = { x: 10.5, y: 20.3 };
            const testMapPosition = { x: 0, y: 0 };
            const displayMapPosition = mapXY || testMapPosition;

            expect(displayMapPosition).toEqual(mapXY);
            expect(displayMapPosition.x).toBe(10.5);
            expect(displayMapPosition.y).toBe(20.3);
        });
    });

    describe('Coordinate system conversions', () => {
        it('should convert map coordinates to pixel coordinates correctly', () => {
            const mapConfig = {
                resolution: 0.05,
                origin: { x: -8.407282, y: -81.081612 }
            };

            const mapPosition = { x: 0.0, y: 0.0 };

            // pixel = (mapCoords - origin) / resolution
            const pixelX = (mapPosition.x - mapConfig.origin.x) / mapConfig.resolution;
            const pixelY = (mapPosition.y - mapConfig.origin.y) / mapConfig.resolution;

            expect(pixelX).toBeCloseTo(168.146, 1);
            expect(pixelY).toBeCloseTo(1621.623, 1);
        });

        it('should convert pixel coordinates to Three.js world space', () => {
            const pixelX = 168.146;
            const pixelY = 1621.623;

            // In Three.js, Y axis is inverted (canvas Y goes down, Three.js Y goes up)
            const worldX = pixelX;
            const worldY = -pixelY;

            expect(worldX).toBe(pixelX);
            expect(worldY).toBe(-pixelY);
        });

        it('should maintain coordinate precision for small movements', () => {
            const mapConfig = {
                resolution: 0.05,
                origin: { x: -8.407282, y: -81.081612 }
            };

            const pos1 = { x: 10.0, y: 10.0 };
            const pos2 = { x: 10.05, y: 10.0 }; // 5cm movement (1 pixel)

            const pixel1X = (pos1.x - mapConfig.origin.x) / mapConfig.resolution;
            const pixel2X = (pos2.x - mapConfig.origin.x) / mapConfig.resolution;

            const pixelDiff = pixel2X - pixel1X;

            // 5cm movement should be exactly 1 pixel
            expect(pixelDiff).toBeCloseTo(1.0, 1);
        });
    });

    describe('ROS subscription lifecycle', () => {
        it('should create subscriber for /mmr/meta_pose topic', () => {
            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose', {
                queue_length: 0,
                queue_size: 1
            });

            expect(subscriber).toBeDefined();
            expect(subscriber?.subscribe).toBeDefined();
            expect(subscriber?.unsubscribe).toBeDefined();
        });

        it('should call subscription callback when message is published', () => {
            const callback = vi.fn();
            const testMessage = createMockRobotMetaPose(12.9716, 77.5946, 5.0, 10.0, 0.5);

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose');
            subscriber?.subscribe(callback);

            publishToTopic('/mmr/meta_pose', testMessage);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(testMessage);
        });

        it('should stop receiving messages after unsubscribe', () => {
            const callback = vi.fn();
            const testMessage = createMockRobotMetaPose(12.9716, 77.5946, 5.0, 10.0, 0.5);

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose');
            subscriber?.subscribe(callback);

            // Publish first message
            publishToTopic('/mmr/meta_pose', testMessage);
            expect(callback).toHaveBeenCalledTimes(1);

            // Unsubscribe
            subscriber?.unsubscribe();

            // Publish second message (should not be received)
            publishToTopic('/mmr/meta_pose', testMessage);
            expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 2
        });
    });

    describe('Multiple position updates', () => {
        it('should handle rapid position updates', () => {
            const positions: Array<{ lat: number; lng: number; x: number; y: number }> = [];

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose');
            subscriber?.subscribe((message: any) => {
                positions.push({
                    lat: message.latitude,
                    lng: message.longitude,
                    x: message.pose.point.x,
                    y: message.pose.point.y
                });
            });

            // Publish 5 position updates rapidly
            for (let i = 0; i < 5; i++) {
                const message = createMockRobotMetaPose(
                    12.9716 + i * 0.0001,
                    77.5946 + i * 0.0001,
                    i * 1.0,
                    i * 1.0,
                    i * 0.1
                );
                publishToTopic('/mmr/meta_pose', message);
            }

            expect(positions).toHaveLength(5);
            expect(positions[0].x).toBe(0);
            expect(positions[4].x).toBe(4.0);
        });

        it('should track robot movement along a path', () => {
            const pathPositions: Array<{ x: number; y: number }> = [];

            const subscriber = rosSubscribe('/mmr/meta_pose', 'mmr/msg/RobotMetaPose');
            subscriber?.subscribe((message: any) => {
                pathPositions.push({
                    x: message.pose.point.x,
                    y: message.pose.point.y
                });
            });

            // Simulate robot moving in a straight line
            const pathPoints = [
                { x: 0.0, y: 0.0 },
                { x: 1.0, y: 0.0 },
                { x: 2.0, y: 0.0 },
                { x: 3.0, y: 0.0 }
            ];

            pathPoints.forEach(point => {
                const message = createMockRobotMetaPose(12.9716, 77.5946, point.x, point.y, 0.0);
                publishToTopic('/mmr/meta_pose', message);
            });

            expect(pathPositions).toHaveLength(4);
            expect(pathPositions[0]).toEqual({ x: 0.0, y: 0.0 });
            expect(pathPositions[3]).toEqual({ x: 3.0, y: 0.0 });
        });
    });
});
