import jwt from "jsonwebtoken";

/**
 * Generates JWT token for user
 * @param email - user's emailId
 * @param role - user's role (admin or custom)
 * @param permissions - user's custom permissions array (for custom role)
 *
 * @returns JWT token
 */
export const generateEmailToken = (email: string, role?: string, permissions?: string[]) => {
  const payload: { email: string; role?: string; permissions?: string[] } = { email };

  if (role) {
    payload.role = role;
  }

  // Include permissions for custom role users
  if (role === "custom" && permissions) {
    payload.permissions = permissions;
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "30d"
  });
  return token;
};

/**
 * Generates JWT token for robot
 * @param deviceId - robot's deviceId(mobile no)
 *
 *
 * @returns JWT token
 */
export const generateRobotToken = (deviceId: string) => {
  const token = jwt.sign({ deviceId }, process.env.JWT_SECRET as string, {
    expiresIn: "30d"
  });
  return token;
};

export const generateAppToken = (userId: string) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "30d"
  });
  return token;
};
