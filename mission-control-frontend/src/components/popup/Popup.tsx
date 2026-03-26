import { cn } from "@/lib/utils";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, ReactNode } from "react";
import { MdClose } from "react-icons/md";

type PopupProps = {
    dialogToggle: boolean;
    onClose: () => void;
    title: string;
    description: string | ReactNode;
    children: ReactNode;
    panelClassName?: string;
};

const Popup = ({
    dialogToggle,
    onClose,
    title,
    description,
    panelClassName,
    children
}: PopupProps) => {
    return (
        <Transition appear show={dialogToggle} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={() => {}}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-2 text-center md:p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className={cn(
                                    "flex w-full max-w-[95%] transform flex-col gap-4 overflow-hidden rounded-xl border border-backgroundGray bg-gray-900 p-4 text-left align-middle shadow-xl transition-all md:max-w-[90%] md:rounded-2xl md:p-6 md:gap-6 lg:w-1/2 lg:max-w-none",
                                    panelClassName
                                )}
                            >
                                <MdClose
                                    onClick={onClose}
                                    className="absolute right-4 top-4 h-5 w-5 cursor-pointer text-white opacity-75 hover:opacity-100 md:right-6 md:top-6"
                                />
                                <Dialog.Title
                                    as="h3"
                                    className="pr-6 text-base font-medium text-white md:text-lg"
                                >
                                    {title}
                                </Dialog.Title>
                                <Dialog.Description className="text-xs text-neutral-400 md:text-sm">
                                    {description}
                                </Dialog.Description>
                                {children}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
export default Popup;
