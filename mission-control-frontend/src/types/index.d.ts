export {};

declare module "@mui/material/styles" {
    interface Palette {
        backgroundGray: Palette["primary"];
        neutral: Palette["primary"];
    }

    interface PaletteOptions {
        backgroundGray?: PaletteOptions["primary"];
        neutral?: PaletteOptions["primary"];
    }
}
