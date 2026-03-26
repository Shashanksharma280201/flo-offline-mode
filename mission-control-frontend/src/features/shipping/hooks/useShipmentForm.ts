
import { useReducer } from "react";
import { type ShipmentType, type ItemReference } from "@/api/shipmentApi";
import { type RobotType } from "@/data/types/robotTypes";

// --- STATE AND TYPES ---

export interface UIItemReference extends ItemReference {
    availableQuantity?: number;
}

export type ShipmentFormState = {
    type: ShipmentType;
    selectedRobot: RobotType | null;
    robotQuery: string;
    description: string;
    startLocation: string;
    endLocation: string;
    startDate: Date;
    endDate: Date;
    
    // Items for Robot form
    robotMechanicalItems: UIItemReference[];
    robotElectronicsItems: UIItemReference[];

    // Items for Misc form
    miscMechanicalItems: UIItemReference[];
    miscElectronicsItems: UIItemReference[];
    othersDescription: string;

    // Queries for comboboxes
    mechanicalQuery: string;
    electronicsQuery: string;
};

// --- REDUCER ACTIONS ---

export type Action =
    | { type: "SET_FIELD"; payload: { field: keyof ShipmentFormState; value: any } }
    | { type: "SET_TYPE"; payload: ShipmentType }
    | { type: "SET_ROBOT"; payload: RobotType | null }
    | { type: "ADD_ITEM"; payload: { item: UIItemReference; listKey: keyof ShipmentFormState } }
    | { type: "REMOVE_ITEM"; payload: { itemId: string; listKey: keyof ShipmentFormState } }
    | { type: "UPDATE_ITEM"; payload: { itemId: string; listKey: keyof ShipmentFormState; updates: Partial<UIItemReference> } }
    | { type: "RESET_FORM" };

// --- INITIAL STATE ---

const initialState: ShipmentFormState = {
    type: "robot",
    selectedRobot: null,
    robotQuery: "",
    description: "",
    startLocation: "",
    endLocation: "",
    startDate: new Date(),
    endDate: new Date(),
    robotMechanicalItems: [],
    robotElectronicsItems: [],
    miscMechanicalItems: [],
    miscElectronicsItems: [],
    othersDescription: "",
    mechanicalQuery: "",
    electronicsQuery: "",
};

// --- REDUCER ---

const shipmentFormReducer = (state: ShipmentFormState, action: Action): ShipmentFormState => {
    switch (action.type) {
        case "SET_FIELD":
            return { ...state, [action.payload.field]: action.payload.value };
        
        case "SET_TYPE":
            return { ...state, type: action.payload };

        case "SET_ROBOT":
            return { ...state, selectedRobot: action.payload };

        case "ADD_ITEM": {
            const { item, listKey } = action.payload;
            const targetList = state[listKey] as UIItemReference[];
            
            if (targetList.find(i => i.itemId === item.itemId && i.itemId !== "OTHERS")) {
                return state; // Avoid duplicates, except for "OTHERS"
            }
            
            return { ...state, [listKey]: [...targetList, item] };
        }

        case "REMOVE_ITEM": {
            const { itemId, listKey } = action.payload;
            const targetList = state[listKey] as UIItemReference[];
            
            // For "OTHERS" items, since they might not have a unique ID, we remove the first one found.
            // A better approach would be to assign a temporary unique ID upon creation.
            if (itemId === "OTHERS") {
                const index = targetList.findIndex(i => i.itemId === "OTHERS");
                if (index > -1) {
                    const newList = [...targetList];
                    newList.splice(index, 1);
                    return { ...state, [listKey]: newList };
                }
            }

            return { ...state, [listKey]: targetList.filter(i => i.itemId !== itemId) };
        }

        case "UPDATE_ITEM": {
            const { itemId, listKey, updates } = action.payload;
            const targetList = state[listKey] as UIItemReference[];

            return {
                ...state,
                [listKey]: targetList.map(item =>
                    item.itemId === itemId ? { ...item, ...updates } : item
                )
            };
        }

        case "RESET_FORM":
            return { ...initialState, startDate: new Date(), endDate: new Date() }; // Ensure dates are fresh objects

        default:
            return state;
    }
};

// --- THE HOOK ---

export const useShipmentForm = () => {
    const [state, dispatch] = useReducer(shipmentFormReducer, initialState);
    return { state, dispatch };
};
