// Store to handle state between Tele components
import dayjs, { Dayjs } from "dayjs";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type TeleState = {
    streams: { [streamId: string]: MediaStream | undefined };
    streamBitrates: { [streamId: string]: string };
};
type TeleActions = {
    setStreams: (stream: {
        [streamId: string]: MediaStream | undefined;
    }) => void;
    setStreamBitrates: (streamBitrate: {
        [streamId: string]: string | undefined;
    }) => void;
    resetStreams: () => void;
};

const initialState: TeleState = {
    streams: {},
    streamBitrates: {}
};

export const useTeleStore = create<TeleState & TeleActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setStreams: (stream) => {
                set((state) => ({
                    streams: {
                        ...state.streams,
                        ...stream
                    }
                }));
            },
            setStreamBitrates: (streamBitrate) => {
                set((state) => ({
                    streamBitrates: {
                        ...state.streamBitrates,
                        ...streamBitrate
                    }
                }));
            },
            resetStreams: () => {
                set(initialState);
            }
        }))
    )
);
