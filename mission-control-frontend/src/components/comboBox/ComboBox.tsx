import { Combobox, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { MdCheck, MdChevronRight, MdSearch } from "react-icons/md";
import LoadingSpinner from "../ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { ByComparator } from "@headlessui/react/dist/types";
import { IconType } from "react-icons";

type ComboBoxProps<T> = {
    items: T[];
    selectedItem?: T;
    setSelectedItem: (item: T) => void;
    label: string;
    placeholder?: string;
    getItemLabel: (item: T) => string;
    showLabel?: boolean;
    isLoading?: boolean;
    isItemLoading?: boolean;
    wrapperClassName?: string;
    dropDownWrapperClassName?: string;
    inputClassName?: string;
    compareItems?: ByComparator<T | null> | undefined;
    isSelect?: boolean;
    nullable?: boolean;
};

const ComboBox = <T,>({
    items,
    selectedItem,
    setSelectedItem,
    label,
    placeholder,
    getItemLabel,
    showLabel = true,
    isLoading,
    isItemLoading,
    wrapperClassName,
    dropDownWrapperClassName,
    inputClassName,
    compareItems,
    isSelect = false,
    nullable = true
}: ComboBoxProps<T>) => {
    const [query, setQuery] = useState("");

    const filteredItems =
        query === ""
            ? items
            : items.filter((item) =>
                  getItemLabel(item)
                      .toLowerCase()
                      .replace(/\s+/g, "")
                      .includes(query.toLowerCase().replace(/\s+/g, ""))
              );

    return (
        <Combobox
            value={selectedItem ?? null}
            by={compareItems ?? "id"}
            onChange={setSelectedItem}
            // @ts-ignore
            nullable={nullable}
        >
            <div className="relative h-full w-full">
                <div
                    className={cn(
                        `relative flex h-full w-full items-center justify-end  space-x-2 rounded-md border border-border p-3 text-sm md:text-base`,
                        wrapperClassName
                    )}
                >
                    {showLabel && (
                        <Combobox.Label className="text-neutral-400 ">
                            {label}:
                        </Combobox.Label>
                    )}
                    <Combobox.Input
                        placeholder={placeholder}
                        className={cn(
                            `flex h-full w-full appearance-none items-center bg-transparent text-sm text-white first-letter:uppercase placeholder:text-sm placeholder:text-neutral-400 focus:outline-none md:text-base`,
                            inputClassName
                        )}
                        onChange={(event) => setQuery(event.target.value)}
                        displayValue={getItemLabel}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        {isItemLoading ? (
                            <LoadingSpinner className="h-4 w-4 animate-spin fill-white text-center text-background" />
                        ) : isSelect ? (
                            <MdChevronRight
                                className="h-5 w-5 rotate-90 cursor-pointer text-neutral-400"
                                aria-hidden="true"
                            />
                        ) : (
                            <MdSearch
                                className="h-5 w-5 cursor-pointer text-neutral-400"
                                aria-hidden="true"
                            />
                        )}
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
                            "absolute z-[150] mt-2 max-h-60 w-full min-w-36 overflow-auto rounded-md bg-backgroundGray text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                        }
                    >
                        {isLoading ? (
                            <div className="relative flex cursor-default select-none items-center justify-center px-4 py-2 text-white">
                                <LoadingSpinner className="h-5 w-5 animate-spin fill-white text-center text-background" />
                            </div>
                        ) : (
                            <>
                                {filteredItems.length === 0 && query !== "" ? (
                                    <div className="relative cursor-default select-none px-4 py-4 text-white">
                                        Nothing found.
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="relative cursor-default select-none px-4 py-4 text-white">
                                        No {label} to display
                                    </div>
                                ) : (
                                    <div>
                                        {filteredItems.map((item, index) => (
                                            <Combobox.Option
                                                key={index}
                                                className={`relative cursor-pointer select-none py-2 pl-10 pr-4 text-white ui-active:bg-white ui-active:text-black`}
                                                value={item}
                                            >
                                                {({ selected }) => {
                                                    return (
                                                        <>
                                                            <span
                                                                className={`block truncate font-normal text-neutral-300 ui-selected:text-white ui-active:text-black `}
                                                            >
                                                                {getItemLabel(
                                                                    item
                                                                )}
                                                            </span>
                                                            <span
                                                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${selected ? "visible" : "invisible"}`}
                                                            >
                                                                <MdCheck
                                                                    className="h-5 w-5 text-green-500"
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                        </>
                                                    );
                                                }}
                                            </Combobox.Option>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );
};

export default ComboBox;
