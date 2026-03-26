import ComboBox from "@/components/comboBox/ComboBox";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useUserStore } from "@/stores/userStore";
import { LeadPayload } from "@/data/types";
import { LeadsDatePicker } from "./LeadsDatePicker";
import { useLeadsStore } from "@/stores/leadsStore";
import { indianNumberFormat, removeCommas } from "@/util/numberConverter";

export const AddOrEditLeadForm = ({
    onSubmit,
    onCancel
}: {
    onSubmit: (data: Partial<LeadPayload>) => void;
    onCancel: () => void;
}) => {
    const { register, handleSubmit, setValue, watch } = useForm();
    const leadToEdit = useLeadsStore((state) => state.selectedLead);

    const acvValue = watch("acv");
    const tcvValue = watch("tcv");

    const user = useUserStore((state) => state.user);
    const [dateAdded, setDateAdded] = useState<Date | undefined>(new Date());
    const [stage, setStage] = useState<string>();
    const [source, setSource] = useState<string>();
    const [category, setCategory] = useState<string>();
    const [type, setType] = useState<string>();
    const [product, setProduct] = useState<string>();
    const [pipelineStage, setPipelineStage] = useState<string>();
    const [billingStatus, setBillingStatus] = useState<string>();

    const submitHandler = (data: Partial<LeadPayload>) => {
        onSubmit({
            ...data,
            stage: stage ? +stage[stage.length - 1] : undefined,
            ...(acvValue && { acv: +removeCommas(acvValue) }),
            ...(tcvValue && { tcv: +removeCommas(tcvValue) }),
            ...(source && { source }),
            ...(category && { category }),
            ...(type && { type }),
            ...(product && { product }),
            ...(pipelineStage && { pipelineStage }),
            ...(billingStatus && { billingStatus }),
            dateAdded,
            addedBy: user?.id
        });
    };

    useEffect(() => {
        // If lead exists, we are in edit mode
        if (leadToEdit) {
            setValue("pocName", leadToEdit.pocName);
            setValue("companyName", leadToEdit.companyName);
            setValue("city", leadToEdit.city);
            setValue("phoneNumber", leadToEdit.phoneNumber);
            setValue("linkedinTag", leadToEdit.linkedinTag);
            setValue("email", leadToEdit.email);
            setValue("designation", leadToEdit.designation);
            setValue("contact", leadToEdit.contact);
            setValue("product", leadToEdit.product);
            setValue("source", leadToEdit.source);
            setValue("sourceDetails", leadToEdit.sourceDetails);
            setValue("category", leadToEdit.category);
            setValue("type", leadToEdit.type);
            setValue(
                "acv",
                leadToEdit.acv ? indianNumberFormat(+leadToEdit.acv) : ""
            );
            setValue(
                "tcv",
                leadToEdit.tcv ? indianNumberFormat(+leadToEdit.tcv) : ""
            );
            setValue("robotCount", leadToEdit.robotCount);
            setValue("plan", leadToEdit.closePlan?.description || "");
            setValue("pipelineStage", leadToEdit.pipelineStage);
            setStage(
                leadToEdit.stage !== undefined
                    ? `Stage ${leadToEdit.stage}`
                    : undefined
            );
            setBillingStatus(leadToEdit.billingStatus);
            setDateAdded(leadToEdit.dateAdded);
            setSource(leadToEdit.source);
            setCategory(leadToEdit.category);
            setType(leadToEdit.type);
            setProduct(leadToEdit.product);
            setPipelineStage(leadToEdit.pipelineStage);
        }
    }, [
        leadToEdit?.pocName,
        leadToEdit?.companyName,
        leadToEdit?.city,
        leadToEdit?.sourceDetails,
        leadToEdit?.linkedinTag,
        leadToEdit?.product,
        leadToEdit?.source,
        leadToEdit?.category,
        leadToEdit?.type,
        leadToEdit?.acv,
        leadToEdit?.tcv,
        leadToEdit?.contact,
        leadToEdit?.phoneNumber,
        leadToEdit?.email,
        leadToEdit?.designation,
        leadToEdit?.robotCount,
        leadToEdit?.closePlan,
        leadToEdit?.pipelineStage,
        leadToEdit?.stage,
        leadToEdit?.dateAdded,
        leadToEdit?.billingStatus,
        setValue
    ]);

    return (
        <form
            onSubmit={handleSubmit(submitHandler)}
            className="mx-auto flex w-full flex-col gap-6 bg-blue-900/25 py-4 sm:p-8"
        >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                    <label>
                        POC Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        required
                        {...register("pocName")}
                        placeholder="Enter POC Name"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>
                        City <span className="text-red-500">*</span>
                    </label>
                    <input
                        required
                        {...register("city")}
                        placeholder="Enter city"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>
                        Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        required
                        {...register("companyName")}
                        placeholder="Enter company name"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Company LinkedIn Tag</label>
                    <input
                        {...register("linkedinTag")}
                        placeholder="Enter LinkedIn Tag"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Contact info</label>
                    <input
                        {...register("contact")}
                        placeholder="Enter email or phone number"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Phone number</label>
                    <input
                        {...register("phoneNumber")}
                        placeholder="Enter phone number"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Email</label>
                    <input
                        {...register("email")}
                        placeholder="Enter email"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Designation</label>
                    <input
                        {...register("designation")}
                        placeholder="Enter designation"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col  gap-2">
                    <label>Source</label>
                    <ComboBox
                        wrapperClassName="px-4 py-2 h-fit bg-gray-800"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
                        label=""
                        showLabel={false}
                        items={[
                            "Inbound",
                            "LinkedIn",
                            "FB Marketplace",
                            "Reference",
                            "Cold Email",
                            "Other"
                        ]}
                        selectedItem={source}
                        setSelectedItem={setSource}
                        getItemLabel={(source) => source}
                        placeholder="Select source"
                        compareItems={(sourceA, sourceB) => sourceA === sourceB}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Source details</label>
                    <input
                        {...register("sourceDetails")}
                        placeholder="Enter the source details"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Type</label>
                    <ComboBox
                        wrapperClassName="px-4 py-2 h-fit bg-gray-800"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
                        label=""
                        showLabel={false}
                        items={[
                            "Builder+Contractor",
                            "FM",
                            "Builder",
                            "Contractor",
                            "Pre-Cast",
                            "Other"
                        ]}
                        selectedItem={type}
                        setSelectedItem={setType}
                        getItemLabel={(type) => type}
                        placeholder="Select Type"
                        compareItems={(typeA, typeB) =>
                            typeA === typeB
                        }
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Category</label>
                    <ComboBox
                        wrapperClassName="px-4 py-2 h-fit bg-gray-800"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
                        label=""
                        showLabel={false}
                        items={[
                            "Strategic",
                            "Large",
                            "Medium",
                            "Long Tail"
                        ]}
                        selectedItem={category}
                        setSelectedItem={setCategory}
                        getItemLabel={(category) => category}
                        placeholder="Select category"
                        compareItems={(categoryA, categoryB) =>
                            categoryA === categoryB
                        }
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Product</label>
                    <ComboBox
                        wrapperClassName="px-4 py-2 h-fit bg-gray-800"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
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
                </div>
                <div className="flex flex-col gap-2">
                    <label>Pipeline Stage</label>
                    <ComboBox
                        wrapperClassName="px-4 py-2 h-fit bg-gray-800"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
                        label=""
                        showLabel={false}
                        items={[
                            "Stage -1",
                            "Stage 0",
                            "Stage 1",
                            "Stage 2",
                            "Stage 3",
                            "Stage 4",
                            "Stage 5"
                        ]}
                        selectedItem={stage}
                        setSelectedItem={setStage}
                        getItemLabel={(stage) => stage}
                        placeholder="Select pipeline stage"
                        compareItems={(stageA, stageB) => stageA === stageB}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Stage</label>
                    <ComboBox
                        wrapperClassName="px-4 py-2 h-fit bg-gray-800"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
                        label=""
                        showLabel={false}
                        items={[
                            "Contacted",
                            "Not Contacted",
                            "Deferred",
                            "Closed",
                            "Not Responding",
                            "On going discussion (call)",
                            "Meeting done",
                            "Post meeting discussion",
                            "Closing pending",
                            "Not interested",
                            "Industry connects"
                        ]}
                        selectedItem={pipelineStage}
                        setSelectedItem={setPipelineStage}
                        getItemLabel={(pipelineStage) => pipelineStage}
                        placeholder="Select the stage"
                        compareItems={(pipelineStageA, pipelineStageB) =>
                            pipelineStageA === pipelineStageB
                        }
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Billing status</label>
                    <ComboBox
                        wrapperClassName="px-4 py-2 h-fit bg-gray-800"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
                        label=""
                        showLabel={false}
                        items={[
                            "Billing",
                            "Not Billing",
                            "Work order pending",
                            "Free POC"
                        ]}
                        selectedItem={billingStatus}
                        setSelectedItem={setBillingStatus}
                        getItemLabel={(billingStatus) => billingStatus}
                        placeholder="Select the billing status"
                        compareItems={(billingStatusA, billingStatusB) =>
                            billingStatusA === billingStatusB
                        }
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Robot count</label>
                    <input
                        type="number"
                        {...register("robotCount")}
                        placeholder="Enter the number of robots"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>ACV</label>
                    <input
                        {...register("acv")}
                        onBlur={(e) => {
                            setValue(
                                "acv",
                                e.target.value
                                    ? indianNumberFormat(e.target.value)
                                    : ""
                            );
                        }}
                        onFocus={(e) =>
                            setValue("acv", removeCommas(e.target.value))
                        }
                        placeholder="Enter the ACV"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>TCV</label>
                    <input
                        {...register("tcv")}
                        onBlur={(e) => {
                            setValue(
                                "tcv",
                                e.target.value
                                    ? indianNumberFormat(e.target.value)
                                    : ""
                            );
                        }}
                        onFocus={(e) =>
                            setValue("tcv", removeCommas(e.target.value))
                        }
                        placeholder="Enter the TCV"
                        className="rounded-md border border-border bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Date added</label>
                    <LeadsDatePicker
                        className="bg-gray-800"
                        variant="input"
                        selectedDate={dateAdded}
                        onDateSelect={setDateAdded}
                    />
                </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row   sm:self-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-border px-6 py-2 text-white hover:bg-backgroundGray/90"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="rounded-md border border-border bg-green-500/90 px-6 py-2 text-black hover:bg-green-500/50"
                >
                    Submit
                </button>
            </div>
        </form>
    );
};
