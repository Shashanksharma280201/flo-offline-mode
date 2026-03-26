import { useState } from "react";
import { useMutation } from "react-query";
import { errorLogger } from "../../../util/errorLogger";
import { MdClose } from "react-icons/md";
import { toast } from "react-toastify";
import { createClient } from "../services/clientService";
import { TimePicker } from "./TimePicker";
import { TimeZonePicker } from "./TimeZonePicker";

type ClientFormProps = {
    refetchClients: () => void;
    closeClientForm: () => void;
};

/**
 * Form to create a new client
 */
const ClientForm = ({ refetchClients, closeClientForm }: ClientFormProps) => {
    const [formData, setFormData] = useState({
        name: "",
        operatingHours: "",
        latitude: "",
        longitude: ""
    });
    const [selectedTime, setSelectedTime] = useState("09:00:00");
    const [selectedTimezone, setSelectedTimezone] = useState("Asia/Kolkata");

    const onChange = (e: any) => {
        setFormData((prevData) => ({
            ...prevData,
            [e.target.name]: e.target.value
        }));
    };

    const { mutate: mutateCreateClient, isLoading } = useMutation(
        (clientData: {
            name: string;
            operatingHours: string;
            latitude: number;
            longitude: number;
            checkInTimeWithZone: string;
        }) => createClient(clientData),
        {
            onSuccess: () => {
                toast.success("Client created successfully");
                setFormData({
                    name: "",
                    operatingHours: "",
                    latitude: "",
                    longitude: ""
                });
                setSelectedTime("08:00");
                setSelectedTimezone("Asia/Kolkata");
                refetchClients();
            },
            onError: (error: any) => {
                errorLogger(error);
            }
        }
    );

    const validateFormData = () => {
        let error = "";
        if (!formData.name) {
            error = "Name is required";
        } else if (!formData.operatingHours) {
            error = "Operating hours is required";
        } else if (!formData.latitude) {
            error = "Latitude is required";
        } else if (!formData.longitude) {
            error = "Longitude is required";
        } else if (!selectedTime) {
            error = "Check In Time is required";
        } else if (!selectedTimezone) {
            error = "Timezone is required";
        }
        return error;
    };

    const submitHandler = (event: any) => {
        event.preventDefault();
        const error = validateFormData();
        if (error) {
            toast.error(error);
            return;
        }
        const checkInTimeWithZone = `${selectedTime},${selectedTimezone}`;
        mutateCreateClient({
            name: formData.name,
            operatingHours: formData.operatingHours,
            latitude: +formData.latitude,
            longitude: +formData.longitude,
            checkInTimeWithZone
        });
        closeClientForm();
    };

    return (
        <div className="fixed left-0 top-0 z-[100] flex h-screen w-screen flex-col bg-background md:bg-opacity-75">
            <div className="flex w-full justify-end p-4 md:hidden">
                <MdClose
                    onClick={closeClientForm}
                    className="h-6 w-6 cursor-pointer text-white hover:opacity-75 "
                />
            </div>
            <div className="flex h-full w-full flex-col items-start justify-center gap-y-8 rounded-2xl border-border bg-background p-6 md:mx-auto md:my-auto md:h-auto md:w-[35%] md:border md:p-8">
                <div className="w-full space-y-2">
                    <div className="flex justify-between">
                        <h1 className="text-xl font-bold text-neutral-200">
                            Create Client
                        </h1>
                        <MdClose
                            onClick={closeClientForm}
                            className="hidden h-6 w-6 cursor-pointer text-white hover:opacity-75 md:block "
                        />
                    </div>
                    <p className="text-sm text-white/50">
                        Fill the details to create a new client
                    </p>
                </div>
                <form
                    onSubmit={submitHandler}
                    className="flex w-full flex-col gap-y-6"
                >
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="name">Name of the Client</label>
                        <input
                            required
                            type="text"
                            className="flex w-full  appearance-none items-center rounded-md border border-border bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-base"
                            name="name"
                            value={formData.name}
                            placeholder="Enter Name"
                            onChange={onChange}
                        />
                    </fieldset>
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="operatingHours">
                            Operating hours at the site
                        </label>
                        <input
                            required
                            type="number"
                            className="flex w-full appearance-none items-center rounded-md border border-border bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-base"
                            name="operatingHours"
                            value={formData.operatingHours}
                            placeholder="Enter Operating hours"
                            onChange={onChange}
                        />
                    </fieldset>
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="latitude">Location of the client</label>
                        <div className="flex gap-6">
                            <input
                                required
                                type="number"
                                className="flex w-full appearance-none items-center rounded-md border border-border bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-base"
                                name="latitude"
                                value={formData.latitude}
                                placeholder="Enter Latitude"
                                onChange={onChange}
                            />
                            <input
                                required
                                type="number"
                                className="flex w-full appearance-none items-center rounded-md border border-border bg-backgroundGray/30 p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-base"
                                name="longitude"
                                value={formData.longitude}
                                placeholder="Enter longitude"
                                onChange={onChange}
                            />
                        </div>
                    </fieldset>
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="checkInTime">
                            Check In Information at the site
                        </label>
                        <div className="flex gap-6">
                            <div className="flex items-center justify-center rounded-md border border-border bg-backgroundGray/30">
                                <TimePicker
                                    selectedTime={selectedTime}
                                    setSelectedTime={setSelectedTime}
                                />
                            </div>
                            <div className="rounded-md border border-border bg-backgroundGray/30">
                                <TimeZonePicker
                                    selectedTimezone={selectedTimezone}
                                    setSelectedTimezone={setSelectedTimezone}
                                />
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <button
                            disabled={isLoading}
                            type="submit"
                            className="w-full rounded-md border border-green-500 bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                        >
                            Submit
                        </button>
                    </fieldset>
                </form>
            </div>
        </div>
    );
};
export default ClientForm;
