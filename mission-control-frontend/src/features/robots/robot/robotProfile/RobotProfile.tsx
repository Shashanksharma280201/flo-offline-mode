import { ChangeEvent, useEffect, useRef, useState } from "react";
import { FaRobot } from "react-icons/fa";
import { useOutletContext } from "react-router-dom";
import { useMutation } from "react-query";
import { FleetType, RobotType } from "@/data/types";
import RobotProfileItem from "./RobotProfileItem";
import { getFleetsListFn, updateRobotfn } from "../../services/robotsService";
import { errorLogger } from "@/util/errorLogger";
import FleetComboBox from "../../RobotComboBox";
import RobotMaintenanceSchedule from "./RobotMaintenanceSchedule";
import { toast } from "react-toastify";

type ProfileOutletProps = { robot: RobotType; fetchRobotDetails: () => void };

const RobotProfile = () => {
    const { robot, fetchRobotDetails } = useOutletContext<ProfileOutletProps>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [isViewOnly, setIsViewOnly] = useState(true);
    const [selectedFleet, setSelectedFleet] = useState<FleetType | null>(
        robot.fleet || null
    );

    const [maintenanceSchedule, setMaintenanceSchedule] = useState(
        new Set(robot.maintenance?.schedule)
    );

    const [robotImage, setRobotImage] = useState(robot.image);

    const [fleets, setFleets] = useState<FleetType[]>([]);

    const [robotDetails, setRobotDetails] = useState({
        name: robot.name,
        macAddress: robot.macAddress,
        description: robot.desc
    });

    const onChangeHandler = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setRobotDetails((prev) => ({
            ...prev,
            [event.target.name]: event.target.value
        }));
    };

    const { mutate: mutatefetchFleetsList, isLoading: fleetIsLoading } =
        useMutation(() => getFleetsListFn(), {
            onSuccess: (fleetData: FleetType[]) => {
                setFleets(fleetData);
            },
            onError: (error: any) => errorLogger(error)
        });

    const updateRobotMutation = useMutation({
        mutationFn: (robotData: {
            name: string;
            desc?: string;
            robotId: string;
            fleetId?: string;
            macAddress?: string;
            maintenance?: {
                schedule: number[];
                lastMaintenance: number;
            };
        }) => updateRobotfn(robotData),
        onSuccess: (data) => {
            setIsViewOnly(true);
            fetchRobotDetails();
            toast.success(data.message);
        },
        onError: (err) => console.log(err)
    });

    useEffect(() => {
        mutatefetchFleetsList();
    }, []);

    const editClickHandler = () => {
        if (isViewOnly) {
            setIsViewOnly(false);
        } else {
            cancelEditHandler();
        }
    };

    const cancelEditHandler = () => {
        setRobotImage(robot.image);
        setSelectedFleet(robot.fleet || null);
        setRobotDetails({
            name: robot.name,
            macAddress: robot.macAddress,
            description: robot.desc
        });
        setIsViewOnly(true);
    };
    const saveEditHandler = () => {
        const robotData = {
            name: robotDetails.name,
            desc: robotDetails.description,
            robotId: robot.id,
            macAddress: robotDetails.macAddress,
            fleetId: selectedFleet?.id,
            ...(maintenanceSchedule && {
                maintenance: {
                    schedule: Array.from(maintenanceSchedule),
                    lastMaintenance:
                        robot.maintenance?.lastMaintenance ?? Date.now()
                }
            })
        };
        updateRobotMutation.mutate(robotData);
    };

    const setRobotImageHandler = (ev: ChangeEvent<HTMLInputElement>) => {
        const imageFile = ev.target.files && ev.target.files[0];
        if (imageFile) {
            const imageUrl = URL.createObjectURL(imageFile);
            setRobotImage(imageUrl);
        }
    };

    const selectImageHandler = () => {
        if (fileRef.current) {
            fileRef.current.click();
        }
    };

    return (
        <div className="flex flex-col gap-4 bg-blue-900/25 py-6 md:gap-8 md:px-8">
            <div className="flex w-screen flex-col justify-center gap-6 overflow-y-auto px-6 md:flex-row md:gap-8 md:px-8">
                <section className="w-full md:w-[25%]">
                    <div className="relative flex min-h-[25vh] w-full flex-col items-center justify-center rounded-md border border-border bg-slate-800/30  bg-opacity-50">
                        {!isViewOnly && (
                            <div
                                onClick={selectImageHandler}
                                className="absolute flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-black/60 transition-all duration-200 hover:bg-black/80"
                            >
                                <span className="text-neutral-200">
                                    Click to update image
                                </span>
                            </div>
                        )}
                        {robotImage ? (
                            <img
                                src={robotImage}
                                onError={() => setRobotImage(undefined)}
                                className="h-[25vh] w-full object-contain"
                            />
                        ) : (
                            <div className="flex min-h-[25vh] w-full items-center justify-center ">
                                <FaRobot className="h-16 w-16 text-backgroundGray/30" />
                            </div>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            onChange={setRobotImageHandler}
                            accept="image/png, image/jpeg"
                            className="hidden"
                        />
                    </div>
                </section>
                <section className="relative flex w-full flex-col divide-y divide-border overflow-hidden rounded-md border border-border bg-gray-700/45 md:w-[50%]">
                    <button
                        onClick={editClickHandler}
                        className={`absolute right-6 top-6 cursor-pointer bg-green-600 p-2 rounded-lg font-sans  ${isViewOnly ? "text-gray-300 hover:bg-green-700" : "text-gray-300 bg-red-600/80"} `}
                    >
                        {isViewOnly ? "Edit details" : "Cancel Editing"}
                    </button>
                    <RobotProfileItem
                        title="Robot's Name"
                        desc="This is the name used to identify the robot on field or on the
                dashboard."
                    >
                        <input
                            disabled={isViewOnly}
                            value={robotDetails.name}
                            name="name"
                            className="w-full rounded-md bg-transparent p-3 outline-none placeholder:text-neutral-600"
                            placeholder="Enter robot Name"
                            onChange={onChangeHandler}
                        />
                    </RobotProfileItem>
                    <RobotProfileItem
                        title="Robot's Mac adress"
                        desc="This is used for data collection"
                    >
                        <input
                            disabled={isViewOnly}
                            value={robotDetails.macAddress}
                            name="macAddress"
                            className="w-full rounded-md bg-transparent p-3 outline-none placeholder:text-neutral-600"
                            placeholder="Enter robot Mac adress"
                            onChange={onChangeHandler}
                        />
                    </RobotProfileItem>
                    <RobotProfileItem
                        childClassname="border-none"
                        title="Robot's Type"
                        desc="This describes the robot's fleet."
                    >
                        <FleetComboBox
                            className="bg-transparent"
                            fleets={fleets}
                            disabled={isViewOnly}
                            selectedFleet={selectedFleet}
                            isLoading={fleetIsLoading}
                            setSelectedFleet={setSelectedFleet}
                        />
                    </RobotProfileItem>
                    <RobotProfileItem
                        title="Robot's Description"
                        desc="Describes robot in detail about its nature and the kind of work the robot works on."
                    >
                        <textarea
                            disabled={isViewOnly}
                            value={robotDetails.description}
                            name="description"
                            className="w-full rounded-md bg-transparent p-3 outline-none placeholder:text-neutral-600"
                            placeholder="Enter robot description"
                            onChange={onChangeHandler}
                        />
                    </RobotProfileItem>
                    <RobotProfileItem
                        title="Robot's maintenance"
                        desc="Operators will be notified to do a maintenance check on these days"
                    >
                        <RobotMaintenanceSchedule
                            className="border-0"
                            disabled={isViewOnly}
                            maintenanceSchedule={maintenanceSchedule}
                            setMaintenanceSchedule={setMaintenanceSchedule}
                        />
                    </RobotProfileItem>
                </section>
            </div>
            {!isViewOnly && (
                <div className="flex justify-end gap-6 px-4 md:p-0 lg:mx-auto lg:w-[75%]">
                    <button
                        onClick={cancelEditHandler}
                        className="rounded-md border border-border px-6 py-2 hover:bg-backgroundGray/50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveEditHandler}
                        className="rounded-md border border-border bg-white px-6 py-2 text-black hover:bg-white/90"
                    >
                        Save
                    </button>
                </div>
            )}
        </div>
    );
};
export default RobotProfile;
