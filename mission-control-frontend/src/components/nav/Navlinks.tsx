import {
    Bot,
    AlertCircle,
    Database,
    Truck,
    CarFront,
    Boxes,
    Users,
    UserCog,
    Clock,
    Package,
    ReceiptIndianRupee,
    GraduationCap,
    BarChart3,
    LogOut,
    UserPlus
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSocketStore } from "../../stores/socketStore";
import { logout } from "../../features/auth/authService";
import { checkPermission } from "@/util/roles";

/**
 * Links:
 * * Robots & Fleet management
 * * Issues & Master Data
 * * Site Management (Clients, Operators, Billing, etc)
 * * Analytics & Tutorials
 * * Logout
 */
const Navlinks = () => {
    const clientSocket = useSocketStore((state) => state.clientSocket);
    const navigate = useNavigate();

    /**
     * Signs out the user
     */
    const signOutHandler = () => {
        clientSocket?.disconnect();
        logout();
        navigate("/login", { replace: true });
    };

    const iconClass = "h-5 w-5";

    // Standardized class to handle the "active" highlight for all links
    const navItemClass = ({ isActive }: { isActive: boolean }) =>
        `rounded-md p-4 hover:bg-slate-800 hover:translate-x-1 transition-transform delay-75 flex items-center gap-3 ${
            isActive ? "text-white bg-slate-800/50" : "text-neutral-400/65"
        }`;

    return (
        <nav className="flex h-full flex-col justify-between">
            <section className="flex flex-col justify-center">
                {/* --- ROBOTICS --- */}
                {checkPermission("view_robots") && (
                    <NavLink to="/robots" className={navItemClass}>
                        {/* <Bot className={iconClass} /> */}
                        Robots
                    </NavLink>
                )}
                {/* OFFLINE MODE: Commented out items */}
                {/* {checkPermission("view_issues") && (
                    <NavLink to="/issues" className={navItemClass}>
                        Robot Issues
                    </NavLink>
                )}
                {checkPermission("view_issues") && (
                    <NavLink to="/master-data" className={navItemClass}>
                        Robot Master Data
                    </NavLink>
                )} */}

                {/* <NavLink
                    to="/operations"
                    className={navItemClass}
                >
                    <CirclePlay className={iconClass} />
                    Operations
                </NavLink> */}

                {/* --- LOGISTICS & ASSETS --- */}
                {/* OFFLINE MODE: Commented out logistics items */}
                {/* {checkPermission("view_fleet") && (
                    <NavLink to="/fleet" className={navItemClass}>
                        Fleet
                    </NavLink>
                )}
                {checkPermission("change_robots") && (
                    <NavLink to="/inventory" className={navItemClass}>
                        Inventory
                    </NavLink>
                )}
                {checkPermission("view_site_mgmt") && (
                    <NavLink to="/materials" className={navItemClass}>
                        Materials
                    </NavLink>
                )}
                {(checkPermission("change_robots") ||
                    checkPermission("view_site_mgmt")) && (
                    <NavLink to="/shipping" className={navItemClass}>
                        Shipping
                    </NavLink>
                )} */}

                {/* --- MANAGEMENT --- */}
                {/* OFFLINE MODE: Commented out management items */}
                {/* {checkPermission("view_site_mgmt") && (
                    <>
                        <NavLink to="/clients" className={navItemClass}>
                            Clients
                        </NavLink>
                        <NavLink to="/operators" className={navItemClass}>
                            Operators
                        </NavLink>
                        <NavLink to="/overtime" className={navItemClass}>
                            Overtime Management
                        </NavLink>
                        <NavLink to="/billing" className={navItemClass}>
                            Billing
                        </NavLink>
                    </>
                )} */}

                {/* --- INSIGHTS --- */}
                {/* OFFLINE MODE: Commented out tutorials and analytics */}
                {/* {checkPermission("view_tutorials") && (
                    <NavLink to="/tutorials" className={navItemClass}>
                        Tutorials
                    </NavLink>
                )} */}
                {/* {checkPermission("change_users") && (
                    <NavLink
                        to="/users"
                        className={navItemClass}
                    >
                        User Management
                    </NavLink>
                )} */}
                {/* <NavLink to="/analytics" className={navItemClass}>
                    Analytics
                </NavLink> */}
            </section>

            <section className="flex flex-col justify-center gap-2">
                {/* {checkPermission("change_users") && (
                    <button
                        onClick={() => navigate("/users/create")}
                        className={`flex items-center gap-4 rounded-xl bg-green-500 p-4 hover:bg-green-600`}
                    >
                        <UserPlus className={iconClass} />
                        Create Account
                    </button>
                )} */}
                <button
                    onClick={signOutHandler}
                    className={`flex items-center gap-4 rounded-xl bg-clip-padding p-4 transition-colors hover:bg-red-500/55`}
                >
                    <LogOut className={iconClass} />
                    Logout
                </button>
            </section>
        </nav>
    );
};

export default Navlinks;
