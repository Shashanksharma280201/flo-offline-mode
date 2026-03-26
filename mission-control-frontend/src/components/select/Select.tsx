import { Listbox, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { MdCheck, MdKeyboardArrowDown } from "react-icons/md";
import LoadingSpinner from "../ui/LoadingSpinner";

type SelectProps<DataType> = {
    values: DataType[] | undefined;
    value: DataType;
    setValue:
        | React.Dispatch<React.SetStateAction<DataType>>
        | ((value?: DataType) => void);
    color?: string;
    position?: string;
    width?: string;
    path?: string;
    minWidth?: string;
    padding?: string;
    margin?: string;
    background?: string;
    isLoading?: boolean;
};

/**
 * Custom select drop down component
 *
 * @param SelectProps - prop contains data required for select drop-down
 *
 */

const Select = <T extends { [x: string]: any }>({
    values,
    value,
    setValue,
    color,
    position = "top",
    width = "full",
    path = "name",
    padding,
    minWidth,
    margin,
    background,
    isLoading
}: SelectProps<T>) => {
    const dropdownpos = position === "top" ? "bottom-[100%]" : "bottom";
    return (
        <div className={`relative h-full w-${width}`}>
            <Listbox value={value} onChange={setValue}>
                <Listbox.Button
                    className={`flex h-full w-full cursor-pointer items-center justify-between rounded-md p-3 bg-${
                        background ? background : "backgroundGray"
                    }   text-left text-sm shadow-md focus:outline-none focus-visible:border-green-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 md:text-lg ${minWidth} ${margin}`}
                >
                    <span
                        className={`block truncate text-xs md:text-sm ${
                            color ? color : ""
                        }`}
                    >
                        {value[path]}
                    </span>
                    <span className="pointer-events-none flex items-center">
                        {isLoading ? (
                            <LoadingSpinner className="h-5 w-5 animate-spin fill-white text-center text-background" />
                        ) : (
                            <MdKeyboardArrowDown
                                className="h-5 w-5 text-white"
                                aria-hidden="true"
                            />
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
                        className={`absolute ${dropdownpos} max-h-54 z-50 w-fit overflow-auto rounded-md border-white bg-backgroundGray  text-left text-base shadow-lg ring-2 ring-black ring-opacity-5 focus:outline-none sm:text-sm  ${minWidth} no-scrollbar`}
                    >
                        {values && values.length > 0 ? (
                            values.map((value, index) => (
                                <Listbox.Option
                                    key={index}
                                    className={`relative cursor-pointer select-none py-2 pl-10 pr-4 text-white ui-active:bg-white ui-active:text-black`}
                                    value={value}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span
                                                className={`block truncate font-normal text-neutral-300 ui-selected:text-white ui-active:text-black `}
                                            >
                                                {value && value[path]}
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
export default Select;
