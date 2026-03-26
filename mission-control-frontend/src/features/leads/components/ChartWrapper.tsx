export const ChartWrapper = ({
    title,
    description,
    isEmpty,
    children
}: {
    title: string;
    description: string;
    isEmpty: boolean;
    children: React.ReactNode;
}) => {
    return (
        <div className="flex flex-col items-center gap-4 rounded-md border border-backgroundGray bg-gray-800/75 p-2">
            <div className="flex flex-col gap-1 self-start p-2">
                <span className="text-2xl">{title}</span>
                <span className="text-base text-neutral-400">
                    {description}
                </span>
            </div>
            {isEmpty && (
                <div className="flex h-[400px] w-full items-center justify-center rounded-md bg-backgroundGray/30">
                    No data
                </div>
            )}
            {!isEmpty && children}
        </div>
    );
};
