import ComboBox from "@/components/comboBox/ComboBox";
import { cn } from "@/lib/utils";
import { MdSearch } from "react-icons/md";

type IssuesFilterProps = {
    className?: string;
    issuesStatus: string;
    setIssuesStatus: (issuesStatus: string) => void;
    searchValue: string;
    setSearchValue: (searchValue: string) => void;
};

const IssuesFilter = ({
    className,
    issuesStatus,
    setIssuesStatus,
    searchValue,
    setSearchValue
}: IssuesFilterProps) => {
    return (
        <div
            className={cn([
                "flex h-14 w-full items-center border-b border-gray-700",
                className
            ])}
        >
            {/* Status Filter Dropdown */}
            <div className="h-full w-40 border-r border-gray-700">
                <ComboBox
                    nullable={false}
                    label="Issues"
                    items={["All", "Open", "Closed"]}
                    selectedItem={issuesStatus}
                    setSelectedItem={setIssuesStatus}
                    getItemLabel={(issuesStatus) => issuesStatus ?? ""}
                    wrapperClassName="border-none h-full px-4 bg-slate-900/30"
                    compareItems={(itemOne, itemTwo) => itemOne === itemTwo}
                    showLabel={false}
                    isSelect={true}
                />
            </div>

            {/* Search Input */}
            <label
                htmlFor="Search"
                className="flex h-full flex-1 items-center justify-between bg-slate-900/30 pr-4 transition-colors"
            >
                <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    type="text"
                    placeholder="Search issues by title..."
                    className="block h-full w-full appearance-none bg-transparent px-6 text-sm text-white placeholder:text-gray-400 focus:outline-none"
                />
                <MdSearch className="h-5 w-5 text-gray-400" />
            </label>
        </div>
    );
};

export default IssuesFilter;
