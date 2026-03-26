import { Listbox, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { View, ViewsProps, Messages, Event } from "react-big-calendar";
import { MdCheck, MdExpandMore } from "react-icons/md";

type ViewsListBoxProps = {
    view: View;
    views: View[];
    messages: Messages;
    onView: (view: View) => void;
};

const ViewsListBox = ({ view, views, messages, onView }: ViewsListBoxProps) => {
    return (
        <>
            <Listbox value={view} onChange={onView}>
                <div className="relative w-full">
                    <Listbox.Button
                        className={`flex max-w-fit items-center justify-between space-x-2 rounded-md border border-white bg-background px-4 py-2  text-xs md:text-base`}
                    >
                        <span>{messages[view]}</span>
                        <MdExpandMore className="h-4 w-4 md:h-5 md:w-5" />
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options
                            className={
                                "absolute z-[150] mt-2 max-h-60 w-36 overflow-auto rounded-md bg-backgroundGray text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                            }
                        >
                            {views.map((viewName, index) => (
                                <Listbox.Option
                                    className={`relative  cursor-default select-none py-2 pl-10 pr-4 text-white ui-active:bg-white ui-active:text-black`}
                                    key={index}
                                    value={viewName}
                                >
                                    <span
                                        className={`block truncate font-normal text-neutral-300 ui-selected:text-white ui-active:text-black `}
                                    >
                                        {messages[viewName]}
                                    </span>
                                    <span
                                        className={`invisible absolute inset-y-0 left-0 flex items-center pl-3 ui-selected:visible`}
                                    >
                                        <MdCheck
                                            className="h-4 w-4 text-white ui-active:text-black md:h-5 md:w-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </>
    );
};
export default ViewsListBox;
