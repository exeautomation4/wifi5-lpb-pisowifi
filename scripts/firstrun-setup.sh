#!/usr/bin/env bash
# ==============================================================================
# WiFi5 LPB Piso WiFi - Unattended First-Boot Self-Provisioning Script
# Executes automatically on first physical boot to ensure 100% turnkey setup.
# ==============================================================================

set -euo pipefail

LOG_FILE="/var/log/wifi5-firstboot.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=============================================================="
echo " 🚀 Starting WiFi5 LPB First-Boot Provisioning: $(date)"
echo "=============================================================="

INSTALL_TARGET="/opt/wifi5-piso"

if [ -d "${INSTALL_TARGET}/scripts" ]; then
  cd "${INSTALL_TARGET}/scripts"
fi

export DEBIAN_FRONTEND=noninteractive

# 1. Update and install required packages
echo "📦 Step 1: Checking and installing core packages..."
PACKAGES_NEEDED=""
for pkg in dnsmasq iptables iptables-persistent net-tools nginx python3 python3-pip python3-setuptools curl; do
  if ! dpkg -s "${pkg}" >/dev/null 2>&1; then
    PACKAGES_NEEDED="${PACKAGES_NEEDED} ${pkg}"
  fi
done

if [ -n "${PACKAGES_NEEDED}" ]; then
  echo "[*] Installing missing dependencies: ${PACKAGES_NEEDED}..."
  apt-get update -y || true
  apt-get install -y --no-install-recommends ${PACKAGES_NEEDED} || true
fi

# 2. Deploy Web Assets to Nginx Root
echo "🌐 Step 2: Deploying web portal and admin studio..."
mkdir -p /var/www/html
cp -f "${INSTALL_TARGET}/index.html" /var/www/html/ 2>/dev/null || true
cp -f "${INSTALL_TARGET}/style.css" /var/www/html/ 2>/dev/null || true
cp -f "${INSTALL_TARGET}/app.js" /var/www/html/ 2>/dev/null || true
mkdir -p /var/www/html/assets
cp -rf "${INSTALL_TARGET}/assets/"* /var/www/html/assets/ 2>/dev/null || true

# 3. Configure Hotspot Bridge Interface (10.0.0.1/24)
echo "⚙️ Step 3: Configuring static hotspot interface..."
mkdir -p /etc/network/interfaces.d
cat << 'EOF' > /etc/network/interfaces.d/wifi5-hotspot
auto wlan0
iface wlan0 inet static
    address 10.0.0.1
    netmask 255.255.255.0
EOF

# 4. Configure dnsmasq for DHCP & DNS Spoofing
echo "📡 Step 4: Activating dnsmasq DHCP & Captive Portal DNS..."
mkdir -p /etc/dnsmasq.d
cp -f "${INSTALL_TARGET}/scripts/dnsmasq.conf" /etc/dnsmasq.d/wifi5-piso.conf

# Disable systemd-resolved stub listener if running on port 53
if [ -f /etc/systemd/resolved.conf ]; then
  sed -i 's/#DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf || true
  systemctl restart systemd-resolved || true
fi

systemctl restart dnsmasq || true
systemctl enable dnsmasq || true

# 5. Enable IP Forwarding and Apply iptables Firewall
echo "🛡️ Step 5: Applying NAT masquerade & Captive Portal redirection..."
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf || true
sysctl -w net.ipv4.ip_forward=1 || true

if [ -f "${INSTALL_TARGET}/scripts/setup_iptables.sh" ]; then
  bash "${INSTALL_TARGET}/scripts/setup_iptables.sh" || true
fi

# 6. Enable and Start Systemd Daemon Service
echo "⚡ Step 6: Enabling wifi5-piso.service..."
cp -f "${INSTALL_TARGET}/scripts/wifi5-piso.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable wifi5-piso.service
systemctl restart wifi5-piso.service
systemctl restart nginx || true

# Mark completion flag
touch /var/log/wifi5-firstboot-completed.flag

echo "=============================================================="
echo " ✅ First-Boot Self-Provisioning Complete!                    "
echo " Access Portal at: http://10.0.0.1                            "
echo " Owner Studio at:  http://10.0.0.1/#admin (PIN: 1234)         "
echo "=============================================================="
