@echo off
chcp 65001 >nul
echo 🚀 Cortex v2.0 Windows 설치 시작...

REM 현재 디렉토리 확인
echo 📂 현재 위치: %CD%

REM Python 버전 확인
echo 🐍 Python 버전 확인...
python --version
if %ERRORLEVEL% neq 0 (
    echo ❌ Python이 설치되지 않았습니다.
    echo https://python.org 에서 Python 3.8+ 를 설치해주세요.
    pause
    exit /b 1
)

REM Node.js 버전 확인
echo 📦 Node.js 버전 확인...
node --version
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
    echo https://nodejs.org 에서 Node.js를 설치해주세요.
    pause
    exit /b 1
)

REM 기존 가상환경 제거
if exist venv rmdir /s /q venv

REM 새 가상환경 생성
echo 🔧 Python 가상환경 생성...
python -m venv venv
if %ERRORLEVEL% neq 0 (
    echo ❌ 가상환경 생성 실패
    pause
    exit /b 1
)

REM 가상환경 활성화
echo 🔄 가상환경 활성화...
call venv\Scripts\activate.bat

REM pip 업그레이드
echo 📦 pip 업그레이드...
python -m pip install --upgrade pip

REM requirements.txt가 있는지 확인
if not exist requirements.txt (
    echo 📝 requirements.txt 생성...
    echo Flask==3.0.0> requirements.txt
    echo Flask-CORS==4.0.0>> requirements.txt
    echo Flask-SQLAlchemy==3.1.1>> requirements.txt
    echo Flask-JWT-Extended==4.6.0>> requirements.txt
    echo SQLAlchemy==2.0.23>> requirements.txt
    echo Werkzeug==3.0.1>> requirements.txt
    echo bcrypt==4.1.2>> requirements.txt
    echo openai==1.6.1>> requirements.txt
    echo requests==2.31.0>> requirements.txt
    echo python-dotenv==1.0.0>> requirements.txt
    echo python-dateutil==2.8.2>> requirements.txt
    echo marshmallow==3.20.2>> requirements.txt
    echo colorlog==6.8.0>> requirements.txt
)

REM 패키지 설치
echo 📚 Python 패키지 설치 중...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo ❌ 패키지 설치 실패
    echo 💡 인터넷 연결을 확인하고 다시 시도해주세요.
    pause
    exit /b 1
)

REM .env 파일 생성
if not exist .env (
    echo 🔑 환경변수 파일 생성...
    echo FLASK_APP=app.py> .env
    echo FLASK_ENV=development>> .env
    echo SECRET_KEY=cortex-ultra-secure-key-2025-v2>> .env
    echo JWT_SECRET_KEY=cortex-jwt-super-secret-2025>> .env
    echo OPENAI_API_KEY=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>> .env
    echo NOTION_TOKEN=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>> .env
    echo NOTION_DB_ID=1d7ffbc06edc807280bdc6c14abfe288>> .env
    echo GITHUB_TOKEN=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>> .env
)

REM app.py 파일 확인
if not exist app.py (
    echo ❌ app.py 파일이 없습니다.
    echo 💡 위에서 제공한 백엔드 코드를 app.py 파일로 저장해주세요.
    pause
    exit /b 1
)

echo ✅ 백엔드 설정 완료!
echo.
echo 🚀 서버를 시작하려면:
echo    python app.py
echo.
echo 🌐 접속 정보:
echo    - API 서버: http://localhost:5000
echo    - 헬스 체크: http://localhost:5000/api/health
echo    - 데모 계정: demo@cortex.app / demo123
echo.
pause