# 🔌 WiFi5 LPB Piso WiFi | Hardware Wiring & Assembly Guide

Complete electrical schematic, pinout guide, and step-by-step assembly manual for building a commercial **Standalone Piso WiFi Vendo** powered by an **Orange Pi** (One / PC / Zero 2 / Zero 3) or **Raspberry Pi** with an **Allan 1234A / 1235A Multi-Coin Acceptor**.

---

## 📦 Required Bill of Materials (BOM)

| Item | Component | Specification | Purpose |
| :--- | :--- | :--- | :--- |
| **1** | **Single Board Computer (SBC)** | Orange Pi One, PC, Zero 2, Zero 3, or Raspberry Pi 3/4 | Core Vendo CPU & Hotspot Gateway |
| **2** | **Multi-Coin Acceptor** | **Allan 1234A** or **Allan 1235A** (Programmable) | Accepts ₱1, ₱5, ₱10, and ₱20 coins |
| **3** | **Power Supply Unit (PSU)** | 12V DC, 3A to 5A Switching Power Supply | Powers coin acceptor, relay, and buck converter |
| **4** | **Step-Down Buck Converter** | LM2596 or XL4015 (12V IN ➔ 5V 3A OUT) | Powers the SBC cleanly via 5V DC IN |
| **5** | **12V Relay Module** | 1-Channel Relay (5V or 12V trigger) | **Cut-off circuit**: Disables coin slot when idle |
| **6** | **Resistors (Voltage Divider)** | 10kΩ and 4.7kΩ (or 1kΩ pull-up) | Steppes 5V/12V coin pulse safely down to 3.3V GPIO |
| **7** | **Access Point (AP)** | Comfast CF-E110N / CF-EW71 / TP-Link EAP110 | Long-range outdoor / indoor Wi-Fi coverage |

---

## 🎨 Allan 1234A / 1235A Coin Acceptor Wire Color Codes

| Wire Color | Signal Name | Connection Point | Notes |
| :--- | :--- | :--- | :--- |
| **RED** | **+12V DC Power** | Connect to **Relay NO (Normally Open)** | Switched by cut-off relay |
| **BLACK** | **Ground (GND)** | Connect to **Common 12V PSU GND & SBC GND** | Must share common ground! |
| **WHITE** | **COIN PULSE** | Connect to **Voltage Divider ➔ SBC GPIO Input** | Open-collector active LOW pulse train |
| **GRAY** | **Mechanical Counter** | *Optional* (Leave disconnected if unused) | 12V Pulse for mechanical odometer |

---

## ⚡ Master Wiring Schematic

```
 [12V 5A Power Supply]
     │
     ├─── (+) 12V DC ───────┬───➔ [LM2596 Step-Down (5V 3A)] ────➔ SBC 5V Power Pin
     │                      │
     │                      └───➔ [Relay COM]
     │                                │ (Switched by SBC Relay Pin)
     │                                └───➔ [Relay NO] ──────────➔ Allan RED (+12V)
     │
     └─── (-) GND ──────────┬───➔ [LM2596 Step-Down GND] ────────➔ SBC GND Pin
                            ├───➔ [Relay Module GND] ────────────➔ SBC GND Pin
                            └───➔ [Allan Coin Acceptor BLACK] ───➔ Common GND

 [Allan WHITE (Pulse)]
     │
     ├─── [10kΩ Resistor] ───➔ SBC Ground (Pull-Down)
     └─── [4.7kΩ Resistor] ──➔ SBC GPIO PA12 (Physical Pin 3)
```

---

## 📌 SBC GPIO Header Pin Connections

### 1. Orange Pi One / PC (Allwinner H3 40-Pin Header)

| Physical Pin # | GPIO Name | Function | Destination Component |
| :--- | :--- | :--- | :--- |
| **Pin 2** | **5V VCC** | 5V DC Power Input | LM2596 Step-Down 5.1V Output (+) |
| **Pin 6** | **GND** | System Ground | Common Ground Bus (-) |
| **Pin 3** | **PA12** | **Coin Pulse Input** | Allan Acceptor WHITE (via resistor divider) |
| **Pin 5** | **PA11** | **Cut-Off Relay Signal** | Relay Module Signal (IN) |
| **Pin 7** | **PA06** | *Optional Buzzer* | 5V Piezo Buzzer (+) |

### 2. Raspberry Pi 3 / 4 / Zero 2W (40-Pin Header)

| Physical Pin # | BCM GPIO | Function | Destination Component |
| :--- | :--- | :--- | :--- |
| **Pin 2** | **5V** | 5V DC Power Input | LM2596 Step-Down Output (+) |
| **Pin 6** | **GND** | System Ground | Common Ground (-) |
| **Pin 11** | **GPIO 17** | **Coin Pulse Input** | Allan Acceptor WHITE |
| **Pin 13** | **GPIO 27** | **Cut-Off Relay Signal** | Relay Module Signal (IN) |

---

## 🛡️ Cut-Off Relay Working Principle

Why is a cut-off relay mandatory in professional Piso WiFi systems?
1. When no customer has pressed **"INSERT COIN"**, the relay is **DE-ENERGIZED**.
2. The Allan coin acceptor's 12V line is open-circuit, causing its mechanical internal gate to reject any dropped coin straight back out into the return tray.
3. When a customer clicks **"INSERT COIN"** on their mobile phone, the SBC energizes the relay for **60 seconds**, lighting up the slot and allowing coins to pass through the optical pulse counter.
4. This completely eliminates coin theft, uncredited drops, and customer complaints!

---

## ⚙️ Allan 1234A Calibration Switch Settings

On the side of the Allan 1234A coin acceptor:
- **SW1 (Pulse Speed)**: Set to **MEDIUM (40ms)** or **FAST (20ms)**. (Default: Medium / 40ms).
- **SW2 (Output Signal)**: Set to **N.O. (Normally Open)**.
- **SW3 (Precision)**: Set to **ACCURATE / NORMAL** to prevent counterfeit coin acceptance.
