import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const pythonVenv = process.platform === "win32"
  ? resolve(root, ".venv", "Scripts", "python.exe")
  : resolve(root, ".venv", "bin", "python");
const pythonCandidates = process.env.PYTHON
  ? [process.env.PYTHON]
  : [pythonVenv, "python3", "python"];
const backendPython = pythonCandidates.find((candidate) => {
  if (candidate === pythonVenv && !existsSync(candidate)) return false;
  const probe = spawnSync(candidate, ["--version"], { stdio: "ignore", windowsHide: true });
  return probe.status === 0;
});
const backendDependenciesReady = backendPython && spawnSync(
  backendPython,
  ["-c", "import fastapi, dspy, chromadb, sentence_transformers"],
  { cwd: root, stdio: "ignore", windowsHide: true },
).status === 0;
const ragIndexReady = existsSync(resolve(root, "rag", "index.json"))
  && existsSync(resolve(root, "rag", "chroma"));
const children = [];
let stopping = false;

function start(command, args, options, required = true) {
  const child = spawn(command, args, { stdio: "inherit", windowsHide: true, ...options });
  children.push(child);
  child.on("error", (error) => {
    console.error(`Could not start ${command}: ${error.message}`);
    if (required) shutdown(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`${command} exited${code === null ? "" : ` with code ${code}`}.`);
      if (required) shutdown(code || 1);
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
if (backendPython && backendDependenciesReady && ragIndexReady) {
  env.RAG_API_AVAILABLE = "1";
  start(backendPython, [
    "-m", "uvicorn", "server:app",
    "--app-dir", "rag",
    "--host", env.RAG_HOST || "127.0.0.1",
    "--port", env.RAG_PORT || "8000",
  ], { cwd: root, env }, false);
} else if (!backendPython) {
  env.RAG_API_AVAILABLE = "0";
  console.warn("Python was not found; starting the web UI without the RAG API.");
} else if (!backendDependenciesReady) {
  env.RAG_API_AVAILABLE = "0";
  console.warn("RAG Python packages are not installed; starting the web UI only.");
} else {
  env.RAG_API_AVAILABLE = "0";
  console.warn("The RAG index is not built; starting the web UI only.");
}

start(process.execPath, [resolve(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1"], {
  cwd: root,
  env,
});
