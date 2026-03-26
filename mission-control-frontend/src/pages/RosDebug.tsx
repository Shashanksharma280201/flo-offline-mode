import { useRosFns } from "../lib/ros/useRosFns";

const RosDebug = () => {
    const { rosServiceCaller } = useRosFns();
    const resetPoseHandler = () => {
        rosServiceCaller(
            "/set_pose",
            "geometry_msgs/PoseWithCovarianceStamped",
            (result) => {
                console.log(result);
            },
            (error) => {
                console.log("error: ", error);
            },
            {
                pose: {
                    pose: {
                        position: { x: 0.0, y: 0.0, z: 0.0 },
                        orientation: { x: 0.0, y: 0.0, z: 0.0, w: 0.0 }
                    },
                    covariance: [
                        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                        0.0, 0.0, 0.0
                    ]
                }
            }
        );
    };
    return (
        <div className="h-[100vh] p-5">
            <div className="flex">
                <button
                    onClick={resetPoseHandler}
                    className="w-auto rounded-md bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                >
                    Reset Pose
                </button>
            </div>
        </div>
    );
};
export default RosDebug;
