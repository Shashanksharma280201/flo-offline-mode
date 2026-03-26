import Header from "@/components/header/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    UserResponse,
    fetchAllUsers,
    deleteUser
} from "@/features/users/services/userService";
import { errorLogger } from "@/util/errorLogger";
import { checkPermission } from "@/util/roles";
import { useEffect, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdPerson, MdSearch } from "react-icons/md";
import { useMutation } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";

const Users = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [userForDeletion, setUserForDeletion] = useState<UserResponse | null>(
        null
    );

    // Check if user has permission to view this page
    if (!checkPermission("change_users")) {
        navigate("/analytics");
        return null;
    }

    const { mutate: mutateFetchUsers, isLoading } = useMutation({
        mutationFn: () => fetchAllUsers(),
        onSuccess: (data) => {
            setUsers(data.users);
        },
        onError: (error) => errorLogger(error)
    });

    const deleteMutation = useMutation({
        mutationFn: (userId: string) => deleteUser(userId),
        onSuccess: () => {
            toast.success("User deleted successfully");
            mutateFetchUsers();
            setIsDeletePopupOpen(false);
        },
        onError: (err) => errorLogger(err)
    });

    useEffect(() => {
        mutateFetchUsers();
    }, []);

    const filterUsersOnSearch = (user: UserResponse) => {
        return (
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const handleDeleteUser = () => {
        if (!userForDeletion) return;
        deleteMutation.mutate(userForDeletion.id);
    };

    const filteredUsers = users.filter(filterUsersOnSearch);

    return (
        <>
            <div className="flex w-full flex-col bg-blue-900/25">
                <Header title="User Management">
                    <button
                        className="flex items-center gap-x-2 md:rounded-md md:border md:border-green-500 md:bg-green-500 md:p-2.5 md:font-semibold md:hover:border-green-600 md:hover:bg-green-600"
                        onClick={() => navigate("/users/create")}
                    >
                        <div className="hidden text-sm md:block md:text-base">
                            Create Account
                        </div>
                        <MdAdd className="h-6 w-6 md:h-5 md:w-5" />
                    </button>
                </Header>
                <section className="m-auto flex h-full w-full flex-col items-center justify-center border-border bg-backgroundGray/30 md:my-8 md:w-[75%] md:rounded-md md:border">
                    <div className="flex h-[3rem] w-full items-center border-b border-t border-border text-sm md:border-t-0 md:text-lg">
                        <label
                            htmlFor="Search"
                            className="flex h-full w-full items-center justify-between bg-backgroundGray/30 pr-4 text-sm text-white transition-colors ease-in md:text-lg"
                        >
                            <input
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                value={searchQuery}
                                type="text"
                                placeholder="Search users by name or email"
                                className="block h-full w-full appearance-none items-center bg-transparent px-6 text-sm text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                            />
                            <MdSearch className="h-6 w-6 text-neutral-400" />
                        </label>
                    </div>
                    <div className="w-full">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => {
                                return (
                                    <div
                                        key={user.id}
                                        className="flex w-full items-center gap-6 border-b border-border bg-slate-900/30 p-6 hover:bg-slate-800/45 md:p-8"
                                    >
                                        <div className="hidden sm:flex">
                                            <span className="flex size-10 items-center justify-center rounded-full bg-backgroundGray">
                                                <MdPerson className="size-5 text-white" />
                                            </span>
                                        </div>
                                        <div className="flex w-full flex-col">
                                            <div className="flex justify-between">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base font-semibold text-white">
                                                            {user.name}
                                                        </h3>
                                                        <span className="flex h-fit w-fit items-center justify-center rounded-full border-[0.5px] bg-backgroundGray/30 px-3 py-0.5 text-xs">
                                                            {user.role ===
                                                            "admin"
                                                                ? "Admin"
                                                                : "Custom"}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-secondary">
                                                        {user.email}
                                                    </span>
                                                    {user.role === "custom" &&
                                                        user.permissions && (
                                                            <span className="mt-1 text-xs text-neutral-400">
                                                                {
                                                                    user
                                                                        .permissions
                                                                        .length
                                                                }{" "}
                                                                permissions
                                                            </span>
                                                        )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            navigate(
                                                                `/users/${user.id}/edit`
                                                            )
                                                        }
                                                        className="rounded p-2 hover:bg-backgroundGray"
                                                        title="Edit user"
                                                    >
                                                        <MdEdit className="h-5 w-5 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setUserForDeletion(
                                                                user
                                                            );
                                                            setIsDeletePopupOpen(
                                                                true
                                                            );
                                                        }}
                                                        className="rounded p-2 hover:bg-backgroundGray"
                                                        title="Delete user"
                                                    >
                                                        <MdDelete className="h-5 w-5 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex min-h-[30vh] items-center justify-center">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading Users</span>
                                    </div>
                                ) : (
                                    <span>No Users Found</span>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
            {userForDeletion && (
                <Popup
                    title="Delete user?"
                    description={
                        <p>
                            Are you sure you want to delete{" "}
                            <span className="font-bold">
                                {userForDeletion.name}
                            </span>
                            ?
                            <br />
                            This action cannot be undone.
                        </p>
                    }
                    onClose={() => setIsDeletePopupOpen(false)}
                    dialogToggle={isDeletePopupOpen}
                >
                    <div className="flex items-center justify-end gap-2 md:gap-4">
                        <SmIconButton
                            name="Cancel"
                            className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                            onClick={() => setIsDeletePopupOpen(false)}
                        />
                        <SmIconButton
                            name="Delete"
                            className="border bg-red-500 font-semibold text-white hover:bg-red-600"
                            onClick={handleDeleteUser}
                        />
                    </div>
                </Popup>
            )}
        </>
    );
};

export default Users;
