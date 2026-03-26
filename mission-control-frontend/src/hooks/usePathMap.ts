import { useMutation } from "react-query";
import { errorLogger } from "@/util/errorLogger";
import { useMissionsStore } from "@/stores/missionsStore";
import { getPathMapById } from "@/features/dashboard/pathMapService";

type UsePathMapProps = {
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
const usePathMap = ({ onSuccess, onError }: UsePathMapProps = {}) => {
    const setPathMap = useMissionsStore((state) => state.setPathMap);
    return useMutation((id: string) => getPathMapById(id), {
        onSuccess: (data, variables, context) => {
            setPathMap(data);
            if (onSuccess) onSuccess(data, variables, context);
        },
        onError: (error, variables, context) => {
            if (onError) onError(error, variables, context);
            errorLogger(error);
        }
    });
};
export default usePathMap;
