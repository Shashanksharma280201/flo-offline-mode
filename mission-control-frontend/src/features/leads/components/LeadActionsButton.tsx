import * as XLSX from "xlsx";
import { LuArrowUpDown } from "react-icons/lu";
import { toast } from "react-toastify";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/DropdownMenu";
import dayjs from "dayjs";
import { useMutation } from "react-query";
import { downloadLeadsFn, uploadLeadsFn } from "../services/leadService";
import { FormattedLeadPayload, Lead } from "@/data/types";
import { errorLogger } from "@/util/errorLogger";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";

type LeadFromSheetFormat = {
    "Stage (0-5)": string | number;
    "POC Name": string;
    "Company Name": string;
    Contact: string;
    Email: string;
    "Phone Number": string;
    Designation: string;
    "Billing Status": string;
    City: string;
    Product: string;
    Source: string;
    "Source Details": string;
    Category: string;
    Stage: string;
    "Date Added": string;
    Response: string;
    "Added by": string;
    "Next steps": string;
    "Next step Date": string;
    ACV: string;
    TCV: string;
    "Target Date": string;
    "Target Date change reason": string;
    "Robot Count": string | number;
    "Close Plan": string;
};

const formatCsvForUploading = (leads: LeadFromSheetFormat[]) => {
    const getNextSteps = (lead: LeadFromSheetFormat) => {
        if (!lead["Next steps"] || lead["Next steps"]?.trim().length === 0)
            return [];

        return [
            {
                date: new Date(),
                description: lead["Next steps"]?.trim() || ""
            }
        ];
        // const nextSteps = lead["Next steps"]?.trim().split("\n");
        // const nextStepsDates = lead["Next step Date"]?.trim().split("\n");
        // if (nextSteps.length === 1 && nextSteps[0] === "") return [];
        // return nextSteps.map((step, index) => ({
        //     date: getDate(nextStepsDates[index]) ?? new Date(),
        //     description: step
        // }));
    };
    const getTargetChanges = (lead: LeadFromSheetFormat) => {
        const targetDate = lead["Target Date"]?.trim().split("\n");
        const targetDateChangeReason = lead["Target Date change reason"]
            ?.trim()
            .split("\n");
        if (targetDate.length === 1 && targetDate[0] === "") return [];
        return targetDate.map((date, index) => ({
            date: getDate(date) ?? new Date(),
            changeReason: targetDateChangeReason[index]
        }));
    };
    const getResponses = (lead: LeadFromSheetFormat) => {
        if (lead.Response) {
            return [{ date: new Date(), description: lead.Response }];
        }
        return [];
        // const responses = lead["Response"].split("\n");
        // if (responses.length === 1 && responses[0] === "") return [];
        // return responses.map((response) => ({
        //     date: getDate(response.split(" - ")[0]) ?? new Date(),
        //     description: response.split(" - ")[1]
        // }));
    };
    const getDate = (dateStr: string) => {
        if (!dateStr) return undefined;
        let [day, month, year] = dateStr.split("/");
        if (!day || !month || !year) return undefined;
        if (year.length === 2) year = `20${year}`;
        return new Date(`${year}/${month}/${day}`);
    };
    const results: FormattedLeadPayload[] = leads.map((lead) => {
        return {
            ...(lead["Stage (0-5)"] !== "" && {
                stage: +lead["Stage (0-5)"]
            }),
            pocName: lead["POC Name"]?.trim(),
            companyName: lead["Company Name"]?.trim(),
            city: lead["City"]?.trim(),
            contact: lead["Contact"]?.trim(),
            product: lead["Product"]?.trim(),
            source: lead["Source"]?.trim(),
            sourceDetails: lead["Source Details"]?.trim(),
            category: lead["Category"]?.trim(),
            pipelineStage: lead["Stage"]?.trim(),
            dateAdded: getDate(lead["Date Added"]) ?? new Date(),
            responses: getResponses(lead),
            nextSteps: getNextSteps(lead),
            ...(lead["ACV"] !== "" && {
                acv: +lead["ACV"]?.trim().replaceAll(",", "")
            }),
            ...(lead["TCV"] !== "" && {
                tcv: +lead["TCV"]?.trim().replaceAll(",", "")
            }),
            targetChanges: getTargetChanges(lead),
            ...(lead["Robot Count"] !== "" && {
                robotCount: +lead["Robot Count"]
            }),
            closePlan: {
                description: lead["Close Plan"]?.trim() || ""
            },
            addedBy: lead["Added by"]?.trim()
        };
    });
    return results;
};

