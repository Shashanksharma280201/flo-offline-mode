import { LuArrowUpDown } from "react-icons/lu";
import { toast } from "react-toastify";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/DropdownMenu";
import dayjs from "dayjs";
import { useMutation } from "react-query";
import {
    downloadMasterDataFn,
    uploadMasterDataFn,
    getRobotsMasterData
} from "../service/masterDataService";
import {
    FormattedMasterDataPayload,
    MasterData,
    RobotMasterData
} from "@/data/types/masterDataTypes";
import { errorLogger } from "@/util/errorLogger";
import { useNavigate } from "react-router-dom";
import { useMasterData } from "@/hooks/useMasterData";

type MasterDataFromSheetFormat = {
    Name: string;
    Category: string;
    Description: string;
    Status: string;
    Type: string;
    Value: string;
    Priority: string | number;
    "Is Active": string;
    "Date Added": string;
    "Added by": string;
    Notes: string;
};

const formatCsvForUploading = (masterData: MasterDataFromSheetFormat[]) => {
    const getNotes = (item: MasterDataFromSheetFormat) => {
        if (!item.Notes || item.Notes?.trim().length === 0) return [];

        return [
            {
                date: new Date(),
                description: item.Notes?.trim() || ""
            }
        ];
    };

    const getDate = (dateStr: string) => {
        if (!dateStr) return undefined;
        let [day, month, year] = dateStr.split("/");
        if (!day || !month || !year) return undefined;
        if (year.length === 2) year = `20${year}`;
        return new Date(`${year}/${month}/${day}`);
    };

    const results: FormattedMasterDataPayload[] = masterData.map((item) => {
        return {
            name: item.Name?.trim(),
            category: item.Category?.trim(),
            description: item.Description?.trim(),
            status: item.Status?.trim(),
            type: item.Type?.trim(),
            value: item.Value?.trim(),
            priority: item.Priority !== "" ? +item.Priority : undefined,
            isActive: item["Is Active"]?.trim().toLowerCase() === "true",
            dateAdded: getDate(item["Date Added"]) ?? new Date(),
            notes: getNotes(item),
            addedBy: item["Added by"]?.trim()
        };
    });
    return results;
};

type RobotMasterDataExcelFormat = {
    "Robot Name": string;
    Description: string;
    Status: string;
    "Connectivity State": string;
    "Last Connection": string;
    "Connectivity Age (s)": number | "";
    "Connected Clients": number;
    "Connectivity Freshness At": string;
    "MAC Address": string;
    "Fleet Name": string;
    "Operator Name": string;
    "Operator Phone Number": string;
    "Checked In Today": string;
    "Last Check In Time": string;
    "Operator Staffing State": string;
    "Staffing Freshness At": string;
    "Client Name": string;
    "Billing Client": string;
    "Billing Amount": number | "";
    "Billing Status": string;
    "Operating Hours": string;
    "Maintenance Schedule": string;
    "Last Maintenance Date": string;
    "Maintenance Due (Days)": number;
    "Maintenance Status": string;
    "BOM Completion Status": string;
    "BOM Insufficient Parts Count": number;
    "BOM Status": string;
    "Maintenance Freshness At": string;
    "Manufacturing Partner": string;
    "Manufacturing Date": string;
    "Shipping Date": string;
    "Data Collection": string;
    Features: string;
    "Additional Inputs": string;
    "Battery Code": string;
    "Battery Serial Number": string;
    "Battery Type": string;
    "Bluetooth Connection Serial Number": string;
    "Battery ID Dropdown": string;
    "Flo Stack ID": string;
    "Motor Type": string;
    "Motor Model": string;
    "Motor Serial Number": string;
    "Motor ID": string;
    "Total Tasks": number;
    "Pending Tasks": number;
    "In Progress Tasks": number;
    "Completed Tasks": number;
    "Cancelled Tasks": number;
    "Latest Task Title": string;
    "Latest Task Status": string;
    "Latest Task Created Date": string;
    "Yesterday Trip Count": number;
    "Cycle Efficiency (%)": number | "";
    "Cycle Efficiency Window": string;
    "Cycle Efficiency Freshness At": string;
};

