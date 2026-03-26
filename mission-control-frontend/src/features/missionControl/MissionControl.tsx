import { Suspense, useRef } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import Draggable from "react-draggable";
import { MdDragIndicator, MdSwapVert } from "react-icons/md";
import { ESwapScreenStatus } from "../../data/types";
import Teleops from "../../pages/Teleops";
import { useUserStore } from "../../stores/userStore";
import { useRobotConfigStore } from "../../stores/robotConfigStore";
import { GridHelper } from "three";
import Viz from "./Viz";
import { Perf } from "r3f-perf";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const MissionControl = () => {
    return (
        <div
            className={`relative h-full w-[80%] grow bg-background transition ease-in-out`}
        >
            <Suspense
                fallback={
                    <div className="flex h-full min-h-[20vh] w-full flex-col items-center justify-center gap-8">
                        Loading environment...
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                }
            >
                <Canvas
                    camera={{
                        fov: 45,
                        near: 0.1,
                        far: 200,
                        position: [-5, 5, 0]
                    }}
                >
                    <Viz />
                    {/* <Perf className=" hidden md:block" /> */}
                </Canvas>
            </Suspense>
        </div>
    );
};
export default MissionControl;
