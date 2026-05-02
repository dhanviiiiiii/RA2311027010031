const { sendLog } = require("./logger");

function levelFromStatus(statusCode) {
  if (statusCode >= 500) return "fatal";
  if (statusCode >= 400) return "error";
  if (statusCode >= 300) return "warn";
  return "info";
}

function inferPackage(path) {
  if (path.includes("/auth")) return "auth";
  if (path.includes("/config")) return "config";
  if (path.includes("/cache")) return "cache";
  if (path.includes("/cron")) return "cron_job";
  if (path.includes("/db") || path.includes("/database")) return "db";
  if (path.includes("/domain")) return "domain";
  if (path.includes("/repository") || path.includes("/repo")) return "repository";
  if (path.includes("/service")) return "service";
  if (path.includes("/route") || path.includes("/api")) return "route";
  return "handler";
}

function createLoggingMiddleware({ token, getToken, stack = "backend", silent = false }) {
  return function loggingMiddleware(req, res, next) {
    const startTime = Date.now();
    const originalEnd = res.end.bind(res);

    res.end = function (...args) {
      originalEnd(...args);

      // Always get a fresh token — reads from .env each time
      const activeToken = getToken ? getToken() : token;

      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const level = levelFromStatus(statusCode);
      const pkg = inferPackage(req.path);
      const message = `${req.method} ${req.originalUrl} → ${statusCode} (${duration}ms)`;

      sendLog(stack, level, pkg, message, activeToken).catch((err) => {
        if (!silent) {
          console.error("[logging_middleware] Could not deliver log:", err.message);
        }
      });
    };

    next();
  };
}

module.exports = { createLoggingMiddleware };
