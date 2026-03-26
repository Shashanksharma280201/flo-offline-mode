// Store to handle state between R3f components
import { ThreeJSOverlayView } from "@googlemaps/three";
import { Quaternion, Vector2, Vector3 } from "three";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type R3fComponentsState = {
    overlay?: ThreeJSOverlayView;
    isOrbitControlsEnabled: boolean;
    modelPosition: Vector3;
    modelQuarternion: Quaternion;
    isFetchingLatLng: boolean;
    mousePosition: Vector2;
    clickPosition: Vector2;
};
type R3fComponentsActions = {
    setIsFetchingLatLng: (isFetchingLatLng: boolean) => void;
    setIsOrbitControlsEnabled: (isOrbitControlsEnabled: boolean) => void;
    setModelPosition: (modelPosition: Vector3) => void;
    setModelQuarternion: (modelQuarternion: Quaternion) => void;
    setOverlay: (overlay?: ThreeJSOverlayView) => void;
    setMousePosition: (mousePosition: Vector2) => void;
    setClickPosition: (clickPosition: Vector2) => void;
};

const initialState: R3fComponentsState = {
    isFetchingLatLng: false,
    isOrbitControlsEnabled: true,
    modelPosition: new Vector3(),
    modelQuarternion: new Quaternion(),
    mousePosition: new Vector2(),
    clickPosition: new Vector2()
};

export const useR3fStore = create<R3fComponentsState & R3fComponentsActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setIsFetchingLatLng: (isFetchingLatLng) => {
                set({ isFetchingLatLng });
            },
            setOverlay: (overlay) => {
                set({ overlay });
            },
            setIsOrbitControlsEnabled: (isOrbitControlsEnabled) => {
                set({ isOrbitControlsEnabled });
            },
            setModelPosition: (modelPosition) => {
                set({ modelPosition });
            },
            setModelQuarternion: (modelQuarternion) => {
                set({ modelQuarternion });
            },
            setMousePosition: (mousePosition: Vector2) => {
                set({ mousePosition });
            },
            setClickPosition: (clickPosition: Vector2) => {
                set({ clickPosition });
            }
        }))
    )
);
