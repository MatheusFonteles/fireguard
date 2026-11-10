@echo off
title FireGuard - Site, Chatbot e Painel
cd /d "%~dp0fireguard"
echo Iniciando a demonstracao FireGuard (Site + Chatbot + Painel)...
start "FireGuard - servidor (nao feche esta janela)" /min python servidor.py 5500
timeout /t 2 /nobreak >nul
start "" "http://localhost:5500/index.html"
start "" "http://localhost:5500/painel.html"
exit
