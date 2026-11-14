import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const python = process.env.PYTHON || "python3";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const pythonVenv = resolve(root, ".venv", "bin", "python");
const backendPython = process.env.PYTHON || (existsSync(pythonVenv) ? pythonVenv : python);
const children = [];
let stopping = false;

function start(command, args, options) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  children.push(child);
  child.on("error", (error) => {
    console.error(`Could not start ${command}: ${error.message}`);
    shutdown(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`${command} exited${code === null ? "" : ` with code ${code}`}.`);
      shutdown(code || 1);
    }
  });
  return child;
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

const env = { ...process.env };
start(backendPython, [
  "-m", "uvicorn", "server:app",
  "--app-dir", "rag",
  "--host", env.RAG_HOST || "127.0.0.1",
  "--port", env.RAG_PORT || "8000",
], { cwd: root, env });
start(npm, ["run", "dev:web"], { cwd: root, env });
