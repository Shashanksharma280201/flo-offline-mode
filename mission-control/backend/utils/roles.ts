// All available permissions in the system
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
  "change_users", // NEW: Permission to create/edit users
  "manage_qc_templates",
  "manage_blogs"
] as const;

// Role-based permission sets
const ROLES: { [key: string]: string[] } = {
  admin: [...ALL_PERMISSIONS], // Admin has all permissions
  custom: [] // Custom role uses user.permissions array
};

// Default permissions for new custom users (basic user role)
export const DEFAULT_CUSTOM_PERMISSIONS = [
  "view_fleet",
  "view_issues",
  "view_site_mgmt",
  "view_missions"
];

/**
 * Check if a user has a specific permission
 * @param roleName - User's role (admin or custom)
 * @param permission - Permission to check
 * @param customPermissions - Optional custom permissions array for custom role
 */
export const checkPermission = (
  roleName: string,
  permission: string,
  customPermissions?: string[]
): boolean => {
  // Admin always has all permissions
  if (roleName === "admin") {
    return true;
  }

  // Custom role uses user-specific permissions
  if (roleName === "custom" && customPermissions) {
    return customPermissions.includes(permission);
  }

  // Fallback to role-based permissions (backward compatibility)
  const role = ROLES[roleName];
  if (role) {
    return role.includes(permission);
  }

  return false;
};
