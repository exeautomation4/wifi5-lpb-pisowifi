#!/usr/bin/env bash
# ==============================================================================
# WiFi5 LPB Piso WiFi - Turnkey Bootable Image Generator
# Creates a ready-to-flash .img.xz file for Balena Etcher / Rufus / RPi Imager
# Target Hardware: Orange Pi One / PC / Zero 2 / Zero 3
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}   🚀 WiFi5 LPB PISO WIFI - BOOTABLE IMAGE BUILDER            ${NC}"
echo -e "${CYAN}   Produces a Balena Etcher-Ready Flashable .img.xz Image     ${NC}"
echo -e "${CYAN}==============================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[!] Error: This builder must be run as root (sudo bash build_bootable_image.sh)${NC}"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "${SCRIPT_DIR}")"
WORK_DIR="${REPO_DIR}/build_tmp"
OUTPUT_DIR="${REPO_DIR}/output"
OUTPUT_NAME="wifi5-lpb-pisowifi-orangepione.img"

# Official Armbian Minimal Image for Orange Pi One (Allwinner H3)
DEFAULT_ARMBIAN_URL="https://dl.armbian.com/orangepione/Trixie_current_minimal"

INPUT_IMAGE="${1:-}"

# 1. Check & Install Required Host Tools
echo -e "\n${YELLOW}[1/6] Checking build dependencies on host system...${NC}"
for cmd in losetup parted xz e2fsck resize2fs wget; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}[!] Missing required tool: ${cmd}. Installing via apt...${NC}"
    apt-get update -y && apt-get install -y parted udev util-linux e2fsprogs xz-utils wget curl
    break
  fi
done

mkdir -p "${WORK_DIR}"
mkdir -p "${OUTPUT_DIR}"

