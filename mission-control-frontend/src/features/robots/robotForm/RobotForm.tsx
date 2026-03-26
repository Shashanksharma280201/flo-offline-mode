import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "react-query";
import { errorLogger } from "../../../util/errorLogger";
import { MdClose, MdCopyAll } from "react-icons/md";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { createRobotfn, createRobotWithBOMfn, getFleetsListFn, BOMPart } from "../services/robotsService";
import { FleetType } from "../../../data/types/fleetTypes";
import RobotComboBox from "../RobotComboBox";
import { toast } from "react-toastify";
import { RobotType } from "../../../data/types";
import { useUserStore } from "../../../stores/userStore";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import RobotMaintenanceSchedule from "../robot/robotProfile/RobotMaintenanceSchedule";
import BOMVerificationModal from "./BOMVerificationModal";

type RobotFormProps = {
    onRefetchRobotslist: () => void;
    closeRobotForm: () => void;
};

/**
 * Form to create a new robot
 */
const RobotForm = ({ closeRobotForm, onRefetchRobotslist }: RobotFormProps) => {
    const userId = useUserStore((state) => state.user?.id);
    const [fleets, setFleets] = useState<any[]>([]); // Will contain full fleet data with partsConsumption
    const [selectedFleet, setSelectedFleet] = useState<any | null>(null);
    const [createdBot, setCreatedBot] = useState<RobotType>();
    const [robotType, setRobotType] = useState<"autonomous" | "manual">(
        "manual"
    );
    const [showBOMModal, setShowBOMModal] = useState(false);
    const [formData, setFormData] = useState<{
        name: string;
        desc: string;
        password: string;
        macAddress: string;
        confirmPassword: string;
    }>({
        name: "",
        desc: "",
        macAddress: "",
        password: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const schedule = useMemo(
        () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        []
    );
    const [maintenanceSchedule, setMaintenanceSchedule] = useState(
        new Set<number>([1, 4])
    );
    const { name, desc, password, confirmPassword, macAddress } = formData;

    /**
     * Set formData state value on change in email or password fields
     * @param e - form data value that can be email or password
     */
    const onChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));

        let error = "";

        if (name === "name") {
            const robotNameRegex = /^MMR-\d+/;
            if (!value) {
                error = "Robot name is required";
            } else if (!robotNameRegex.test(value)) {
                error =
                    "Robot name must be in the format 'MMR-{Number}' followed by any optional text";
            } else {
                const userRobots = useUserStore.getState().robots;
                const nameExists = userRobots?.some(
                    (r: RobotType) =>
                        r.name.toLowerCase() === value.toLowerCase()
                );
                if (nameExists) {
                    error = "A robot with this name already exists";
                }
            }
        }

        if (name === "desc" && !value) {
            error = "Description is required";
        }

        if (name === "macAddress" && robotType === "manual") {
            const macRegex = /^[0-9A-Fa-f]{12}$/;
            const normalizedMac = value.trim().replace(/[:-]/g, "");
            if (!value) {
                error = "MAC Address is required for manual robots";
            } else if (!macRegex.test(normalizedMac)) {
                error = "MAC Address must be 12 hexadecimal characters";
            }
        }

        if (name === "password" && !value) {
            error = "Password is required";
        }

        if (name === "confirmPassword") {
            if (!value) {
                error = "Please confirm your password";
            } else if (value !== formData.password) {
                error = "Passwords do not match";
            }
        }

        // Special case: if we change password, we might need to update confirmPassword's error
        if (name === "password") {
            if (
                formData.confirmPassword &&
                value !== formData.confirmPassword
            ) {
                setErrors((prev) => ({
                    ...prev,
                    confirmPassword: "Passwords do not match"
                }));
            } else if (
                formData.confirmPassword &&
                value === formData.confirmPassword
            ) {
                setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.confirmPassword;
                    return newErrors;
                });
            }
        }

        setErrors((prev) => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[name] = error;
            } else {
                delete newErrors[name];
            }
            return newErrors;
        });
    };

    const isFormValid = useMemo(() => {
        // Basic requirement: all fields must have values and no errors
        const requiredFieldsFilled =
            !!name && !!desc && !!password && !!confirmPassword;
        const noErrors = Object.keys(errors).length === 0;
        const passwordsMatch = password === confirmPassword;

        // Logical check for MAC based on robot type
        const macValid =
            robotType === "manual"
                ? !!macAddress &&
                  /^[0-9A-Fa-f]{12}$/.test(
                      macAddress.trim().replace(/[:-]/g, "")
                  )
                : true;

        // Fleet is now mandatory for BOM verification
        const fleetSelected = !!selectedFleet;

        return requiredFieldsFilled && noErrors && passwordsMatch && macValid && fleetSelected;
    }, [errors, name, desc, password, confirmPassword, macAddress, robotType, selectedFleet]);

    const {
        mutate: fetchFleetsList,
        isLoading,
        isError,
        isSuccess
    } = useMutation(() => getFleetsListFn(), {
        onSuccess: (fleetData: FleetType[]) => {
            console.log(fleetData);
            setFleets(fleetData);
        },
        onError: (error: any) => errorLogger(error)
    });

    const createRobotMutation = useMutation(
        (robotData: {
            name: string;
            desc: string;
            password: string;
            owner: string;
            robotType: "autonomous" | "manual";
            macAddress?: string;
            fleetId?: string;
            maintenance: {
                schedule: number[];
                lastMaintenance: number;
            };
        }) => createRobotfn(robotData),
        {
            onSuccess: (data: RobotType) => {
                setCreatedBot(data);
                toast.success("Robot created successfully");
                resetForm();
                onRefetchRobotslist();
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    const createRobotWithBOMMutation = useMutation(
        (payload: {
            robotData: {
                name: string;
                desc: string;
                password: string;
                owner: string;
                fleetId: string;
                robotType: "autonomous" | "manual";
                macAddress?: string;
                maintenance: {
                    schedule: number[];
                    lastMaintenance: number;
                };
            };
            bomVerification: BOMPart[];
        }) => createRobotWithBOMfn(payload),
        {
            onSuccess: (data: any) => {
                setCreatedBot(data.robot);
                setShowBOMModal(false);

                // Show success with warnings if any
                if (data.warnings && data.warnings.length > 0) {
                    toast.warning(
                        `Robot created! Low stock warnings: ${data.warnings.map((w: any) => w.name).join(', ')}`,
                        { autoClose: 5000 }
                    );
                } else {
                    toast.success("Robot created successfully with BOM verification");
                }

                resetForm();
                onRefetchRobotslist();
            },
            onError: (error: any) => {
                setShowBOMModal(false);
                errorLogger(error);
            }
        }
    );

    const resetForm = () => {
        setFormData({
            name: "",
            desc: "",
            password: "",
            confirmPassword: "",
            macAddress: ""
        });
        setRobotType("manual");
        setSelectedFleet(null);
        setMaintenanceSchedule(new Set([1, 4]));
    };

    /**
     * Sends userData to server on Login submission
     * @param event - click
     */
    const submitHandler = (event: any) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            setFormData((prevData) => ({
                ...prevData,
                password: "",
                confirmPassword: ""
            }));
            return;
        }

        // Validate macAddress for manual robots
        if (robotType === "manual" && !macAddress) {
            toast.error(
                "MAC Address is required for manual robots (live data dashboard)"
            );
            return;
        }

        // Validate robot name format: MMR-{Number}[optional text]
        const robotNameRegex = /^MMR-\d+/;
        if (!robotNameRegex.test(name)) {
            toast.error(
                "Robot name must be in the format 'MMR-{Number}' followed by any optional text"
            );
            return;
        }

        // Check if robot name already exists (case-insensitive)
        const userRobots = useUserStore.getState().robots;
        const nameExists = userRobots?.some(
            (r: RobotType) => r.name.toLowerCase() === name.toLowerCase()
        );
        if (nameExists) {
            toast.error("A robot with this name already exists");
            return;
        }

        if (userId && selectedFleet) {
            console.log("Submit handler triggered");
            console.log("Selected Fleet:", selectedFleet);
            console.log("Parts consumption:", selectedFleet.partsConsumption);

            // Check if fleet has parts consumption (BOM)
            const hasPartsConsumption = selectedFleet.partsConsumption &&
                (selectedFleet.partsConsumption.electrical?.length > 0 ||
                 selectedFleet.partsConsumption.mechanical?.length > 0);

            console.log("Has parts consumption:", hasPartsConsumption);
            console.log("Electrical parts:", selectedFleet.partsConsumption?.electrical?.length || 0);
            console.log("Mechanical parts:", selectedFleet.partsConsumption?.mechanical?.length || 0);

            if (!hasPartsConsumption) {
                console.error("No BOM parts configured for this fleet");
                toast.error("This fleet does not have BOM parts configured. Please configure parts in Fleet settings first.");
                return;
            }

            // Show BOM verification modal (mandatory)
            console.log("Opening BOM verification modal");
            setShowBOMModal(true);
        }
    };

    const handleBOMConfirm = (bomParts: BOMPart[]) => {
        if (!userId || !selectedFleet) return;

        const payload = {
            robotData: {
                name,
                desc,
                password,
                robotType,
                macAddress: robotType === "manual" ? macAddress : undefined,
                owner: userId,
                fleetId: selectedFleet.id,
                maintenance: {
                    schedule: Array.from(maintenanceSchedule),
                    lastMaintenance: Date.now()
                }
            },
            bomVerification: bomParts
        };

        createRobotWithBOMMutation.mutate(payload);
    };

    useEffect(() => {
        fetchFleetsList();
    }, []);

    // Clear MAC address when switching to autonomous robot
    useEffect(() => {
        if (robotType === "autonomous") {
            setFormData((prevData) => ({
                ...prevData,
                macAddress: ""
            }));
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.macAddress;
                return newErrors;
            });
        }
    }, [robotType]);

    return (
        <div className="fixed left-0 top-0 z-[100] flex h-screen w-screen flex-col overflow-y-scroll md:bg-opacity-75">
            <div className="flex w-full justify-end p-4 md:hidden">
                <MdClose
                    onClick={() => {
                        setCreatedBot(undefined);
                        closeRobotForm();
                    }}
                    className="h-6 w-6 text-white hover:opacity-75 "
                />
            </div>
            <div className="flex h-full w-full flex-col items-center justify-center rounded-md border-border bg-background p-6 md:mx-auto md:my-auto md:h-auto md:w-[35%] md:gap-y-8 md:border  md:p-8">
                {(createRobotMutation.isLoading || createRobotWithBOMMutation.isLoading) ? (
                    <section>
                        <section className="flex flex-col items-center justify-between gap-16 ">
                            <LoadingSpinner className="mb-2 h-14 w-14 animate-spin fill-white text-background" />
                            <span
                                className={`text-sm text-neutral-400 md:text-base `}
                            >
                                Please wait while we assemble your robot.
                            </span>
                        </section>
                    </section>
                ) : (
                    <section className="w-full">
                        <section className="flex flex-col">
                            <section className="flex items-center justify-between ">
                                <h1
                                    className={`text-xl ${
                                        (createRobotMutation.isSuccess || createRobotWithBOMMutation.isSuccess)
                                            ? "text-green-500"
                                            : "text-white"
                                    }  font-semibold md:text-2xl `}
                                >
                                    {(createRobotMutation.isSuccess || createRobotWithBOMMutation.isSuccess)
                                        ? "Bot Creation Successful"
                                        : "Create Bot"}
                                </h1>

                                <span
                                    onClick={() => {
                                        setCreatedBot(undefined);
                                        closeRobotForm();
                                    }}
                                >
                                    <MdClose className="hidden h-6 w-6 text-white hover:opacity-75 md:flex" />
                                </span>
                            </section>

                            <p
                                className={`my-5 text-sm text-secondary sm:text-lg`}
                            >
                                {(createRobotMutation.isSuccess || createRobotWithBOMMutation.isSuccess)
                                    ? "Use the credentials below to setup your bot on the edge device."
                                    : "Let's get you started!"}
                            </p>
                        </section>
                        <section>
                            {(createRobotMutation.isSuccess || createRobotWithBOMMutation.isSuccess) && createdBot ? (
                                <div className="flex w-full items-center justify-between rounded-md border border-border p-3">
                                    <span>{createdBot.id}</span>

                                    <MdCopyAll
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(
                                                    createdBot.id
                                                );
                                                toast.success(
                                                    "Copied to clipboard"
                                                );
                                            } catch (error: any) {
                                                toast.error(
                                                    error.message ?? error
                                                );
                                            }
                                        }}
                                        className="h-6 w-6 cursor-pointer text-white hover:opacity-75 "
                                    />
                                </div>
                            ) : (
                                <form
                                    onSubmit={submitHandler}
                                    className="flex w-full flex-col gap-y-4"
                                >
                                    <fieldset className="flex flex-col justify-center  gap-2 rounded-md ">
                                        <label htmlFor="name">
                                            Name Of Bot
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            className={`flex w-full appearance-none items-center rounded-md border ${errors.name ? "border-red-500" : "border-border"} bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg `}
                                            name="name"
                                            value={name}
                                            placeholder="Enter Name"
                                            onChange={onChange}
                                        />
                                        {errors.name && (
                                            <span className="mt-1 text-xs text-red-500">
                                                {errors.name}
                                            </span>
                                        )}
                                    </fieldset>
                                    <fieldset className="flex flex-col justify-center gap-3 rounded-md">
                                        <label htmlFor="robotType">
                                            Robot Type
                                        </label>
                                        <div className="flex flex-col gap-3">
                                            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-backgroundGray/30 p-3 transition-colors hover:border-neutral-400">
                                                <input
                                                    type="radio"
                                                    name="robotType"
                                                    value="manual"
                                                    checked={
                                                        robotType === "manual"
                                                    }
                                                    onChange={(e) =>
                                                        setRobotType(
                                                            e.target.value as
                                                                | "autonomous"
                                                                | "manual"
                                                        )
                                                    }
                                                    className="h-4 w-4 text-green-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">
                                                        Manual Robot
                                                    </span>
                                                    <span className="text-xs text-neutral-400">
                                                        With live data dashboard
                                                        & teleoperation
                                                    </span>
                                                </div>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-backgroundGray/30 p-3 transition-colors hover:border-neutral-400">
                                                <input
                                                    type="radio"
                                                    name="robotType"
                                                    value="autonomous"
                                                    checked={
                                                        robotType ===
                                                        "autonomous"
                                                    }
                                                    onChange={(e) =>
                                                        setRobotType(
                                                            e.target.value as
                                                                | "autonomous"
                                                                | "manual"
                                                        )
                                                    }
                                                    className="h-4 w-4 text-green-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">
                                                        Autonomous Robot
                                                    </span>
                                                    <span className="text-xs text-neutral-400">
                                                        With autonomous
                                                        navigation & mission
                                                        control
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    </fieldset>
                                    <fieldset className="flex flex-col justify-center  gap-2 rounded-md ">
                                        <label htmlFor="fleet">
                                            Fleet
                                            <span className="ml-1 text-red-500">*</span>
                                        </label>
                                        <RobotComboBox
                                            className="bg-backgroundGray/30"
                                            fleets={fleets}
                                            selectedFleet={selectedFleet}
                                            isLoading={isLoading}
                                            setSelectedFleet={setSelectedFleet}
                                        />
                                        {!selectedFleet && (
                                            <span className="text-xs text-secondary">
                                                Fleet selection is required for BOM verification
                                            </span>
                                        )}
                                        {selectedFleet && (
                                            <>
                                                <div className="mt-2 rounded-md border border-blue-500/50 bg-blue-500/10 p-3">
                                                    <div className="flex items-start gap-2">
                                                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                                                        <div className="text-xs text-blue-300">
                                                            <p className="mb-1 font-medium">
                                                                Fleet Selected: {selectedFleet.name}
                                                            </p>
                                                            <p className="text-blue-300/80">
                                                                BOM verification will be required before robot creation
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedFleet.partsConsumption &&
                                                 (!selectedFleet.partsConsumption.electrical?.length &&
                                                  !selectedFleet.partsConsumption.mechanical?.length) && (
                                                    <div className="mt-2 rounded-md border border-red-500/50 bg-red-500/10 p-3">
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                                                            <div className="text-xs text-red-300">
                                                                <p className="mb-1 font-medium">
                                                                    No BOM Parts Configured
                                                                </p>
                                                                <p className="text-red-300/80">
                                                                    This fleet does not have BOM parts configured.
                                                                    Please add parts in Fleet settings before creating robots.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {!selectedFleet.qcTemplateId && (
                                                    <div className="mt-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                                                            <div className="text-xs text-yellow-300">
                                                                <p className="mb-1 font-medium">
                                                                    No QC Template Configured
                                                                </p>
                                                                <p className="text-yellow-300/80">
                                                                    This fleet does not have a QC template assigned.
                                                                    Quality control checks will not be available for robots in this fleet.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </fieldset>
                                    <fieldset className="flex flex-col justify-center  gap-2 rounded-md ">
                                        <label htmlFor="desc">
                                            Description
                                        </label>

                                        <textarea
                                            required
                                            className={`flex w-full appearance-none items-center rounded-md border ${errors.desc ? "border-red-500" : "border-border"} bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg  `}
                                            name="desc"
                                            value={desc}
                                            placeholder="Enter Description"
                                            onChange={onChange}
                                        />
                                        {errors.desc && (
                                            <span className="mt-1 text-xs text-red-500">
                                                {errors.desc}
                                            </span>
                                        )}
                                    </fieldset>
                                    {robotType === "manual" && (
                                        <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                                            <label htmlFor="macAddress">
                                                MAC Address
                                                <span className="ml-1 text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                className={`flex w-full appearance-none items-center rounded-md border ${errors.macAddress ? "border-red-500" : "border-border"} bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg `}
                                                name="macAddress"
                                                value={macAddress}
                                                placeholder="Enter MAC Address (e.g., 6825DDCE1A28)"
                                                onChange={onChange}
                                            />
                                            {errors.macAddress && (
                                                <span className="mt-1 text-xs text-red-500">
                                                    {errors.macAddress}
                                                </span>
                                            )}
                                            <span className="text-xs text-neutral-400">
                                                Required for live data
                                                dashboard. 12 hexadecimal
                                                characters.
                                            </span>
                                        </fieldset>
                                    )}
                                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                                        <label htmlFor="maintenance">
                                            Maintenance Schedule
                                        </label>
                                        <RobotMaintenanceSchedule
                                            maintenanceSchedule={
                                                maintenanceSchedule
                                            }
                                            className="bg-backgroundGray/30"
                                            setMaintenanceSchedule={
                                                setMaintenanceSchedule
                                            }
                                        />
                                    </fieldset>
                                    <fieldset className="flex flex-col justify-center  gap-2 rounded-md">
                                        <label htmlFor="password">
                                            Password
                                        </label>
                                        <input
                                            required
                                            type="password"
                                            className={`flex w-full appearance-none items-center rounded-md border ${errors.password ? "border-red-500" : "border-border"} bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg  `}
                                            name="password"
                                            value={password}
                                            placeholder="Enter password"
                                            onChange={onChange}
                                        />
                                        {errors.password && (
                                            <span className="mt-1 text-xs text-red-500">
                                                {errors.password}
                                            </span>
                                        )}
                                    </fieldset>
                                    <fieldset className="flex flex-col justify-center  gap-2 rounded-md">
                                        <label htmlFor="confirmPassword">
                                            Confirm Password
                                        </label>
                                        <input
                                            required
                                            type="password"
                                            className={`flex w-full appearance-none items-center rounded-md border ${errors.confirmPassword ? "border-red-500" : "border-border"} bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg `}
                                            name="confirmPassword"
                                            value={confirmPassword}
                                            placeholder="Enter password"
                                            onChange={onChange}
                                        />
                                        {errors.confirmPassword && (
                                            <span className="mt-1 text-xs text-red-500">
                                                {errors.confirmPassword}
                                            </span>
                                        )}
                                    </fieldset>
                                    <fieldset>
                                        <button
                                            disabled={!isFormValid}
                                            type="submit"
                                            className="w-full rounded-md border border-green-500 bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            Submit
                                        </button>
                                    </fieldset>
                                </form>
                            )}
                        </section>
                    </section>
                )}
            </div>

            {/* BOM Verification Modal */}
            {showBOMModal && selectedFleet?.partsConsumption && (
                <BOMVerificationModal
                    fleetName={selectedFleet.name}
                    partsConsumption={selectedFleet.partsConsumption}
                    onConfirm={handleBOMConfirm}
                    onCancel={() => setShowBOMModal(false)}
                />
            )}
        </div>
    );
};
export default RobotForm;
