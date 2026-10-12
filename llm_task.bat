@echo off
setlocal
python "%~dp0llm_task.py" %*
exit /b %ERRORLEVEL%
