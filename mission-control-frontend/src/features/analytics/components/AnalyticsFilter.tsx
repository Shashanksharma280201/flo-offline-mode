import { useCallback, useEffect, useState } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import { MdExpandMore, MdFilterListAlt } from "react-icons/md";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import { DateRangePicker } from "@/features/analytics/components/DateRangePicker";
import ComboBox from "@/components/comboBox/ComboBox";
import { AppUser, ClientData, RobotType, Gnss } from "@/data/types";
import useClients from "@/hooks/useClients";
import { errorLogger } from "@/util/errorLogger";
import { useUserStore } from "@/stores/userStore";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useMutation } from "react-query";
import {
    getOperatorsInRange,
    getRobotsInRange,
    getSessionsInRange,
    getProcessedSessionData,
    getGnssDataInRange,
    getMultiClientSessionsInRange
} from "../analyticsService";
import Select from "@/components/select/Select";
import useRobotsFromAppUsers from "@/hooks/useRobotsFromAppUsers";
import dayjs from "dayjs";
import { naturalSort } from "@/util/sortRobots";
import { usePDFConfigStore } from "@/stores/usePDFConfigStore";

const filterCategories = [
    {
        id: "clients",
        name: "Clients"
    },
    {
        id: "robots",
        name: "Robots"
    }
];

/**
 * Filter component of analytics page
 * Filter based on clients, robots and operators within a select timeframe
 */
