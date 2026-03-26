import { cn } from "@/lib/utils";

export const Skeleton = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-backgroundGray",
                className
            )}
            {...props}
        />
    );
};

export const ChromeSkeleton = ({
    className,
    chromeClassName,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { chromeClassName?: string }) => {
    return (
        <div
            className={cn(
                "relative flex h-5 w-full items-center overflow-hidden rounded-md bg-backgroundGray",
                className
            )}
            {...props}
        >
            <div
                className={cn(
                    "animate-skeleton-chrome absolute z-10 h-full w-full -rotate-45 bg-[#555]/50  blur-sm ",
                    chromeClassName
                )}
            />
        </div>
    );
};
