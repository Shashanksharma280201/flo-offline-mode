import { Disclosure, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { FaCaretDown } from "react-icons/fa";

type DisclosureProps = {
    name: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
};

const CustomDisclosure = ({
    name,
    children,
    defaultOpen = false
}: DisclosureProps) => {
    return (
        <div className="h-full w-full">
            <Disclosure defaultOpen={defaultOpen}>
                <Disclosure.Button className="border-border flex w-full items-center justify-between border-y px-4 py-4 ">
                    {name}
                    <FaCaretDown className="ui-open:rotate-180 ui-open:transform" />
                </Disclosure.Button>
                <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-100 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                >
                    {children && (
                        <Disclosure.Panel
                            className={`border-border  flex w-full flex-col gap-6 border-b  p-4`}
                        >
                            {children}
                        </Disclosure.Panel>
                    )}
                </Transition>
            </Disclosure>
        </div>
    );
};

export default CustomDisclosure;
