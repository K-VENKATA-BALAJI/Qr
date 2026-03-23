cd "<CLONED_REPO_PATH>\Qr\backend"

# allow script execution only for this terminal session
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# create and activate virtual env
python -m venv venv
.\venv\Scripts\Activate.ps1

# install backend deps
pip install -r requirements.txt

# install Playwright browser used for screenshots
python -m playwright install chromium

# run backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000


cd "<CLONED_REPO_PATH>\Qr\frontend"

# if npm is blocked by execution policy in PowerShell:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

npm install
npm start