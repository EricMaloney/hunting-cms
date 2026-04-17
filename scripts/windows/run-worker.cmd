@echo off
::
:: run-worker.cmd
:: Called by Windows Task Scheduler every 5 minutes.
:: Runs the UniFi publish worker and appends output to a rolling log.
::
cd /d C:\huntington-worker

:: Keep log under 1 MB — rename to .old when it gets big
for %%f in (worker.log) do (
    if %%~zf gtr 1000000 (
        move /y worker.log worker.log.old >nul 2>&1
    )
)

:: Run worker, append timestamped output to log
node --env-file=.env.local node_modules\.bin\tsx scripts\unifi-worker.ts >> worker.log 2>&1
