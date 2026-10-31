Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting PartyHub: Next.js + PartyKit Realtime Server   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start PartyKit server in background window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'PartyKit Server running on port 1999...' -ForegroundColor Green; npm run party"

# 2. Start Next.js frontend in current terminal
Write-Host "Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Yellow
npm run dev