const AnalyticsFilter = () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);

    const [appUserRobots, setAppUserRobots] = useState<RobotType[]>([]);
    const [filteredOperators, setFilteredOperators] = useState<AppUser[]>([]);
    const [filteredRobots, setFilteredRobots] = useState<
        { id: string; name: string }[]
    >([]);
    const [robots, clients] = useUserStore(
        useShallow((state) => [
            state.robots
                .map((robot) => ({
                    id: robot.id,
                    name: robot.name
                }))
                .sort((a, b) => naturalSort(a.name, b.name)),
            state.clients
        ])
    );
    const [filterCategory, setFilterCategory] = useState<{
        id: string;
        name: string;
    }>(filterCategories[0]);
    const [query, setQuery] = useState<{
        robotId?: string;
        clientId?: string;
        operatorId?: string;
        startingTimestamp?: string;
        endingTimestamp?: string;
    }>({
        robotId: undefined,
        clientId: undefined,
        operatorId: undefined,
        startingTimestamp: undefined,
        endingTimestamp: undefined
    });

    const [
        selectedRobot,
        selectedClient,
        selectedAppUser,
        startingTimestamp,
        endingTimestamp,
        setStartingTimestamp,
        setEndingTimestamp,
        setSelectedRobot,
        setSelectedClient,
        setSelectedAppUser,
        setProcessedAppData,
        setTotalDistance,
        setGnssData
    ] = useAnalyticsStore(
        useShallow((state) => [
            state.selectedRobot,
            state.selectedClient,
            state.selectedAppUser,
            state.startingTimestamp,
            state.endingTimestamp,
            state.setStartingTimestamp,
            state.setEndingTimestamp,
            state.setSelectedRobot,
            state.setSelectedClient,
            state.setSelectedAppUser,
            state.setProcessedAppData,
            state.setTotalDistance,
            state.setGnssData
        ])
    );

    const dateRange = {
        from: startingTimestamp?.toDate(),
        to: endingTimestamp?.toDate()
    };

    const { mutate: fetchClientsList, isLoading: isClientListLoading } =
        useClients();

    const { mutate: fetchDataBetweenRange, isLoading: isFetchingData } =
        useMutation(
            ({
                robotId,
                clientId,
                operatorId,
                startingTimestamp,
                endingTimestamp
            }: {
                robotId?: string;
                clientId?: string;
                operatorId?: string;
                startingTimestamp: number;
                endingTimestamp: number;
            }) =>
                getSessionsInRange({
                    robotId,
                    clientId,
                    operatorId,
                    startingTimestamp,
                    endingTimestamp
                }),
            {
                // onSuccess: (processedAppData) => {
                onSuccess: async (processedAppData, variables) => {
                    console.log('=== ANALYTICS DATA RESPONSE ===');
                    console.log('App Session Data Count:', processedAppData.appSessionData.length);
                    console.log('Downtime Data Count:', processedAppData.downtimeData.length);
                    if (processedAppData.appSessionData.length > 0) {
                        console.log('Sample session:', processedAppData.appSessionData[0]);
                    }
                    setProcessedAppData(processedAppData);
                    if (variables.robotId) {
                        const robotId = variables.robotId;
                        console.log(
                            "Fetching data for robot:",
                            variables.robotId
                        );
                        try {
                            const [sessionInfo, gnssData] = await Promise.all([
                                getProcessedSessionData({
                                    robotId: variables.robotId,
                                    startingTimestamp:
                                        variables.startingTimestamp,
                                    endingTimestamp: variables.endingTimestamp
                                }),
                                getGnssDataInRange({
                                    robotId: variables.robotId,
                                    startingTimestamp:
                                        variables.startingTimestamp,
                                    endingTimestamp: variables.endingTimestamp
                                })
                            ]);

                            const gnssPoints: Gnss[] = Array.isArray(gnssData)
                                ? gnssData
                                      .filter((doc: any) =>
                                          Array.isArray(doc.gnss)
                                      )
                                      .flatMap((doc: any) => doc.gnss)
                                : [];

                            // Debug: Check for unrealistic coordinates
                            if (gnssPoints.length > 0) {
                                const firstPoint = gnssPoints[0];
                                const lastPoint =
                                    gnssPoints[gnssPoints.length - 1];
                                console.log("First GPS point:", firstPoint);
                                console.log("Last GPS point:", lastPoint);

                                const unrealisticCoords = gnssPoints.some(
                                    (point) =>
                                        point.latitude < -90 ||
                                        point.latitude > 90 ||
                                        point.longitude < -180 ||
                                        point.longitude > 180
                                );
                                if (unrealisticCoords) {
                                    console.warn(
                                        "WARNING: Found unrealistic GPS coordinates!"
                                    );
                                }
                            }

                            setTotalDistance(sessionInfo.totalDistance || 0);
                            setGnssData(gnssPoints);
                        } catch (err) {
                            console.error("Error fetching robot data:", err);
                            setTotalDistance(0);
                            setGnssData([]);
                            if (err instanceof Error) {
                                errorLogger(err.message);
                            } else {
                                errorLogger(String(err));
                            }
                        }
                    } else if (variables.clientId) {
                        // Client selected - fetch data for all robots of that client
                        console.log(
                            "Fetching data for all robots of client:",
                            variables.clientId
                        );
                        try {
                            // const allRobots = useUserStore.getState().robots;
                            const clientSessions =
                                processedAppData.appSessionData.filter(
                                    (session: any) =>
                                        session.clientName ===
                                        selectedClient?.name
                                );
                            // Extract unique robot IDs directly from the sessions
                            const robotIds = [
                                ...new Set(
                                    clientSessions
                                        .map((session: any) => session.robotId)
                                        .filter(
                                            (id) =>
                                                id !== undefined && id !== null
                                        )
                                )
                            ];
                            console.log(
                                "Client sessions:",
                                clientSessions.length
                            );

                            console.log("Robot IDs for client:", robotIds);

                            if (robotIds.length === 0) {
                                console.log(
                                    "No robots found for this client in the time range"
                                );
                                setTotalDistance(0);
                                setGnssData([]);
                                return;
                            }

                            const robotDataPromises = robotIds.map(
                                async (robotId: string) => {
                                    try {
                                        const [sessionInfo, gnssData] =
                                            await Promise.all([
                                                getProcessedSessionData({
                                                    robotId: robotId,
                                                    startingTimestamp:
                                                        variables.startingTimestamp,
                                                    endingTimestamp:
                                                        variables.endingTimestamp
                                                }),
                                                getGnssDataInRange({
                                                    robotId: robotId,
                                                    startingTimestamp:
                                                        variables.startingTimestamp,
                                                    endingTimestamp:
                                                        variables.endingTimestamp
                                                })
                                            ]);
                                        return {
                                            sessionInfo,
                                            gnssData,
                                            robotId
                                        };
                                    } catch (err) {
                                        console.error(
                                            `Error fetching data for robot ${robotId}:`,
                                            err
                                        );
                                        return null;
                                    }
                                }
                            );

                            const robotDataResults =
                                await Promise.all(robotDataPromises);
                            const validResults = robotDataResults.filter(
                                (result) => result !== null
                            );

                            if (validResults.length === 0) {
                                console.log(
                                    "No valid data found for any robot of this client"
                                );
                                setTotalDistance(0);
                                setGnssData([]);
                                return;
                            }

                            // Combine all session data
                            const totalDistance = validResults.reduce(
                                (sum, result) =>
                                    sum +
                                    (result?.sessionInfo.totalDistance || 0),
                                0
                            );

                            // Combine all GNSS data
                            const allGnssPoints: Gnss[] = validResults.flatMap(
                                (result) => {
                                    if (!result?.gnssData) return [];
                                    return Array.isArray(result.gnssData)
                                        ? result.gnssData
                                              .filter((doc: any) =>
                                                  Array.isArray(doc.gnss)
                                              )
                                              .flatMap((doc: any) => doc.gnss)
                                        : [];
                                }
                            );

                            console.log(
                                "Combined Total Distance:",
                                totalDistance
                            );
                            console.log(
                                "Combined GNSS Points Length:",
                                allGnssPoints.length
                            );

                            // Debug: Check for unrealistic coordinates
                            if (allGnssPoints.length > 0) {
                                const firstPoint = allGnssPoints[0];
                                const lastPoint =
                                    allGnssPoints[allGnssPoints.length - 1];
                                console.log("First GPS point:", firstPoint);
                                console.log("Last GPS point:", lastPoint);

                                const unrealisticCoords = allGnssPoints.some(
                                    (point) =>
                                        point.latitude < -90 ||
                                        point.latitude > 90 ||
                                        point.longitude < -180 ||
                                        point.longitude > 180
                                );
                                if (unrealisticCoords) {
                                    console.warn(
                                        "WARNING: Found unrealistic GPS coordinates!"
                                    );
                                }
                            }

                            setTotalDistance(totalDistance);
                            setGnssData(allGnssPoints);
                        } catch (err) {
                            console.error(
                                "Error fetching client robot data:",
                                err
                            );
                            setTotalDistance(0);
                            setGnssData([]);
                            if (err instanceof Error) {
                                errorLogger(err.message);
                            } else {
                                errorLogger(String(err));
                            }
                        }
                    } else {
                        console.log(
                            "No robot or client selected, clearing distance and GNSS data"
                        );
                        setTotalDistance(0);
                        setGnssData([]);
                    }
                },
                onError: (error: any) => errorLogger(error.message)
            }
        );

    const {
        mutate: fetchRobotsFromAppUsers,
        isLoading: isRobotsFromAppUserLoading
    } = useRobotsFromAppUsers({
        onSuccess: (data) => {
            const updatedData = data
                .map((robot: RobotType) => ({
                    name: robot.name,
                    id: robot.id
                }))
                .sort((a: { name: string; id: string }, b: { name: string; id: string }) => naturalSort(a.name, b.name));
            setAppUserRobots(updatedData);
        },
        onError: (error) => {
            errorLogger(error);
        }
    });

    const { mutate: fetchRobotsInRange } = useMutation({
        mutationFn: ({
            startingTimestamp,
            endingTimestamp
        }: {
            startingTimestamp: number;
            endingTimestamp: number;
        }) => getRobotsInRange({ startingTimestamp, endingTimestamp }),
        onSuccess: (data) => {
            const sortedData = [...data].sort((a, b) =>
                naturalSort(a.name, b.name)
            );
            setFilteredRobots(sortedData);
        },
        onError: (error: any) => {
            errorLogger(error.message);
        }
    });

    const { mutate: fetchOperatorsInRange } = useMutation({
        mutationFn: ({
            clientId,
            startingTimestamp,
            endingTimestamp
        }: {
            clientId: string;
            startingTimestamp: number;
            endingTimestamp: number;
        }) =>
            getOperatorsInRange({
                clientId,
                startingTimestamp,
                endingTimestamp
            }),
        onSuccess: (data) => {
            setFilteredOperators(data);
        },
        onError: (error: any) => {
            errorLogger(error.message);
        }
    });

    const clientChangeHandler = useCallback(
        (client: ClientData | undefined) => {
            setSelectedClient(client);
            setSelectedAppUser(undefined);
            setSelectedRobot(undefined);
        },
        []
    );

    const appUserChangeHandler = useCallback((appUser: AppUser | undefined) => {
        setSelectedAppUser(appUser);
        setSelectedRobot(undefined);
    }, []);

    const applyFilterHandler = () => {
        // In multi-client mode, we don't need single client/robot selection
        // The multi-client effect will handle data fetching
        if (pdfMode === "multi") {
            if (selectedClientIds.length === 0) {
                toast.error("Please select at least one client in PDF configuration");
                return;
            }
            if (!startingTimestamp || !endingTimestamp) {
                toast.error("Invalid time range");
                return;
            }
            // In multi-client mode, just validate and let the useEffect handle fetching
            toast.success("Multi-client mode active - dashboard will update automatically");
            return;
        }

        // Single client mode validation (original logic)
        if (!selectedClient && !selectedRobot) {
            toast.error("Atleast one filter needs to be set");
            return;
        }
        if (!startingTimestamp || !endingTimestamp) {
            toast.error("Invalid time range");
            return;
        }

        const startTs = startingTimestamp.startOf("day").valueOf();
        const endTs = endingTimestamp.endOf("day").valueOf();

        console.log('=== ANALYTICS FILTER DEBUG ===');
        console.log('Selected Date Range:', {
            startingTimestamp: startingTimestamp.format('YYYY-MM-DD HH:mm:ss'),
            endingTimestamp: endingTimestamp.format('YYYY-MM-DD HH:mm:ss')
        });
        console.log('Converted to milliseconds:', {
            startTs,
            endTs,
            startDate: new Date(startTs).toISOString(),
            endDate: new Date(endTs).toISOString()
        });
        console.log('Filter params:', {
            robotId: selectedRobot?.id,
            robotName: selectedRobot?.name,
            clientId: selectedClient?.id,
            clientName: selectedClient?.name,
            operatorId: selectedAppUser?.id,
            operatorName: selectedAppUser?.name
        });

        fetchDataBetweenRange({
            startingTimestamp: startTs,
            endingTimestamp: endTs,
            robotId: selectedRobot?.id,
            clientId: selectedClient?.id,
            operatorId: selectedAppUser?.id
        });
    };

    const onChangeCategory = (value?: { id: string; name: string }) => {
        if (!value) return;
        if (value.name === "Clients") {
            setSelectedRobot(undefined);
        } else {
            setSelectedClient(undefined);
            setSelectedAppUser(undefined);
        }
        setFilterCategory(value);
    };

    useEffect(() => {
        if (selectedAppUser) {
            fetchRobotsFromAppUsers(selectedAppUser.id);
        }
    }, [selectedAppUser]);

    useEffect(() => {
        if (!startingTimestamp || !endingTimestamp) return;
        if (startingTimestamp.isAfter(endingTimestamp)) return;

        fetchRobotsInRange({
            startingTimestamp: startingTimestamp.valueOf(),
            endingTimestamp: endingTimestamp.valueOf()
        });
    }, [selectedClient, startingTimestamp, endingTimestamp]);

    useEffect(() => {
        fetchClientsList();
    }, []);

    useEffect(() => {
        const robotId = searchParams.get("robot") ?? undefined;
        const clientId = searchParams.get("client") ?? undefined;
        const operatorId = searchParams.get("operator") ?? undefined;
        const startingTimestamp = searchParams.get("gt") ?? undefined;
        const endingTimestamp = searchParams.get("lt") ?? undefined;

        setQuery({
            robotId,
            clientId,
            operatorId,
            startingTimestamp,
            endingTimestamp
        });
    }, []);

    useEffect(() => {
        const {
            robotId,
            clientId,
            operatorId,
            startingTimestamp,
            endingTimestamp
        } = query;
        if (clients.length && startingTimestamp && endingTimestamp) {
            setSelectedClient(clients.find((client) => client.id === clientId));

            const dayjsStart = dayjs(Number(startingTimestamp));
            const dayjsEnd = dayjs(Number(endingTimestamp));
            setStartingTimestamp(dayjsStart);
            setEndingTimestamp(dayjsEnd);
            fetchDataBetweenRange({
                robotId,
                clientId,
                operatorId,
                startingTimestamp: +startingTimestamp,
                endingTimestamp: +endingTimestamp
            });
        }
    }, [query, clients]);

    // Watch PDF config for multi-client mode changes
    const { pdfMode, selectedClientIds } = usePDFConfigStore();

    useEffect(() => {
        // Only fetch multi-client data if:
        // 1. PDF mode is "multi"
        // 2. At least one client is selected
        // 3. Date range is valid
        if (
            pdfMode === "multi" &&
            selectedClientIds.length > 0 &&
            startingTimestamp &&
            endingTimestamp
        ) {
            const startTs = startingTimestamp.startOf("day").valueOf();
            const endTs = endingTimestamp.endOf("day").valueOf();

            console.log("=== MULTI-CLIENT MODE ACTIVATED ===");
            console.log("Selected Client IDs:", selectedClientIds);
            console.log("Date Range:", {
                start: new Date(startTs).toISOString(),
                end: new Date(endTs).toISOString()
            });

            // Fetch aggregated data for all selected clients
            getMultiClientSessionsInRange({
                clientIds: selectedClientIds,
                startingTimestamp: startTs,
                endingTimestamp: endTs
            })
                .then((aggregatedData) => {
                    console.log("=== MULTI-CLIENT DATA FETCHED ===");
                    console.log("Total Sessions:", aggregatedData.appSessionData.length);
                    console.log("Total Downtime Records:", aggregatedData.downtimeData.length);

                    // Show warning if some clients failed
                    if (aggregatedData.metadata?.failedClients) {
                        const failedCount = aggregatedData.metadata.failedClients.length;
                        toast.warning(
                            `Loaded data for ${selectedClientIds.length - failedCount}/${selectedClientIds.length} clients. ` +
                            `${failedCount} client(s) failed to load.`
                        );
                    }

                    setProcessedAppData(aggregatedData);

                    // Fetch sensor data for all robots across all clients IN BATCHES
                    const robotIds = [
                        ...new Set(
                            aggregatedData.appSessionData
                                .map((session) => session.robotId)
                                .filter((id) => id !== undefined && id !== null)
                        )
                    ];

                    if (robotIds.length > 0) {
                        // Batch sensor data fetching (5 robots at a time)
                        const fetchSensorDataInBatches = async () => {
                            const batchSize = 5;
                            let totalDistance = 0;
                            const allGnssPoints: Gnss[] = [];
                            let successCount = 0;
                            let failCount = 0;

                            for (let i = 0; i < robotIds.length; i += batchSize) {
                                const batch = robotIds.slice(i, i + batchSize);
                                const results = await Promise.allSettled(
                                    batch.map((robotId) =>
                                        Promise.all([
                                            getProcessedSessionData({
                                                robotId,
                                                startingTimestamp: startTs,
                                                endingTimestamp: endTs
                                            }),
                                            getGnssDataInRange({
                                                robotId,
                                                startingTimestamp: startTs,
                                                endingTimestamp: endTs
                                            })
                                        ])
                                    )
                                );

                                results.forEach((result) => {
                                    if (result.status === "fulfilled") {
                                        const [sessionInfo, gnssData] = result.value;
                                        totalDistance += sessionInfo.totalDistance || 0;

                                        const gnssPoints = Array.isArray(gnssData)
                                            ? gnssData
                                                  .filter((doc: any) => Array.isArray(doc.gnss))
                                                  .flatMap((doc: any) => doc.gnss)
                                            : [];
                                        allGnssPoints.push(...gnssPoints);
                                        successCount++;
                                    } else {
                                        failCount++;
                                        console.warn("Failed to fetch sensor data:", result.reason);
                                    }
                                });
                            }

                            console.log(`Sensor data: ${successCount}/${robotIds.length} robots loaded`);
                            if (failCount > 0) {
                                toast.warning(
                                    `Loaded sensor data for ${successCount}/${robotIds.length} robots. ` +
                                    `${failCount} robot(s) failed.`
                                );
                            }

                            setTotalDistance(totalDistance);
                            setGnssData(allGnssPoints);
                        };

                        fetchSensorDataInBatches();
                    } else {
                        setTotalDistance(0);
                        setGnssData([]);
                    }
                })
                .catch((error) => {
                    console.error("Error fetching multi-client data:", error);
                    toast.error(
                        `Failed to fetch multi-client data: ${error.message || "Unknown error"}`
                    );
                    errorLogger(error.message || "Multi-client fetch failed");
                });
        }
    }, [pdfMode, selectedClientIds, startingTimestamp, endingTimestamp]);

    return (
        <Disclosure defaultOpen>
            <Disclosure.Button className="flex items-center justify-between gap-6 border-b border-t border-border bg-gray-800 px-6 py-3 md:gap-8 md:border-t-0 md:px-8 ">
                <DisclosureButton />
            </Disclosure.Button>

            <Transition
                enter="ease-out duration-1000"
                enterFrom="transform -translate-y-1 opacity-0"
                enterTo="transform translate-y-0 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform opacity-100"
                leaveTo="transform opacity-0"
            >
                <Disclosure.Panel className="flex flex-col gap-6 border-b border-border bg-blue-900/25 px-2 py-8 md:gap-8 md:px-8">
                    <section className="flex w-full flex-col items-center gap-6 md:flex-row md:gap-8">
                        <div className="flex min-w-96 items-center divide-x divide-border rounded-md border border-border bg-gray-700">
                            <Select
                                width="48"
                                background="transparent"
                                values={filterCategories}
                                value={filterCategory}
                                setValue={onChangeCategory}
                                position="bottom"
                            />
                            {filterCategory.id === "clients" ? (
                                <ComboBox
                                    wrapperClassName="border-none w-full bg-slate-900/25 rounded-s-none"
                                    label="Client"
                                    showLabel={false}
                                    items={clients}
                                    selectedItem={selectedClient}
                                    setSelectedItem={clientChangeHandler}
                                    getItemLabel={(client) =>
                                        client ? client.name : ""
                                    }
                                    placeholder="Select Client"
                                    isLoading={isClientListLoading}
                                />
                            ) : (
                                <ComboBox
                                    wrapperClassName="border-none w-full bg-slate-900/25 rounded-s-none"
                                    label="Robots"
                                    showLabel={false}
                                    items={
                                        startingTimestamp && endingTimestamp
                                            ? filteredRobots
                                            : robots
                                    }
                                    selectedItem={selectedRobot}
                                    setSelectedItem={setSelectedRobot}
                                    getItemLabel={(robot) => robot?.name ?? ""}
                                    placeholder="Select Robot"
                                />
                            )}
                        </div>
                        {selectedClient?.appUsers && (
                            <div>
                                <ComboBox
                                    wrapperClassName="w-96 bg-gray-700"
                                    label="Operator"
                                    items={selectedClient?.appUsers}
                                    selectedItem={selectedAppUser}
                                    setSelectedItem={appUserChangeHandler}
                                    getItemLabel={(appUser) =>
                                        appUser ? appUser.name : ""
                                    }
                                    placeholder="Select Operator"
                                />
                            </div>
                        )}
                        {selectedAppUser && (
                            <div>
                                <ComboBox
                                    wrapperClassName="w-96 bg-gray-700"
                                    label="Robots"
                                    items={appUserRobots}
                                    selectedItem={selectedRobot}
                                    setSelectedItem={setSelectedRobot}
                                    getItemLabel={(robot) => robot?.name ?? ""}
                                    placeholder="Select Robot"
                                    isLoading={isRobotsFromAppUserLoading}
                                />
                            </div>
                        )}
                    </section>
                    <section
                        className={`flex flex-col items-end justify-between gap-6 md:flex-row md:items-stretch md:gap-8`}
                    >
                        <DateRangePicker
                            className="min-w-96 self-center"
                            dateRange={dateRange}
                            setStartingTimestamp={setStartingTimestamp}
                            setEndingTimestamp={setEndingTimestamp}
                        />

                        <button
                            className="flex w-fit items-center justify-between space-x-2 justify-self-end whitespace-nowrap rounded-md bg-green-600/55 hover:bg-green-600 p-3 text-sm md:text-base "
                            onClick={applyFilterHandler}
                        >
                            <span className="font-semibold">Apply Filters</span>
                            {isFetchingData ? (
                                <LoadingSpinner className="h-5 w-5 animate-spin fill-white text-background" />
                            ) : (
                                <MdFilterListAlt className="h-5 w-5 text-white hover:opacity-75" />
                            )}
                        </button>
                    </section>
                </Disclosure.Panel>
            </Transition>
        </Disclosure>
    );
};
export default AnalyticsFilter;

