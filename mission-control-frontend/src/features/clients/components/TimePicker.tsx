import { MILITARY_TIME } from "@/util/timeFormatter";
import { Combobox, Listbox } from "@headlessui/react";
import { useState } from "react";
import { MdCheck, MdSearch } from "react-icons/md";

export const TimePicker = ({
    disabled,
    selectedTime,
    setSelectedTime
}: {
    disabled?: boolean;
    selectedTime: string;
    setSelectedTime: (selectedTime: string) => void;
}) => {
    const [query, setQuery] = useState("");
    const filteredTime =
        query === ""
            ? MILITARY_TIME
            : MILITARY_TIME.filter((time) => {
                  return time.toLowerCase().startsWith(query.toLowerCase());
              });

    return (
        <Combobox
            disabled={disabled}
            value={selectedTime}
            onChange={setSelectedTime}
        >
            <div className="relative h-full w-full">
                <div className="relative flex h-full w-full items-center">
                    <Combobox.Input
                        className="h-full w-full bg-transparent p-3 pr-12"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    {!disabled && (
                        <Combobox.Button className="absolute right-3">
                            <MdSearch className="h-6 w-6 text-neutral-400" />
                        </Combobox.Button>
                    )}
                </div>
                <Combobox.Options
                    className={`no-scrollbar absolute bottom-[110%] max-h-60 w-full min-w-56 overflow-y-scroll rounded-md ${filteredTime.length ? "border border-border" : ""} bg-[#131313]`}
                >
                    {filteredTime.map((time) => (
                        <Combobox.Option
                            className="relative flex cursor-pointer items-center py-2 pl-10 pr-4 text-white hover:bg-neutral-200 hover:text-black"
                            key={time}
                            value={time}
                        >
                            {time === selectedTime && (
                                <MdCheck className="\ absolute left-3 size-4 text-primary600" />
                            )}
                            <span>{time}</span>
                        </Combobox.Option>
                    ))}
                </Combobox.Options>
            </div>
        </Combobox>
    );
};
