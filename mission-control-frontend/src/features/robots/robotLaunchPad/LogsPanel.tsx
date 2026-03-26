import { useState } from "react";
import { MdErrorOutline, MdSearch } from "react-icons/md";
import Select from "../../../components/select/Select";
import { LogMessage } from "../../../stores/robotStore";
import dayjs from "dayjs";

type LogPanelProps = {
    logs: LogMessage[];
};

/**
 * Types for log messages coming from Robotic Operating System
 *
 * [ROS2 reference](https://docs.ros2.org/foxy/api/rcl_interfaces/msg/Log.html)
 *
 **/
const Levels: {
    [x: number]: { label: string; modifiers: string; level: number };
} = {
    0: { label: "All", modifiers: "text-blue-500", level: 0 },
    10: { label: "Debug", modifiers: "text-green-200", level: 10 },
    20: { label: "Info", modifiers: "text-cyan-400", level: 20 },
    30: { label: "Warn", modifiers: "text-yellow-200", level: 30 },
    40: { label: "Error", modifiers: "text-red-500", level: 40 },
    50: { label: "Fatal", modifiers: "text-red-900", level: 50 }
};

/**
 * This component displays logs from edge
 */
const LogsPanel = ({ logs }: LogPanelProps) => {
    const [searchValue, setSearchValue] = useState<string>("");

    const searchValueChangeHandler = (val: string) => {
        setSearchValue(val);
    };

    const [selectedLevel, setSelectedLevel] = useState<{
        label: string;
        modifiers: string;
        level: number;
    }>(Levels[0]);

    const filterLogsOnSearch = (log: LogMessage) => {
        if (searchValue === "" && selectedLevel == Levels[0]) {
            return true;
        }
        const reSearchValue = searchValue.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const re = new RegExp(reSearchValue, "i");

        if (
            (searchValue.length > 0 ? log.msg.match(re) : true) &&
            (selectedLevel?.level != 0
                ? selectedLevel.level == log.level
                : true)
        ) {
            return true;
        }
        return false;
    };

    return (
        <div className="flex-column h-[100%] w-full text-white md:text-lg">
            {logs.length === 0 ? (
                <div className="flex h-[60vh] w-full flex-col items-center justify-center">
                    <MdErrorOutline className="mb-6 h-24 w-24 text-red-500 " />
                    <p className="mb-2 text-xs">Error retrieving logs</p>
                </div>
            ) : (
                <>
                    <div className="border-border flex  h-[3.5rem] items-center justify-between border-b">
                        <div className="border-border h-full w-1/2 border-r ">
                            <Select
                                value={selectedLevel}
                                values={Object.values(Levels)}
                                path="label"
                                setValue={setSelectedLevel}
                                position="bottom"
                                background="transparent"
                            />
                        </div>
                        <div className="flex h-full w-full items-center justify-between gap-x-2 border-white bg-background px-5 text-sm lg:text-lg">
                            <input
                                value={searchValue}
                                onChange={(e) =>
                                    searchValueChangeHandler(e.target.value)
                                }
                                type="text"
                                placeholder="Search logs"
                                className="w-full appearance-none   bg-transparent text-sm text-white placeholder:text-base placeholder:text-neutral-400 focus:outline-none lg:text-lg"
                            />
                            <label htmlFor="Search">
                                <MdSearch className="text-bold relative h-4 w-4 text-white hover:text-gray-400 md:h-5 md:w-5" />
                            </label>
                        </div>
                    </div>
                    <ul className="no-scrollbar h-[81vh] overflow-y-scroll px-5 pt-5 ">
                        {logs.filter(filterLogsOnSearch).map((log, index) => {
                            return (
                                <li
                                    className="mb-5 whitespace-pre-line break-words text-left text-xs md:text-sm"
                                    key={index}
                                >
                                    <span
                                        className={
                                            Levels?.[log.level].modifiers
                                        }
                                    >{`[${dayjs(log.stamp.sec * 1000).format(
                                        "h:mm:ss A[, ]DD/MM/YYYY"
                                    )}] [${log.name}] ${log.msg}`}</span>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
};

export default LogsPanel;
