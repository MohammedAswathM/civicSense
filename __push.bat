@echo off
cd /d "C:\Users\Mohammed Aswath\Documents\College\Hackathon\Vibeship"
git add src/types/issue.ts
git commit -m "fix: add missing Issue type fields for new UI pages"
git push
echo DONE: %ERRORLEVEL%
