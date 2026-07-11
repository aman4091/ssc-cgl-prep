# Waits for the dev server, then opens the site in the default browser.
$url = 'http://localhost:3000'
for ($i = 0; $i -lt 120; $i++) {
    try {
        Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2 | Out-Null
        Start-Process $url
        break
    } catch {
        Start-Sleep -Milliseconds 800
    }
}
