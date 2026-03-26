import ComboBox from "@/components/comboBox/ComboBox";
import Header from "@/components/header/Header";
import {
    PaginationComponent,
    PaginationInfo
} from "@/components/pagination/PaginationComponent";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ClientData, RobotType } from "@/data/types";
import ClientComboBox from "@/features/issues/ClientComboBox";
import { IssueDateRangePicker } from "@/features/issues/IssueDateRangePicker";
import { IssueExportButton } from "@/features/issues/IssueExportButton";
import { Issue, IssueItem } from "@/features/issues/IssueItem";
import { IssueStatusFilter } from "@/features/issues/IssueStatusFilter";
import { RobotComboBox } from "@/features/issues/RobotComboBox";
import {
    IssueQueryParams,
    queryIssuesFn
} from "@/features/robots/services/issuesService";
import { errorLogger } from "@/util/errorLogger";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { useMutation } from "react-query";

const CATEGORY_OPTIONS = [
    "All",
    "Mechanical",
    "Electrical",
    "Downtime",
    "Observation",
    "Other"
] as const;
type CategoryType = (typeof CATEGORY_OPTIONS)[number];

const SUBCATEGORY_OPTIONS: Record<CategoryType, string[]> = {
    Mechanical: [
        "Dumper Hinge Issue",
        "Tyre Issue",
        "Shaft Issue",
        "Motor Issue",
        "Gearbox Issue",
        "Bearing Issue",
        "Stopper Broken",
        "Braking Issue",
        "Other Issues"
    ],
    Electrical: [
        "Remote Issue",
        "Trim Issue",
        "Power Button Issue",
        "Emergency Button Issue",
        "Battery Cut-Off Issue",
        "Actuator/Hydraulics Issue",
        "Light Issue",
        "Pivoting Issue",
        "Speed Issue",
        "Other Issues"
    ],
    Downtime: [],
    Observation: [],
    Other: [],
    All: []
};

type IssueStatus = "All" | "Open" | "Closed";
type IssueType =
    | "All"
    | "Mechanical"
    | "Electrical"
    | "Downtime"
    | "Observation"
    | "Other";

