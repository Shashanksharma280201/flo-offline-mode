import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

const environment = process.env.NODE_ENV;
/**
 * MiddleWare that handles all the Runtime errors thrown
 * @param err - errors thrown
 * @param req - Response
 * @param res - Response
 *
 *
 */
const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = res.statusCode ? res.statusCode : 500;
  const statusCode = status < 300 ? 400 : status;
  res.status(statusCode);
  logger.error(err.message);
  res.json({
    message: err.message,
    ...(environment === "development" && { stack: err.stack })
  });
};

export default errorHandler;
