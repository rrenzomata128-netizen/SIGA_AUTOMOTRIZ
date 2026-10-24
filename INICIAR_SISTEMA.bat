@echo off
title SIGA Automotriz RH - Iniciador Windows 11
echo =====================================================================
echo   INICIANDO SISTEMA DE ASISTENCIA Y PRENOMINA AUTOMOTRIZ (SIGA)
echo =====================================================================
echo.
if not exist node_modules (
  echo [1/2] Instalando dependencias por primera vez (npm install)...
  call npm install
)
echo [2/2] Levantando servidor en tiempo real (http://localhost:5173)...
call npm run dev
pause
