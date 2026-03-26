import { useMutation } from "react-query";
import {
    getClientsListFn,
    getRobotListFn
} from "../features/analytics/analyticsService";
import { errorLogger } from "@/util/errorLogger";
import { useUserStore } from "@/stores/userStore";

const useClients = () => {
    const setClients = useUserStore((state) => state.setClients);
    return useMutation(() => getClientsListFn(), {
        onSuccess: (data) => {
            setClients(data);
        },
        onError: (error: any) => errorLogger(error)
    });
};
export default useClients;
