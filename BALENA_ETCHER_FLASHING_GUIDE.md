# 💿 Balena Etcher Flashing & Bootable Image Guide for Orange Pi

A step-by-step guide to flashing and running the **WiFi5 LPB Piso WiFi Vendo OS** on an **Orange Pi** (One / PC / Zero 2 / Zero 3) using **Balena Etcher**, **Rufus**, or **Raspberry Pi Imager**.

---

## 🚀 Quick Overview: Two Fast Methods

You have two simple ways to get your Orange Pi running the vendo software:

| Method | What You Need | How It Works |
| :--- | :--- | :--- |
| **Method 1: Direct Ready-to-Flash Image** | Pre-baked `.img.xz` image file | Select `.img.xz` in Balena Etcher ➔ Flash ➔ Plug into Orange Pi ➔ **Ready!** |
| **Method 2: Clean Armbian + Auto-Provisioning** *(Zero-Linux needed)* | Official Armbian image + `armbian_first_run.txt` | Flash Armbian ➔ Copy 1 config file to SD in Windows ➔ Power on ➔ **Auto-installs in 3 mins!** |

---

## 📥 Direct Download Links for Orange Pi Armbian Images

Download the official Armbian Minimal image for your specific board:

| Orange Pi Board Model | Processor | Recommended Armbian Base Image (.img.xz) |
| :--- | :--- | :--- |
| **Orange Pi One** | Allwinner H3 (512MB RAM) | **[Direct Download: Armbian Minimal (CLI) - 296MB](https://dl.armbian.com/orangepione/Trixie_current_minimal)** <br>• Alternative: [Ubuntu Minimal (CLI)](https://dl.armbian.com/orangepione/Resolute_current_minimal) <br>• [Official Orange Pi One Portal](https://www.armbian.com/orange-pi-one/) |
| **Orange Pi PC** | Allwinner H3 (1GB RAM) | [Armbian for Orange Pi PC](https://www.armbian.com/orange-pi-pc/) |
| **Orange Pi Zero 2** | Allwinner H616 (1GB RAM) | [Armbian for Orange Pi Zero 2](https://www.armbian.com/orange-pi-zero-2/) |
| **Orange Pi Zero 3** | Allwinner H618 (1GB/2GB RAM) | [Armbian for Orange Pi Zero 3](https://www.armbian.com/orange-pi-zero-3/) |
| **Orange Pi 3 LTS** | Allwinner H6 (2GB RAM) | [Armbian for Orange Pi 3 LTS](https://www.armbian.com/orange-pi-3-lts/) |

---

## 🛠️ Method 1: Generate the Ready-to-Flash `.img.xz` Image

If you have a Linux machine, WSL2, or a friend's Linux PC, you can run the builder script to bake all files, captive portal, and services directly into a single `.img.xz` file:

```bash
cd /path/to/wifi5-lpb-pisowifi
sudo bash scripts/build_bootable_image.sh
```

- Output file: `output/wifi5-lpb-pisowifi-orangepione.img.xz`
- This single file is 100% turnkey and ready to select in Balena Etcher.

---

## ⚡ Method 2: The 3-Minute Windows Method (No Linux Needed!)

If you are on Windows right now, you can prepare the bootable SD card in 3 easy steps without compiling anything:

### Step 1: Flash the Base Image with Balena Etcher
1. Insert your MicroSD Card (8GB, 16GB, or 32GB Class 10 / A1) into your PC's card reader.
2. Open **Balena Etcher**.
3. Click **"Flash from file"** and select the downloaded `Armbian_..._minimal.img.xz`.
4. Click **"Select target"** and choose your MicroSD card.
5. Click **"Flash!"** and wait ~2–3 minutes until validation completes.

### Step 2: Drop the Unattended First-Run Config
1. Keep the MicroSD card plugged into your PC after flashing.
2. In Windows File Explorer, open the SD card drive (usually labeled `boot` or `Armbian`).
3. Copy [`armbian_first_run.txt`](file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/wifi5-lpb-pisowifi/scripts/armbian_first_run.txt) into the root folder of the SD card:
   - This sets the root password to `orangepi` automatically.
   - It bypasses all interactive monitor/keyboard prompts.

### Step 3: Boot the Orange Pi and Auto-Deploy
1. Safely eject the MicroSD card from your PC and insert it into your Orange Pi.
2. Connect an Ethernet cable from your internet router/modem to the Orange Pi Ethernet port.
3. Power on the Orange Pi with a 5V 2A–3A DC power adapter.
4. Open PowerShell on your PC and run:
   ```powershell
   ssh root@wifi5-piso
   # Password: orangepi
   ```
5. Run the 1-step installer command:
   ```bash
   curl -sSL https://raw.githubusercontent.com/wifi5-lpb/installer/main/install.sh | sudo bash
   ```
   *(Or copy the `wifi5-lpb-pisowifi` folder directly over SFTP/SCP into `/opt/wifi5-piso` and run `sudo bash scripts/install.sh`)*.

---

## 🎯 Verification & Testing

Once booted:
1. Connect your phone or laptop to the Access Point Wi-Fi.
2. Open your web browser and navigate to:
   - **Captive Portal**: `http://10.0.0.1`
   - **Owner Admin Studio**: `http://10.0.0.1/#admin` (Default PIN: `1234`)
3. Test dropping a test coin or entering a prepaid voucher code!
