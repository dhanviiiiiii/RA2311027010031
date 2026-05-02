const { createLoggingMiddleware } = require("./middleware");
const { sendLog } = require("./logger");
const fs = require("fs");
const path = require("path");

// Reads the token fresh from .env file every time — avoids stale token issue
function getFreshToken() {
  try {
    const envPath = path.join(__dirname, ".env");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^ACCESS_TOKEN=(.+)$/m);
    return match ? match[1].trim() : process.env.ACCESS_TOKEN || "";
  } catch {
    return process.env.ACCESS_TOKEN || "";
  }
}

async function Log(stack, level, pkg, message, token) {
  const t = token || getFreshToken();
  try {
    const result = await sendLog(stack, level, pkg, message, t);
    console.log(`[Log] Delivered → logID: ${result.logID}`);
  } catch (err) {
    console.error(`[Log] Failed: ${err.message}`);
  }
}

module.exports = {
  createLoggingMiddleware: (opts) =>
    createLoggingMiddleware({ ...opts, getToken: getFreshToken }),
  Log,
  sendLog,
  getFreshToken,
};
