import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import logger from "../utils/logger";

/**
 * List of authorized emails that can manage QC forms
 * Only these users can create, update, and delete QC form templates
 */
const AUTHORIZED_QC_ADMINS = [
  "contact@flomobility.com",
  "robotics@flomobility.com"
];

/**
 * Middleware that restricts QC form template management to authorized admins
 * @param req - Request
 * @param res - Response
 * @param next - Next function
 */
export const protectQCAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn("QC Admin access attempted without authentication");
      res.status(401);
      throw new Error("Not authorized - no user found");
    }

    const userEmail = req.user.email;

    if (!AUTHORIZED_QC_ADMINS.includes(userEmail)) {
      logger.warn(
        `QC Admin access denied for user: ${userEmail}. Only authorized emails can manage QC forms.`
      );
      res.status(403);
      throw new Error(
        "Access denied. Only authorized administrators can manage QC forms."
      );
    }

    logger.info(`QC Admin access granted to: ${userEmail}`);
    next();
  }
);

/**
 * Helper function to check if a user is a QC admin
 * @param email - User email
 * @returns boolean
 */
export const isQCAdmin = (email: string): boolean => {
  return AUTHORIZED_QC_ADMINS.includes(email);
};

export default protectQCAdmin;