export const LeadsActionButton = () => {
    const navigate = useNavigate();
    const { fetchLeads } = useLeads();

    const downloadLeadsHandler = (leads: Lead[]) => {
        if (leads.length === 0) {
            toast.info("No leads to download");
            return;
        }
        const dataToDownload: LeadFromSheetFormat[] = leads.map((lead) => {
            return {
                "Stage (0-5)": lead.stage ?? "",
                "POC Name": lead.pocName,
                "Company Name": lead.companyName,
                Contact: lead.contact ?? "",
                "Phone Number": lead.phoneNumber ?? "",
                Email: lead.email ?? "",
                Designation: lead.designation ?? "",
                "Billing Status": lead.billingStatus ?? "",
                City: lead.city ?? "",
                Product: lead.product ?? "",
                Source: lead.source ?? "",
                "Source Details": lead.sourceDetails ?? "",
                Category: lead.category ?? "",
                Stage: lead.pipelineStage ?? "",
                "Date Added": lead.dateAdded
                    ? dayjs(lead.dateAdded).format("D/MM/YYYY")
                    : "",
                "Added by": lead.addedBy?.name ?? "",
                Response: lead.responses
                    .map(
                        (response) =>
                            `${dayjs(response.date).format("D/MM/YYYY")} - ${response.description}`
                    )
                    .join("\n"),
                "Next steps": lead.nextSteps
                    .map((nextStep) => nextStep.description)
                    .join("\n"),
                "Next step Date": lead.nextSteps
                    .map((nextStep) => dayjs(nextStep.date).format("D/MM/YYYY"))
                    .join("\n"),
                ACV: lead.acv?.toString() ?? "",
                TCV: lead.tcv?.toString() ?? "",
                "Target Date": lead.targetChanges
                    .map((change) => dayjs(change.date).format("D/MM/YYYY"))
                    .join("\n"),
                "Target Date change reason": lead.targetChanges
                    .map((change) => change.changeReason)
                    .join("\n"),
                "Robot Count": lead.robotCount ?? "",
                "Close Plan": lead.closePlan?.description ?? ""
            };
        });
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(dataToDownload);
        worksheet["!cols"] = [];
        Object.keys(dataToDownload).forEach(() => {
            worksheet["!cols"]?.push({
                wpx: 65
            });
        });

        XLSX.utils.book_append_sheet(workbook, worksheet, "leads");

        XLSX.writeFile(workbook, `Projects/Leads.xlsx`);
    };

    const downloadLeadsMutation = useMutation({
        mutationFn: () => downloadLeadsFn(),
        onSuccess: (data) => {
            downloadLeadsHandler(data);
        },
        onError: (error) => errorLogger(error)
    });

    const uploadLeads = useMutation({
        mutationFn: (data: FormattedLeadPayload[]) => uploadLeadsFn(data),
        onSuccess: () => {
            toast.success("Leads uploaded successfully");
            fetchLeads();
        },
        onError: (error) => errorLogger(error)
    });

    const uploadLeadsHandler = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (!target?.files?.[0]) return;
            const file = target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target?.result;
                if (!data) return;
                // Read the CSV file content using XLSX
                const workbook = XLSX.read(data, { type: "binary" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                // Convert sheet to JSON
                const dataFromCsv = XLSX.utils.sheet_to_json(worksheet, {
                    defval: "",
                    raw: false
                }) as LeadFromSheetFormat[];

                const formattedData = formatCsvForUploading(dataFromCsv);

                uploadLeads.mutate(formattedData);
            };
            reader.readAsArrayBuffer(file);
        };
        input.click();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex items-center justify-center gap-3 rounded-md border px-4 py-2 bg-green-500 hover:bg-green-600 border-none transition-colors delay-75 md:m-0">
                    <span>Actions</span>
                    <LuArrowUpDown className="h-4 w-4" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="border-backgroundGray bg-backgroundGray"
            >
                <DropdownMenuItem
                    onClick={() => downloadLeadsMutation.mutate()}
                    className="cursor-pointer rounded-md text-white focus:bg-neutral-100 focus:text-black"
                >
                    Download leads
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => navigate("/leads/analytics")}
                    className="cursor-pointer rounded-md text-white focus:bg-neutral-100 focus:text-black"
                >
                    Show analytics
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={uploadLeadsHandler}>
                    Upload leads
                </DropdownMenuItem> */}
                {/* <GenerateReportMenuItem /> */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
