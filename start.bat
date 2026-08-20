@echo off
title Hugging Face Modern Studio & Hub Manager
color 0B

echo ======================================================================
echo           🤗 HUGGING FACE MODERN STUDIO DASHBOARD 🤗
echo ======================================================================
echo.
echo [1/2] Avvio del Backend FastAPI (Porta 8000)...
start "HF-Dashboard-Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Avvio del Frontend React Vite (Porta 3000)...
cd frontend
start "HF-Dashboard-Frontend" cmd /k "npm run dev"

echo.
echo ======================================================================
echo Dashboard avviata con successo!
echo Apri il tuo browser all'indirizzo: http://localhost:3000
echo ======================================================================
echo.
pause
