#!/usr/bin/env bash
# ==============================================================================
# WiFi5 LPB Piso WiFi - Production iptables Captive Redirection & NAT Rules
# ==============================================================================

HOTSPOT_IF="wlan0"
WAN_IF="eth0"
PORTAL_IP="10.0.0.1"
PORTAL_PORT="80"

echo "[FIREWALL] Resetting existing iptables firewall rules..."
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

echo "[FIREWALL] Configuring Default Policies..."
iptables -P INPUT ACCEPT
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

echo "[FIREWALL] Configuring WAN NAT Masquerade on ${WAN_IF}..."
iptables -t nat -A POSTROUTING -o ${WAN_IF} -j MASQUERADE

# Forward established connections
iptables -A FORWARD -i ${WAN_IF} -o ${HOTSPOT_IF} -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow DNS and DHCP queries
iptables -A INPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --dport 67:68 -j ACCEPT
iptables -A FORWARD -p udp --dport 53 -j ACCEPT

# Captive Portal Bypasses (Operating System probe URLs)
iptables -t nat -A PREROUTING -d captive.apple.com -j ACCEPT
iptables -t nat -A PREROUTING -d connectivitycheck.gstatic.com -j ACCEPT
iptables -t nat -A PREROUTING -d msftconnecttest.com -j ACCEPT

# Whitelist Paying Clients Chain
iptables -N WIFI5_WHITELIST
iptables -t nat -N WIFI5_WHITELIST_NAT

# Apply Whitelist Chain
iptables -A FORWARD -i ${HOTSPOT_IF} -j WIFI5_WHITELIST
iptables -t nat -A PREROUTING -i ${HOTSPOT_IF} -j WIFI5_WHITELIST_NAT

# Redirect all remaining non-authenticated HTTP (Port 80) traffic to Captive Portal
iptables -t nat -A PREROUTING -i ${HOTSPOT_IF} -p tcp --dport 80 -j DNAT --to-destination ${PORTAL_IP}:${PORTAL_PORT}

echo "[FIREWALL] Captive Portal firewall rules successfully applied!"
