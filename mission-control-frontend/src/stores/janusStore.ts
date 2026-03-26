import Janus, { JanusJS } from "janus-gateway";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type JanusState = {
    janusInstance?: Janus;
    isJanusFeedSubscriber: boolean;
    restartSubscriber: boolean;
    isJanusDataPublisher: boolean;
    restartPublisher: boolean;
    isJanusDataPeerActive: boolean;
    vRPubHandle?: JanusJS.PluginHandle;
    vRSubHandle?: JanusJS.PluginHandle;
};

type JanusActions = {
    setJanusInstance: (janusInstance: Janus | undefined) => void;
    setVRPubHandle: (vrPubHandle: JanusJS.PluginHandle | undefined) => void;
    setVRSubHandle: (vrSubHandle: JanusJS.PluginHandle | undefined) => void;
    setIsJanusFeedSubscriber: (isJanusFeedSubscriber: boolean) => void;
    setRestartSubscriber: (restartSubscriber: boolean) => void;
    setRestartPublisher: (restartPublisher: boolean) => void;
    setIsJanusDataPublisher: (isJanusDataPublisher: boolean) => void;
    setIsJanusDataPeerActive: (isJanusDataPeerActive: boolean) => void;
};

const initialState: JanusState = {
    isJanusFeedSubscriber: false,
    isJanusDataPublisher: false,
    isJanusDataPeerActive: false,
    restartSubscriber: false,
    restartPublisher: false
};

// define the store
export const useJanusStore = create<JanusState & JanusActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setJanusInstance: (janusInstance) => {
                set({ janusInstance });
            },
            setVRSubHandle: (vRSubHandle) => {
                set({ vRSubHandle });
            },
            setRestartPublisher: (restartPublisher) => {
                set({ restartPublisher });
            },
            setRestartSubscriber: (restartSubscriber) => {
                set({ restartSubscriber });
            },
            setIsJanusFeedSubscriber: (isJanusFeedSubscriber) => {
                set({ isJanusFeedSubscriber });
            },
            setIsJanusDataPublisher: (isJanusDataPublisher) => {
                set({ isJanusDataPublisher });
            },
            setIsJanusDataPeerActive: (isJanusDataPeerActive) => {
                set({ isJanusDataPeerActive });
            },
            setVRPubHandle: (vRPubHandle) => {
                set({ vRPubHandle });
            }
        }))
    )
);
