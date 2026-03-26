/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/tw-elements/dist/js/**/*.js",
        "./node_modules/flowbite/**/*.js",
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}"
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px"
            }
        },
        extend: {
            colors: {
                background: "#000000",
                backgroundGray: "#404040",
                primary600: "#22c55e",
                primary700: "#16a34a",
                border: "#404040",
                secondary: "#979797"
            },
            fontFamily: {
                poppins: ["Poppins", "sans-serif"]
            },
            gridTemplateColumns: {
                autoFit: "repeat(auto-fill, minmax(20rem, 1fr))",
                autoFitReports: "repeat(auto-fill, minmax(50%, 1fr))"
            },
            keyframes: {
                "skeleton-chrome": {
                    from: { left: "-200%" },
                    to: { left: "200%" }
                },
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" }
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" }
                }
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "skeleton-chrome": "skeleton-chrome 2s ease-in-out infinite"
            }
        },
        screens: {
            xs: "480px",
            ss: "620px",
            sm: "768px",
            md: "1060px",
            lg: "1200px",
            xl: "1700px"
        }
    },
    plugins: [
        require("@headlessui/tailwindcss"),
        require("autoprefixer"),
        require("tailwindcss-animate"),
        require("@tailwindcss/typography")
    ]
};
