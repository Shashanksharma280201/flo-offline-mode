import * as React from "react";
import {
  Tailwind,
  Html,
  Head,
  Body,
  Font,
  TailwindConfig,
  Img
} from "@react-email/components";

const EmailWrapper = ({ children }: { children: React.ReactNode }) => (
  <Html lang="en">
    <Tailwind
      config={
        {
          theme: {
            fontSize: {
              xs: ["12px", { lineHeight: "16px" }],
              sm: ["14px", { lineHeight: "20px" }],
              base: ["16px", { lineHeight: "24px" }],
              lg: ["18px", { lineHeight: "28px" }],
              xl: ["20px", { lineHeight: "28px" }],
              "2xl": ["24px", { lineHeight: "32px" }],
              "3xl": ["30px", { lineHeight: "36px" }],
              "4xl": ["36px", { lineHeight: "36px" }],
              "5xl": ["48px", { lineHeight: "1" }],
              "6xl": ["60px", { lineHeight: "1" }],
              "7xl": ["72px", { lineHeight: "1" }],
              "8xl": ["96px", { lineHeight: "1" }],
              "9xl": ["144px", { lineHeight: "1" }]
            },
            spacing: {
              px: "1px",
              0: "0",
              0.5: "2px",
              1: "4px",
              1.5: "6px",
              2: "8px",
              2.5: "10px",
              3: "12px",
              3.5: "14px",
              4: "16px",
              5: "20px",
              6: "24px",
              7: "28px",
              8: "32px",
              9: "36px",
              10: "40px",
              11: "44px",
              12: "48px",
              14: "56px",
              16: "64px",
              20: "80px",
              24: "96px",
              28: "112px",
              32: "128px",
              36: "144px",
              40: "160px",
              44: "176px",
              48: "192px",
              52: "208px",
              56: "224px",
              60: "240px",
              64: "256px",
              72: "288px",
              80: "320px",
              96: "384px"
            },
            extend: {
              colors: {
                background: "#000000",
                backgroundGray: "#404040",
                primary600: "#22c55e",
                primary700: "#16a34a",
                border: "#404040",
                secondary: "#979797"
              }
            }
          }
        } as TailwindConfig
      }
    >
      <Font
        fontFamily="Roboto"
        fallbackFontFamily="Verdana"
        webFont={{
          url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
          format: "woff2"
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Head />
      <Font
        fontFamily="Roboto"
        fallbackFontFamily="Verdana"
        webFont={{
          url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
          format: "woff2"
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Body className="h-full  md:bg-[#EAF1FB] bg-white  p-2 md:p-6">
        <Img
          src={
            "https://flomobility.com/wp-content/uploads/2023/07/flo-mobility-Autonomous-Navigation.png"
          }
          alt="Flo Mobility"
          className="w-16 h-16  mx-auto"
        />

        {children}
      </Body>
    </Tailwind>
  </Html>
);
export default EmailWrapper;
