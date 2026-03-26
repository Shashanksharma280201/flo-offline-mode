interface LegendItem {
    label: string;
    color: string;
}

interface ChartPanelProps {
    title: string;
    description: string;
    chart: React.ReactNode;
    dataLength: number;
    legendItems?: LegendItem[];
}

export const ChartPanel = ({
    title,
    description,
    chart,
    dataLength,
    legendItems = []
}: ChartPanelProps) => {
    return (
        <div className="flex h-auto min-h-fit w-full flex-col gap-6 rounded-3xl border border-border bg-slate-800 p-6 shadow-xl">
            <div className="flex flex-col gap-1">
                <span className="text-2xl font-semibold text-white">
                    {title}
                </span>
                <span className="text-base text-neutral-400">
                    {description}
                </span>
            </div>

            {dataLength > 0 ? (
                <div className="flex w-full flex-col gap-4">
                    <div className="h-[400px] w-full">{chart}</div>
                </div>
            ) : (
                <div className="flex min-h-[50vh] w-full items-center justify-center rounded-md border border-border bg-gray-700">
                    No data found
                </div>
            )}
        </div>
    );
};
