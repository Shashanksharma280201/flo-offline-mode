import * as React from "react";
import { Button, Container, Heading, Text } from "@react-email/components";
import EmailWrapper from "./components/EmailWrapper";

type IssuePendingProps = {
  title: string;
  data: {
    robotName: string;
    daysPending: number;
    clientName: string;
    raisedByOperator: string;
    startTime: string;
    url: string;
  };
};
const IssuePending = ({ title, data }: IssuePendingProps) => {
  return (
    <EmailWrapper>
      <Container className="border border-solid bg-white border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
        <Heading className="text-2xl font-bold text-center text-gray-800 my-4">
          {title}
        </Heading>
        <Text className="text-gray-600 mb-4 text-center">
          An Issue is pending for{" "}
          <span className="font-bold">{data.daysPending}</span> days at{" "}
          <span className="font-bold">{data.clientName}</span>
        </Text>
        <ul className="list-disc pl-6 mb-4">
          <li className="text-gray-600 mb-2">
            <Text className="m-0">
              Robot Name: <span className="font-bold">{data.robotName}</span>
            </Text>
          </li>
          <li className="text-gray-600 mb-2">
            <Text className="m-0">
              Raised By Operator:{" "}
              <span className="font-bold">{data.raisedByOperator}</span>
            </Text>
          </li>
          <li className="text-gray-600 mb-2">
            <Text className="m-0">
              Issue Start Time:{" "}
              <span className="font-bold">{data.startTime}</span>
            </Text>
          </li>
        </ul>
        <Button
          className="bg-primary600 text-white font-bold py-2 px-4 rounded text-center block mx-auto"
          href={data.url}
        >
          View Issue
        </Button>
      </Container>
    </EmailWrapper>
  );
};
export default IssuePending;
