import { useState } from "react";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import { type Shipment, type UpdateShipmentPayload } from "@/api/shipmentApi";
import { format } from "date-fns";
import Calendar from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { MdCalendarToday } from "react-icons/md";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/Select";

interface EditShipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment;
  onSubmit: (payload: UpdateShipmentPayload) => void;
  isLoading: boolean;
}

const EditShipmentDialog = ({
  isOpen,
  onClose,
  shipment,
  onSubmit,
  isLoading
}: EditShipmentDialogProps) => {
  const [startLocation, setStartLocation] = useState(shipment.startLocation);
  const [endLocation, setEndLocation] = useState(shipment.endLocation);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(shipment.startDate)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(shipment.endDate)
  );
  const [actualDeliveryDate, setActualDeliveryDate] = useState<Date | undefined>(
    shipment.actualDeliveryDate ? new Date(shipment.actualDeliveryDate) : undefined
  );
  const [status, setStatus] = useState(shipment.status);

  const handleSubmit = () => {
    const payload: UpdateShipmentPayload = {};

    if (startLocation !== shipment.startLocation) {
      payload.startLocation = startLocation;
    }
    if (endLocation !== shipment.endLocation) {
      payload.endLocation = endLocation;
    }
    if (startDate && startDate.toISOString() !== shipment.startDate) {
      payload.startDate = startDate.toISOString();
    }
    if (endDate && endDate.toISOString() !== shipment.endDate) {
      payload.endDate = endDate.toISOString();
    }
    if (actualDeliveryDate) {
      payload.actualDeliveryDate = actualDeliveryDate.toISOString();
    }
    if (status !== shipment.status) {
      payload.status = status;
    }

    onSubmit(payload);
  };

  const handleClose = () => {
    setStartLocation(shipment.startLocation);
    setEndLocation(shipment.endLocation);
    setStartDate(new Date(shipment.startDate));
    setEndDate(new Date(shipment.endDate));
    setActualDeliveryDate(
      shipment.actualDeliveryDate ? new Date(shipment.actualDeliveryDate) : undefined
    );
    setStatus(shipment.status);
    onClose();
  };

  return (
    <Popup
      title="Edit Shipment"
      description={`Update details for ${shipment.shipmentId}`}
      onClose={handleClose}
      dialogToggle={isOpen}
    >
      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1 text-white md:gap-4 md:pr-2">
        <div className="rounded-md border border-border bg-gray-800/45 p-3 md:p-4">
          {/* Read-only shipment info */}
          <div className="mb-3 md:mb-4">
            <p className="text-xs text-neutral-400 md:text-sm">Shipment Type</p>
            <p className="text-base font-semibold capitalize md:text-lg">{shipment.type}</p>
          </div>

          {/* Read-only robots/items */}
          {shipment.type === "robot" && shipment.robots && (
            <div className="mb-3 md:mb-4">
              <p className="mb-1.5 text-xs text-neutral-400 md:mb-2 md:text-sm">Robots</p>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {shipment.robots.map((robot, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-neutral-300 md:px-2 md:py-1 md:text-sm"
                  >
                    {robot.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs text-neutral-400 md:text-sm">Start Location</label>
              <input
                type="text"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                className="rounded-md border border-border bg-transparent p-2 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:p-2.5 md:text-base"
                placeholder="Start location"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs text-neutral-400 md:text-sm">End Location</label>
              <input
                type="text"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                className="rounded-md border border-border bg-transparent p-2 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:p-2.5 md:text-base"
                placeholder="End location"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs text-neutral-400 md:text-sm">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border border-border bg-transparent p-2 text-left text-sm text-white outline-none transition-all hover:border-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:p-2.5 md:text-base"
                  >
                    {startDate ? (
                      format(startDate, "MMM dd, yyyy")
                    ) : (
                      <span className="text-neutral-400">Pick a date</span>
                    )}
                    <MdCalendarToday className="h-4 w-4 text-neutral-400 md:h-5 md:w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[9999] w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs text-neutral-400 md:text-sm">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border border-border bg-transparent p-2 text-left text-sm text-white outline-none transition-all hover:border-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:p-2.5 md:text-base"
                  >
                    {endDate ? (
                      format(endDate, "MMM dd, yyyy")
                    ) : (
                      <span className="text-neutral-400">Pick a date</span>
                    )}
                    <MdCalendarToday className="h-4 w-4 text-neutral-400 md:h-5 md:w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[9999] w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs text-neutral-400 md:text-sm">Actual Delivery Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border border-border bg-transparent p-2 text-left text-sm text-white outline-none transition-all hover:border-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:p-2.5 md:text-base"
                  >
                    {actualDeliveryDate ? (
                      format(actualDeliveryDate, "MMM dd, yyyy")
                    ) : (
                      <span className="text-neutral-400">Not delivered yet</span>
                    )}
                    <MdCalendarToday className="h-4 w-4 text-neutral-400 md:h-5 md:w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[9999] w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={actualDeliveryDate}
                    onSelect={setActualDeliveryDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs text-neutral-400 md:text-sm">Status</label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger className="rounded-md border border-border bg-transparent p-2 text-sm text-white md:p-2.5 md:text-base">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="in-transit" className="text-sm md:text-base">In Transit</SelectItem>
                  <SelectItem value="delivered" className="text-sm md:text-base">Delivered</SelectItem>
                  <SelectItem value="cancelled" className="text-sm md:text-base">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-700 pt-3 md:gap-3 md:pt-4">
        <SmIconButton
          name="Cancel"
          className="border border-backgroundGray bg-transparent text-sm font-semibold text-white hover:bg-white/20 md:text-base"
          onClick={handleClose}
        />
        <SmIconButton
          name={isLoading ? "Updating..." : "Save Changes"}
          className="border bg-white text-sm font-semibold text-black md:text-base"
          onClick={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </Popup>
  );
};

export default EditShipmentDialog;
