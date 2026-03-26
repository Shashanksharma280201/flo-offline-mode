import winston from "winston";
import dayjs from "dayjs";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  data: 4,
  debug: 5
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  data: "cyan",
  debug: "white"
};

winston.addColors(colors);

const level = () => {
  const env = process.env.NODE_ENV ?? "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "debug";
};
const timeZone = () =>
  new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

const format = winston.format.combine(
  // Add the message timestamp with the preferred format
  winston.format.timestamp({ format: timeZone }),
  // Tell Winston that the logs must be colored
  winston.format.colorize({ all: true }),
  // Tell winston to include stack traces for errors
  winston.format.errors({ stack: true }),
  // Define the format of the message showing the timestamp, the level and the message,
  winston.format.printf(
    (info) =>
      `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message} ${
        info.stack ? info.stack : ""
      }`
  )
);

// Define which transports the logger must use to print out messages.
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      // Add the message timestamp with the preferred format
      winston.format.timestamp({ format: timeZone }),
      // Tell Winston that the logs must be colored
      winston.format.colorize({ all: true }),
      // Tell winston to include stack traces for errors
      winston.format.errors({ stack: true }),
      // Define the format of the message showing the timestamp, the level and the message,
      winston.format.printf(
        (info) =>
          `${info.timestamp} [${info.level}]: ${info.message} ${
            info.stack ? info.stack : ""
          }`
      )
    )
  }),
  new winston.transports.File({
    filename: `logs/error_${dayjs(Date.now()).format("DD-MM-YYYY")}.log`,
    level: "error"
  }),
  new winston.transports.File({
    filename: `logs/server_${dayjs(Date.now()).format("DD-MM-YYYY")}.log`
  })
];
// Create the logger instance that has to be exported
// and used to log messages.
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports
});

export function logMemoryUsage(label: string) {
  const memoryUsage = process.memoryUsage();
  logger.info(
    `[${label}]Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(
      2
    )} / ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB `
  );
}

export default logger;
