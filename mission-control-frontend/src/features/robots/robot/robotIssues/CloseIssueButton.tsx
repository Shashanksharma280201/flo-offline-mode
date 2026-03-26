import Popup from "@/components/popup/Popup";
import { DateTimePicker } from "@/components/timepicker/DateTimePicker";
import SmIconButton from "@/components/ui/SmIconButton";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

type IssueFormData = {
    date: Date;
    issueSolution: string;
};

const CloseIssueButton = ({
    onSubmit
}: {
    onSubmit: (data: IssueFormData) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <SmIconButton
                name={"Close Issue"}
                className="active::bg-red-500 whitespace-nowrap border border-border bg-transparent text-white placeholder:font-semibold hover:bg-red-500"
                onClick={() => setIsOpen(true)}
            />
            <CloseIssuePopup
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                onSubmit={onSubmit}
            />
        </>
    );
};

const CloseIssuePopup = ({
    isOpen,
    setIsOpen,
    onSubmit
}: {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onSubmit: (data: IssueFormData) => void;
}) => {
    const { handleSubmit, register } = useForm();
    const [date, setDate] = useState<Date | undefined>(new Date());

    const submitHandler = (data: any) => {
        const { issueSolution } = data as { issueSolution?: string };
        if (!issueSolution) {
            toast.error("Please enter a solution");
            return;
        }
        if (!date) {
            toast.error("Please select a date");
            return;
        }
        onSubmit({ date, issueSolution });
    };

    return (
        <Popup
            title="Close issue"
            description={null}
            dialogToggle={isOpen}
            onClose={() => setIsOpen(false)}
            panelClassName="absolute rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[30vw]"
        >
            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(submitHandler)}
            >
                <div className="flex flex-col gap-2">
                    <p className="text-neutral-400">
                        When was the issue resolved?
                    </p>
                    <DateTimePicker date={date} setDate={setDate} />
                </div>
                <div className="flex flex-col gap-2">
                    <p className="text-neutral-400">
                        How was the issue resolved?
                    </p>
                    <textarea
                        required
                        {...register("issueSolution")}
                        placeholder="Issue solution"
                        className="w-full rounded-md border border-border bg-transparent px-4 py-2 text-white outline-none"
                    />
                </div>

                <div className="mt-2 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
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

export default CloseIssueButton;
