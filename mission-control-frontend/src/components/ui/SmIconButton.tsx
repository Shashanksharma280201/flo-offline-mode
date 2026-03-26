import { cn } from "@/lib/utils";
import LoadingSpinner from "./LoadingSpinner";

type SmIconButtonProps = {
    name: string;
    children?: React.ReactNode;
    onClick: React.MouseEventHandler;
    className?: string;
    isLoading?: boolean;
};

const SmIconButton = ({
    name,
    children,
    onClick,
    className = "bg-primary700",
    isLoading
}: SmIconButtonProps) => {
    return (
        <>
            <div
                onClick={onClick}
                className={cn([
                    `text-md flex min-w-[6rem] cursor-pointer items-center justify-around gap-3 rounded-md  p-3 font-semibold  hover:scale-[98%] 
                `,
                    className
                ])}
            >
                <button className="text-center text-xs">{name}</button>
                {isLoading ? (
                    <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                ) : (
                    children
                )}
            </div>
        </>
    );
};

export default SmIconButton;