const DisclosureButton = () => {
    const [selectedRobot, selectedClient, selectedAppUser] = useAnalyticsStore(
        useShallow((state) => [
            state.selectedRobot,
            state.selectedClient,
            state.selectedAppUser
        ])
    );
    const [startingTimestamp, endingTimestamp] = useAnalyticsStore(
        useShallow((state) => [state.startingTimestamp, state.endingTimestamp])
    );

    const getFilterHeaderName = () => {
        let filterheaderName = [];
        if (selectedClient?.name) {
            filterheaderName.push(selectedClient?.name);
        }
        if (selectedAppUser?.name) {
            filterheaderName.push(selectedAppUser?.name);
        }
        if (selectedRobot?.name) {
            filterheaderName.push(selectedRobot?.name);
        }
        return filterheaderName.join(" - ");
    };

    return (
        <>
            <div className="flex w-full flex-col items-start gap-2 md:flex-row md:justify-between ">
                {(selectedClient || selectedAppUser || selectedRobot) && (
                    <div className="flex flex-col gap-2 text-left md:hidden ">
                        <span>{selectedClient?.name}</span>
                        <span>{selectedAppUser?.name}</span>
                        <span>{selectedRobot?.name}</span>
                    </div>
                )}
                <div className="hidden gap-2 text-left md:flex">
                    {getFilterHeaderName()}
                </div>
                {startingTimestamp && endingTimestamp ? (
                    <span>
                        {startingTimestamp?.format("MMMM D, YYYY[ - ]") +
                            endingTimestamp?.format("MMMM D, YYYY")}
                    </span>
                ) : (
                    <></>
                )}
            </div>

            <MdExpandMore
                className={`h-5 w-5 self-start text-white hover:opacity-75 ui-open:rotate-180 ui-open:transform`}
            />
        </>
    );
};
