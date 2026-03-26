import Popup from "@/components/popup/Popup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { LeadsDatePicker } from "./LeadsDatePicker";

type Props = {
    isOpen: boolean;
    onSubmit: (data: any) => void;
    onClose: () => void;
};

export const AddOrEditResponsePopup = ({
    isOpen,
    onSubmit,
    onClose
}: Props) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        new Date()
    );

    const { handleSubmit, register } = useForm();

    const closeHandler = () => {
        onClose();
    };

    const submitHandler = (data: any) => {
        const { description } = data as { description: string };
        onSubmit({ description, date: selectedDate });
    };

    return (
        <Popup
            title="Add Response"
            description=""
            dialogToggle={isOpen}
            onClose={closeHandler}
            panelClassName="absolute rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[30vw]"
        >
            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(submitHandler)}
            >
                <div className="flex flex-col gap-2">
                    <label htmlFor="description">Description</label>
                    <input
                        id="description"
                        {...register("description")}
                        className="rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                        placeholder="Enter the response"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Date</label>
                    <LeadsDatePicker
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                </div>
                <div className="mt-2 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-border px-6 py-2 text-white hover:bg-backgroundGray/30"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-md border border-border bg-white px-6 py-2 text-black hover:bg-white/80"
                    >
                        Submit
                    </button>
                </div>
            </form>
        </Popup>
    );
};
