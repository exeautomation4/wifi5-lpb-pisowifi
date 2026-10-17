#!/usr/bin/env python3
"""
WiFi5 LPB Piso WiFi - Hardware GPIO Coin Acceptor & 12V Relay Controller
Compatible with: Orange Pi (Allwinner H3/H616), Raspberry Pi 3/4/Zero 2W
Handles pulse trains from Allan 1234A / 1235A Multi-Coin Acceptors with software debouncing.
"""

import time
import sys
import os
import threading
import json
import urllib.request

# Configuration
PULSE_PIN = 12        # Orange Pi PA12 (Physical Pin 3)
RELAY_PIN = 11        # Orange Pi PA11 (Physical Pin 5) - 12V Cut-Off Solenoid
DEBOUNCE_MS = 40      # Debounce threshold in milliseconds
INTER_COIN_GAP = 0.5  # Seconds of silence after pulse train before finalizing credit
BACKEND_API_PORT = 8080

pulse_counter = 0
last_pulse_time = 0
lock = threading.Lock()
relay_is_active = False

print("[WIFI5] Initializing Hardware GPIO Coin Detection Daemon...")

def initialize_gpio():
    """Initializes SBC GPIO subsystem (tries gpiod, OPi.GPIO, or RPi.GPIO)."""
    global relay_is_active
    try:
        # Check if running on Orange Pi with OPi.GPIO
        import OPi.GPIO as GPIO
        GPIO.setmode(GPIO.BOARD)
        GPIO.setup(PULSE_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(RELAY_PIN, GPIO.OUT)
        GPIO.output(RELAY_PIN, GPIO.LOW) # Default: Relay cut-off active
        GPIO.add_event_detect(PULSE_PIN, GPIO.FALLING, callback=on_gpio_pulse_interrupt)
        print("[GPIO] Successfully initialized OPi.GPIO (Board mode).")
        return True
    except ImportError:
        try:
            # Check Raspberry Pi
            import RPi.GPIO as GPIO
            GPIO.setmode(GPIO.BOARD)
            GPIO.setup(PULSE_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.setup(RELAY_PIN, GPIO.OUT)
            GPIO.output(RELAY_PIN, GPIO.LOW)
            GPIO.add_event_detect(PULSE_PIN, GPIO.FALLING, callback=on_gpio_pulse_interrupt)
            print("[GPIO] Successfully initialized RPi.GPIO (Board mode).")
            return True
        except ImportError:
            print("[GPIO SIMULATION] Running in simulated software mode (No physical GPIO drivers found).")
            return False

def on_gpio_pulse_interrupt(channel):
    """Callback fired on falling edge pulse from coin acceptor."""
    global pulse_counter, last_pulse_time
    now = time.time()
    with lock:
        # Software Debounce Filter
        if (now - last_pulse_time) * 1000 >= DEBOUNCE_MS:
            pulse_counter += 1
            last_pulse_time = now
            print(f"[PULSE DETECTED] Pin {channel} -> Pulse #{pulse_counter}")

def pulse_evaluator_loop():
    """Background evaluator to convert accumulated pulses into Peso credits."""
    global pulse_counter, last_pulse_time
    while True:
        time.sleep(0.05)
        with lock:
            if pulse_counter > 0 and (time.time() - last_pulse_time) > INTER_COIN_GAP:
                amount_peso = pulse_counter
                print(f"[COIN FINALIZED] Evaluated {pulse_counter} pulses = ₱{amount_peso}.00 Credit!")
                notify_local_server(amount_peso)
                pulse_counter = 0

def notify_local_server(peso):
    """Notifies the local captive portal service of the credit."""
    url = f"http://127.0.0.1:{BACKEND_API_PORT}/api/coin-inserted"
    payload = json.dumps({"amount": peso, "timestamp": time.time()}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=2) as response:
            print(f"[API RESPONSE] Successfully credited ₱{peso} to active session.")
    except Exception as e:
        print(f"[API NOTE] Local HTTP endpoint not active or simulated: {e}")

def set_coin_relay(state: bool):
    """Energizes (True) or de-energizes (False) the 12V coin acceptor cut-off relay."""
    global relay_is_active
    relay_is_active = state
    try:
        import OPi.GPIO as GPIO
        GPIO.output(RELAY_PIN, GPIO.HIGH if state else GPIO.LOW)
    except:
        try:
            import RPi.GPIO as GPIO
            GPIO.output(RELAY_PIN, GPIO.HIGH if state else GPIO.LOW)
        except:
            pass
    print(f"[RELAY] 12V Coin Solenoid Relay set to: {'ENERGIZED (ON)' if state else 'CUT-OFF (OFF)'}")

if __name__ == "__main__":
    initialize_gpio()
    t = threading.Thread(target=pulse_evaluator_loop, daemon=True)
    t.start()
    print("[WIFI5] Coin Listener Daemon running. Press Ctrl+C to terminate.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("[WIFI5] Daemon stopped cleanly.")
