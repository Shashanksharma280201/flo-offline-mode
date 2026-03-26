import Header from "@/components/header/Header";
import OvertimeDashboard from "../features/overtime/OvertimeDashboard";

const Overtime = () => {
    return (
        <div className="h-screen overflow-y-auto bg-blue-900/25">
            <Header title="Overtime Management" />

            <div className="mx-auto flex w-full flex-col gap-6 p-7 md:gap-8 md:p-10">
                <OvertimeDashboard />
            </div>
        </div>
    );
};

export default Overtime;
