@echo off
echo Initializing git repo...
git init
git add .
git commit -m "feat: unified dashboard with 4-source sync, analytics, CRM, themes, global search"
git branch -M main
git remote add origin https://github.com/melsoobky-hue/mostwda3.git
git push -u origin main
echo Done!
pause
