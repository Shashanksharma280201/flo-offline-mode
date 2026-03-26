import { create } from "zustand";
import { devtools } from "zustand/middleware";

type PDFMode = "single" | "multi";

type PDFConfigState = {
    pdfMode: PDFMode;
    selectedClientIds: string[];
};

type PDFConfigActions = {
    setPdfMode: (mode: PDFMode) => void;
    setSelectedClientIds: (clientIds: string[]) => void;
};

const initialState: PDFConfigState = {
    pdfMode: "single",
    selectedClientIds: []
};

export const usePDFConfigStore = create<PDFConfigState & PDFConfigActions>()(
    devtools((set) => ({
        ...initialState,
        setPdfMode: (pdfMode) => set({ pdfMode }),
        setSelectedClientIds: (selectedClientIds) => set({ selectedClientIds })
    }))
);
