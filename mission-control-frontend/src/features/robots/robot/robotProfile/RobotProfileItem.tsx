import { cn } from "@/lib/utils";
import React from "react";

type RobotProfileItemProps = {
    title: string;
    desc: string;
    children: React.ReactNode;
    childClassname?: string;
};

const RobotProfileItem = ({
    title,
    desc,
    children,
    childClassname
}: RobotProfileItemProps) => {
    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1">
                <label className="text-base font-semibold">{title}</label>
                <p className="text-secondary">{desc}</p>
            </div>
            <div className="flex flex-col gap-4 md:flex-row">
                {React.Children.map(children, (child, index) => (
                    <div
                        key={index}
                        className={cn(
                            "w-full rounded-md border-[2.7px] border-border bg-slate-600/30 focus:outline-none",
                            childClassname
                        )}
                    >
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};
export default RobotProfileItem;
