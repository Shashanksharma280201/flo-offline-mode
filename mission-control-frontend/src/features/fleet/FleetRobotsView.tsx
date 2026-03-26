import { useMutation } from "react-query";
import { fetchFleetRobotsFn } from "./services/fleetService";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { naturalSort } from "@/util/sortRobots";
import { Search, Copy } from "lucide-react";

type FleetRobot = {
    name: string;
    id: string;
};

export const FleetRobotsView = () => {
    const { id } = useParams() as { id: string };

    const [robots, setRobots] = useState<FleetRobot[]>([]);

    const fetchFleetRobotsMutation = useMutation({
        mutationFn: (fleetId: string) => fetchFleetRobotsFn(fleetId),
        onSuccess: (data) => {
            setRobots(data);
        },
        onError: (error) => {
            console.log("Error fetching robots", error);
            toast.error("Error fetching robots");
        }
    });

    useEffect(() => {
        fetchFleetRobotsMutation.mutate(id);
    }, []);

    const handleCopyId = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        toast.success("ID copied to clipboard");
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pl-10 text-sm text-white placeholder:text-white/50 focus:border-white/20 focus:outline-none"
                    placeholder="Search fleet..."
                />
            </div>

            {fetchFleetRobotsMutation.isLoading && (
                <LoadingSpinner className="mt-6 size-8 animate-spin self-center fill-white text-center text-white/10" />
            )}
            {!fetchFleetRobotsMutation.isLoading && (
                <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {robots.length ? (
                        robots
                            .sort((a, b) => naturalSort(a.name, b.name))
                            .map((robot) => {
                                return (
                                    <Link
                                        key={robot.id}
                                        to={`/robots/${robot.id}/profile`}
                                        className="group flex cursor-pointer items-center justify-between border-b border-white/10 p-4 transition-colors last:border-b-0 hover:bg-white/5 sm:p-6"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <h1 className="text-sm font-semibold text-white">
                                                {robot.name}
                                            </h1>
                                            <span className="font-mono text-xs tracking-wide text-white/50">
                                                ID: {robot.id}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) =>
                                                handleCopyId(e, robot.id)
                                            }
                                            className="rounded p-2 text-white/30 transition-all hover:bg-white/10 hover:text-white"
                                            title="Copy robot ID"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </Link>
                                );
                            })
                    ) : (
                        <span className="self-center p-6 text-white/50">
                            No robots found
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
