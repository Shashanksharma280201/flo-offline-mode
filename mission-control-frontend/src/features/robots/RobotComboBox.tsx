import { Combobox, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { MdCheck, MdSearch } from "react-icons/md";
import { FleetType } from "../../data/types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

type FleetComboBoxProps = {
    fleets: FleetType[];
    selectedFleet: FleetType | null;
    setSelectedFleet: React.Dispatch<React.SetStateAction<FleetType | null>>;
    isLoading: boolean;
    disabled?: boolean;
    className?: string;
};

const FleetComboBox = ({
    fleets,
    selectedFleet,
    setSelectedFleet,
    isLoading,
    disabled,
    className
}: FleetComboBoxProps) => {
    const [query, setQuery] = useState("");
    const filteredFleets =
        query === ""
            ? fleets
            : fleets.filter((fleet) =>
                  fleet.name
                      .toLowerCase()
                      .replace(/\s+/g, "")
                      .includes(query.toLowerCase().replace(/\s+/g, ""))
              );
    return (
        <Combobox
            value={selectedFleet}
            disabled={disabled}
            onChange={setSelectedFleet}
            nullable
        >
            <div className="relative w-full">
                <div
                    className={cn(
                        `relative flex w-full items-center justify-end space-x-2 rounded-md bg-background text-sm outline-none md:text-lg `,
                        className
                    )}
                >
                    <Combobox.Input
                        name="fleet"
                        className={`flex w-full appearance-none items-center rounded-md border border-border bg-transparent p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none md:text-base`}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Select the fleet type"
                        displayValue={(fleet: FleetType) => fleet?.name}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <MdSearch
                            className="h-5 w-5 text-neutral-400"
                            aria-hidden="true"
                        />
                    </Combobox.Button>
                </div>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery("")}
                >
                    <Combobox.Options
                        className={
                            "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-backgroundGray py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                        }
                    >
                        {isLoading ? (
                            <div className="flex cursor-default select-none items-center justify-center px-4 py-2 text-white">
                                <LoadingSpinner className="mb-2 h-5 w-5 animate-spin fill-white text-background" />
                            </div>
                        ) : filteredFleets.length === 0 && query !== "" ? (
                            <div className="relative cursor-default select-none px-4 py-2 text-white">
                                Nothing found.
                            </div>
                        ) : (
                            filteredFleets.map((fleet) => (
                                <Combobox.Option
                                    key={fleet.id}
                                    className={`relative cursor-pointer select-none py-2 pl-10 pr-4 font-semibold text-white ui-active:bg-white ui-active:text-black`}
                                    value={fleet}
                                >
                                    <>
                                        <span
                                            className={`block truncate font-normal ui-selected:font-semibold `}
                                        >
                                            {fleet.name}
                                        </span>
                                        <span
                                            className={`invisible absolute inset-y-0 left-0 flex items-center pl-3 ui-selected:visible`}
                                        >
                                            <MdCheck
                                                className="h-5 w-5 text-green-500"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </>
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );
};
export default FleetComboBox;
