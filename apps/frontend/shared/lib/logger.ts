import pino from "pino";

// Shared logger instance for Frontend (Server Components/Actions)
export const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport:
        process.env.NODE_ENV === "development"
            ? {
                  target: "pino-pretty",
                  options: {
                      colorize: true,
                      translateTime: "SYS:standard",
                      ignore: "pid,hostname",
                  },
              }
            : undefined,
});

export default logger;
