@echo off
echo 🚀 Cortex v2.0 시작...

cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
start python app.py

cd ..\frontend
npm install
npm start