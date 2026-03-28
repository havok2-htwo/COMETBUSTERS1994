#!/bin/bash

echo ""
echo "========================================================"
echo ""
echo "  Server wird gestartet! Browser sollte sich oeffnen..."
echo "  (Falls nicht manuell oeffnen: http://127.0.0.1:8080 )"
echo ""
echo "========================================================"
echo ""

# Versuche den Browser zu öffnen je nach Betriebssystem
if command -v xdg-open &> /dev/null; then
    xdg-open http://127.0.0.1:8080 &
elif command -v open &> /dev/null; then
    open http://127.0.0.1:8080 &
fi

# Starte Python Server
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
else
    python -m http.server 8080
fi
