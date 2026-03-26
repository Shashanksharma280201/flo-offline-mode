import { AnimatedCounter } from "./AnimatedCounter";

interface DataCardProps {
    value?: number;
    label: string;
    units: string;
    isAnimated?: boolean;
    precision?: number;
}

/**
 * A number card to display stats either statically or with a count up animation
 */
export const DataCard = ({
    value,
    label,
    units,
    isAnimated,
    precision = 2
}: DataCardProps) => {
    return (
        <div className="flex w-full  flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-8">
            <div className="flex flex-col items-center">
                {!value && <span className="text-3xl text-slate-500">-</span>}
                {!!value &&
                    (isAnimated ? (
                        <AnimatedCounter
                            number={value}
                            className="text-3xl text-green-600"
                            precision={precision}
                        />
                    ) : (
                        <span className="text-3xl text-green-600">
                            {value.toFixed(precision)}
                        </span>
                    ))}

                {value ? (
                    <span className="text-sm text-slate-400">{units}</span>
                ) : (
                    <span className="invisible text-sm text-black">-</span>
                )}
            </div>
            <span className="text-center text-xl text-slate-100">{label}</span>
        </div>
    );
};
