import { useEffect, useState } from "react";
import useComponentVisible from "../../../hooks/useComponentVisible";
import ClientCard from "./ClientCard";

type ConnectedClientsProps = {
    connectedClients: {
        [x: string]: {
            name: string;
            email: string;
        };
    };
};

/**
 * A component that shows the clients that are connected to the robot
 */
const ConnectedClients = ({ connectedClients }: ConnectedClientsProps) => {
    const { ref, isComponentVisible, setIsComponentVisible } =
        useComponentVisible(true);

    const [selectedUsers, setSelectedUsers] = useState<
        { email: string; name: string }[] | undefined
    >();
    
    const colors = ["bg-red-400", "bg-blue-400", "bg-green-300"];
    const limit = 2;

    const [connectedClientsLength, setConnectedClientsLength] =
        useState<number>(Object.values(connectedClients).length);
    const [connectedClientsList, setConnectedClientsList] = useState<
        { email: string; name: string }[]
    >(Object.values(connectedClients));

    useEffect(() => {
        setConnectedClientsList(Object.values(connectedClients));
        setConnectedClientsLength(Object.values(connectedClients).length);
    }, [connectedClients]);

    const handleSelectedUser = (email: string, name: string) => {
        setSelectedUsers([
            {
                email,
                name
            }
        ]);
        setIsComponentVisible(true);
    };

    const handleListUsers = () => {
        setSelectedUsers(connectedClientsList.slice(limit));
        setIsComponentVisible(true);
    };

    return (
        <div
            className={`relative flex items-center transition ease-in-out ${
                connectedClientsLength > limit && "right-5"
            }`}
        >
            {connectedClientsLength > 0 &&
                connectedClientsList
                    .slice(0, limit)
                    .map(({ email, name }, index) => {
                        return (
                            <div
                                style={{
                                    right: `${index * 1.25}rem`,
                                    zIndex: `${index + 20}`
                                }}
                                key={index}
                                className={`absolute ${
                                    colors[index % 3]
                                } flex cursor-pointer items-center justify-center rounded-full px-2 py-1 text-xs `}
                                onClick={() => {
                                    handleSelectedUser(email, name);
                                }}
                            >
                                {email.toUpperCase().charAt(0)}
                            </div>
                        );
                    })}

            {connectedClientsLength - limit > 0 && (
                <div
                    style={{
                        right: `${(limit - 1) * -1.3}rem`,
                        zIndex: `${20 - limit - 1}`
                    }}
                    className={`absolute flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-backgroundGray text-xs `}
                    onClick={() => {
                        handleListUsers();
                    }}
                >
                    {`+${connectedClientsLength - limit}`}
                </div>
            )}

            {isComponentVisible && selectedUsers && (
                <div ref={ref} onClick={() => setIsComponentVisible(true)}>
                    <ClientCard users={selectedUsers} colors={colors} />
                </div>
            )}
        </div>
    );
};

export default ConnectedClients;
