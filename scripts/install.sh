#!/usr/bin/env bash
# ==============================================================================
# WiFi5 LPB Piso WiFi Vendo - 1-Step Turnkey Linux SBC Installer
# Hardware: Orange Pi One / PC / Zero 2 / Zero 3 / Raspberry Pi 3 & 4 / x86
# OS: Armbian / Debian 12 (Bookworm) / Ubuntu Server
# ==============================================================================

set -e

echo "=========================================================="
echo "   🚀 Starting WiFi5 LPB Piso WiFi System Installation   "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run as root (sudo bash install.sh)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INSTALL_DIR="/opt/wifi5-piso"

echo "📦 Step 1: Updating packages & installing core hotspot dependencies..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  dnsmasq \
  iptables \
  iptables-persistent \
  net-tools \
  python3 \
  python3-pip \
  python3-setuptools \
  curl \
  wget \
  hostapd \
  nginx

echo "🌐 Step 2: Configuring Hotspot Bridge Interface (10.0.0.1/24)..."
cat << 'EOF' > /etc/network/interfaces.d/wifi5-hotspot
# WiFi5 LPB Hotspot Interface
auto wlan0
iface wlan0 inet static
    address 10.0.0.1
    netmask 255.255.255.0
EOF

echo "⚙️ Step 3: Deploying dnsmasq captive portal & DNS configuration..."
cp "${PROJECT_DIR}/scripts/dnsmasq.conf" /etc/dnsmasq.d/wifi5-piso.conf
systemctl restart dnsmasq

echo "🛡️ Step 4: Enabling IPv4 Forwarding & iptables Captive Rules..."
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
sysctl -w net.ipv4.ip_forward=1
bash "${PROJECT_DIR}/scripts/setup_iptables.sh"

echo "📂 Step 5: Installing Web Assets to /var/www/html..."
mkdir -p /var/www/html/wifi5
cp "${PROJECT_DIR}/index.html" /var/www/html/
cp "${PROJECT_DIR}/style.css" /var/www/html/
cp "${PROJECT_DIR}/app.js" /var/www/html/
mkdir -p /var/www/html/assets
cp -r "${PROJECT_DIR}/assets/"* /var/www/html/assets/ 2>/dev/null || true

echo "⚡ Step 6: Installing GPIO Coin Acceptor Daemon..."
mkdir -p "${INSTALL_DIR}"
cp -r "${PROJECT_DIR}"/* "${INSTALL_DIR}/"
cp "${PROJECT_DIR}/scripts/wifi5-piso.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable wifi5-piso.service
systemctl restart wifi5-piso.service
systemctl restart nginx

echo "=========================================================="
echo "   ✅ WiFi5 LPB Piso WiFi System Successfully Deployed!   "
echo "   Portal URL:       http://10.0.0.1                     "
echo "   Owner Studio:     http://10.0.0.1/#admin              "
echo "   Default PIN:      1234                                "
echo "=========================================================="