const loadXlsx = async () => import("xlsx");

export const MasterDataActionsButton = () => {
    const navigate = useNavigate();
    const { fetchMasterData } = useMasterData();

    const downloadRobotMasterDataHandler = async () => {
        try {
            toast.info("Fetching all robot data...");

            // Fetch all robots (no pagination limit)
            const response = await getRobotsMasterData(1, 10000, {});
            const robots = response.robots;

            if (robots.length === 0) {
                toast.info("No robot data to download");
                return;
            }

            const dataToDownload: RobotMasterDataExcelFormat[] = robots.map(
                (robot: RobotMasterData) => {
                    const formatDate = (date?: Date | string) => {
                        if (!date) return "";
                        try {
                            return dayjs(date).format("DD/MM/YYYY HH:mm");
                        } catch {
                            return "";
                        }
                    };
                    const formatCycleEfficiency = (value?: number | null) => {
                        if (
                            value === null ||
                            value === undefined ||
                            Number.isNaN(value)
                        ) {
                            return "";
                        }
                        const normalizedValue =
                            value <= 1 ? value * 100 : value;
                        return Number(normalizedValue.toFixed(1));
                    };

                    return {
                        "Robot Name": robot.name || "",
                        Description: robot.desc || "",
                        Status: robot.status || "",
                        "Connectivity State":
                            robot.connectivityFreshnessState || "unknown",
                        "Last Connection": formatDate(
                            robot.lastConnectionOn
                                ? new Date(robot.lastConnectionOn)
                                : undefined
                        ),
                        "Connectivity Age (s)":
                            robot.connectivityFreshnessSeconds ?? "",
                        "Connected Clients": robot.connectedClientsCount || 0,
                        "Connectivity Freshness At": formatDate(
                            robot.metricFreshness?.connectivity
                        ),
                        "MAC Address": robot.macAddress || "",
                        "Fleet Name": robot.fleet?.name || "",
                        "Operator Name": robot.operator?.name || "",
                        "Operator Phone Number":
                            robot.operator?.phoneNumber || "",
                        "Checked In Today": robot.checkedInToday ? "Yes" : "No",
                        "Last Check In Time": formatDate(
                            robot.lastCheckInTime ||
                                robot.operator?.lastCheckInTime ||
                                undefined
                        ),
                        "Operator Staffing State":
                            robot.staffingCoverageState || "unknown",
                        "Staffing Freshness At": formatDate(
                            robot.metricFreshness?.staffing
                        ),
                        "Client Name": robot.client?.name || "",
                        "Billing Client": robot.billing?.clientName || "",
                        "Billing Amount": robot.billing?.amount ?? "",
                        "Billing Status": robot.billing?.status || "",
                        "Operating Hours":
                            robot.client?.operatingHours?.toString() || "",
                        "Maintenance Schedule":
                            robot.maintenance?.schedule?.join(", ") || "",
                        "Last Maintenance Date": robot.maintenance
                            ?.lastMaintenance
                            ? formatDate(
                                  new Date(robot.maintenance.lastMaintenance)
                              )
                            : "",
                        "Maintenance Due (Days)":
                            robot.maintenanceOverdueDays || 0,
                        "Maintenance Status": robot.maintenanceState || "",
                        "BOM Completion Status":
                            robot.bomCompletionStatus || "",
                        "BOM Insufficient Parts Count":
                            robot.insufficientPartsCount || 0,
                        "BOM Status": robot.bomState || "",
                        "Maintenance Freshness At": formatDate(
                            robot.metricFreshness?.maintenance
                        ),
                        "Manufacturing Partner":
                            robot.manufacturingData?.manufacturingPartner || "",
                        "Manufacturing Date": formatDate(
                            robot.manufacturingData?.manufacturingDate
                        ),
                        "Shipping Date": formatDate(
                            robot.manufacturingData?.shippingDate
                        ),
                        "Data Collection": robot.manufacturingData
                            ?.dataCollection
                            ? "Enabled"
                            : "Disabled",
                        Features: robot.manufacturingData?.features || "",
                        "Additional Inputs":
                            robot.manufacturingData?.additionalInputs || "",
                        "Battery Code": robot.motorData?.batteryCode || "",
                        "Battery Serial Number":
                            robot.motorData?.batterySerialNo || "",
                        "Battery Type": robot.motorData?.batteryType || "",
                        "Bluetooth Connection Serial Number":
                            robot.motorData?.bluetoothConnectionSerialNo || "",
                        "Battery ID Dropdown":
                            robot.motorData?.batteryIdDropdown || "",
                        "Flo Stack ID": robot.motorData?.floStackId || "",
                        "Motor Type": robot.motorData?.motorType || "",
                        "Motor Model": robot.motorData?.motorModel || "",
                        "Motor Serial Number":
                            robot.motorData?.motorSerialNumber || "",
                        "Motor ID": robot.motorData?.motorId || "",
                        "Total Tasks": robot.taskCounts?.total || 0,
                        "Pending Tasks": robot.taskCounts?.pending || 0,
                        "In Progress Tasks": robot.taskCounts?.inProgress || 0,
                        "Completed Tasks": robot.taskCounts?.completed || 0,
                        "Cancelled Tasks": robot.taskCounts?.cancelled || 0,
                        "Latest Task Title": robot.latestTask?.title || "",
                        "Latest Task Status": robot.latestTask?.status || "",
                        "Latest Task Created Date": formatDate(
                            robot.latestTask?.createdDate
                        ),
                        "Yesterday Trip Count": robot.yesterdayTripCount || 0,
                        "Cycle Efficiency (%)": formatCycleEfficiency(
                            robot.cycleEfficiency
                        ),
                        "Cycle Efficiency Window":
                            robot.cycleEfficiencyWindow || "unknown",
                        "Cycle Efficiency Freshness At": formatDate(
                            robot.metricFreshness?.cycleEfficiency
                        )
                    };
                }
            );

            const XLSX = await loadXlsx();
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(dataToDownload);

            // Set column widths for better readability
            worksheet["!cols"] = [
                { wpx: 150 }, // Robot Name
                { wpx: 200 }, // Description
                { wpx: 100 }, // Status
                { wpx: 120 }, // Connectivity State
                { wpx: 140 }, // Last Connection
                { wpx: 120 }, // Connectivity Age
                { wpx: 120 }, // Connected Clients
                { wpx: 150 }, // Connectivity Freshness
                { wpx: 150 }, // MAC Address
                { wpx: 120 }, // Fleet Name
                { wpx: 150 }, // Operator Name
                { wpx: 130 }, // Operator Phone
                { wpx: 120 }, // Checked In Today
                { wpx: 150 }, // Last Check In Time
                { wpx: 170 }, // Operator Staffing State
                { wpx: 150 }, // Staffing Freshness
                { wpx: 150 }, // Client Name
                { wpx: 150 }, // Billing Client
                { wpx: 120 }, // Billing Amount
                { wpx: 120 }, // Billing Status
                { wpx: 110 }, // Operating Hours
                { wpx: 150 }, // Maintenance Schedule
                { wpx: 130 }, // Last Maintenance
                { wpx: 140 }, // Maintenance Due (Days)
                { wpx: 140 }, // Maintenance Status
                { wpx: 140 }, // BOM Completion Status
                { wpx: 160 }, // BOM Insufficient Parts Count
                { wpx: 120 }, // BOM Status
                { wpx: 150 }, // Maintenance Freshness
                { wpx: 150 }, // Manufacturing Partner
                { wpx: 130 }, // Manufacturing Date
                { wpx: 130 }, // Shipping Date
                { wpx: 110 }, // Data Collection
                { wpx: 250 }, // Features
                { wpx: 250 }, // Additional Inputs
                { wpx: 120 }, // Battery Code
                { wpx: 150 }, // Battery Serial
                { wpx: 150 }, // Battery Type
                { wpx: 180 }, // Bluetooth Serial
                { wpx: 140 }, // Battery ID Dropdown
                { wpx: 120 }, // Flo Stack ID
                { wpx: 130 }, // Motor Type
                { wpx: 130 }, // Motor Model
                { wpx: 150 }, // Motor Serial
                { wpx: 100 }, // Motor ID
                { wpx: 100 }, // Total Tasks
                { wpx: 110 }, // Pending Tasks
                { wpx: 130 }, // In Progress Tasks
                { wpx: 120 }, // Completed Tasks
                { wpx: 120 }, // Cancelled Tasks
                { wpx: 200 }, // Latest Task Title
                { wpx: 130 }, // Latest Task Status
                { wpx: 160 }, // Latest Task Date
                { wpx: 130 }, // Yesterday Trips
                { wpx: 140 }, // Cycle Efficiency
                { wpx: 150 }, // Cycle Efficiency Window
                { wpx: 170 } // Cycle Efficiency Freshness
            ];

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Robot Master Data"
            );

            const fileName = `Robot_Master_Data_${dayjs().format("YYYY-MM-DD_HH-mm")}.xlsx`;
            XLSX.writeFile(workbook, fileName, { compression: true });

            toast.success(`Downloaded ${robots.length} robots successfully!`);
        } catch (error) {
            errorLogger(error);
            toast.error("Failed to download robot data");
        }
    };

    const downloadMasterDataHandler = async (masterData: MasterData[]) => {
        if (masterData.length === 0) {
            toast.info("No master data to download");
            return;
        }
        const dataToDownload: MasterDataFromSheetFormat[] = masterData.map(
            (item) => {
                return {
                    Name: item.name,
                    Category: item.category,
                    Description: item.description ?? "",
                    Status: item.status ?? "",
                    Type: item.type ?? "",
                    Value: item.value ?? "",
                    Priority: item.priority ?? "",
                    "Is Active": item.isActive ? "true" : "false",
                    "Date Added": item.dateAdded
                        ? dayjs(item.dateAdded).format("D/MM/YYYY")
                        : "",
                    "Added by": item.addedBy?.name ?? "",
                    Notes: item.notes
                        .map(
                            (note) =>
                                `${dayjs(note.date).format("D/MM/YYYY")} - ${note.description}`
                        )
                        .join("\n")
                };
            }
        );
        try {
            const XLSX = await loadXlsx();
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(dataToDownload);
            worksheet["!cols"] = [];
            Object.keys(dataToDownload).forEach(() => {
                worksheet["!cols"]?.push({
                    wpx: 65
                });
            });

            XLSX.utils.book_append_sheet(workbook, worksheet, "masterdata");

            XLSX.writeFile(workbook, `MasterData/MasterData.xlsx`);
        } catch (error) {
            errorLogger(error);
        }
    };

    const downloadMutation = useMutation({
        mutationFn: () => downloadMasterDataFn(),
        onSuccess: (data) => {
            downloadMasterDataHandler(data);
        },
        onError: (error) => errorLogger(error)
    });

    const uploadMutation = useMutation({
        mutationFn: (data: FormattedMasterDataPayload[]) =>
            uploadMasterDataFn(data),
        onSuccess: () => {
            toast.success("Master data uploaded successfully");
            fetchMasterData();
        },
        onError: (error) => errorLogger(error)
    });

    const uploadMasterDataHandler = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (!target?.files?.[0]) return;
            const file = target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                void (async () => {
                    const data = event.target?.result;
                    if (!data) return;

                    try {
                        const XLSX = await loadXlsx();
                        const workbook = XLSX.read(data, { type: "binary" });
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const dataFromCsv = XLSX.utils.sheet_to_json(worksheet, {
                            defval: "",
                            raw: false
                        }) as MasterDataFromSheetFormat[];

                        const formattedData = formatCsvForUploading(dataFromCsv);

                        uploadMutation.mutate(formattedData);
                    } catch (error) {
                        errorLogger(error);
                    }
                })();
            };
            reader.readAsArrayBuffer(file);
        };
        input.click();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex items-center justify-center gap-3 rounded-md border px-4 py-2 hover:bg-white hover:text-black md:m-0">
                    <span>Actions</span>
                    <LuArrowUpDown className="h-4 w-4" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="border-backgroundGray bg-backgroundGray"
            >
                <DropdownMenuItem
                    onClick={downloadRobotMasterDataHandler}
                    className="cursor-pointer rounded-md text-white focus:bg-neutral-100 focus:text-black"
                >
                    Download Sheet
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
