import morgan, { StreamOptions } from "morgan";

import logger from "../utils/logger";
import { formatBytes } from "../utils/bytesConvertor";

// Override the stream method by telling
// Morgan to use our custom logger instead of the console.log.
const stream: StreamOptions = {
  // Use the http severity
  write: (message) => logger.http(message)
};

// Skip all the Morgan http log if the
// application is not running in development mode.

// const skip = () => {
//   const env = process.env.NODE_ENV || "development";
//   return env !== "development";
// };
// Define the custom token
morgan.token("formattedContentLength", (req, res) => {
  // You can replace 'res.getHeader('content-length')' with the actual way you get the content length in your response
  const contentLength = res.getHeader("content-length");
  return formatBytes(Number(contentLength));
});
// Build the morgan middleware
const morganMiddleware = morgan(
  // Define message format string.
  // The message format is made from tokens, and each token is
  // defined inside the Morgan library.
  ":remote-addr :method :url :status :formattedContentLength - :response-time ms",
  {
    stream
    // skip(req, res) {
    //   return res.statusCode < 400;
    // }
  }
);

export default morganMiddleware;
