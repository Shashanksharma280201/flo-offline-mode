import ComboBox from "@/components/comboBox/ComboBox";
import { RobotType } from "@/data/types";
import useRobots from "@/hooks/useRobots";
import { useUserStore } from "@/stores/userStore";
import { allRobotOption } from "./constants";
import { cn } from "@/lib/utils";

export const RobotComboBox = ({
    selectedRobot,
    setSelectedRobot,
    className
}: {
    selectedRobot?: RobotType;
    setSelectedRobot: (selectedRobot: RobotType) => void;
    className?: string;
}) => {
    // useRobots now returns a query - auto-fetches on mount
    const { isLoading } = useRobots();
    const robots = useUserStore((state) => state.robots);

    // No need for manual fetch - useQuery auto-fetches

    return (
        <ComboBox
            wrapperClassName={cn("bg-backgroundGray/30", className)}
            label="Robot"
            items={[allRobotOption, ...robots]}
            selectedItem={selectedRobot}
            setSelectedItem={setSelectedRobot}
            getItemLabel={(robot) => robot?.name ?? ""}
            placeholder="Select Robots"
            isLoading={isLoading}
        />
    );
};
