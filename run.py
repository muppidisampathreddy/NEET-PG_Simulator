"""One command to run everything: python3 run.py

Installs dependencies, builds the React app, and starts FastAPI serving both the
student and admin screens on http://localhost:8000 (set PORT / HOST to change).
"""
import os
import shutil
import subprocess
import sys
import threading
import venv
import webbrowser
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND, FRONTEND = ROOT / "backend", ROOT / "frontend"
VENV = BACKEND / ".venv"
PY = VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
PORT = os.environ.get("PORT", "8000")
HOST = os.environ.get("HOST", "127.0.0.1")  # 0.0.0.0 lets other devices on your network take the exam


def step(msg: str, *cmd, cwd: Path) -> None:
    print(f"\n==> {msg}", flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


npm = shutil.which("npm")
if not npm:
    sys.exit("Node.js is required (https://nodejs.org). Install it, then run this again.")
if not PY.exists():
    print("==> Creating Python virtual environment", flush=True)
    venv.create(VENV, with_pip=True)

step("Installing backend packages", PY, "-m", "pip", "install", "-q", "-r", "requirements.txt", cwd=BACKEND)
step("Installing frontend packages", npm, "install", "--no-audit", "--no-fund", cwd=FRONTEND)
step("Building the app", npm, "run", "build", cwd=FRONTEND)

url = f"http://localhost:{PORT}"
print(f"\n  Students:  {url}\n  Admin:     {url}/#/admin\n\n  Press Ctrl+C to stop.\n", flush=True)
if not os.environ.get("NO_BROWSER"):
    threading.Timer(2, webbrowser.open, [url]).start()
try:
    subprocess.run([PY, "-m", "uvicorn", "main:app", "--host", HOST, "--port", PORT], cwd=BACKEND)
except KeyboardInterrupt:
    pass
