@echo off
echo ========================================================
echo   Starting Coinwach.io Market Intelligence Terminal
echo   Hyperliquid #1 + Binance #2 + Bybit #3
echo ========================================================
echo.

cd /d "%~dp0backend"
echo Activating Python virtual environment...
call .venv\Scripts\activate.bat

echo Starting Coinwach.io Engine & Terminal on http://localhost:8000 ...
start http://localhost:8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
