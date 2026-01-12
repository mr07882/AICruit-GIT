@echo off

echo Starting Frontend...
cd Frontend
call npm install
start cmd /k npm start

echo Starting Backend...
cd ..\Backend
call npm install
start cmd /k node Server.js

echo Starting Resume Pipeline...
cd ..\Resume_Pipeline
call pip install -r requirements.txt
cd ..
start cmd /k python -m Resume_Pipeline.api_server