import { useMutation } from "react-query";
import { getRobotsFromAppUsersFn } from "../features/analytics/analyticsService";
import { errorLogger } from "@/util/errorLogger";

type UseRobotsFromAppUsersProps = {
    onSuccess?:
        | ((
              data: any,
              variables: string,
              context: unknown
          ) => void | Promise<unknown>)
        | undefined;
    onError?:
        | ((
              error: any,
              variables: string,
              context: unknown
          ) => void | Promise<unknown>)
        | undefined;
};
const useRobotsFromAppUsers = ({
    onSuccess,
    onError
}: UseRobotsFromAppUsersProps = {}) => {
    return useMutation((id: string) => getRobotsFromAppUsersFn(id), {
        onSuccess: (data, variables, context) => {
            if (onSuccess) onSuccess(data, variables, context);
        },
        onError: (error, variables, context) => {
            if (onError) onError(error, variables, context);
            errorLogger(error);
        }
    });
};
export default useRobotsFromAppUsers;
