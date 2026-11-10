@echo off
title FireGuard - Chatbot e Painel
cd /d "%~dp0fireguard-chatbot"
echo Iniciando a demonstracao FireGuard (Chatbot WhatsApp + Painel)...
start "FireGuard - servidor (nao feche esta janela)" /min python servidor.py 5501
timeout /t 2 /nobreak >nul
start "" "http://localhost:5501/index.html"
start "" "http://localhost:5501/painel.html"
exit
