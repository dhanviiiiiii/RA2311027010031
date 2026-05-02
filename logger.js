const https = require("https");
const http = require("http");

const LOG_ENDPOINT = "http://20.207.122.201/evaluation-service/logs";

const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const BACKEND_PACKAGES = [
  "cache", "controller", "cron_job", "db", "domain",
  "handler", "repository", "route", "service",
];
const FRONTEND_PACKAGES = ["api", "component", "hook", "page", "state", "style"];
const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];

/**
 * Validates the log payload before sending.
 * @param {string} stack
 * @param {string} level
 * @param {string} pkg
 * @returns {{ valid: boolean, reason?: string }}
 */
function validatePayload(stack, level, pkg) {
  if (!VALID_STACKS.includes(stack)) {
    return { valid: false, reason: `Invalid stack: "${stack}". Must be one of ${VALID_STACKS.join(", ")}` };
  }
  if (!VALID_LEVELS.includes(level)) {
    return { valid: false, reason: `Invalid level: "${level}". Must be one of ${VALID_LEVELS.join(", ")}` };
  }

  const allowed =
    stack === "backend"
      ? [...BACKEND_PACKAGES, ...SHARED_PACKAGES]
      : [...FRONTEND_PACKAGES, ...SHARED_PACKAGES];

  if (!allowed.includes(pkg)) {
    return {
      valid: false,
      reason: `Package "${pkg}" is not valid for stack "${stack}". Allowed: ${allowed.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Sends a log entry to the AffordMed evaluation API.
 *
 * @param {string} stack    - "backend" | "frontend"
 * @param {string} level    - "debug" | "info" | "warn" | "error" | "fatal"
 * @param {string} pkg      - package name (see spec for allowed values per stack)
 * @param {string} message  - log message
 * @param {string} token    - Bearer access token
 * @returns {Promise<{ logID: string, message: string }>}
 */
async function sendLog(stack, level, pkg, message, token) {
  const check = validatePayload(stack, level, pkg);
  if (!check.valid) {
    throw new Error(`[logging_middleware] Validation failed: ${check.reason}`);
  }

  const body = JSON.stringify({
    stack,
    level,
    package: pkg,
    message,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(LOG_ENDPOINT);
    const transport = url.protocol === "https:" ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: `Bearer ${token}`,
      },
    };

    const req = transport.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(`[logging_middleware] API error ${res.statusCode}: ${raw}`));
          }
        } catch {
          reject(new Error(`[logging_middleware] Failed to parse API response: ${raw}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`[logging_middleware] Network error: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

module.exports = { sendLog };
