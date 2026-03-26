import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "react-query";
import { toast } from "react-toastify";
import { MdClose } from "react-icons/md";
import { errorLogger } from "@/util/errorLogger";
import { ALL_PERMISSIONS, DEFAULT_CUSTOM_PERMISSIONS } from "@/util/roles";
import {
    createUser,
    updateUser,
    fetchUserById,
    CreateUserData,
    UserResponse
} from "./services/userService";
import { fetchAllOperators } from "@/features/operators/services/operatorService";
import { fetchClients } from "@/features/clients/services/clientService";
import { fetchAllRobots } from "@/features/robots/services/robotsService";
import { RobotType } from "@/data/types";
import { ClientData } from "@/data/types/userTypes";
import { Operator } from "@/data/types/appDataTypes";

const UserForm = () => {
    const { userId } = useParams<{ userId?: string }>();
    const navigate = useNavigate();
    const isEditMode = !!userId;

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"admin" | "custom">("custom");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([...DEFAULT_CUSTOM_PERMISSIONS]);
    const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectedOperators, setSelectedOperators] = useState<string[]>([]);

    // Available options
    const [robots, setRobots] = useState<RobotType[]>([]);
    const [clients, setClients] = useState<ClientData[]>([]);
    const [operators, setOperators] = useState<Operator[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Fetch available options
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoadingData(true);
                const [fetchedRobots, fetchedClients, fetchedOperators] = await Promise.all([
                    fetchAllRobots(),
                    fetchClients(),
                    fetchAllOperators()
                ]);
                setRobots(fetchedRobots);
                setClients(fetchedClients);
                setOperators(fetchedOperators);
            } catch (error) {
                errorLogger(error);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchData();
    }, []);

    // Fetch existing user data if editing
    const { mutate: fetchUser, isLoading: isFetchingUser } = useMutation({
        mutationFn: (id: string) => fetchUserById(id),
        onSuccess: (data: UserResponse) => {
            setName(data.name);
            setEmail(data.email);
            setRole(data.role as "admin" | "custom");
            setSelectedPermissions(data.permissions || []);
            setSelectedRobots(data.robots || []);
            setSelectedClients(data.clients || []);
            setSelectedOperators(data.operators || []);
        },
        onError: (error) => {
            errorLogger(error);
            toast.error("Failed to load user data");
            navigate("/users");
        }
    });

    useEffect(() => {
        if (isEditMode && userId) {
            fetchUser(userId);
        }
    }, [userId, isEditMode]);

    // Create/Update mutation
    const { mutate: saveUser, isLoading: isSaving } = useMutation({
        mutationFn: async () => {
            if (isEditMode && userId) {
                // In edit mode, only send password if it's not empty
                const updateData: CreateUserData = {
                    name,
                    email,
                    password: password || "",  // Temporary value, will be conditionally removed below
                    role,
                    permissions: role === "custom" ? selectedPermissions : undefined,
                    robots: selectedRobots,
                    clients: selectedClients,
                    operators: selectedOperators
                };

                // Build the final update payload
                const finalUpdateData: any = {
                    name: updateData.name,
                    email: updateData.email,
                    role: updateData.role,
                    permissions: updateData.permissions,
                    robots: updateData.robots,
                    clients: updateData.clients,
                    operators: updateData.operators
                };

                // Only include password if it was provided
                if (password) {
                    finalUpdateData.password = password;
                }

                return updateUser(userId, finalUpdateData);
            } else {
                // In create mode, all fields are required
                const userData: CreateUserData = {
                    name,
                    email,
                    password,
                    role,
                    permissions: role === "custom" ? selectedPermissions : undefined,
                    robots: selectedRobots,
                    clients: selectedClients,
                    operators: selectedOperators
                };
                return createUser(userData);
            }
        },
        onSuccess: () => {
            toast.success(isEditMode ? "User updated successfully" : "User created successfully");
            navigate("/users");
        },
        onError: (error) => errorLogger(error)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!name.trim()) {
            toast.error("Name is required");
            return;
        }
        if (!email.trim()) {
            toast.error("Email is required");
            return;
        }
        if (!isEditMode && !password) {
            toast.error("Password is required");
            return;
        }
        if (role === "custom" && selectedPermissions.length === 0) {
            toast.error("Please select at least one permission for custom users");
            return;
        }

        saveUser();
    };

    const togglePermission = (permission: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const toggleRobot = (robotId: string) => {
        setSelectedRobots(prev =>
            prev.includes(robotId)
                ? prev.filter(r => r !== robotId)
                : [...prev, robotId]
        );
    };

    const toggleClient = (clientId: string) => {
        setSelectedClients(prev =>
            prev.includes(clientId)
                ? prev.filter(c => c !== clientId)
                : [...prev, clientId]
        );
    };

    const toggleOperator = (operatorId: string) => {
        setSelectedOperators(prev =>
            prev.includes(operatorId)
                ? prev.filter(o => o !== operatorId)
                : [...prev, operatorId]
        );
    };

    // Select/Deselect All functions
    const toggleAllPermissions = () => {
        if (selectedPermissions.length === ALL_PERMISSIONS.length) {
            setSelectedPermissions([...DEFAULT_CUSTOM_PERMISSIONS]);
        } else {
            setSelectedPermissions([...ALL_PERMISSIONS]);
        }
    };

    const toggleAllRobots = () => {
        if (selectedRobots.length === robots.length) {
            setSelectedRobots([]);
        } else {
            setSelectedRobots(robots.map((robot: RobotType) => robot.id));
        }
    };

    const toggleAllClients = () => {
        if (selectedClients.length === clients.length) {
            setSelectedClients([]);
        } else {
            setSelectedClients(clients.map(client => client.id));
        }
    };

    const toggleAllOperators = () => {
        if (selectedOperators.length === operators.length) {
            setSelectedOperators([]);
        } else {
            setSelectedOperators(operators.map(operator => operator.id));
        }
    };

    const isLoading = isLoadingData || isFetchingUser;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm p-4 md:p-6 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-1 bg-green-500 rounded-full"></div>
                    <h1 className="text-xl font-bold text-white md:text-2xl">
                        {isEditMode ? "Edit User" : "Create New User"}
                    </h1>
                </div>
                <button
                    onClick={() => navigate("/users")}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 hover:border-slate-500 transition-all"
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                {/* Basic Information */}
                <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-6 md:p-8 shadow-xl hover:border-slate-600/50 transition-all">
                    <div className="flex items-center gap-2 mb-6">
                        {/* <div className="h-2 w-2 bg-blue-500 rounded-full"></div> */}
                        <h2 className="text-lg font-bold text-white">Basic Information</h2>
                    </div>

                    <div className="space-y-5">
                        <fieldset className="flex flex-col gap-2">
                            <label htmlFor="name" className="text-sm font-medium text-slate-300">Name *</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter user name"
                                required
                                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 p-3 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                            />
                        </fieldset>

                        <fieldset className="flex flex-col gap-2">
                            <label htmlFor="email" className="text-sm font-medium text-slate-300">Email *</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter email address"
                                required
                                disabled={isEditMode}
                                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 p-3 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {isEditMode && <p className="text-xs text-slate-400">Email cannot be changed</p>}
                        </fieldset>

                        <fieldset className="flex flex-col gap-2">
                            <label htmlFor="password" className="text-sm font-medium text-slate-300">
                                {isEditMode ? "Password (optional)" : "Password *"}
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isEditMode ? "Leave empty to keep current password" : "Enter password"}
                                required={!isEditMode}
                                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 p-3 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                            />
                            {isEditMode && <p className="text-xs text-slate-400">Leave empty to keep current password</p>}
                        </fieldset>
                    </div>
                </section>

                {/* Role Selection */}
                <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-6 md:p-8 shadow-xl hover:border-slate-600/50 transition-all">
                    <div className="flex items-center gap-2 mb-6">
                        {/* <div className="h-2 w-2 bg-purple-500 rounded-full"></div> */}
                        <h2 className="text-lg font-bold text-white">Role & Access Level</h2>
                    </div>

                    <fieldset className="flex flex-col gap-2">
                        <label htmlFor="role" className="text-sm font-medium text-slate-300">User Role *</label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as "admin" | "custom")}
                            className="w-full rounded-lg border border-slate-600 bg-slate-900/50 p-3 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all cursor-pointer"
                        >
                            <option value="custom">Custom (Limited Access)</option>
                            <option value="admin">Admin (Full Access)</option>
                        </select>
                    </fieldset>

                    {role === "admin" && (
                        <div className="mt-4 rounded-lg bg-purple-500/10 border border-purple-500/30 p-4">
                            <p className="text-sm text-purple-300">
                                Admin users have unrestricted access to all features and permissions.
                            </p>
                        </div>
                    )}
                </section>

                {/* Permissions (only for custom role) */}
                {role === "custom" && (
                    <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-6 md:p-8 shadow-xl hover:border-slate-600/50 transition-all">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {/* <div className="h-2 w-2 bg-orange-500 rounded-full"></div> */}
                                <h2 className="text-lg font-bold text-white">Permissions</h2>
                            </div>
                            <button
                                type="button"
                                onClick={toggleAllPermissions}
                                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 hover:border-slate-500 transition-all"
                            >
                                {selectedPermissions.length === ALL_PERMISSIONS.length ? "Deselect All" : "Select All"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {ALL_PERMISSIONS.map((permission) => (
                                <label
                                    key={permission}
                                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-900/30 p-3 hover:bg-slate-700/30 hover:border-green-500/30 transition-all"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(permission)}
                                        onChange={() => togglePermission(permission)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-2 focus:ring-green-500/20 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                                        {permission.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-sm">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                                    style={{ width: `${(selectedPermissions.length / ALL_PERMISSIONS.length) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-slate-400 font-medium whitespace-nowrap">
                                {selectedPermissions.length} / {ALL_PERMISSIONS.length}
                            </span>
                        </div>
                    </section>
                )}

                {/* Robots Access */}
                <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-6 md:p-8 shadow-xl hover:border-slate-600/50 transition-all">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* <div className="h-2 w-2 bg-cyan-500 rounded-full"></div> */}
                            <h2 className="text-lg font-bold text-white">Robot Access</h2>
                        </div>
                        {robots.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleAllRobots}
                                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 hover:border-slate-500 transition-all"
                            >
                                {selectedRobots.length === robots.length ? "Deselect All" : "Select All"}
                            </button>
                        )}
                    </div>
                    <p className="mb-4 text-sm text-slate-400">
                        Select which robots this user can view and manage. Leave empty to show no robots.
                    </p>

                    <div className="max-h-80 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                        {robots.length > 0 ? (
                            robots.map((robot: RobotType) => (
                                <label
                                    key={robot.id}
                                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-900/30 p-3 hover:bg-slate-700/30 hover:border-cyan-500/30 transition-all"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedRobots.includes(robot.id)}
                                        onChange={() => toggleRobot(robot.id)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-200 group-hover:text-white transition-colors font-medium">{robot.name}</span>
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-8">No robots available</p>
                        )}
                    </div>

                    {robots.length > 0 && (
                        <div className="mt-6 flex items-center gap-2 text-sm">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                                    style={{ width: `${(selectedRobots.length / robots.length) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-slate-400 font-medium whitespace-nowrap">
                                {selectedRobots.length} / {robots.length}
                            </span>
                        </div>
                    )}
                </section>

                {/* Clients Access */}
                <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-6 md:p-8 shadow-xl hover:border-slate-600/50 transition-all">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* <div className="h-2 w-2 bg-emerald-500 rounded-full"></div> */}
                            <h2 className="text-lg font-bold text-white">Client Access</h2>
                        </div>
                        {clients.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleAllClients}
                                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 hover:border-slate-500 transition-all"
                            >
                                {selectedClients.length === clients.length ? "Deselect All" : "Select All"}
                            </button>
                        )}
                    </div>
                    <p className="mb-4 text-sm text-slate-400">
                        Select which clients this user can view and manage.
                    </p>

                    <div className="max-h-80 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                        {clients.length > 0 ? (
                            clients.map((client) => (
                                <label
                                    key={client.id}
                                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-900/30 p-3 hover:bg-slate-700/30 hover:border-emerald-500/30 transition-all"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedClients.includes(client.id)}
                                        onChange={() => toggleClient(client.id)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-200 group-hover:text-white transition-colors font-medium">{client.name}</span>
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-8">No clients available</p>
                        )}
                    </div>

                    {clients.length > 0 && (
                        <div className="mt-6 flex items-center gap-2 text-sm">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
                                    style={{ width: `${(selectedClients.length / clients.length) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-slate-400 font-medium whitespace-nowrap">
                                {selectedClients.length} / {clients.length}
                            </span>
                        </div>
                    )}
                </section>

                {/* Operators Access */}
                <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-6 md:p-8 shadow-xl hover:border-slate-600/50 transition-all">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* <div className="h-2 w-2 bg-amber-500 rounded-full"></div> */}
                            <h2 className="text-lg font-bold text-white">Operator Access</h2>
                        </div>
                        {operators.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleAllOperators}
                                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 hover:border-slate-500 transition-all"
                            >
                                {selectedOperators.length === operators.length ? "Deselect All" : "Select All"}
                            </button>
                        )}
                    </div>
                    <p className="mb-4 text-sm text-slate-400">
                        Select which operators this user can view and manage.
                    </p>

                    <div className="max-h-80 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                        {operators.length > 0 ? (
                            operators.map((operator) => (
                                <label
                                    key={operator.id}
                                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-900/30 p-3 hover:bg-slate-700/30 hover:border-amber-500/30 transition-all"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedOperators.includes(operator.id)}
                                        onChange={() => toggleOperator(operator.id)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col flex-1">
                                        <span className="text-sm text-slate-200 group-hover:text-white transition-colors font-medium">{operator.name}</span>
                                        <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                                            {operator.client?.name || "No client"}
                                        </span>
                                    </div>
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-8">No operators available</p>
                        )}
                    </div>

                    {operators.length > 0 && (
                        <div className="mt-6 flex items-center gap-2 text-sm">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                                    style={{ width: `${(selectedOperators.length / operators.length) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-slate-400 font-medium whitespace-nowrap">
                                {selectedOperators.length} / {operators.length}
                            </span>
                        </div>
                    )}
                </section>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 border-t border-slate-700/50 pt-6 mt-2">
                    <button
                        type="button"
                        onClick={() => navigate("/users")}
                        className="rounded-lg border border-slate-600 bg-slate-800/50 px-8 py-3 font-semibold text-white hover:bg-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-3 font-semibold text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 transition-all"
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : isEditMode ? "Update User" : "Create User"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserForm;
