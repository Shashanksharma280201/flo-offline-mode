import { vi } from 'vitest';

// Mock ROSLIB types
export interface MockRosService {
    callService: ReturnType<typeof vi.fn>;
}

export interface MockRosTopic {
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
}

export interface MockRos {
    connect: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
}

// Create mock ROS service caller
export const createMockRosServiceCaller = () => {
    const serviceResponses: Record<string, any> = {};

    const rosServiceCaller = vi.fn((
        serviceName: string,
        serviceType: string,
        successCallback: (result: any) => void,
        errorCallback?: (error: any) => void,
        request?: any
    ) => {
        const response = serviceResponses[serviceName];

        if (response && response.success) {
            setTimeout(() => successCallback(response), 0);
        } else if (response && !response.success && errorCallback) {
            setTimeout(() => errorCallback(response.error || { message: 'Service failed' }), 0);
        } else {
            // Default success response
            setTimeout(() => successCallback({ success: true, message: 'OK' }), 0);
        }
    });

    const setServiceResponse = (serviceName: string, response: any) => {
        serviceResponses[serviceName] = response;
    };

    return { rosServiceCaller, setServiceResponse };
};

// Create mock ROS subscriber
export const createMockRosSubscribe = () => {
    const subscribers: Record<string, any[]> = {};

    const rosSubscribe = vi.fn((topic: string, messageType: string, options?: any) => {
        if (!subscribers[topic]) {
            subscribers[topic] = [];
        }

        const subscriber = {
            subscribe: vi.fn((callback: (message: any) => void) => {
                subscribers[topic].push(callback);
            }),
            unsubscribe: vi.fn(() => {
                subscribers[topic] = [];
            })
        };

        return subscriber;
    });

    const publishToTopic = (topic: string, message: any) => {
        if (subscribers[topic]) {
            subscribers[topic].forEach(callback => callback(message));
        }
    };

    return { rosSubscribe, publishToTopic, subscribers };
};

// Mock ROS message types
export const createMockRobotMetaPose = (
    lat: number = 12.9716,
    lng: number = 77.5946,
    mapX: number = 0,
    mapY: number = 0,
    yaw: number = 0
) => ({
    latitude: lat,
    longitude: lng,
    pose: {
        point: {
            x: mapX,
            y: mapY
        },
        yaw: yaw
    }
});

export const createMockStartRecordingPathResponse = (success: boolean = true) => ({
    success,
    message: success ? 'Path recording started' : 'Failed to start recording'
});

export const createMockStopRecordingPathResponse = (
    success: boolean = true,
    points: Array<{ x: number; y: number }> = []
) => ({
    success,
    message: success ? 'Path recording stopped' : 'Failed to stop recording',
    path: { points }
});

export const createMockLoadMapResponse = (success: boolean = true) => ({
    success,
    message: success ? 'Map loaded successfully' : 'Failed to load map'
});

export const createMockLocalizeResponse = (success: boolean = true) => ({
    success,
    message: success ? 'Localized from GPS' : 'Localization failed'
});

export const createMockStartMappingResponse = (success: boolean = true) => ({
    success,
    message: success ? 'LIDAR mapping started' : 'Failed to start mapping'
});

export const createMockSavePCDResponse = (success: boolean = true) => ({
    success,
    message: success ? 'PCD saved successfully' : 'Failed to save PCD'
});

export const createMockEnableNonRTKResponse = (success: boolean = true) => ({
    success,
    message: success ? 'Non-RTK mode enabled' : 'Failed to enable Non-RTK mode'
});
