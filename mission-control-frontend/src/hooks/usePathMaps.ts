import { useMutation } from "react-query";
import { getRobotListFn } from "../features/analytics/analyticsService";
import { errorLogger } from "@/util/errorLogger";
import { useUserStore } from "@/stores/userStore";
import { getPathMapsListFn } from "@/features/dashboard/pathMapService";
import { useMissionsStore } from "@/stores/missionsStore";

type usePathMapsProps = {
    onSuccess?:
        | ((
              data: any,
              variables: void,
              context: unknown
          ) => void | Promise<unknown>)
        | undefined;
    onError?:
        | ((
              error: any,
              variables: void,
              context: unknown
          ) => void | Promise<unknown>)
        | undefined;
};
const usePathMaps = ({ onSuccess, onError }: usePathMapsProps = {}) => {
    const setPathMaps = useMissionsStore((state) => state.setPathMaps);
    return useMutation(() => getPathMapsListFn(), {
        onSuccess: (data, variables, context) => {
            setPathMaps(data);
            if (onSuccess) onSuccess(data, variables, context);
        },
        onError: (error, variables, context) => {
            if (onError) onError(error, variables, context);
            errorLogger(error);
        }
    });
};
export default usePathMaps;
