import { getAuthUser } from "@/features/auth/authService";
import { jwtDecode } from "jwt-decode";

// All available permissions in the system (must match backend)
export const ALL_PERMISSIONS = [
    // View permissions
    "view_fleet",
    "view_issues",
    "view_site_mgmt",
    "view_missions",
    "view_leads",
    "view_robots",
    "view_tutorials",
    "view_analytics",
    // Change permissions
    "change_tutorials",
    "change_robots",
    "change_leads",
    "change_fleet",
    "change_issues",
    "change_site_mgmt",
    "change_missions",
    "change_users",
    "manage_qc_templates"
] as const;

// Default permissions for new custom users (basic user role)
export const DEFAULT_CUSTOM_PERMISSIONS = [
    "view_fleet",
    "view_issues",
    "view_site_mgmt",
    "view_missions"
];

const ROLES: { [key: string]: string[] } = {
    admin: [...ALL_PERMISSIONS], // Admin has all permissions
    custom: [] // Custom role uses user.permissions array from token
};

interface DecodedToken {
    role: string;
    email: string;
    permissions?: string[];
}

export const checkPermission = (permission: string) => {
    const { token } = getAuthUser() || {};
    if (!token) return null;

    const decoded = jwtDecode(token) as DecodedToken;
    const { role, permissions } = decoded;

    if (!role) return null;

    // Admin always has all permissions
    if (role === "admin") return true;

    // Custom role uses custom permissions from token
    if (role === "custom" && permissions) {
        return permissions.includes(permission);
    }

    // Fallback to role-based permissions (backward compatibility)
    return ROLES[role]?.includes(permission) ?? false;
};
