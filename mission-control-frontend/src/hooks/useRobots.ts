import { useQuery } from "react-query";
import { getRobotListFn } from "../features/analytics/analyticsService";
import { errorLogger } from "@/util/errorLogger";
import { useUserStore } from "@/stores/userStore";

/**
 * Hook to fetch robots from API and store in useUserStore
 * Uses useQuery for proper caching and automatic refetching
 */
const useRobots = () => {
    const setRobots = useUserStore((state) => state.setRobots);

    return useQuery({
        queryKey: ["robots"],
        queryFn: getRobotListFn,
        onSuccess: (data) => {
            setRobots(data);
        },
        onError: (error: any) => errorLogger(error)
    });
};

export default useRobots;
