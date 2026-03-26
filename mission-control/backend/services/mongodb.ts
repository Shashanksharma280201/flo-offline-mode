import mongoose, { ClientSession } from "mongoose";
import colors from "colors";

import logger from "../utils/logger";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(process.env.DB_URI as string);

    logger.info(
      colors.cyan.underline(`MongoDB Connected: ${conn.connection.host}`)
    );
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

type TransactionCallback<T> = (session: ClientSession) => Promise<T>;

async function commitWithRetry(
  session: ClientSession,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<void> {
  try {
    await session.commitTransaction();
  } catch (error: any) {
    if (
      error.errorLabels &&
      error.errorLabels.indexOf("UnknownTransactionCommitResult") >= 0
    ) {
      if (retryCount >= maxRetries) {
        logger.error(
          `Commit failed after ${maxRetries} retries, aborting transaction`
        );
        throw error;
      }

      const backoffDelay = Math.min(100 * Math.pow(2, retryCount), 1000);
      logger.error(
        `UnknownTransactionCommitResult, retrying commit operation (attempt ${retryCount + 1}/${maxRetries}) after ${backoffDelay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return await commitWithRetry(session, retryCount + 1, maxRetries);
    } else {
      logger.error("Error during commit ...");
      throw error;
    }
  }
}

export const runInTransaction = async <T>(
  callback: TransactionCallback<T>,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<T> => {
  const session: ClientSession = await mongoose.startSession();

  session.startTransaction();

  try {
    const result: T = await callback(session);

    // Commit the changes
    await commitWithRetry(session);

    return result;
  } catch (error: any) {
    // Abort transaction before handling error
    await session.abortTransaction();

    // If transient error, retry the whole transaction
    if (
      error.errorLabels &&
      error.errorLabels.indexOf("TransientTransactionError") >= 0
    ) {
      if (retryCount >= maxRetries) {
        logger.error(
          `Transaction failed after ${maxRetries} retries, giving up`
        );
        throw error;
      }

      const backoffDelay = Math.min(100 * Math.pow(2, retryCount), 1000);
      logger.error(
        `TransientTransactionError, retrying transaction (attempt ${retryCount + 1}/${maxRetries}) after ${backoffDelay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return await runInTransaction(callback, retryCount + 1, maxRetries);
    } else {
      logger.error("runTransactionWithRetry error: ");
      throw error;
    }
  } finally {
    // Ending the session
    session.endSession();
  }
};

export default connectDB;
