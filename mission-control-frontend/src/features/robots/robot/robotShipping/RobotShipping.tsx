import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "react-query";
import { fetchShipmentsByRobot, type Shipment } from "@/api/shipmentApi";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { errorLogger } from "@/util/errorLogger";
import { MdEdit, MdLocationOn, MdCalendarToday } from "react-icons/md";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

type RobotParams = {
  robotId: string;
};

type RobotContextType = {
  robot: {
    id: string;
    name: string;
  };
  fetchRobotDetails: () => void;
};

const RobotShipping = () => {
  const { robotId } = useParams<RobotParams>();
  const navigate = useNavigate();
  const { robot } = useOutletContext<RobotContextType>();

  const { data: shipments, isLoading } = useQuery(
    ["robot-shipments", robotId],
    () => fetchShipmentsByRobot(robotId!),
    {
      enabled: !!robotId,
      onError: errorLogger
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600";
      case "in-transit":
        return "text-yellow-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-neutral-500";
    }
  };

  const getDeliveryStatusColor = (deliveryStatus?: string) => {
    switch (deliveryStatus) {
      case "delivered":
        return "text-green-500";
      case "on-time":
        return "text-blue-500";
      case "overdue":
        return "text-red-500";
      case "cancelled":
        return "text-neutral-500";
      default:
        return "text-neutral-400";
    }
  };

  const formatStatusText = (status: string) => {
    return status
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleShipmentClick = (shipment: Shipment) => {
    // Navigate to shipping page with robot name and shipment ID for search
    navigate(`/shipping?robotName=${encodeURIComponent(robot.name)}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
          <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
          <span className="text-sm md:text-base">Loading shipping history</span>
        </div>
      </div>
    );
  }

  if (!shipments || shipments.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background p-4 md:p-8">
        <div className="text-center">
          <p className="text-base text-neutral-400 md:text-lg">No shipping history found for this robot</p>
          <p className="mt-2 text-xs text-neutral-500 md:text-sm">
            Shipments related to this robot will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full ">
      <div className="flex w-full flex-col p-4 items-center divide-y divide-border">
        {shipments.map((shipment) => (
          <div
            key={shipment.id}
            onClick={() => handleShipmentClick(shipment)}
            className="flex w-full md:w-3/4 cursor-pointer flex-col gap-2 border border-border rounded-xl bg-blue-900/25 p-3 transition-colors hover:bg-slate-800/50 md:gap-4 md:p-6 lg:p-8"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <div className="flex w-full flex-col gap-2 md:gap-3">
                {/* Header with shipment ID and status */}
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                  <h3 className="text-base font-semibold opacity-85 sm:text-lg md:text-xl lg:text-2xl">
                    {shipment.shipmentId}
                  </h3>
                  <span
                    className={`rounded-full px-2 md:px-4 md:py-1 py-0.5 text-xs font-semibold capitalize ${getStatusColor(shipment.status)} ${
                      shipment.status === "delivered"
                        ? "bg-green-600/20"
                        : shipment.status === "in-transit"
                          ? "bg-yellow-500/20"
                          : "bg-red-500/20"
                    }`}
                  >
                    {formatStatusText(shipment.status)}
                  </span>
                </div>

                {/* Quick summary */}
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 sm:text-sm md:grid-cols-3">
                  <div className="flex items-center gap-1">
                    <MdLocationOn className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-400">From: </span>
                    <span className="font-semibold">{shipment.startLocation}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MdLocationOn className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-400">To: </span>
                    <span className="font-semibold">{shipment.endLocation}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MdCalendarToday className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-400">
                      {format(new Date(shipment.startDate), "MMM dd")} -{" "}
                      {format(new Date(shipment.endDate), "MMM dd, yyyy")}
                    </span>
                  </div>
                </div>

                {/* Robots or items preview */}
                {shipment.type === "robot" && shipment.robots && (
                  <div className="flex flex-wrap gap-1 md:gap-1.5">
                    {shipment.robots.slice(0, 3).map((robot, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-700/50 px-1.5 py-0.5 text-xs text-neutral-300 md:px-2"
                      >
                        {robot.name}
                      </span>
                    ))}
                    {shipment.robots.length > 3 && (
                      <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-xs text-neutral-300 md:px-2">
                        +{shipment.robots.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Accordion for full details */}
                <Accordion type="single" collapsible className="mt-1 md:mt-2">
                  <AccordionItem
                    value="shipment-details"
                    className="rounded-md border border-border bg-slate-800"
                  >
                    <AccordionTrigger
                      className="px-2 py-2 hover:no-underline md:px-3 md:py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-semibold text-neutral-400 md:text-sm">
                        View Full Details
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2 md:px-3 md:pb-3">
                      <div className="flex flex-col gap-3 text-xs md:gap-4 md:text-sm">
                        {/* Shipment Info */}
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-neutral-300 md:mb-2 md:text-sm">
                            Shipment Information
                          </p>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div>
                              <span className="text-neutral-400">Type: </span>
                              <span className="capitalize">{shipment.type}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400">Status: </span>
                              <span
                                className={`font-semibold capitalize ${getStatusColor(shipment.status)}`}
                              >
                                {formatStatusText(shipment.status)}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-400">Created By: </span>
                              <span>{shipment.createdBy.name}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400">Created At: </span>
                              <span>
                                {format(new Date(shipment.createdAt), "MMM dd, yyyy HH:mm")}
                              </span>
                            </div>
                            {shipment.deliveryStatus && (
                              <div>
                                <span className="text-neutral-400">Delivery Status: </span>
                                <span
                                  className={`font-semibold capitalize ${getDeliveryStatusColor(shipment.deliveryStatus)}`}
                                >
                                  {formatStatusText(shipment.deliveryStatus)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Robots (for robot shipments) */}
                        {shipment.type === "robot" && shipment.robots && (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-neutral-300 md:mb-2 md:text-sm">
                              Robots ({shipment.robots.length})
                            </p>
                            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 md:gap-2">
                              {shipment.robots.map((robot, idx) => (
                                <div key={idx} className="rounded bg-slate-700/30 p-2">
                                  <span className="font-semibold">{robot.name}</span>
                                  <span className="ml-2 text-xs text-neutral-400">
                                    ({robot.robotId})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Additional Items (for robot shipments) */}
                        {shipment.type === "robot" &&
                          shipment.additionalItems &&
                          shipment.additionalItems.length > 0 && (
                            <div>
                              <p className="mb-1.5 text-xs font-semibold text-neutral-300 md:mb-2 md:text-sm">
                                Additional Items
                              </p>
                              <div className="grid grid-cols-1 gap-1.5 md:gap-2">
                                {shipment.additionalItems.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between rounded bg-slate-700/30 p-2"
                                  >
                                    <div className="flex flex-col">
                                      <span>{item.name}</span>
                                      {item.customDescription && (
                                        <span className="text-xs text-neutral-400">
                                          {item.customDescription}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-neutral-400">
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Items (for miscellaneous shipments) */}
                        {shipment.type === "miscellaneous" && shipment.items && (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-neutral-300 md:mb-2 md:text-sm">
                              Items ({shipment.items.length})
                            </p>
                            <div className="grid grid-cols-1 gap-1.5 md:gap-2">
                              {shipment.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between rounded bg-slate-700/30 p-2"
                                >
                                  <div className="flex flex-col">
                                    <span>{item.name}</span>
                                    {item.customDescription && (
                                      <span className="text-xs text-neutral-400">
                                        {item.customDescription}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-neutral-400">
                                    {item.quantity} {item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Location & Timeline */}
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-neutral-300 md:mb-2 md:text-sm">
                            Location & Timeline
                          </p>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div>
                              <span className="text-neutral-400">From: </span>
                              <span className="font-semibold">{shipment.startLocation}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400">To: </span>
                              <span className="font-semibold">{shipment.endLocation}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400">Start Date: </span>
                              <span>
                                {format(new Date(shipment.startDate), "MMM dd, yyyy")}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-400">Expected End: </span>
                              <span>
                                {format(new Date(shipment.endDate), "MMM dd, yyyy")}
                              </span>
                            </div>
                            {shipment.actualDeliveryDate && (
                              <div>
                                <span className="text-neutral-400">Actual Delivery: </span>
                                <span className="font-semibold text-green-500">
                                  {format(
                                    new Date(shipment.actualDeliveryDate),
                                    "MMM dd, yyyy"
                                  )}
                                </span>
                              </div>
                            )}
                            {shipment.duration && (
                              <div>
                                <span className="text-neutral-400">Duration: </span>
                                <span>
                                  {shipment.duration} day{shipment.duration !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {shipment.description && (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-neutral-300 md:mb-2 md:text-sm">
                              Description
                            </p>
                            <p className="rounded bg-slate-700/30 p-2 text-neutral-300">
                              {shipment.description}
                            </p>
                          </div>
                        )}

                        {/* Edit History */}
                        {shipment.editHistory && shipment.editHistory.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-neutral-300 md:mb-2 md:text-sm">
                              Edit History
                            </p>
                            <div className="flex flex-col gap-1.5 md:gap-2">
                              {shipment.editHistory.map((edit, idx) => (
                                <div
                                  key={idx}
                                  className="rounded border-l-2 border-blue-500 bg-slate-700/30 p-2"
                                >
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-400 md:gap-2">
                                    <span>
                                      {format(new Date(edit.editedAt), "MMM dd, HH:mm")}
                                    </span>
                                    <span>by {edit.editedBy.name}</span>
                                  </div>
                                  <div className="mt-1 text-xs md:text-sm">
                                    <span className="font-semibold capitalize">
                                      {edit.field.replace(/([A-Z])/g, " $1")}:
                                    </span>{" "}
                                    <span className="text-neutral-400">{edit.oldValue}</span>
                                    <span className="mx-1 md:mx-2">→</span>
                                    <span className="text-white">{edit.newValue}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Click indicator */}
              <div className="flex flex-shrink-0 items-start">
                <div className="rounded-md p-1 text-neutral-400 md:p-1.5">
                  <span className="text-xs">Click to edit →</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RobotShipping;
