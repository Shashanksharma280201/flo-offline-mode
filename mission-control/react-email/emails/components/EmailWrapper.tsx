import * as React from "react";
import {
  Tailwind,
  Html,
  Hr,
  Head,
  Body,
  Font,
  Text,
  Img
} from "@react-email/components";
import config from "../../tailwind.config";

const EmailWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Html lang="en">
      <Tailwind config={config}>
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
};
export default EmailWrapper;