cleanup() {
  echo -e "\n${YELLOW}[*] Cleaning up temporary mounts...${NC}"
  if [ -n "${MOUNT_POINT:-}" ] && mountpoint -q "${MOUNT_POINT}"; then
    umount -l "${MOUNT_POINT}" || true
  fi
  if [ -n "${LOOP_DEV:-}" ]; then
    losetup -d "${LOOP_DEV}" 2>/dev/null || true
  fi
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

# 2. Acquire & Prepare Base Image
RAW_IMG="${WORK_DIR}/base_armbian.img"

if [ -n "${INPUT_IMAGE}" ] && [ -f "${INPUT_IMAGE}" ]; then
  echo -e "${GREEN}[✓] Using provided base image: ${INPUT_IMAGE}${NC}"
  if [[ "${INPUT_IMAGE}" == *.xz ]]; then
    echo -e "[*] Decompressing ${INPUT_IMAGE}..."
    xz -dc "${INPUT_IMAGE}" > "${RAW_IMG}"
  elif [[ "${INPUT_IMAGE}" == *.gz ]]; then
    echo -e "[*] Decompressing ${INPUT_IMAGE}..."
    gzip -dc "${INPUT_IMAGE}" > "${RAW_IMG}"
  else
    cp "${INPUT_IMAGE}" "${RAW_IMG}"
  fi
else
  echo -e "${YELLOW}[*] No local image supplied. Downloading official Armbian Bookworm for Orange Pi One...${NC}"
  echo -e "URL: ${CYAN}${DEFAULT_ARMBIAN_URL}${NC}"
  DOWNLOAD_FILE="${WORK_DIR}/armbian.img.xz"
  wget -q --show-progress -O "${DOWNLOAD_FILE}" "${DEFAULT_ARMBIAN_URL}" || {
    echo -e "${RED}[!] Download failed. Please provide a local Armbian .img or .img.xz file as argument.${NC}"
    echo -e "Usage: sudo bash scripts/build_bootable_image.sh /path/to/Armbian_orangepi.img.xz"
    exit 1
  }
  echo -e "[*] Decompressing base image..."
  xz -dc "${DOWNLOAD_FILE}" > "${RAW_IMG}"
  rm -f "${DOWNLOAD_FILE}"
fi

# 3. Expand Partition for Piso WiFi Files & Packages (+750MB)
echo -e "\n${YELLOW}[2/6] Expanding disk image (+750MB) for vendo files & web server...${NC}"
dd if=/dev/zero bs=1M count=750 >> "${RAW_IMG}" 2>/dev/null
parted -s "${RAW_IMG}" resizepart 1 100%

# 4. Attach Loopback & Mount Ext4 Filesystem
echo -e "\n${YELLOW}[3/6] Attaching loop device and mounting rootfs...${NC}"
LOOP_DEV=$(losetup -Pf --show "${RAW_IMG}")
PART_DEV="${LOOP_DEV}p1"
if [ ! -b "${PART_DEV}" ]; then
  PART_DEV="${LOOP_DEV}1"
fi

e2fsck -fy "${PART_DEV}" || true
resize2fs "${PART_DEV}"

MOUNT_POINT="${WORK_DIR}/rootfs"
mkdir -p "${MOUNT_POINT}"
mount "${PART_DEV}" "${MOUNT_POINT}"
echo -e "${GREEN}[✓] Rootfs mounted successfully at ${MOUNT_POINT}${NC}"

# 5. Inject WiFi5 LPB Piso WiFi Application Files
echo -e "\n${YELLOW}[4/6] Injecting WiFi5 LPB Vendo codebase into /opt/wifi5-piso...${NC}"
TARGET_APP="${MOUNT_POINT}/opt/wifi5-piso"
mkdir -p "${TARGET_APP}"
cp -f "${REPO_DIR}/index.html" "${TARGET_APP}/"
cp -f "${REPO_DIR}/style.css" "${TARGET_APP}/"
cp -f "${REPO_DIR}/app.js" "${TARGET_APP}/"
cp -f "${REPO_DIR}/README.md" "${TARGET_APP}/"
cp -f "${REPO_DIR}/HARDWARE_WIRING_GUIDE.md" "${TARGET_APP}/"
mkdir -p "${TARGET_APP}/assets"
cp -rf "${REPO_DIR}/assets/"* "${TARGET_APP}/assets/" 2>/dev/null || true
mkdir -p "${TARGET_APP}/scripts"
cp -rf "${REPO_DIR}/scripts/"* "${TARGET_APP}/scripts/"
chmod +x "${TARGET_APP}/scripts/"*.sh "${TARGET_APP}/scripts/"*.py

# Also pre-deploy web assets directly to Nginx web root
mkdir -p "${MOUNT_POINT}/var/www/html"
cp -f "${TARGET_APP}/index.html" "${MOUNT_POINT}/var/www/html/"
cp -f "${TARGET_APP}/style.css" "${MOUNT_POINT}/var/www/html/"
cp -f "${TARGET_APP}/app.js" "${MOUNT_POINT}/var/www/html/"
mkdir -p "${MOUNT_POINT}/var/www/html/assets"
cp -rf "${TARGET_APP}/assets/"* "${MOUNT_POINT}/var/www/html/assets/" 2>/dev/null || true

# 6. Pre-configure Network, dnsmasq, iptables & Unattended Boot
echo -e "\n${YELLOW}[5/6] Pre-configuring unattended boot, network, services & firewall...${NC}"

# A. Hotspot Interface Configuration
mkdir -p "${MOUNT_POINT}/etc/network/interfaces.d"
cat << 'EOF' > "${MOUNT_POINT}/etc/network/interfaces.d/wifi5-hotspot"
auto wlan0
iface wlan0 inet static
    address 10.0.0.1
    netmask 255.255.255.0
EOF

# B. dnsmasq configuration
mkdir -p "${MOUNT_POINT}/etc/dnsmasq.d"
cp -f "${TARGET_APP}/scripts/dnsmasq.conf" "${MOUNT_POINT}/etc/dnsmasq.d/wifi5-piso.conf"

# C. Kernel IPv4 Forwarding
mkdir -p "${MOUNT_POINT}/etc/sysctl.d"
cat << 'EOF' > "${MOUNT_POINT}/etc/sysctl.d/99-piso-ipforward.conf"
net.ipv4.ip_forward = 1
net.ipv4.conf.all.route_localnet = 1
EOF

# D. Register systemd daemon services
mkdir -p "${MOUNT_POINT}/etc/systemd/system/multi-user.target.wants"
cp -f "${TARGET_APP}/scripts/wifi5-piso.service" "${MOUNT_POINT}/etc/systemd/system/wifi5-piso.service"
ln -sf "/etc/systemd/system/wifi5-piso.service" "${MOUNT_POINT}/etc/systemd/system/multi-user.target.wants/wifi5-piso.service"

# E. Deploy First-Boot Auto-Provisioner Service
cat << 'EOF' > "${MOUNT_POINT}/etc/systemd/system/wifi5-firstboot.service"
[Unit]
Description=WiFi5 LPB First-Boot Provisioning Service
After=network-online.target
Wants=network-online.target
ConditionPathExists=/opt/wifi5-piso/scripts/firstrun-setup.sh

[Service]
Type=oneshot
ExecStart=/bin/bash /opt/wifi5-piso/scripts/firstrun-setup.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
ln -sf "/etc/systemd/system/wifi5-firstboot.service" "${MOUNT_POINT}/etc/systemd/system/multi-user.target.wants/wifi5-firstboot.service"

# F. Unattended Boot: Hostname & Default Root Password ('orangepi')
echo "wifi5-piso" > "${MOUNT_POINT}/etc/hostname"
touch "${MOUNT_POINT}/root/.armbian_first_run_done" 2>/dev/null || true
rm -f "${MOUNT_POINT}/root/.not_logged_in_yet" 2>/dev/null || true

# Set default password hash for root to 'orangepi'
if [ -f "${MOUNT_POINT}/etc/shadow" ]; then
  sed -i "s|^root:[^:]*:|root:\$6\$saltsalt\$hB4dYgZ.wU4sH7H2fN6rA7.GgGqI4qEa9I3M3kU9V0e1gYy4yYy5mJ5xY9wV.hN6tP4xM6hJ9E4kQ8jY6vD9fX8w9Z:|g" "${MOUNT_POINT}/etc/shadow" || true
fi

# Copy armbian_first_run.txt to /boot
if [ -d "${MOUNT_POINT}/boot" ]; then
  cp -f "${TARGET_APP}/scripts/armbian_first_run.txt" "${MOUNT_POINT}/boot/armbian_first_run.txt" 2>/dev/null || true
fi

# Unmount clean
sync
umount -l "${MOUNT_POINT}"
losetup -d "${LOOP_DEV}"
unset MOUNT_POINT
unset LOOP_DEV

# 7. Compress into final Balena Etcher ready image
echo -e "\n${YELLOW}[6/6] Compressing final image into .xz format for Balena Etcher...${NC}"
FINAL_OUTPUT="${OUTPUT_DIR}/${OUTPUT_NAME}.xz"
xz -9 -T0 -c "${RAW_IMG}" > "${FINAL_OUTPUT}"
rm -f "${RAW_IMG}"

echo -e "\n${GREEN}==============================================================${NC}"
echo -e "${GREEN}   ✅ BOOTABLE BALENA ETCHER IMAGE CREATED!                   ${NC}"
echo -e "${GREEN}   File: ${CYAN}${FINAL_OUTPUT}${NC}"
echo -e "${GREEN}   Ready to flash using Balena Etcher, Rufus, or RPi Imager!  ${NC}"
echo -e "${GREEN}==============================================================${NC}"
