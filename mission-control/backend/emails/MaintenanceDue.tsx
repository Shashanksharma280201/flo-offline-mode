import { Container, Heading, Text } from "@react-email/components";
import EmailWrapper from "./components/EmailWrapper";

type MaintenanceDueProps = {
  robotName: string;
  daysPending: number;
  lastMaintenance: string;
};
const MaintenanceDue = ({
  robotName,
  daysPending,
  lastMaintenance
}: MaintenanceDueProps) => {
  return (
    <EmailWrapper>
      <Container className="border border-solid bg-white border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
        <Heading className="text-2xl font-bold text-center text-gray-800 my-4">
          {robotName}
        </Heading>
        <Text className="text-gray-600 mb-4 text-center">
          An Issue is pending for{" "}
          <span className="font-bold">{daysPending}</span> days.
        </Text>
        <ul className="list-disc pl-6 mb-4">
          <li className="text-gray-600 mb-2">
            <Text className="m-0">
              Last Maintenance Time:{" "}
              <span className="font-bold">{lastMaintenance}</span>
            </Text>
          </li>
        </ul>
      </Container>
    </EmailWrapper>
  );
};
export default MaintenanceDue;
