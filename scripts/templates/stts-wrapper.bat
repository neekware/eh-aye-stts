@echo off
REM STTS wrapper script for Windows systems
REM Auto-generated - do not edit manually

REM Check if stts command is available
where stts >nul 2>&1
if %errorlevel% == 0 (
    REM Pass all arguments to stts
    stts %*
) else (
    REM Fallback behavior - configurable at runtime
    if "%STTS_FALLBACK_MODE%"=="workspace" (
        REM stts not available, silently continue
        exit /b 0
    ) else (
        REM Default to user mode
        echo Warning: stts command not found. Please install stts first. >&2
        exit /b 1
    )
)