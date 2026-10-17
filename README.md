# 🚀 WiFi5 LPB Piso WiFi | Standalone SBC & Mini PC Vendo Suite

An autonomous, commercial-grade **Piso WiFi Hotspot Vendo Software Suite** designed in the architecture of **Wifi5soft**, **LPB Piso WiFi**, and **WiFi ng Bayan** for Single-Board Computers (**Orange Pi One, PC, Zero 2, Zero 3, Raspberry Pi 3/4**) and **x86 Mini PCs / Thin Clients**.

---

## 🌟 Key Features

### 1. 📱 Client Captive Portal (Mobile-First)
- **Zero-Dependency Native Stack**: Runs instantly on any device without node/npm overhead.
- **Hero Radial Countdown Ring**: Real-time per-second timer display (`HH:MM:SS`) with animated SVG progress ring and status indicators.
- **Interactive "INSERT COIN" Experience**:
  - Animated mechanical coin slot plate with live green LED indicator.
  - 60-Second insertion countdown timer bar with auto-reset on coin drop.
  - Real-time coin counter showing live Peso amount and accumulated internet time.
  - Realistic Web Audio API synthesized mechanical coin clinks and success chimes.
- **Pause & Resume Time**: Users can pause their remaining time to conserve credits when leaving the hotspot vicinity.
- **Voucher Redemption Dialog**: One-click redemption for 6-digit prepaid WiFi vouchers.
- **Dynamic Rates & Pricing Card**: Automatically pulls live rate tiers configured in the Owner Admin Studio.

### 2. 📊 Executive Owner Admin Studio
- **Master PIN Security Protection**: Factory default PIN `1234` with custom PIN update.
- **4-Card Revenue Analytics**:
  - Today's Sales (Live)
  - This Week's Sales (7-Day Rolling)
  - This Month's Sales (30-Day Rolling)
  - All-Time Gross Revenue
- **Coin Denomination Breakdown**: Tracks exact piece counts for ₱1, ₱5, ₱10, and ₱20 coins.
- **Voucher Generator & Thermal POS Printer**:
  - Batch generation of custom voucher codes (1 Hour, 3 Hours, 24 Hours, 3 Days, 7 Days, 30 Days).
  - Print-ready 58mm / 80mm thermal receipt slip sheet with QR codes, Wi-Fi SSID, and pricing.
- **Rates & Pricing Manager**:
  - Add, edit, or delete coin-to-time ratios with immediate live reflection on the captive portal.
  - One-click restore to standard Philippine market benchmark rates.
- **Connected Client Session Manager**: Real-time client IP, MAC address, allocated speed, and controls (Kick, Pause, Add +15m / +1h).
- **Data Export**: One-click download of Sales CSV report and JSON database backup.

### 3. ⚡ Hardware & GPIO Lab Console
- **Oscilloscope Waveform Display**: Visualizes square wave pulse trains on GPIO input pins.
- **Interactive Coin Pulse Injector**: Test ₱1, ₱5, ₱10, and ₱20 pulse trains directly.
- **12V Solenoid Cut-Off Relay Controller**: Toggle energize / de-energize states to verify coin slot anti-theft blocking.
- **Live Terminal Log**: Real-time daemon log viewer showing kernel interrupt events.

### 4. 🐧 Production Linux SBC Deployment Hub
- **1-Step Automated Installer**: `curl -sSL ... | sudo bash` for Armbian and Debian Bookworm.
- **Kernel Routing & iptables**: NAT masquerade, captive portal redirection, and OS probe URL bypassing (`captive.apple.com`, `connectivitycheck.gstatic.com`).
- **Python GPIO Daemon**: High-speed interrupt handler with 40ms software debouncing for Allan 1234A/1235A coin acceptors.

---

## 📁 Repository Structure

```text
wifi5-lpb-pisowifi/
├── index.html                    # Master unified web app (Portal, Admin, Lab, Hub)
├── style.css                     # Modern cyber-glassmorphic styling & thermal print CSS
├── app.js                        # Synthesized audio, timer engine, rates & admin logic
├── HARDWARE_WIRING_GUIDE.md      # Complete electrical schematics & pinout manual
├── README.md                     # System documentation
├── BALENA_ETCHER_FLASHING_GUIDE.md # Balena Etcher 1-click flashing & direct download links
├── assets/
│   └── logo.jpg                  # High-resolution WiFi5 LPB official emblem
└── scripts/
    ├── build_bootable_image.sh   # Turnkey .img.xz image generator for Balena Etcher
    ├── firstrun-setup.sh         # Unattended first-boot self-provisioner
    ├── armbian_first_run.txt     # Headless Armbian first-boot configuration
    ├── install.sh                # 1-Step turnkey installer for Armbian / Debian SBCs
    ├── gpio_coin_daemon.py       # Python hardware GPIO interrupt & relay daemon
    ├── setup_iptables.sh         # Linux firewall NAT & captive redirection rules
    ├── dnsmasq.conf              # Hotspot DHCP server pool & DNS captive spoofer
    └── wifi5-piso.service        # Systemd daemon autostart configuration
```

---

## 🚀 How to Run Locally on Windows

You can run and test the complete software suite immediately in any browser with **zero dependencies**:

1. Open `index.html` directly in your browser:
   ```text
   C:\Users\Admin\.gemini\antigravity-ide\scratch\wifi5-lpb-pisowifi\index.html
   ```
2. Or launch via PowerShell:
   ```powershell
   Start-Process "C:\Users\Admin\.gemini\antigravity-ide\scratch\wifi5-lpb-pisowifi\index.html"
   ```

---

## 🐧 How to Deploy to an Orange Pi or Raspberry Pi

1. Flash **Armbian 24+** (for Orange Pi) or **Raspberry Pi OS (64-bit Lite)** to your MicroSD card.
2. Boot your SBC, connect via SSH or terminal, and clone this repository:
   ```bash
   git clone https://github.com/your-repo/wifi5-lpb-pisowifi.git /opt/wifi5-piso
   cd /opt/wifi5-piso
   sudo bash scripts/install.sh
   ```
3. Connect your Access Point to the SBC Ethernet or Wi-Fi interface.
4. Your standalone Piso WiFi Vendo is now operational!
