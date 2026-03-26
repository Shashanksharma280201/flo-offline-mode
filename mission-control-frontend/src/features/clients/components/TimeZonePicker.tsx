import { Combobox } from "@headlessui/react";
import { useState } from "react";
import { MdCheck, MdSearch } from "react-icons/md";

const TIME_ZONES = ["Asia/Kolkata"];

export const TimeZonePicker = ({
    disabled,
    selectedTimezone,
    setSelectedTimezone
}: {
    disabled?: boolean;
    selectedTimezone: string;
    setSelectedTimezone: (selectedTimezone: string) => void;
}) => {
    const [query, setQuery] = useState("");

    const filteredTimezones =
        query === ""
            ? TIME_ZONES
            : TIME_ZONES.filter((timezone) => {
                  return timezone.toLowerCase().includes(query.toLowerCase());
              });

    return (
        <Combobox
            disabled={disabled}
            value={selectedTimezone}
            onChange={setSelectedTimezone}
        >
            <div className="relative h-full w-full ">
                <div className="relative flex h-full w-full items-center ">
                    <Combobox.Input
                        className="h-full w-full bg-transparent p-3 pr-12"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    {!disabled && (
                        <Combobox.Button className="absolute right-3">
                            <MdSearch className="h-6 w-6 cursor-pointer text-neutral-400" />
                        </Combobox.Button>
                    )}
                </div>
                <Combobox.Options
                    className={`no-scrollbar absolute bottom-[110%] max-h-60 w-full min-w-56 overflow-y-scroll rounded-md ${filteredTimezones.length ? "border border-border" : ""} bg-[#131313]`}
                >
                    {filteredTimezones.map((timezone) => (
                        <Combobox.Option
                            className="relative flex cursor-pointer items-center py-2 pl-10 pr-4 text-white hover:bg-neutral-200 hover:text-black"
                            key={timezone}
                            value={timezone}
                        >
                            {timezone === selectedTimezone && (
                                <MdCheck className="absolute left-3 size-4 text-primary600" />
                            )}
                            <span>{timezone}</span>
                        </Combobox.Option>
                    ))}
                </Combobox.Options>
            </div>
        </Combobox>
    );
};
