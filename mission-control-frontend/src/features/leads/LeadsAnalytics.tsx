import Header from "@/components/header/Header";
import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { useNavigate } from "react-router-dom";
import { fetchWeeklyReportDataFn } from "./services/leadService";
import * as XLSX from "xlsx";
import dayjs, { Dayjs } from "dayjs";
import { useLeadsStore } from "@/stores/leadsStore";
import { LeadReportData } from "@/data/types";
import { ACVTCVLineChart, ACVFunnelChart } from "./components/LeadAnalyticsCharts";
import { errorLogger } from "@/util/errorLogger";
import { DateRangePicker } from "../analytics/components/DateRangePicker";
import { Disclosure, Transition } from "@headlessui/react";
import { MdExpandMore } from "react-icons/md";
import ComboBox from "@/components/comboBox/ComboBox";
import LeadsBreakupTable from "./components/LeadsBreakupTable";
import LeadsLevelProductMachinewise from "./components/LeadsLevelProductMachinewise";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLeadsAnalyticsNavigation } from "@/hooks/useLeadsAnalyticsNavigation";

const LeadsAnalytics = () => {
    const navigate = useNavigate();
    const leads = useLeadsStore((state) => state.leads);

    const [startDate, setStartDate] = useState<Dayjs | undefined>(dayjs());
    const [endDate, setEndDate] = useState<Dayjs | undefined>(dayjs());
    const [product, setProduct] = useState<string>();
    const [chartData, setChartData] = useState<LeadReportData>();

    const fetchAnalyticsDataMutation = useMutation({
        mutationFn: ({
            startDate,
            endDate,
            product
        }: {
            startDate: Date;
            endDate: Date;
            product?: string;
        }) => fetchWeeklyReportDataFn({ startDate, endDate, product }),
        onSuccess: setChartData,
        onError: errorLogger
    });

    useEffect(() => {
        const start = dayjs().startOf("month");
        const end = dayjs().endOf("month");
        setStartDate(start);
        setEndDate(end);
        fetchAnalyticsDataMutation.mutate({
            startDate: start.toDate(),
            endDate: end.toDate()
        });
    }, []);

    const downloadDataHandler = () => {
        const data = leads.reduce(
            (acc, lead) => {
                const { pocName, history } = lead;
                acc[pocName] = Object.keys(history).reduce(
                    (acc, date) => {
                        // @ts-ignore
                        const historyObj = history[date];
                        acc.push({
                            date,
                            stage: `L${historyObj.stage}`,
                            acv: historyObj.acv,
                            tcv: historyObj.tcv,
                            robotCount: historyObj.robotCount,
                            product: historyObj.product
                        });
                        return acc;
                    },
                    [] as {
                        date: string;
                        stage: string;
                        acv: number;
                        tcv: number;
                        robotCount: number;
                        product: string;
                    }[]
                );

                return acc;
            },
            {} as {
                [name: string]: {
                    date: string;
                    stage: string;
                    acv: number;
                    tcv: number;
                    robotCount: number;
                    product: string;
                }[];
            }
        );

        const workbook = XLSX.utils.book_new();
        Object.keys(data).forEach((name) => {
            const worksheet = XLSX.utils.json_to_sheet(data[name]);
            worksheet["!cols"] = [];
            Object.keys(data[name][0] || {}).forEach((key, idx) => {
                worksheet["!cols"]?.push({
                    wpx: 100
                });
            });
            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                name.length > 31 ? `${name.substring(0, 28)}...` : name
            );
        });
        XLSX.writeFile(workbook, "Dashboard-data.xlsx", { compression: true });
    };

    // const uploadHistoryHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = e.target.files?.[0];
    //     if (!file) return;

    //     const reader = new FileReader();
    //     reader.readAsArrayBuffer(file);

    //     reader.onload = (event) => {
    //         if (!event.target?.result) return;
    //         const data = new Uint8Array(event.target.result as ArrayBuffer);
    //         const workbook = XLSX.read(data, { type: "array" });

    //         const sheet = workbook.Sheets[workbook.SheetNames[0]];
    //         const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    //         if (rawData.length < 2) return; // Ensure there's enough data

    //         const leadHistory: {
    //             name: string;
    //             companyName: string;
    //             city: string;
    //             history: {
    //                 [date: string]: {
    //                     acv: number;
    //                     tcv: number;
    //                     stage: number;
    //                     robotCount: number;
    //                     product: string;
    //                 };
    //             };
    //         } = [];
    //         const leadData = rawData.slice(2);
    //         const dates = rawData[0].slice(3).filter((item) => !!item);
    //         const subHeaders: string[] = [
    //             "acv",
    //             "tcv",
    //             "robotCount",
    //             "stage",
    //             "product"
    //         ];

    //         for (let item of leadData) {
    //             if (item.length === 0) break;

    //             const [name, companyName, city] = item.slice(0, 3);
    //             let acc: any = {};

    //             // Loop through each date column set
    //             for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
    //                 const date = dates[dateIndex];
    //                 acc[date] = {};

    //                 // Extract the corresponding values for the current date section
    //                 const offset = 3 + dateIndex * subHeaders.length; // Correct offset calculation

    //                 for (let i = 0; i < subHeaders.length; i++) {
    //                     acc[date][subHeaders[i]] = item[offset + i]; // Assign correct values
    //                 }
    //             }

    //             leadHistory.push({
    //                 name,
    //                 companyName,
    //                 city,
    //                 history: acc
    //             });
    //         }
    //     };
    // };

    const submitHandler = () => {
        if (!startDate || !endDate) return;
        fetchAnalyticsDataMutation.mutate({
            startDate: startDate.toDate(),
            endDate: endDate.toDate(),
            product
        });
    };

    // Enable voice-triggered leads analytics navigation
    useLeadsAnalyticsNavigation({
        setProduct,
        setStartDate,
        setEndDate,
        submitHandler,
    });

    return (
        <>
            <Header title="Analytics" onBack={() => navigate(-1)}></Header>
            <Disclosure defaultOpen>
                <Disclosure.Button className="flex w-full items-center justify-between gap-2 border-b border-t border-border bg-gray-700/55 px-4 py-3 text-sm sm:gap-4 sm:px-6 md:gap-8 md:border-t-0 md:px-8 md:text-base">
                    <div className="flex-1 text-left">
                        {product ? `${product},` : ""}&nbsp;
                        <span className="block sm:inline">
                            {startDate?.format("MMM D, YYYY")} -{" "}
                            {endDate?.format("MMM D, YYYY")}
                        </span>
                    </div>
                    <MdExpandMore
                        className={`h-5 w-5 flex-shrink-0 text-white hover:opacity-75 ui-open:rotate-180 ui-open:transform`}
                    />
                </Disclosure.Button>
                <Transition
                    enter="ease-out duration-1000"
                    enterFrom="transform -translate-y-1 opacity-0"
                    enterTo="transform translate-y-0 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform opacity-100"
                    leaveTo="transform opacity-0"
                >
                    <Disclosure.Panel className="flex flex-col justify-between gap-4 border-b border-border bg-slate-800/75 px-4 py-6 sm:gap-6 sm:px-6 md:flex-row md:items-center md:gap-8 md:px-8 md:py-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                            <ComboBox
                                wrapperClassName="px-4 py-3 w-full sm:w-auto"
                                inputClassName="placeholder:text-sm placeholder:text-gray "
                                label=""
                                showLabel={false}
                                items={[
                                    "MMR rental",
                                    "MMR otb",
                                    "LM",
                                    "Autonomy",
                                    "Projects",
                                    "Others"
                                ]}
                                selectedItem={product}
                                setSelectedItem={setProduct}
                                getItemLabel={(product) => product}
                                placeholder="Select product"
                                compareItems={(productA, productB) =>
                                    productA === productB
                                }
                            />
                            <DateRangePicker
                                dateRange={{
                                    from: startDate?.toDate(),
                                    to: endDate?.toDate()
                                }}
                                setEndingTimestamp={setEndDate}
                                setStartingTimestamp={setStartDate}
                            />
                        </div>
                        <button
                            className="h-fit w-full rounded-md bg-primary600 px-4 py-2.5 text-sm font-medium text-black hover:scale-[0.99] sm:w-auto md:px-6 md:text-base"
                            onClick={submitHandler}
                        >
                            Submit
                        </button>
                    </Disclosure.Panel>
                </Transition>
            </Disclosure>
            <div className="mx-auto flex w-full flex-col items-center justify-center bg-blue-900/25 p-4 sm:p-6 md:p-8">
                <div className="flex w-full flex-col gap-4 sm:gap-6 md:w-11/12 lg:w-5/6 xl:w-3/4">
                    {chartData && Object.keys(chartData).length ? (
                        <>
                            <ACVTCVLineChart chartData={chartData} />
                            <ACVFunnelChart chartData={chartData} />
                            <LeadsBreakupTable chartData={chartData} />
                            <LeadsLevelProductMachinewise chartData={chartData} />
                        </>
                    ) : fetchAnalyticsDataMutation.isLoading ? (
                        <div className="flex min-h-[40vh] items-center justify-center">
                            <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background sm:h-10 sm:w-10" />
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
};

const LoadingSkeleton = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            {...props}
            className={cn(
                "animate-pulse rounded-md bg-backgroundGray/50",
                className
            )}
        />
    );
};

export default LeadsAnalytics;
