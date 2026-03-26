type ClientCardProps = {
    users: { name: string; email: string }[];
    colors: string[];
};

/**
 * A component that shows the name and email of the connected clients 
 */
const ClientCard = ({ users, colors }: ClientCardProps) => {
    return (
        <div className="fixed right-12  top-11 z-40 h-fit max-h-60 max-w-fit flex-col overflow-auto rounded-md border-2 border-white bg-white p-4 ">
            {users.map((user, index) => {
                return (
                    <div className="flex items-center gap-2 py-1" key={index}>
                        <div
                            className={` ${colors[index % 3]} flex h-[20px] w-[20px] p-4 items-center justify-center rounded-full `}
                        >
                            {user.email.toUpperCase().charAt(0)}
                        </div>
                        <div className="flex flex-col text-black">
                            <span>{user.name}</span>
                            <span>{user.email}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ClientCard;
