import { ReactNode } from "react";

export const AttendanceItem = ({
    title,
    description,
    data
}: {
    title: string;
    description: ReactNode;
    data: ReactNode;
}) => {
    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1">
                <label className="text-base font-semibold text-neutral-200">
                    {title}
                </label>
                {description}
            </div>

            {data}
        </div>
    );
};