const Issues = () => {
    const [issueStatus, setIssueStatus] = useState<IssueStatus>("All");
    const [searchValue, setSearchValue] = useState("");
    const [selectedRobot, setSelectedRobot] = useState<RobotType>();
    const [selectedClient, setSelectedClient] = useState<ClientData>();
    const [currentPage, setCurrentPage] = useState(1);
    const [robotIssues, setRobotIssues] = useState<Issue[]>([]);
    const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>();
    const [issueSubCategory, setIssueSubCategory] = useState<
        string | undefined
    >(undefined);

    const [typeOfIssue, setTypeOfIssue] = useState<IssueType>("All");

    const [dateRange, setDateRange] = useState<DateRange>({
        from: undefined,
        to: undefined
    });

    const statusChangeHandler = (status: IssueStatus) => {
        setIssueStatus(status);
        fetchIssueMutation.mutate({
            clientId: selectedClient?.id,
            page: currentPage,
            searchValue,
            startingTimestamp: dateRange.from?.getTime(),
            endingTimestamp: dayjs(dateRange.to).endOf("day").valueOf(),
            robotId: selectedRobot?.id,
            issueStatus: status,
            typeOfIssue,
            issueSubCategory
        });
    };

    const robotChangeHandler = (robot: RobotType) => {
        let robotId;
        if (robot.id === "none") {
            setSelectedRobot(undefined);
        } else {
            robotId = robot.id;
            setSelectedRobot(robot);
        }
        fetchIssueMutation.mutate({
            clientId: selectedClient?.id,
            page: currentPage,
            searchValue,
            startingTimestamp: dateRange.from?.getTime(),
            endingTimestamp: dayjs(dateRange.to).endOf("day").valueOf(),
            robotId,
            issueStatus,
            typeOfIssue,
            issueSubCategory
        });
    };

    const clientChangeHandler = (clientData: ClientData) => {
        let clientId;
        if (clientData.id === "none") {
            setSelectedClient(undefined);
        } else {
            clientId = clientData.id;
            setSelectedClient(clientData);
        }
        fetchIssueMutation.mutate({
            clientId,
            page: currentPage,
            searchValue,
            startingTimestamp: dateRange.from?.getTime(),
            endingTimestamp: dayjs(dateRange.to).endOf("day").valueOf(),
            robotId: selectedRobot?.id,
            issueStatus,
            typeOfIssue,
            issueSubCategory
        });
    };

    // search using issue types
    const typeChangeHandler = (typeOfIssue: IssueType) => {
        setTypeOfIssue(typeOfIssue);
        fetchIssueMutation.mutate({
            clientId: selectedClient?.id,
            page: currentPage,
            searchValue,
            startingTimestamp: dateRange.from?.getTime(),
            endingTimestamp: dayjs(dateRange.to).endOf("day").valueOf(),
            robotId: selectedRobot?.id,
            issueStatus,
            typeOfIssue,
            issueSubCategory
        });
    };

    const searchIssueHandler = () => {
        fetchIssueMutation.mutate({
            clientId: selectedClient?.id,
            page: currentPage,
            searchValue,
            startingTimestamp: dateRange.from?.getTime(),
            endingTimestamp: dayjs(dateRange.to).endOf("day").valueOf(),
            robotId: selectedRobot?.id,
            issueStatus,
            typeOfIssue,
            issueSubCategory
        });
    };
    const dateRangeSelectHandler = (dateRange?: DateRange) => {
        setDateRange({
            from: dateRange?.from,
            to: dateRange?.to
        });

        fetchIssueMutation.mutate({
            clientId: selectedClient?.id,
            page: currentPage,
            searchValue,
            startingTimestamp: dateRange
                ? dateRange.from?.getTime()
                : undefined,
            endingTimestamp: dateRange
                ? dayjs(dateRange.to).endOf("day").valueOf()
                : undefined,
            robotId: selectedRobot?.id,
            issueStatus,
            typeOfIssue,
            issueSubCategory
        });
    };

    const fetchIssueMutation = useMutation({
        mutationFn: (issueQueryParams: IssueQueryParams) =>
            queryIssuesFn(issueQueryParams),
        onSuccess: ({ metaData, issues }) => {
            setPaginationInfo(metaData);
            setRobotIssues(issues);
        },
        onError: (error) => errorLogger(error)
    });

    const pageChangeHandler = (page: number) => {
        setCurrentPage(page);
        fetchIssueMutation.mutate({
            clientId: selectedClient?.id,
            page,
            searchValue,
            startingTimestamp: dateRange.from?.getTime(),
            endingTimestamp: dayjs(dateRange.to).endOf("day").valueOf(),
            robotId: selectedRobot?.id,
            issueStatus,
            typeOfIssue,
            issueSubCategory
        });
    };

    useEffect(() => {
        fetchIssueMutation.mutate({ page: 1 });
    }, []);

    return (
        <div className="flex h-screen w-screen flex-col overflow-y-auto bg-blue-900/25">
            <Header title="Issues" />
            <div className="flex flex-col gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row">
                    <IssueStatusFilter
                        className="flex basis-6/12 rounded border bg-backgroundGray/30"
                        dropDownWrapperClassName="w-[20%] min-w-[100px] "
                        issueStatus={issueStatus}
                        searchValue={searchValue}
                        setSearchValue={setSearchValue}
                        onStatusChange={statusChangeHandler}
                        onSearch={searchIssueHandler}
                    />
                    <div className="flex basis-2/12">
                        <ClientComboBox
                            selectedClient={selectedClient}
                            setSelectedClient={clientChangeHandler}
                        />
                    </div>

                    <div className="flex basis-2/12">
                        <RobotComboBox
                            selectedRobot={selectedRobot}
                            setSelectedRobot={robotChangeHandler}
                        />
                    </div>
                    <div className="flex basis-2/12">
                        <IssueDateRangePicker
                            dateRange={dateRange}
                            onDateRangeChange={dateRangeSelectHandler}
                        />
                    </div>
                    <div className="flex basis-2/12 ">
                        <ComboBox<CategoryType>
                            nullable={false}
                            label="Category"
                            items={[...CATEGORY_OPTIONS]}
                            selectedItem={typeOfIssue}
                            setSelectedItem={(cat) => {
                                setTypeOfIssue(cat);
                                setIssueSubCategory(undefined);
                                fetchIssueMutation.mutate({
                                    clientId: selectedClient?.id,
                                    page: 1,
                                    searchValue,
                                    startingTimestamp:
                                        dateRange.from?.getTime(),
                                    endingTimestamp: dayjs(dateRange.to)
                                        .endOf("day")
                                        .valueOf(),
                                    robotId: selectedRobot?.id,
                                    issueStatus,
                                    typeOfIssue: cat,
                                    issueSubCategory: undefined
                                });
                            }}
                            getItemLabel={(cat) => cat}
                            wrapperClassName="bg-backgroundGray/30"
                            compareItems={(a, b) => a === b}
                            isSelect={true}
                        />
                    </div>
                    {(typeOfIssue === "Mechanical" ||
                        typeOfIssue === "Electrical") && (
                        <div className="flex basis-2/12 ">
                            <ComboBox<string>
                                nullable={false}
                                label="Subcategory"
                                items={
                                    SUBCATEGORY_OPTIONS[
                                        typeOfIssue as CategoryType
                                    ] || []
                                }
                                selectedItem={issueSubCategory}
                                setSelectedItem={(sub) => {
                                    setIssueSubCategory(sub);
                                    fetchIssueMutation.mutate({
                                        clientId: selectedClient?.id,
                                        page: 1,
                                        searchValue,
                                        startingTimestamp:
                                            dateRange.from?.getTime(),
                                        endingTimestamp: dayjs(dateRange.to)
                                            .endOf("day")
                                            .valueOf(),
                                        robotId: selectedRobot?.id,
                                        issueStatus,
                                        typeOfIssue,
                                        issueSubCategory: sub
                                    });
                                }}
                                getItemLabel={(sub) => sub}
                                wrapperClassName="bg-backgroundGray/30"
                                compareItems={(a, b) => a === b}
                                isSelect={true}
                            />
                        </div>
                    )}
                    <div className="flex items-center">
                        <IssueExportButton
                            exportParams={{
                                startingTimestamp: dateRange.from?.getTime(),
                                endingTimestamp: dateRange.to
                                    ? dayjs(dateRange.to).endOf("day").valueOf()
                                    : undefined,
                                robotId: selectedRobot?.id,
                                clientId: selectedClient?.id,
                                issueStatus,
                                typeOfIssue,
                                issueSubCategory
                            }}
                        />
                    </div>
                </div>
                {robotIssues.length ? (
                    <div className="divide-y divide-border rounded-md border border-border">
                        {robotIssues.map((issue) => {
                            return <IssueItem issue={issue} key={issue.id} />;
                        })}
                    </div>
                ) : fetchIssueMutation.isLoading ? (
                    <LoadingSpinner className="h-10 w-10 animate-spin self-center  fill-white text-center text-background" />
                ) : (
                    <div className="flex items-center justify-center">
                        No issues found
                    </div>
                )}
                {robotIssues.length && paginationInfo ? (
                    <div className="flex justify-center">
                        <PaginationComponent
                            paginationInfo={paginationInfo}
                            currentPage={currentPage}
                            onPageChange={pageChangeHandler}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default Issues;
