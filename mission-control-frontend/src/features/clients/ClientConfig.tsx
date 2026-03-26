import { RasterMapOptions } from "@/constants/map";
import { ClientData } from "@/data/types";
import { ChangeEvent, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation } from "react-query";
import { toast } from "react-toastify";

import { errorLogger } from "@/util/errorLogger";
import {
    ClientUpdatePayload,
    updateClientDetails
} from "./services/clientService";
import RobotProfileItem from "../robots/robot/robotProfile/RobotProfileItem";
import { ClientMap } from "./components/ClientMap";
import { TimePicker } from "./components/TimePicker";
import { TimeZonePicker } from "./components/TimeZonePicker";
import { checkPermission } from "@/util/roles";

const ClientConfig = () => {
    const {
        selectedClient,
        refetchClient
    }: { selectedClient: ClientData; refetchClient: () => void } =
        useOutletContext();
    const [time, timezone] = selectedClient.checkInTimeWithZone
        ? selectedClient.checkInTimeWithZone.split(",")
        : ["08:00", "Asia/Kolkata"];
    const [isViewOnly, setIsViewOnly] = useState(true);

    const [selectedTime, setSelectedTime] = useState(time);
    const [selectedTimezone, setSelectedTimezone] = useState(timezone);

    const [clientDetails, setClientDetails] = useState({
        name: selectedClient.name,
        operatingHours: selectedClient.operatingHours ?? "",
        latitude: selectedClient.location
            ? selectedClient.location.lat + ""
            : "",
        longitude: selectedClient.location
            ? selectedClient.location.lng + ""
            : ""
    });

    const { mutate: mutateUpdateClient, isLoading } = useMutation({
        mutationFn: (clientUpdatePayload: ClientUpdatePayload) =>
            updateClientDetails(clientUpdatePayload),
        onSuccess: () => {
            toast.success("Updated client successfully");
            setIsViewOnly(true);
            refetchClient();
        },
        onError: (error) => {
            errorLogger(error);
        }
    });

    const editClickHandler = () => {
        setIsViewOnly((prev) => !prev);
    };

    const cancelEditHandler = () => {
        setClientDetails({
            name: selectedClient.name,
            operatingHours: selectedClient.operatingHours,
            latitude: selectedClient.location
                ? selectedClient.location.lat + ""
                : "",
            longitude: selectedClient.location
                ? selectedClient.location.lng + ""
                : ""
        });
        setSelectedTime(time);
        setIsViewOnly(true);
    };

    const validateClientDetails = () => {
        let error = "";

        const floatRegex = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
        const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

        if (!clientDetails.name.length) {
            error = "Client Name is required";
        } else if (!clientDetails.operatingHours) {
            error = "Operating hours is required";
        } else if (!floatRegex.test(clientDetails.operatingHours + "")) {
            error = "Operating hours is a decimal number";
        } else if (!clientDetails.latitude) {
            error = "Latitude is required";
        } else if (!floatRegex.test(clientDetails.latitude + "")) {
            error = "Latitude is a decimal number";
        } else if (!clientDetails.longitude) {
            error = "Longitude is required";
        } else if (!floatRegex.test(clientDetails.longitude + "")) {
            error = "Longitude is a decimal number";
        } else if (!selectedTime) {
            error = "Check in time is required";
        } else if (!timeRegex.test(selectedTime)) {
            error = "Check in time should be in military format";
        } else if (!selectedTimezone) {
            error = "Check in timezone is required";
        }
        return error;
    };

    const saveEditHandler = () => {
        const error = validateClientDetails();
        if (error) {
            toast.error(error);
            return;
        }

        mutateUpdateClient({
            id: selectedClient.id,
            checkInTimeWithZone: `${selectedTime},${selectedTimezone}`,
            latitude: +clientDetails.latitude,
            longitude: +clientDetails.longitude,
            name: clientDetails.name,
            operatingHours: clientDetails.operatingHours
        });
    };

    const onChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
        setClientDetails((prev) => ({
            ...prev,
            [event.target.name]: event.target.value
        }));
    };

    return (
        <div className="flex h-full flex-col p-6 md:p-8">
            <div className="flex gap-6 lg:mx-auto lg:w-[75%]">
                <div className="hidden rounded-md border border-border sm:flex sm:basis-1/2 lg:basis-1/3">
                    {selectedClient.location ? (
                        <ClientMap
                            clientName={clientDetails.name}
                            latitude={selectedClient.location.lat}
                            longitude={
                                selectedClient.location.lng ??
                                RasterMapOptions.defaultCenter.lng
                            }
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-md bg-backgroundGray/30">
                            <span>No location data found</span>
                        </div>
                    )}
                </div>
                <div className="relative flex basis-full flex-col divide-y divide-border rounded-md border  border-border  sm:basis-1/2 lg:basis-2/3">
                    {checkPermission("change_site_mgmt") && (
                        <button
                            onClick={editClickHandler}
                            className={`absolute right-6 top-6 cursor-pointer font-semibold  ${isViewOnly ? "text-secondary hover:text-white" : "text-white"} `}
                        >
                            {isViewOnly ? "Edit details" : "Cancel Editing"}
                        </button>
                    )}
                    <RobotProfileItem
                        title="Client Name"
                        desc="Name of the client"
                    >
                        <input
                            disabled={isViewOnly}
                            value={clientDetails.name}
                            name="name"
                            className="w-full rounded-md bg-transparent p-3 outline-none placeholder:text-neutral-600"
                            placeholder="Client Name"
                            onChange={onChangeHandler}
                        />
                    </RobotProfileItem>
                    <RobotProfileItem
                        title="Operating hours"
                        desc="Number of hours a day an operator works for"
                    >
                        <input
                            disabled={isViewOnly}
                            value={clientDetails.operatingHours}
                            name="operatingHours"
                            type="number"
                            className="w-full rounded-md bg-transparent p-3 outline-none placeholder:text-neutral-600"
                            placeholder={"Enter the operating hours"}
                            onChange={onChangeHandler}
                        />
                    </RobotProfileItem>
                    <RobotProfileItem
                        title="Location"
                        desc="Coordinates of the client"
                    >
                        <input
                            disabled={isViewOnly}
                            value={clientDetails.latitude}
                            name="latitude"
                            type="number"
                            className="w-full rounded-md bg-transparent p-3 outline-none placeholder:text-neutral-600"
                            placeholder={
                                RasterMapOptions.defaultCenter.lat + ""
                            }
                            onChange={onChangeHandler}
                        />
                        <input
                            disabled={isViewOnly}
                            value={clientDetails.longitude}
                            name="longitude"
                            type="number"
                            className=" w-full rounded-md bg-transparent p-3 outline-none placeholder:text-neutral-600"
                            placeholder={
                                RasterMapOptions.defaultCenter.lng + ""
                            }
                            onChange={onChangeHandler}
                        />
                    </RobotProfileItem>
                    <RobotProfileItem
                        title="Check-in Time"
                        desc="The time the operator has to check it for attendance"
                    >
                        <TimePicker
                            disabled={isViewOnly}
                            selectedTime={selectedTime}
                            setSelectedTime={setSelectedTime}
                        />
                        <TimeZonePicker
                            disabled={isViewOnly}
                            selectedTimezone={selectedTimezone}
                            setSelectedTimezone={setSelectedTimezone}
                        />
                    </RobotProfileItem>
                </div>
            </div>
            {!isViewOnly && (
                <div className="flex justify-end gap-6 py-6 lg:mx-auto lg:w-[75%]">
                    <button
                        onClick={cancelEditHandler}
                        className="rounded-md border border-border px-6 py-2 hover:bg-backgroundGray/30"
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

export default ClientConfig;
//   Flo
//   latitude: 12.92327981013104
//   longitude: 77.6471350193798

//   Taj
//   latitude: 27.175100
//   longitude: 78.042100
