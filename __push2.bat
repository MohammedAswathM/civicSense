@echo off
cd /d "C:\Users\Mohammed Aswath\Documents\College\Hackathon\Vibeship"
git add src/app/official/queue/page.tsx src/components/map/CivicMap.tsx
git commit -m "fix: resolve all TypeScript errors (tsc --noEmit passes clean)"
git push
echo GIT DONE: %ERRORLEVEL%
