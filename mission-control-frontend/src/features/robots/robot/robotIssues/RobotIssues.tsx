import { RobotType } from "@/data/types";
import { useEffect, useState } from "react";
import { MdOutlineModeComment } from "react-icons/md";
import { useMutation } from "react-query";
import { getIssuesListFn } from "../../services/issuesService";
import { IssueAggregateData } from "@/data/types/issueTypes";
import { GoIssueClosed, GoIssueOpened } from "react-icons/go";
import dayjs from "dayjs";
import IssuesFilter from "./IssuesFilter";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Link, useOutletContext } from "react-router-dom";
import { errorLogger } from "@/util/errorLogger";
import { AlertCircle } from "lucide-react";

type IssuesOutletProps = { robot: RobotType; fetchRobotDetails: () => void };

const RobotIssues = () => {
    const { robot } = useOutletContext<IssuesOutletProps>();
    const [searchValue, setSearchValue] = useState("");
    const [issuesStatus, setIssuesStatus] = useState("All");
    const [issues, setIssues] = useState<IssueAggregateData[]>([]);

    const issuesMutation = useMutation(
        (robotId: string) => getIssuesListFn(robotId),
        {
            onSuccess: (data) => {
                setIssues(data);
            },
            onError: (error) => {
                errorLogger(error);
            }
        }
    );

    const filterIssuesOnSearch = (issue: IssueAggregateData) => {
        if (searchValue === "") {
            return true;
        }
        const reSearchValue = searchValue.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
        const re = new RegExp(reSearchValue, "i");

        if (issue.title.match(re)) {
            return true;
        }
        return false;
    };

    const filterIssuesOnStatus = (issue: IssueAggregateData) => {
        if (issuesStatus === "All") {
            return true;
        }
        if (!issuesStatus) return false;
        if (issue.status === issuesStatus.toLowerCase()) {
            return true;
        }
        return false;
    };

    useEffect(() => {
        if (robot) {
            issuesMutation.mutate(robot.id);
        }
    }, [robot]);

    const filteredIssues = issues
        .filter(filterIssuesOnStatus)
        .filter(filterIssuesOnSearch);

    return (
        <div className="flex w-full flex-col items-center justify-center">
            <div className="m-auto mt-8 flex h-full w-full flex-col overflow-hidden rounded-lg bg-slate-800/30 md:w-[75%]">
                {/* Header Section */}
                <div className="flex w-full items-center gap-3 border-b border-gray-700 bg-slate-900/50 p-4">
                    {/* <AlertCircle className="h-6 w-6 text-orange-400" /> */}
                    <h2 className="text-xl font-bold text-white">Robot Issues</h2>
                </div>

                {/* Filter Section */}
                <IssuesFilter
                    issuesStatus={issuesStatus}
                    setIssuesStatus={setIssuesStatus}
                    searchValue={searchValue}
                    setSearchValue={setSearchValue}
                />

                {/* Issues List */}
                <div className="w-full divide-y divide-gray-700">
                    {filteredIssues.length > 0 ? (
                        filteredIssues.map((issue) => {
                            return (
                                <div
                                    className="flex w-full flex-col gap-4 p-6 transition-colors hover:bg-slate-700/20 md:flex-row md:items-center md:justify-between"
                                    key={issue.id}
                                >
                                    {/* Issue Status Badge */}
                                    <div className="flex-shrink-0 md:order-2">
                                        {issue.status === "open" ? (
                                            <div className="flex w-fit items-center justify-center gap-2 rounded-md border border-green-500/50 bg-green-500/20 px-3 py-1.5 text-sm font-semibold text-green-400">
                                                <GoIssueOpened className="h-4 w-4" />
                                                <span className="capitalize">Open</span>
                                            </div>
                                        ) : (
                                            <div className="flex w-fit items-center justify-center gap-2 rounded-md border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-sm font-semibold text-red-400">
                                                <GoIssueClosed className="h-4 w-4" />
                                                <span className="capitalize">Closed</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Issue Details */}
                                    <div className="flex flex-1 flex-col gap-2 md:order-1">
                                        <Link
                                            to={issue.id}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between gap-4"
                                        >
                                            <span className="text-base font-semibold text-white transition-colors hover:text-blue-400">
                                                {issue.title}
                                            </span>
                                            <div className="flex items-center gap-2 rounded-md bg-blue-500/10 px-2.5 py-1 text-sm text-blue-400">
                                                <MdOutlineModeComment className="h-4 w-4" />
                                                <span className="font-medium">
                                                    {issue.threadCount}
                                                </span>
                                            </div>
                                        </Link>

                                        {/* Timestamp */}
                                        <span className="text-xs text-gray-400">
                                            {!issue.closeTimestamp
                                                ? `Raised on ${dayjs(issue.raisedOnTimestamp).format("MMM DD, YYYY [at] hh:mm A")}`
                                                : `Closed on ${dayjs(issue.closeTimestamp).format("MMM DD, YYYY [at] hh:mm A")}`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex min-h-[30vh] items-center justify-center">
                            {issuesMutation.isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <LoadingSpinner className="h-8 w-8 animate-spin fill-blue-500 text-gray-600" />
                                    <span className="text-sm text-gray-400">
                                        Loading Issues...
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <AlertCircle className="h-12 w-12 text-gray-600" />
                                    <span className="text-sm text-gray-400">
                                        No issues found
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RobotIssues;
