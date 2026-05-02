require("dotenv").config();
const express = require("express");
const { createLoggingMiddleware, Log } = require("./index");
const app = express();
app.use(express.json());

app.use(
  createLoggingMiddleware({
    token: process.env.ACCESS_TOKEN,
    stack: "backend",
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/data", (req, res) => {
  const { value } = req.body;

  if (typeof value !== "boolean") {
    Log("backend", "error", "handler", "received string, expected bool");
    return res.status(400).json({ error: "value must be a boolean" });
  }

  res.json({ received: value });
});

app.get("/api/crash", (req, res) => {
  Log("backend", "fatal", "db", "Critical database connection failure.");
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Example app running on http://localhost:${PORT}`);
  console.log("Every request/response will be forwarded to the AffordMed log API.");
});
