#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createWebSessionStore } from "./web-session-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const webRoot = path.join(projectRoot, "web");
const args = parseArgs(process.argv.slice(2));
const requestedPortText = String(args.port ?? process.env.PORT ?? "5181");
const requestedPort = Number.parseInt(requestedPortText, 10);
const fallbackPorts = [6181, 7181, 8181];
const host = args.host ?? "127.0.0.1";
const store = createWebSessionStore();

const server = http.createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

listenWithFallback([requestedPort, ...fallbackPorts], 0);

function listenWithFallback(candidatePorts, index) {
  const candidatePort = candidatePorts[index];
  if (!Number.isInteger(candidatePort) || candidatePort < 0 || candidatePort > 65535) {
    throw new Error(`Invalid port: ${requestedPortText}`);
  }

  server.once("error", (error) => {
    if ((error.code === "EADDRINUSE" || error.code === "EACCES") && index + 1 < candidatePorts.length) {
      console.warn(`Port ${candidatePort} is unavailable (${error.code}); trying ${candidatePorts[index + 1]} instead.`);
      listenWithFallback(candidatePorts, index + 1);
      return;
    }
    throw error;
  });

  server.listen(candidatePort, host, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : candidatePort;
    console.log(`AI Life Simulator web playtest: http://${host}:${actualPort}`);
    console.log("Use --ai mock in the browser for offline testing, or configure .env and choose deepseek for real AI.");
  });
}

async function handleApi(request, response) {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && pathname === "/api/worlds") {
    sendJson(response, 200, { worlds: store.getWorlds() });
    return;
  }

  if (request.method === "GET" && pathname === "/api/dev/catalog") {
    sendJson(response, 200, store.getDevToolsCatalog());
    return;
  }

  if (request.method === "POST" && pathname === "/api/setup/preview") {
    sendJson(response, 200, store.createSetupPreview(await readJsonBody(request)));
    return;
  }

  if (request.method === "POST" && pathname === "/api/run/start") {
    sendJson(response, 200, await store.startRun(await readJsonBody(request)));
    return;
  }

  if (request.method === "POST" && pathname === "/api/dev/run/start") {
    sendJson(response, 200, await store.startDevRun(await readJsonBody(request)));
    return;
  }

  if (request.method === "POST" && pathname === "/api/run/action") {
    const body = await readJsonBody(request);
    sendJson(response, 200, await store.submitAction(body.sessionId, body.action));
    return;
  }

  const playerViewMatch = /^\/api\/player\/([^/]+)\/view$/.exec(pathname);
  if (request.method === "GET" && playerViewMatch) {
    sendJson(response, 200, store.getPlayerView(decodeURIComponent(playerViewMatch[1])));
    return;
  }

  if (request.method === "POST" && pathname === "/api/run/save") {
    const body = await readJsonBody(request);
    sendJson(response, 200, store.saveSession(body.sessionId, { path: body.path }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/run/load") {
    sendJson(response, 200, await store.loadSession(await readJsonBody(request)));
    return;
  }

  if (request.method === "POST" && pathname === "/api/dev/preset") {
    const body = await readJsonBody(request);
    sendJson(response, 200, store.applyDevPreset(body.sessionId, body));
    return;
  }

  if (request.method === "POST" && pathname === "/api/dev/talent") {
    const body = await readJsonBody(request);
    sendJson(response, 200, store.applyDevTalent(body.sessionId, body));
    return;
  }

  if (request.method === "POST" && pathname === "/api/dev/scenario") {
    const body = await readJsonBody(request);
    sendJson(response, 200, store.triggerDevScenario(body.sessionId, body));
    return;
  }

  if (request.method === "POST" && pathname === "/api/dev/report") {
    const body = await readJsonBody(request);
    sendJson(response, 200, store.getDevReport(body.sessionId));
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

async function serveStatic(request, response) {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(webRoot, relativePath);

  if (!filePath.startsWith(webRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": contentType(filePath) });
  fs.createReadStream(filePath).pipe(response);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  }[ext] ?? "application/octet-stream";
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = rawArgs[index + 1];
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
