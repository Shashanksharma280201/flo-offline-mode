import { memo, useRef } from "react";
import Draggable from "react-draggable";
import { MdClose, MdDragIndicator } from "react-icons/md";
import MetricsPanel from "../../teleops/components/MetricsPanel";

type DraggableMetricsPanelProps = {
    onClose: () => void;
};

const DraggableMetricsPanel = memo(({ onClose }: DraggableMetricsPanelProps) => {
    const panelRef = useRef(null);

    return (
        <Draggable nodeRef={panelRef} handle=".metricsHandle" bounds="parent">
            <div
                ref={panelRef}
                className="pointer-events-auto absolute right-2 top-16 z-50 w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-black/50 xs:w-[70vw] sm:right-5 sm:top-20 sm:w-[40vw] md:w-[35vw] lg:w-[28vw] xl:w-[22vw]"
            >
                <div className="metricsHandle flex cursor-move items-center justify-between border-b border-white/10 bg-gray-900/90 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                        <MdDragIndicator className="h-4 w-4 text-white/60 sm:h-5 sm:w-5" />
                        <span className="text-xs font-medium text-white sm:text-sm">Metrics Panel</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-white/60 transition-all hover:bg-white/10 hover:text-white sm:p-1.5"
                        title="Close"
                    >
                        <MdClose className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>
                <div className="h-full w-full">
                    <MetricsPanel />
                </div>
            </div>
        </Draggable>
    );
});

DraggableMetricsPanel.displayName = "DraggableMetricsPanel";

export default DraggableMetricsPanel;
