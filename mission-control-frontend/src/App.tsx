import React, { useEffect } from "react";
import {
    createBrowserRouter,
    RouterProvider,
    Outlet,
    useLocation,
    Navigate
} from "react-router-dom";
import { QueryClientProvider, QueryClient } from "react-query";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Trial from "./pages/Trial";
import Login from "./pages/Login";
import ErrorPage from "./pages/ErrorPage";
import ErrorBoundary from "./components/ErrorBoundary";
import Android from "./pages/Android";
import useVideoRoom from "./features/teleops/hooks/useVideoRoom";
import { useUserStore } from "./stores/userStore";
import { LogMessage, useRobotStore } from "./stores/robotStore";
import { useClientNamespace } from "./lib/sockets/useClientNamespace";
import { useRos } from "./lib/ros/useRos";
import { useRosFns } from "./lib/ros/useRosFns";
import Sessions from "./pages/Sessions";
import Analytics from "./pages/Analytics";
import { APIProvider } from "@vis.gl/react-google-maps";
import Robot from "./features/robots/robot/Robot";
import RobotIssues from "./features/robots/robot/robotIssues/RobotIssues";
import RobotProfile from "./features/robots/robot/robotProfile/RobotProfile";
import IssueThread from "./features/robots/robot/robotIssues/IssueThread";
import RobotManufacturingData from "./features/robots/robot/robotManufacturingData/RobotManufacturingData";
import RobotMotorData from "./features/robots/robot/robotMotorData/RobotMotorData";
import RobotTasks from "./features/robots/robot/robotTasks/RobotTasks";
import QCPage from "./features/QC/QCPage";
import MaintenancePanel from "./features/sessions/maintenancePanel/MaintenancePanel";
import AnalysisPanel from "./features/sessions/AnalysisPanel";
import RobotSessionsCalendar from "./features/sessions/RobotSessionsCalendar";
import Clients from "./pages/Clients";
import Client from "./features/clients/Client";
import ClientConfig from "./features/clients/ClientConfig";
import ClientOperators from "./features/clients/ClientOperators";
import ClientMaterials from "./features/clients/ClientMaterials";
import Operators from "./pages/Operators";
import OperatorRobots from "./features/operators/OperatorRobots";
import OperatorProfile from "./features/operators/OperatorProfile";
import Operator from "./features/operators/Operator";
import RobotOperators from "./features/robots/robot/robotOperators/RobotOperators";
import RobotShipping from "./features/robots/robot/robotShipping/RobotShipping";
import OperatorAttendance from "./features/operators/Attendance";
import Issues from "./pages/Issues";
import Leads from "./pages/Leads";
import AddLead from "./features/leads/AddLead";
import EditLead from "./features/leads/LeadEdit";
import LeadDetails from "./features/leads/LeadDetails";
import Fleet from "./pages/Fleet";
import FleetDetails from "./features/fleet/FleetDetails";
import { useShallow } from "zustand/react/shallow";
import Tutorials from "./pages/Tutorials";
import { checkPermission } from "./util/roles";
import LeadsAnalytics from "./features/leads/LeadsAnalytics";
import Materials from "./pages/Materials";
import Robots from "./pages/Robots";
import MasterData from "./pages/MasterData";
import Operations from "./pages/Operations";
import Overtime from "./pages/Overtime";
import Inventory from "./pages/Inventory";
import Shipping from "./pages/Shipping";
import BillingSummary from "./pages/BillingSummary";
import RobotBillingHistory from "./pages/RobotBillingHistory";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import UnifiedVoiceAssistant from "./components/UnifiedVoiceAssistant";
import { VoiceAssistantProvider } from "./contexts/VoiceAssistantContext";
import "./styles/ai-highlights.css";

