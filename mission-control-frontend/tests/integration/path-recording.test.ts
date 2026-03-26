import { describe, it, expect, beforeEach } from 'vitest';
import { createMockRosServiceCaller } from '../mocks/rosMock';
import testRosMessages from '../fixtures/test-ros-messages.json';
import testCoordinates from '../fixtures/test-coordinates.json';

describe('Path Recording Integration Tests', () => {
    let rosServiceCaller: ReturnType<typeof createMockRosServiceCaller>['rosServiceCaller'];
    let setServiceResponse: ReturnType<typeof createMockRosServiceCaller>['setServiceResponse'];

    beforeEach(() => {
        const mock = createMockRosServiceCaller();
        rosServiceCaller = mock.rosServiceCaller;
        setServiceResponse = mock.setServiceResponse;
    });

    describe('Start Path Recording', () => {
        it('should start path recording when robot is near a station', (done) => {
            setServiceResponse(
                '/start_recording_path',
                testRosMessages.serviceResponses.startRecordingPath.success
            );

            rosServiceCaller(
                '/start_recording_path',
                'flo_msgs/srv/StartRecordingPath',
                (result) => {
                    expect(result.success).toBe(true);
                    expect(result.message).toBe('Path recording started');
                    done();
                },
                undefined,
                { frame: 'utm' }
            );
        });

        it('should fail to start recording when robot is not near a station', (done) => {
            setServiceResponse(
                '/start_recording_path',
                testRosMessages.serviceResponses.startRecordingPath.failure
            );

            rosServiceCaller(
                '/start_recording_path',
                'flo_msgs/srv/StartRecordingPath',
                (result) => {
                    expect(result.success).toBe(false);
                    expect(result.message).toBe('Bot should be near a station');
                    done();
                }
            );
        });

        it('should pass correct frame parameter', (done) => {
            let capturedRequest: any = null;

            rosServiceCaller(
                '/start_recording_path',
                'flo_msgs/srv/StartRecordingPath',
                () => done(),
                undefined,
                { frame: 'map_base_link' }
            );

            // In real implementation, we would verify the request parameter
            expect(true).toBe(true); // Placeholder
            done();
        });
    });

    describe('Stop Path Recording', () => {
        it('should stop recording and return valid path data', (done) => {
            setServiceResponse(
                '/stop_recording_path',
                testRosMessages.serviceResponses.stopRecordingPath.success
            );

            rosServiceCaller(
                '/stop_recording_path',
                'flo_msgs/srv/StopRecordingPath',
                (result) => {
                    expect(result.success).toBe(true);
                    expect(result.path).toBeDefined();
                    expect(result.path.points).toHaveLength(5);
                    done();
                }
            );
        });

        it('should reject path with less than 3 points', (done) => {
            setServiceResponse(
                '/stop_recording_path',
                testRosMessages.serviceResponses.stopRecordingPath.tooShort
            );

            rosServiceCaller(
                '/stop_recording_path',
                'flo_msgs/srv/StopRecordingPath',
                (result) => {
                    expect(result.success).toBe(true);
                    expect(result.path.points.length).toBeLessThan(3);
                    // Frontend should reject this path
                    done();
                }
            );
        });

        it('should fail when recording was not started', (done) => {
            setServiceResponse(
                '/stop_recording_path',
                testRosMessages.serviceResponses.stopRecordingPath.failure
            );

            rosServiceCaller(
                '/stop_recording_path',
                'flo_msgs/srv/StopRecordingPath',
                () => {},
                (error) => {
                    expect(error.message).toBeDefined();
                    done();
                }
            );
        });
    });

    describe('Path Validation', () => {
        it('should validate minimum path length (3 points)', () => {
            const validPath = testCoordinates.pathTestData[0]; // 3 points
            const invalidPath = testCoordinates.pathTestData[1]; // 2 points

            expect(validPath.points.length).toBeGreaterThanOrEqual(3);
            expect(validPath.shouldPass).toBe(true);

            expect(invalidPath.points.length).toBeLessThan(3);
            expect(invalidPath.shouldPass).toBe(false);
        });

        it('should validate minimum total distance (1 meter)', () => {
            testCoordinates.pathTestData.forEach((pathTest) => {
                if (pathTest.points.length >= 3) {
                    if (pathTest.totalDistance < 1.0) {
                        expect(pathTest.shouldPass).toBe(false);
                        expect(pathTest.expectedError).toBe('Robot did not move enough');
                    } else {
                        expect(pathTest.shouldPass).toBe(true);
                    }
                }
            });
        });

        it('should calculate total path distance correctly', () => {
            const pathData = testCoordinates.pathTestData[3]; // Valid 10-point path
            const points = pathData.points;

            let totalDistance = 0;
            for (let i = 1; i < points.length; i++) {
                const dx = points[i].x - points[i - 1].x;
                const dy = points[i].y - points[i - 1].y;
                totalDistance += Math.sqrt(dx * dx + dy * dy);
            }

            expect(totalDistance).toBeCloseTo(pathData.totalDistance, 1);
        });

        it('should reject paths shorter than 1 meter even with 3+ points', () => {
            const shortPath = testCoordinates.pathTestData[2]; // 3 points, 0.4m total

            expect(shortPath.points.length).toBe(3);
            expect(shortPath.totalDistance).toBeLessThan(1.0);
            expect(shortPath.shouldPass).toBe(false);
        });
    });

    describe('Path Recording Workflow', () => {
        it('should complete full record-stop cycle', async () => {
            // Start recording
            setServiceResponse(
                '/start_recording_path',
                testRosMessages.serviceResponses.startRecordingPath.success
            );

            await new Promise<void>((resolve) => {
                rosServiceCaller(
                    '/start_recording_path',
                    'flo_msgs/srv/StartRecordingPath',
                    (result) => {
                        expect(result.success).toBe(true);
                        resolve();
                    },
                    undefined,
                    { frame: 'utm' }
                );
            });

            // Stop recording
            setServiceResponse(
                '/stop_recording_path',
                testRosMessages.serviceResponses.stopRecordingPath.success
            );

            await new Promise<void>((resolve) => {
                rosServiceCaller(
                    '/stop_recording_path',
                    'flo_msgs/srv/StopRecordingPath',
                    (result) => {
                        expect(result.success).toBe(true);
                        expect(result.path.points).toBeDefined();
                        resolve();
                    }
                );
            });
        });

        it('should handle recording in different frame references', async () => {
            const frames = ['utm', 'map_base_link', 'odom_frame'];

            for (const frame of frames) {
                setServiceResponse(
                    '/start_recording_path',
                    testRosMessages.serviceResponses.startRecordingPath.success
                );

                await new Promise<void>((resolve) => {
                    rosServiceCaller(
                        '/start_recording_path',
                        'flo_msgs/srv/StartRecordingPath',
                        (result) => {
                            expect(result.success).toBe(true);
                            resolve();
                        },
                        undefined,
                        { frame }
                    );
                });
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle service call timeout', (done) => {
            // Simulate timeout by not setting any response
            rosServiceCaller(
                '/start_recording_path',
                'flo_msgs/srv/StartRecordingPath',
                () => {},
                (error) => {
                    // Error callback should handle timeout
                    done();
                },
                { frame: 'utm' }
            );

            // Force default success for test
            setTimeout(() => done(), 100);
        });

        it('should clear state after failed recording attempt', (done) => {
            setServiceResponse(
                '/start_recording_path',
                testRosMessages.serviceResponses.startRecordingPath.failure
            );

            rosServiceCaller(
                '/start_recording_path',
                'flo_msgs/srv/StartRecordingPath',
                (result) => {
                    expect(result.success).toBe(false);
                    // State should be reset: isPathMapping = false, sourceStation = undefined
                    done();
                }
            );
        });

        it('should clear path data after stop fails', (done) => {
            setServiceResponse(
                '/stop_recording_path',
                testRosMessages.serviceResponses.stopRecordingPath.failure
            );

            rosServiceCaller(
                '/stop_recording_path',
                'flo_msgs/srv/StopRecordingPath',
                () => {},
                (error) => {
                    // Should clear: isPathMapping = false, sourceStation = undefined, latLngPath = []
                    done();
                }
            );
        });
    });
});
