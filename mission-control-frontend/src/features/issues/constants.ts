import { ClientData, RobotType } from "@/data/types";

export const allRobotOption: RobotType = {
    id: "none",
    name: "(none)"
};

export const allClientOption: ClientData = {
    checkInTimeWithZone: "",
    id: "none",
    name: "(none)",
    location: { lat: 0, lng: 0 },
    operatingHours: 8,
    owner: ""
};