// Lazy load infrequently accessed routes
const QCTemplates = React.lazy(() => import("./pages/admin/QCTemplates"));
const TemplateJsonEditor = React.lazy(
    () => import("./features/QC/TemplateEditor/TemplateJsonEditor")
);
const Users = React.lazy(() => import("./pages/Users"));
const UserForm = React.lazy(() => import("./features/users/UserForm"));
const BlogPage = React.lazy(() => import("./features/blog/BlogPage"));
const BlogEditPage = React.lazy(() => import("./features/blog/BlogEditPage"));

/**
 * BrowserRoutes to all the pages available
 */

type ProtectedRouteProps = {
    Page: React.ComponentType;
    Fallback: React.ComponentType;
    permission: string;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    Page,
    Fallback,
    permission
}) => {
    const isPermitted = checkPermission(permission);
    if (isPermitted === null) return <Navigate to="/login" replace />;

    return isPermitted ? <Page /> : <Fallback />;
};

/**
 * Root Layout - Wraps all routes and includes global voice assistant
 */
const RootLayout = () => {
    const location = useLocation();

    // Hide voice assistant on dashboard (uses Autonomy Agent) and login page
    const shouldHideVoiceAssistant = location.pathname === '/dashboard' || location.pathname === '/login';

    return (
        <>
            <Outlet />
            {/* Global Voice Assistant - Shows on all pages except dashboard and login */}
            {!shouldHideVoiceAssistant && <UnifiedVoiceAssistant />}
        </>
    );
};

