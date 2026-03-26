import { Listbox, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { MdDone, MdKeyboardArrowDown } from "react-icons/md";

type SelectForArrayProps<DataType> = {
    values: DataType[] | undefined;
    value: DataType;
    handleChange: Function;
    label: string;
    color?: string;
    position?: string;
    width?: string;
    minWidth?: string;
    paddingTop?: string;
};

/**
 * Custom select drop down component
 *
 * @param SelectProps - prop contains data required for select drop-down
 *
 */

const SelectForArray = <T extends string | number | undefined>({
    values,
    value,
    handleChange,
    label,
    color,
    position = "top",
    width = "full",
    minWidth,
    paddingTop
}: SelectForArrayProps<T>) => {
    const dropdownpos = position === "top" ? "bottom-[100%]" : "bottom";
    return (
        <div className={`relative h-full w-${width}`}>
            <Listbox value={value} onChange={(e) => handleChange(e)}>
                <Listbox.Button
                    className={`flex w-full cursor-default items-center justify-between rounded-md bg-backgroundGray  ${
                        paddingTop ? paddingTop : "py-4"
                    } px-4  text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm ${minWidth}`}
                >
                    <span className={`block truncate ${color ? color : ""}`}>
                        {value ? value : `No ${label} available`}
                    </span>
                    <span className="pointer-events-none flex items-center">
                        {value ? (
                            <MdKeyboardArrowDown
                                className="h-5 w-5 text-white"
                                aria-hidden="true"
                            />
                        ) : (
                            <></>
                        )}
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options
                        className={`absolute ${dropdownpos} z-50 mb-2 max-h-60 w-full overflow-auto rounded-md border-white  bg-backgroundGray text-base shadow-lg  ring-2 ring-black ring-opacity-5 focus:outline-none sm:text-sm ${minWidth}`}
                    >
                        {values && values.length > 0 ? (
                            values.map((value, index) => (
                                <Listbox.Option
                                    key={index}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-3 pl-10 pr-4 ${
                                            active
                                                ? "bg-white text-background"
                                                : "text-white"
                                        }`
                                    }
                                    value={value}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span
                                                className={`block truncate ${
                                                    selected
                                                        ? "font-semibold"
                                                        : "font-medium"
                                                }
                                                `}
                                            >
                                                {value}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary700">
                                                    <MdDone
                                                        className="h-5 w-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))
                        ) : (
                            <></>
                        )}
                    </Listbox.Options>
                </Transition>
            </Listbox>
        </div>
    );
};
export default SelectForArray;
