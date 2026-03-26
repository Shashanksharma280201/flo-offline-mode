import Header from "@/components/header/Header";
import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";

import { fetchOperatorDetails } from "./services/operatorService";
import { Operator as OperatorType } from "@/data/types/appDataTypes";
import { errorLogger } from "@/util/errorLogger";

const Operator = () => {
    const { operatorId } = useParams();
    const navigate = useNavigate();
    const [selectedOperator, setSelectedOperator] = useState<OperatorType>();

    const { mutate: mutateFetchOperatorDetails } = useMutation({
        mutationFn: (operatorId: string) => fetchOperatorDetails(operatorId),
        onSuccess: (data) => {
            setSelectedOperator(data);
        },
        onError: errorLogger
    });

    useEffect(() => {
        if (operatorId) mutateFetchOperatorDetails(operatorId);
    }, []);

    const refetchOperator = () => {
        if (operatorId) mutateFetchOperatorDetails(operatorId);
    };

    return (
        <div className="flex w-full flex-col bg-blue-900/25 h-full">
            <Header
                title={selectedOperator?.name ?? "Operators"}
                onBack={() => navigate("/operators", { replace: true })}
            />
            <ul className="flex min-h-[3rem] w-full items-center gap-6 border-b border-t border-border px-6 text-sm md:gap-8 md:border-t-0 md:px-8 md:text-lg">
                <NavLink
                    replace
                    className={({ isActive }) =>
                        `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                    }
                    to={`/operators/${operatorId}/profile`}
                >
                    Profile
                </NavLink>
                {selectedOperator?.isActive ? (
                    <NavLink
                        replace
                        className={({ isActive }) =>
                            ` outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                        }
                        to={`/operators/${operatorId}/robots`}
                    >
                        Robots
                    </NavLink>
                ) : null}
                <NavLink
                    replace
                    className={({ isActive }) =>
                        ` outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                    }
                    to={`/operators/${operatorId}/attendance`}
                >
                    Attendance
                </NavLink>
            </ul>
            {selectedOperator && (
                <Outlet context={{ selectedOperator, refetchOperator }} />
            )}
        </div>
    );
};

export default Operator;
