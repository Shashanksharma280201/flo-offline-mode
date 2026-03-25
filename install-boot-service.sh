#!/bin/bash

################################################################################
# FLO Offline Mode - Install Boot Service
#
# This script installs the systemd service to auto-launch FLO offline mode
# on system boot.
#
# Usage: ./install-boot-service.sh
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FLO Offline Mode - Boot Service Install${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo -e "${YELLOW}Run: sudo ./install-boot-service.sh${NC}"
    exit 1
fi

SERVICE_FILE="flo-offline.service"
SYSTEMD_PATH="/etc/systemd/system/flo-offline.service"

echo -e "${YELLOW}[1/5] Checking files...${NC}"
if [ ! -f "$SERVICE_FILE" ]; then
    echo -e "${RED}Error: $SERVICE_FILE not found${NC}"
    exit 1
fi

if [ ! -f "start-offline-mode.sh" ]; then
    echo -e "${RED}Error: start-offline-mode.sh not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Files found${NC}"
echo ""

echo -e "${YELLOW}[2/5] Copying service file...${NC}"
cp "$SERVICE_FILE" "$SYSTEMD_PATH"
echo -e "${GREEN}✓ Service file copied to $SYSTEMD_PATH${NC}"
echo ""

echo -e "${YELLOW}[3/5] Reloading systemd...${NC}"
systemctl daemon-reload
echo -e "${GREEN}✓ systemd reloaded${NC}"
echo ""

echo -e "${YELLOW}[4/5] Enabling service...${NC}"
systemctl enable flo-offline.service
echo -e "${GREEN}✓ Service enabled (will start on boot)${NC}"
echo ""

echo -e "${YELLOW}[5/5] Service status...${NC}"
systemctl status flo-offline.service --no-pager || true
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Boot Service Installed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Service Management Commands:${NC}"
echo -e "  Start service:   ${GREEN}sudo systemctl start flo-offline${NC}"
echo -e "  Stop service:    ${RED}sudo systemctl stop flo-offline${NC}"
echo -e "  Restart service: ${YELLOW}sudo systemctl restart flo-offline${NC}"
echo -e "  Check status:    ${BLUE}sudo systemctl status flo-offline${NC}"
echo -e "  View logs:       ${BLUE}sudo journalctl -u flo-offline -f${NC}"
echo -e "  Disable boot:    ${RED}sudo systemctl disable flo-offline${NC}"
echo ""
echo -e "${YELLOW}Note: Service will auto-start on next boot${NC}"
echo -e "${YELLOW}To start now: sudo systemctl start flo-offline${NC}"
echo ""
