import * as React from "react";
import { Button, Container, Heading, Text } from "@react-email/components";
import EmailWrapper from "./components/EmailWrapper";

type SiteUtilizationReportProps = {
  clientName: string;
  date: string;
  noOfTrips: number;
  url: string;
};

const SiteUtilizationReport = ({
  clientName,
  date,
  noOfTrips,
  url
}: SiteUtilizationReportProps) => {
  return (
    <EmailWrapper>
      <Container className="border border-solid bg-white border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
        <Heading className="text-2xl font-bold text-center text-gray-800 my-4">
          {noOfTrips} trips were completed today
        </Heading>
        <ul className="list-disc pl-6 mb-4">
          <li className="text-gray-600 mb-2">
            <Text className="m-0">
              Site Name: <span className="font-bold">{clientName}</span>
            </Text>
          </li>
          <li className="text-gray-600 mb-2">
            <Text className="m-0">
              Date: <span className="font-bold">{date}</span>
            </Text>
          </li>
        </ul>

        <Button
          className="bg-primary600 text-white font-bold py-2 px-4 rounded text-center block mx-auto"
          href={url}
        >
          View Analytics
        </Button>
      </Container>
    </EmailWrapper>
  );
};
export default SiteUtilizationReport;
