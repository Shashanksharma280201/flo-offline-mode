import ComboBox from "@/components/comboBox/ComboBox";
import { cn } from "@/lib/utils";
import { KeyboardEvent } from "react";
import { MdSearch } from "react-icons/md";

type IssueStatus = "All" | "Open" | "Closed";

export const IssueStatusFilter = ({
    className,
    dropDownWrapperClassName,
    searchClassName,
    issueStatus,
    searchValue,
    setSearchValue,
    onStatusChange,
    onSearch
}: {
    className?: string;
    dropDownWrapperClassName?: string;
    searchClassName?: string;
    issueStatus: IssueStatus;
    searchValue: string;
    setSearchValue: (searchValue: string) => void;
    onStatusChange: (issueStatus: IssueStatus) => void;
    onSearch: () => void;
}) => {
    const keyPressHandler = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            onSearch();
        }
    };

    return (
        <section
            className={cn([
                "h-[3rem] w-full items-center gap-2 divide-x divide-border border-b-[0.5px] border-border text-sm text-black md:text-lg",
                className
            ])}
        >
            <div className={cn(["h-full", dropDownWrapperClassName])}>
                <ComboBox
                    nullable={false}
                    label="Issues"
                    items={["All", "Open", "Closed"]}
                    selectedItem={issueStatus}
                    setSelectedItem={onStatusChange}
                    getItemLabel={(issuesStatus) => issuesStatus ?? ""}
                    wrapperClassName="border-none px-4"
                    compareItems={(itemOne, itemTwo) => itemOne === itemTwo}
                    showLabel={false}
                    isSelect={true}
                />
            </div>

            <label
                htmlFor="Search"
                className={cn([
                    "flex h-full w-full items-center justify-between pr-2 text-sm text-white  transition-colors ease-in  md:text-lg",
                    searchClassName
                ])}
            >
                <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    onKeyDown={keyPressHandler}
                    type="text"
                    placeholder="Search issue"
                    className="block h-full w-full appearance-none items-center bg-transparent pl-4 pr-2 text-xs text-white placeholder:text-neutral-400 focus:outline-none "
                />
                <MdSearch
                    onClick={onSearch}
                    className="h-6 w-6 cursor-pointer text-neutral-400 hover:text-white"
                />
            </label>
        </section>
    );
};
