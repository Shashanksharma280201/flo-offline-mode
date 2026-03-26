import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { ManufacturingData } from "../../services/robotsService";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/Select";
import Calendar from "@/components/ui/Calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { CalendarIcon, Package, Truck } from "lucide-react";
import dayjs from "dayjs";

type ManufacturingDataFormProps = {
    initialData?: ManufacturingData;
    onSubmit: (data: ManufacturingData) => void;
    isLoading: boolean;
    onCancel?: () => void;
};

const ManufacturingDataForm = ({
    initialData,
    onSubmit,
    isLoading,
    onCancel
}: ManufacturingDataFormProps) => {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors, isDirty }
    } = useForm<ManufacturingData>({
        defaultValues: initialData || {}
    });

    const manufacturingPartner = watch("manufacturingPartner");
    const dataCollection = watch("dataCollection");
    const [showOtherPartner, setShowOtherPartner] = useState(
        manufacturingPartner === "Others"
    );
    const [shipDateOpen, setShipDateOpen] = useState(false);
    const [mfgDateOpen, setMfgDateOpen] = useState(false);

    useEffect(() => {
        setShowOtherPartner(manufacturingPartner === "Others");
        if (manufacturingPartner !== "Others") {
            setValue("manufacturingPartnerOther", "");
        }
    }, [manufacturingPartner, setValue]);

    const onSubmitForm = (data: ManufacturingData) => {
        // Clean up the data
        const cleanedData = { ...data };
        if (cleanedData.manufacturingPartner !== "Others") {
            delete cleanedData.manufacturingPartnerOther;
        }
        onSubmit(cleanedData);
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmitForm)}
            className="space-y-6 rounded-md border border-border bg-gray-700/45 p-6"
        >
            {/* Header Section */}
            <div className="border-b border-border pb-2">
                <h2 className="text-sm font-medium text-white/50">Manufacturing Information</h2>
            </div>

            {/* Manufacturing Partner & Dates Section */}
            <div className="grid grid-cols-1 gap-6 rounded-md border border-border bg-gray-800/50 p-5 md:grid-cols-2">
                {/* Manufacturing Partner */}
                <div className="md:col-span-2">
                    <label className="mb-2 block text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Manufacturing Partner
                    </label>
                    <Select
                        value={manufacturingPartner}
                        onValueChange={(value) =>
                            setValue("manufacturingPartner", value as ManufacturingData["manufacturingPartner"], {
                                shouldDirty: true
                            })
                        }
                    >
                        <SelectTrigger className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder:text-white/20 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select Manufacturing Partner" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#0a0a0a] text-white">
                            <SelectItem value="GKX Engineering">GKX Engineering</SelectItem>
                            <SelectItem value="Abhirup Technologies">Abhirup Technologies</SelectItem>
                            <SelectItem value="Flo Mobility">Flo Mobility</SelectItem>
                            <SelectItem value="Others">Others (Specify)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Other Partner Text Field */}
                {showOtherPartner && (
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-[10px] uppercase font-bold tracking-widest text-white/40">
                            Specify Partner Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                            type="text"
                            {...register("manufacturingPartnerOther", {
                                required: showOtherPartner
                                    ? "Please specify the manufacturing partner"
                                    : false
                            })}
                            className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder:text-white/20 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Enter partner name"
                        />
                        {errors.manufacturingPartnerOther && (
                            <p className="mt-1.5 text-sm text-red-400">
                                {errors.manufacturingPartnerOther.message}
                            </p>
                        )}
                    </div>
                )}

                {/* Manufactured Date */}
                <div>
                    <label className="mb-2 block text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Manufactured Date
                    </label>
                    <Controller
                        name="manufacturingDate"
                        control={control}
                        render={({ field }) => (
                            <Popover open={mfgDateOpen} onOpenChange={setMfgDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full justify-start gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-2.5 text-left font-normal text-white hover:bg-white/5 hover:text-white ${
                                            !field.value && "text-white/40"
                                        }`}
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                        {field.value
                                            ? dayjs(field.value).format("MMM DD, YYYY")
                                            : "Select manufactured date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto border-gray-700 bg-slate-900 p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            field.value
                                                ? new Date(field.value)
                                                : undefined
                                        }
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setMfgDateOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    />
                </div>

                {/* Shipping Date */}
                <div>
                    <label className="mb-2 block text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Shipping Date
                    </label>
                    <Controller
                        name="shippingDate"
                        control={control}
                        render={({ field }) => (
                            <Popover open={shipDateOpen} onOpenChange={setShipDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full justify-start gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-2.5 text-left font-normal text-white hover:bg-white/5 hover:text-white ${
                                            !field.value && "text-white/40"
                                        }`}
                                    >
                                        <Truck className="h-4 w-4" />
                                        {field.value
                                            ? dayjs(field.value).format("MMM DD, YYYY")
                                            : "Select shipping date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto border-gray-700 bg-slate-900 p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            field.value
                                                ? new Date(field.value)
                                                : undefined
                                        }
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setShipDateOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    />
                </div>

                {/* Data Collection Toggle */}
                <div className="md:col-span-2">
                    <Label className="hover:bg-accent/50 group flex cursor-pointer items-start gap-4 rounded-lg border border-white/10 bg-black/20 p-4 transition-all has-[[aria-checked=true]]:border-green-500/50 has-[[aria-checked=true]]:bg-green-500/10 has-[[aria-checked=false]]:border-white/10">
                        <Checkbox
                            id="data-collection-toggle"
                            checked={dataCollection}
                            onCheckedChange={(checked) =>
                                setValue("dataCollection", checked === true, {
                                    shouldDirty: true
                                })
                            }
                            className="mt-0.5 h-5 w-5 rounded border-white/10 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white"
                        />
                        <div className="grid flex-1 gap-1.5">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-400" />
                                <p className="text-sm font-semibold leading-none text-white">
                                    Data Collection {dataCollection ? "Enabled" : "Disabled"}
                                </p>
                            </div>
                            <p className="text-xs text-gray-400">
                                {dataCollection
                                    ? "✓ This robot is collecting and transmitting data"
                                    : "✗ Data collection is currently disabled for this robot"}
                            </p>
                        </div>
                    </Label>
                </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
                {/* Invoicing Status */}
                <div>
                    <label className="mb-2 block text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Invoicing Status
                    </label>
                    <Input
                        type="text"
                        {...register("invoicingStatus", { maxLength: 500 })}
                        className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder:text-white/20 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g., Paid, Pending, Partial Payment"
                    />
                    {errors.invoicingStatus && (
                        <p className="mt-1.5 text-sm text-red-400">
                            Maximum 500 characters allowed
                        </p>
                    )}
                </div>

                {/* Features */}
                <div>
                    <label className="mb-2 block text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Features
                    </label>
                    <textarea
                        {...register("features", { maxLength: 2000 })}
                        rows={4}
                        className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder:text-white/20 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Describe the robot features and specifications..."
                    />
                    {errors.features && (
                        <p className="mt-1.5 text-sm text-red-400">
                            Maximum 2000 characters allowed
                        </p>
                    )}
                </div>

                {/* Additional Inputs */}
                <div>
                    <label className="mb-2 block text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Additional Information
                    </label>
                    <textarea
                        {...register("additionalInputs", { maxLength: 2000 })}
                        rows={4}
                        className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder:text-white/20 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Any additional notes or information..."
                    />
                    {errors.additionalInputs && (
                        <p className="mt-1.5 text-sm text-red-400">
                            Maximum 2000 characters allowed
                        </p>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
                {onCancel && (
                    <Button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md border border-white/10 bg-transparent px-6 py-2.5 text-zinc-300 hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isLoading || !isDirty}
                    className="rounded-md bg-emerald-600 px-8 py-2.5 font-semibold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg
                                className="h-5 w-5 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Saving...
                        </span>
                    ) : (
                        "Save Changes"
                    )}
                </Button>
            </div>
        </form>
    );
};

export default ManufacturingDataForm;
