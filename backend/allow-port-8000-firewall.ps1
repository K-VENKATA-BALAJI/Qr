# Run this script as Administrator so your phone can reach the backend on port 8000.
# Right-click PowerShell -> "Run as Administrator", then:
#   cd "C:\Users\HP\Desktop\qr-mobile\backend"
#   .\allow-port-8000-firewall.ps1

$ruleName = "SafeScan Backend (TCP 8000)"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Rule already exists. Removing old one..."
    Remove-NetFirewallRule -DisplayName $ruleName
}
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
Write-Host "Done. Inbound TCP 8000 is now allowed. Try the app again from your phone."
