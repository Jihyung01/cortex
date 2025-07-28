#!/bin/bash
echo "🚀 Cortex v2.0 시작..."

# 백엔드 실행
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py &

# 프론트엔드 실행  
cd ../frontend
npm install
npm start