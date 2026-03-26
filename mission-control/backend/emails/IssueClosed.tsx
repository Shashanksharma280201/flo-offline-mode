import { Button, Container, Heading, Text } from "@react-email/components";
import EmailWrapper from "./components/EmailWrapper";

type IssueClosedProps = {
  title: string;
  data: {
    clientName: string;
    robotName: string;
    closeTime: string;
    closedByOperator: string;
    url: string;
  };
};

const IssueClosed = ({ title, data }: IssueClosedProps) => {
  return (
    <EmailWrapper>
      <Container className="border border-solid bg-white border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
        <Heading className="text-2xl font-bold text-center text-gray-800 my-4">
          {title}
        </Heading>
        <Text className="text-gray-600 mb-4 text-center">
          An Issue was closed by{" "}
          <span className="font-bold">{data.closedByOperator}</span> on{" "}
          <span className="font-bold">{data.closeTime}</span> in{" "}
          <span className="font-bold">{data.clientName}</span>
        </Text>

        <Button
          className="bg-primary600 text-white font-bold py-2 px-4 rounded text-center block mx-auto"
          href={data.url}
        >
          View Closed Issue
        </Button>
      </Container>
    </EmailWrapper>
  );
};
export default IssueClosed;
