import { useState } from "react";
import Select from "../../../components/select/Select";
import {
    MdAdd,
    MdCancel,
    MdDone,
    MdEdit,
    MdPause,
    MdPlayArrow,
    MdSave
} from "react-icons/md";
import SmIconButton from "../../../components/ui/SmIconButton";
import { createLocationFn, saveBoundaryFn } from "../dashBoardService";
import { toast } from "react-toastify";
import { useMutation } from "react-query";
import {
    IBoundary,
    IDbPosition,
    ILocation
} from "../../../data/types/locationTypes";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import CustomDisclosure from "../../../components/disclosure/CustomDisclosure";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import { threeJsToDb } from "../../../util/cordinatesConverter";
import { errorLogger } from "../../../util/errorLogger";
import { useUserStore } from "../../../stores/userStore";

type BoundaryPanelPropTypes = {
    locations: ILocation[] | [];
    setLocations: React.Dispatch<React.SetStateAction<ILocation[] | []>>;
    fetchLocations: Function;
};

const BoundaryPanel = ({
    locations,
    fetchLocations
}: BoundaryPanelPropTypes) => {
    const [
        location,
        setLocation,
        selectedBoundaryMap,
        setSelectedBoundaryMap,
        boundary,
        setIsBoundaryMapping,
        setIsBoundaryEditing
    ] = useRobotConfigStore((state) => [
        state.location,
        state.setLocation,
        state.selectedBoundaryMap,
        state.setSelectedBoundaryMap,
        state.boundary,
        state.setIsBoundaryMapping,
        state.setIsBoundaryEditing
    ]);
    const [dbBoundaryMapVectors, setdbBoundaryMapVectors] = useState<
        IBoundary[]
    >([]);
    const [newLocation, setNewLocation] = useState<string>("");
    const [user] = useUserStore((state) => [state.user]);
    const [createLocationToggle, setCreateLocationToggle] =
        useState<boolean>(false);
    const {
        mutate: updateBoundaryMap,
        isLoading,
        isError,
        isSuccess
    } = useMutation(
        async ({
            boundaryMap,
            locationId
        }: {
            boundaryMap: IDbPosition[];
            locationId: string;
        }) => saveBoundaryFn(boundaryMap, locationId),
        {
            onSuccess: async (data: ILocation) => {
                toast.success("Saved successfully", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                setLocation(data);
                setdbBoundaryMapVectors([...selectedBoundaryMap]);
                fetchLocations();
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    const { mutate: createLocation } = useMutation(
        async (newLocation: { name: string; owner: string }) =>
            createLocationFn(newLocation),
        {
            onSuccess: async (data: ILocation) => {
                toast.success("Saved successfully", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                setNewLocation("");
                setLocation(data);
                fetchLocations();
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    const handleStartMapping = () => {
        const prev = boundary.isBoundaryMapping;

        setIsBoundaryMapping(!prev);
    };

    const handleEditMapping = () => {
        //get boundary map posistions
        console.log(selectedBoundaryMap);
        const prev = boundary.isBoundaryEditing;
        setIsBoundaryEditing(!prev);
    };

    const handleSaveMapping = async () => {
        if (location && selectedBoundaryMap) {
            const boundaryMapPositions: IDbPosition[] = [];

            selectedBoundaryMap?.forEach((val) => {
                const transformedDbValues = threeJsToDb(val.position);
                if (transformedDbValues.position) {
                    boundaryMapPositions?.push({
                        position: transformedDbValues.position
                    });
                }
            });

            updateBoundaryMap({
                boundaryMap: boundaryMapPositions,
                locationId: location.id
            });
        } else {
            toast.error("please select a location first", {
                position: "top-right"
            });
        }
    };

    const handleClearMapping = () => {
        setSelectedBoundaryMap([]);
    };

    const locationCreationHandler = () => {
        console.log("Creating Location");
        if (newLocation.length > 0 && user?.id) {
            createLocation({ name: newLocation, owner: user.id });
        } else {
            toast.error("Failed to create Location");
        }
    };

    return (
        <>
            <div className="mt-2 flex flex-col px-4 py-5 text-[#979797]">
                <div className="mb-5 flex items-center gap-x-2 text-sm">
                    <span>{`Selected Location:`}</span>
                    {location ? <div>{location.name}</div> : <div>No data</div>}
                </div>
                <div className="mb-5 flex items-center gap-x-2 text-sm">
                    <span>{`Boundary Status:`}</span>
                    {selectedBoundaryMap && selectedBoundaryMap.length > 0 ? (
                        <span className="text-primary700">Present</span>
                    ) : (
                        <span className="text-red-500">Absent</span>
                    )}
                </div>

                <div className="flex items-center  justify-between">
                    {!createLocationToggle && (
                        <>
                            <span className="rounded-md py-2  text-sm ">
                                Create Location
                            </span>
                            <SmIconButton
                                name={"Create"}
                                className="bg-primary700 text-white"
                                onClick={() => setCreateLocationToggle(true)}
                            >
                                <MdAdd className="text-white" />
                            </SmIconButton>
                        </>
                    )}
                </div>

                {createLocationToggle && (
                    <div className="flex items-center justify-between gap-x-1">
                        <input
                            type="text"
                            className=" w-[65%] rounded-md  bg-backgroundGray px-2 py-2    text-xs text-white placeholder:text-gray-400 focus:outline-none"
                            placeholder="Location Name"
                            autoFocus
                            onChange={(e) => setNewLocation(e.target.value)}
                            onBlur={(event) => {
                                setTimeout(() => {
                                    setCreateLocationToggle(false);
                                }, 300);
                            }}
                            value={newLocation}
                        ></input>
                        <SmIconButton
                            name={"Submit"}
                            className="bg-primary700 text-white"
                            onClick={locationCreationHandler}
                        >
                            {isLoading ? (
                                <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                            ) : (
                                <MdDone className="text-white" />
                            )}
                        </SmIconButton>
                    </div>
                )}
            </div>
            <div className="py-2">
                <CustomDisclosure name="Actions" defaultOpen={true}>
                    <div className="flex flex-col py-4">
                        <div className="mb-2 flex items-center justify-between">
                            <Select
                                values={locations}
                                value={
                                    location
                                        ? location
                                        : {
                                              name: "Select Location",
                                              id: "",
                                              owner: ""
                                          }
                                }
                                setValue={setLocation}
                                position="bottom"
                            />
                        </div>
                        {location && (
                            <>
                                <div className="flex items-center justify-between py-[1.5vh]">
                                    <span>Start Mapping</span>
                                    <SmIconButton
                                        name={
                                            boundary.isBoundaryMapping
                                                ? "Stop"
                                                : "Start"
                                        }
                                        className={
                                            boundary.isBoundaryMapping
                                                ? "bg-red-500"
                                                : "bg-primary700"
                                        }
                                        onClick={handleStartMapping}
                                    >
                                        {boundary.isBoundaryMapping ? (
                                            <MdPause className="text-white" />
                                        ) : (
                                            <MdPlayArrow className="text-white" />
                                        )}
                                    </SmIconButton>
                                </div>
                                {!boundary.isBoundaryMapping &&
                                    selectedBoundaryMap &&
                                    selectedBoundaryMap.length > 0 && (
                                        <>
                                            <div className="flex items-center justify-between py-[1.5vh]">
                                                <span>Edit Map</span>
                                                <SmIconButton
                                                    name={
                                                        boundary.isBoundaryEditing
                                                            ? "Stop"
                                                            : "Edit"
                                                    }
                                                    className={
                                                        boundary.isBoundaryEditing
                                                            ? "bg-red-500"
                                                            : "bg-primary700"
                                                    }
                                                    onClick={handleEditMapping}
                                                >
                                                    <MdEdit className="text-white" />
                                                </SmIconButton>
                                            </div>
                                            <div className="flex items-center justify-between py-[1.5vh]">
                                                <span>Save Map</span>
                                                <SmIconButton
                                                    name="Save"
                                                    onClick={handleSaveMapping}
                                                >
                                                    {isLoading ? (
                                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                                    ) : (
                                                        <MdSave className=" text-white" />
                                                    )}
                                                </SmIconButton>
                                            </div>
                                            <div className="flex items-center justify-between py-[1.5vh]">
                                                <span>Clear Map</span>
                                                <SmIconButton
                                                    name="Clear"
                                                    onClick={handleClearMapping}
                                                >
                                                    <MdCancel className=" text-white" />
                                                </SmIconButton>
                                            </div>
                                        </>
                                    )}
                            </>
                        )}
                    </div>
                </CustomDisclosure>
            </div>
        </>
    );
};

export default BoundaryPanel;