const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
    {
        index: true,
        path: "/login",
        element: <Login />,
        errorElement: <ErrorPage />
    },
    {
        path: "/",
        element: <App />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "analytics",
                element: <Analytics />
            },
            {
                path: "robots",
                element: (
                    <ProtectedRoute
                        permission="view_robots"
                        Page={Robots}
                        Fallback={Analytics}
                    />
                )
            },
            {
                path: "/robots/:robotId/",
                element: (
                    <ProtectedRoute
                        permission="view_robots"
                        Page={Robot}
                        Fallback={Analytics}
                    />
                ),
                children: [
                    { index: true, element: <Navigate to="profile" replace /> },
                    {
                        path: "profile",
                        element: <RobotProfile />
                    },
                    {
                        path: "issues",
                        element: <RobotIssues />
                    },
                    {
                        path: "operators",
                        element: <RobotOperators />
                    },
                    {
                        path: "manufacturing-data",
                        element: <RobotManufacturingData />
                    },
                    {
                        path: "motor-data",
                        element: <RobotMotorData />
                    },
                    {
                        path: "tasks",
                        element: <RobotTasks />
                    },
                    {
                        path: "shipping",
                        element: <RobotShipping />
                    },
                    {
                        path: "billing",
                        element: <RobotBillingHistory />
                    }
                ]
            },
            {
                path: "/robots/:robotId/issues/:issueId",
                element: (
                    <ProtectedRoute
                        permission="view_issues"
                        Page={IssueThread}
                        Fallback={Analytics}
                    />
                )
            },
            {
                path: "/robots/:robotId/qc",
                element: (
                    <ProtectedRoute
                        permission="view_robots"
                        Page={QCPage}
                        Fallback={Analytics}
                    />
                )
            },
            {
                path: "/robots/:robotId/qc/:submissionId",
                element: (
                    <ProtectedRoute
                        permission="view_robots"
                        Page={QCPage}
                        Fallback={Analytics}
                    />
                )
            },
            {
                path: "dashboard",
                element: (
                    <ErrorBoundary>
                        <Dashboard />
                    </ErrorBoundary>
                )
            },
            {
                path: "master-data",
                element: <MasterData />
            },
            {
                path: "/robots/:robotId/",
                element: (
                    <ProtectedRoute
                        permission="view_robots"
                        Page={Sessions}
                        Fallback={Analytics}
                    />
                ),
                children: [
                    {
                        path: "sessions",
                        element: <RobotSessionsCalendar />
                    },
                    {
                        path: "sessions/:sessionId",
                        element: <AnalysisPanel />
                    },
                    {
                        path: "maintenance/:maintenanceId",
                        element: <MaintenancePanel />
                    }
                ]
            },

            {
                path: "issues",
                element: <Issues />
            },
            {
                path: "overtime",
                element: <Overtime />
            },
            {
                path: "billing",
                element: <BillingSummary />
            }
            /* NOTE: Operations page temporarily disabled - API integration pending
            {
                path: "operations",
                element: <Operations />
            }
            */
        ]
    },
    {
        path: "/clients",
        element: (
            <ProtectedRoute
                permission="view_site_mgmt"
                Page={Clients}
                Fallback={Analytics}
            />
        )
    },
    {
        path: "/clients/:clientId/",
        element: (
            <ProtectedRoute
                permission="view_site_mgmt"
                Page={Client}
                Fallback={Analytics}
            />
        ),
        children: [
            {
                path: "config",
                element: <ClientConfig />
            },
            {
                path: "operators",
                element: <ClientOperators />
            },
            {
                path: "materials",
                element: <ClientMaterials />
            }
        ]
    },
    {
        path: "/operators",
        element: (
            <ProtectedRoute
                permission="view_site_mgmt"
                Page={Operators}
                Fallback={Analytics}
            />
        )
    },
    {
        path: "/operators/:operatorId",
        element: (
            <ProtectedRoute
                permission="view_site_mgmt"
                Page={Operator}
                Fallback={Analytics}
            />
        ),
        children: [
            {
                path: "profile",
                element: <OperatorProfile />
            },
            {
                path: "attendance",
                element: <OperatorAttendance />
            },
            {
                path: "robots",
                element: <OperatorRobots />
            }
        ]
    },
    {
        path: "fleet",
        element: <Outlet />,
        children: [
            {
                path: "/fleet/",
                element: <Fleet />
            },
            {
                path: "/fleet/:id",
                element: <FleetDetails />
            }
        ]
    },
    {
        path: "/materials",
        element: <Materials />
    },
    {
        path: "/inventory",
        element: <Inventory />
    },
    {
        path: "/shipping",
        element: <Shipping />
    },
    {
        path: "leads",
        element: (
            <ProtectedRoute
                permission="view_leads"
                Page={Outlet}
                Fallback={Analytics}
            />
        ),
        children: [
            {
                path: "/leads/",
                element: <Leads />
            },
            {
                path: "/leads/new",
                element: <AddLead />
            },
            {
                path: "/leads/:id",
                element: <LeadDetails />
            },
            {
                path: "/leads/:id/edit",
                element: <EditLead />
            },
            {
                path: "/leads/analytics",
                element: <LeadsAnalytics />
            }
        ]
    },
    {
        path: "tutorials",
        element: (
            <ProtectedRoute
                permission="view_tutorials"
                Page={Tutorials}
                Fallback={Analytics}
            />
        )
    },
    {
        path: "/users",
        element: (
            // lazy loading
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="change_users"
                    Page={Users}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/users/create",
        element: (
            // lazy loading
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="change_users"
                    Page={UserForm}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/users/:userId/edit",
        element: (
            // lazy loading
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="change_users"
                    Page={UserForm}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/qc",
        element: (
            // lazy loading
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="manage_qc_templates"
                    Page={QCTemplates}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/qc/new",
        element: (
            // lazy loading
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="manage_qc_templates"
                    Page={TemplateJsonEditor}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/qc/:id/edit",
        element: (
            // lazy loading
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="manage_qc_templates"
                    Page={TemplateJsonEditor}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/blog",
        element: (
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="view_site_mgmt"
                    Page={BlogPage}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/blog/:id",
        element: (
            <React.Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <LoadingSpinner className="h-10 w-10 animate-spin text-emerald-500" />
                    </div>
                }
            >
                <ProtectedRoute
                    permission="view_site_mgmt"
                    Page={BlogEditPage}
                    Fallback={Analytics}
                />
            </React.Suspense>
        )
    },
    {
        path: "/test",
        element: <Trial />
    },
    {
        path: "android",
        element: <Android />
    }
        ]
    }
]);

/**
 * App component that contains children requiring authentication to access
 * @returns childComponents
 */
function App() {
    const user = useUserStore((state) => state.user);
    const navigate = useNavigate();
    const location = useLocation();
    const [robot, isRobotConnected, setLogs, addLog] = useRobotStore(
        useShallow((state) => [
            state.robot,
            state.isRobotConnected,
            state.setLogs,
            state.addLog
        ])
    );

    useRos();
    useClientNamespace();
    useVideoRoom();
    const { rosSubscribe } = useRosFns();

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
        } else if (user) {
            if (location.pathname === "/dashboard" && robot) {
                navigate("/dashboard", { replace: true });
            } else if (
                location.pathname === "" ||
                location.pathname === "/" ||
                location.pathname === "/dashboard"
            ) {
                if (checkPermission("view_robots")) {
                    navigate("/robots", { replace: true });
                } else {
                    navigate("/analytics", { replace: true });
                }
            } else {
                navigate(location.pathname, { replace: true });
            }
        }
    }, [user, location.pathname]);

    useEffect(() => {
        let listener: ROSLIB.Topic<ROSLIB.Message> | undefined;
        let alertsListener: ROSLIB.Topic<ROSLIB.Message> | undefined;
        if (isRobotConnected) {
            listener = rosSubscribe("/rosout", "rcl_interfaces/msg/Log", {
                queue_length: 0,
                queue_size: 1
            });
            alertsListener = rosSubscribe("/alerts", "rcl_interfaces/msg/Log", {
                queue_length: 0,
                queue_size: 1
            });
            listener?.subscribe((message) => {
                const data = message as LogMessage;
                addLog(data);
            });
            alertsListener?.subscribe((message) => {
                const data = message as LogMessage;
                console.log(data);
                if (data.level === 50) {
                    // const now = Date.now();
                    // const timeDifference = (now - data.stamp.sec * 1000) / 1000;
                    // if (timeDifference < 60)
                    toast.error(data.msg, {
                        position: "top-center",
                        autoClose: false,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "colored"
                    });
                } else if (data.level === 40) {
                    toast.error(data.msg, {
                        position: "top-center",
                        autoClose: false,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "colored"
                    });
                } else if (data.level === 30) {
                    toast.warn(data.msg, {
                        position: "top-center",
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "colored"
                    });
                } else if (data.level === 20) {
                    toast.info(data.msg, {
                        position: "top-center",
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "colored"
                    });
                }
            });
        }

        return () => {
            listener?.unsubscribe();
            alertsListener?.unsubscribe();
            setLogs([]);
        };
    }, [isRobotConnected]);

    // Hide Master Agent on dashboard page (Autonomy Agent is used there instead)
    const isDashboardPage = location.pathname === '/dashboard';

    return (
        <div className="no-scrollbar min-h-screen overflow-scroll">
            <Outlet />
        </div>
    );
}

/**
 *
 * Root Component that contains routes to all other pages
 */

// Create QueryClient OUTSIDE component to prevent recreation on every render
// This preserves cache and prevents unnecessary refetching
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false, // Don't refetch when user returns to window
            refetchOnMount: false, // Don't refetch on component mount if data exists
            refetchOnReconnect: false, // Don't refetch on network reconnect
            staleTime: 60000, // Data stays fresh for 60 seconds
            cacheTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
            retry: 1, // Only retry failed requests once
            retryDelay: (attemptIndex) =>
                Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
        },
        mutations: {
            retry: 0 // Don't retry mutations
        }
    }
});

const WrappedApp = () => {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <VoiceAssistantProvider>
                    <APIProvider apiKey={import.meta.env.VITE_MAP_KEY}>
                        <RouterProvider router={router} />
                        <ToastContainer theme="dark" limit={5} autoClose={1000} />
                    </APIProvider>
                </VoiceAssistantProvider>
            </QueryClientProvider>
        </>
    );
};
export default WrappedApp;
