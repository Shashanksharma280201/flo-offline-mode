import {
  Button,
  Container,
  Heading,
  Text,
  Section,
  Row,
  Column
} from "@react-email/components";
import EmailWrapper from "./components/EmailWrapper";

type OvertimeRequestEmailProps = {
  operatorName: string;
  clientName: string;
  robotName?: string;
  requestedDuration: number;
  reason: string;
  requestedAt: string;
  approvalUrl: string;
};

const OvertimeRequestEmail = ({
  operatorName,
  clientName,
  robotName,
  requestedDuration,
  reason,
  requestedAt,
  approvalUrl
}: OvertimeRequestEmailProps) => (
  <EmailWrapper>
    <Container className="border border-solid bg-white border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[600px]">
      <Heading className="text-2xl font-bold text-center text-gray-800 my-4">
        New Overtime Request
      </Heading>

      <Text className="text-gray-600 mb-4 text-center">
        An operator has requested permission to work overtime.
      </Text>

      <Section className="bg-gray-50 p-4 rounded mb-4">
        <Row>
          <Column>
            <Text className="m-0 mb-2 text-gray-700">
              <span className="font-semibold">Operator:</span> {operatorName}
            </Text>
            <Text className="m-0 mb-2 text-gray-700">
              <span className="font-semibold">Client:</span> {clientName}
            </Text>
            {robotName && (
              <Text className="m-0 mb-2 text-gray-700">
                <span className="font-semibold">Robot:</span> {robotName}
              </Text>
            )}
            <Text className="m-0 mb-2 text-gray-700">
              <span className="font-semibold">Duration:</span> {requestedDuration} hours
            </Text>
            <Text className="m-0 text-gray-700">
              <span className="font-semibold">Requested At:</span> {requestedAt}
            </Text>
          </Column>
        </Row>
      </Section>

      <Section className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
        <Text className="m-0 mb-2 font-semibold text-gray-800">Reason:</Text>
        <Text className="m-0 text-gray-700">{reason}</Text>
      </Section>

      <Button
        className="bg-primary600 text-white font-bold py-3 px-6 rounded text-center block mx-auto hover:bg-primary600/90"
        href={approvalUrl}
      >
        Review and Approve
      </Button>

      <Text className="text-gray-500 text-sm text-center mt-4">
        Click the button above to review this request in the admin panel.
      </Text>
    </Container>
  </EmailWrapper>
);

export default OvertimeRequestEmail;
