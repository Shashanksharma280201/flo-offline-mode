import { memo, useRef } from "react";
import Draggable from "react-draggable";
import { MdClose, MdDragIndicator, MdSwapVert } from "react-icons/md";
import { useUserStore } from "../../../stores/userStore";
import { ESwapScreenStatus } from "../../../data/types";
import MissionsView from "../MissionsView";

type DraggableMissionPanelProps = {
    onClose: () => void;
};

const DraggableMissionPanel = memo(({ onClose }: DraggableMissionPanelProps) => {
    const panelRef = useRef(null);
    const setSwapScreenStatus = useUserStore((state) => state.setSwapScreenStatus);

    return (
        <Draggable nodeRef={panelRef} handle=".missionHandle" bounds="parent">
            <div
                ref={panelRef}
                className="pointer-events-auto absolute left-5 top-20 z-30 w-[50vw] resize overflow-hidden rounded-md border-2 border-blue-500/30 bg-blue-900/30 shadow-2xl backdrop-blur-sm xs:w-[40vw] sm:w-[20vw] md:w-[18vw]"
            >
                <div className="missionHandle flex cursor-move items-center justify-between bg-gray-800/90 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <MdDragIndicator className="text-gray-400" />
                        <span className="text-sm font-medium text-white">Mission Control</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSwapScreenStatus(ESwapScreenStatus.MISSIONCONTROL)}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                            title="Switch to full Mission Control"
                        >
                            <MdSwapVert className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                            title="Close"
                        >
                            <MdClose className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="flex h-[400px] w-full overflow-hidden rounded-b-md">
                    <MissionsView />
                </div>
            </div>
        </Draggable>
    );
});

DraggableMissionPanel.displayName = "DraggableMissionPanel";

export default DraggableMissionPanel;
