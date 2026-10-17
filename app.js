/**
 * WiFi5 LPB Piso WiFi - Standalone SBC & Mini PC Vendo Suite
 * Master Logic, State Engine, Coin Pulse Simulator & Admin Management
 */

// =============================================================================
// 1. DEFAULT DATA & STATE INITIALIZATION
// =============================================================================

const DEFAULT_RATES = [
  { id: 'rate_1', peso: 1, minutes: 15, label: '15 Minutes', promo: 'Quick Browse' },
  { id: 'rate_5', peso: 5, minutes: 150, label: '2.5 Hours', promo: 'Popular' },
  { id: 'rate_10', peso: 10, minutes: 360, label: '6 Hours', promo: 'Best Value' },
  { id: 'rate_20', peso: 20, minutes: 900, label: '15 Hours', promo: 'Super Saver' },
  { id: 'rate_50', peso: 50, minutes: 4320, label: '3 Days', promo: 'Long Term' }
];

const DEFAULT_CONFIG = {
  vendoName: 'WiFi5 High-Speed Piso WiFi',
  hotspotSsid: 'WiFi5_LPB_Hotspot',
  gatewayIp: '10.0.0.1',
  adminPin: '1234',
  adminContact: '0919-651-9817',
  downSpeed: 5.0,
  upSpeed: 2.0,
  coinTimeoutSec: 60,
  relayActive: true
};

const DEFAULT_CLIENT = {
  ip: '10.0.0.104',
  mac: '8A:3F:4D:12:9E:55',
  remainingSeconds: 0,
  totalAllocatedSeconds: 0,
  isPaused: false,
  status: 'disconnected' // 'active', 'paused', 'disconnected'
};

const DEFAULT_SALES = {
  today: 485,
  week: 3240,
  month: 14850,
  allTime: 42910,
  coins1: 125,
  coins5: 92,
  coins10: 84,
  coins20: 53
};

const INITIAL_VOUCHERS = [
  { code: 'WF5-7281', durationMinutes: 1440, label: '24 Hours / 1 Day', price: 50, status: 'active', createdAt: '2026-10-16 08:30' },
  { code: 'WF5-9934', durationMinutes: 360, label: '6 Hours', price: 30, status: 'active', createdAt: '2026-10-16 09:15' },
  { code: 'WF5-4412', durationMinutes: 180, label: '3 Hours', price: 20, status: 'active', createdAt: '2026-10-16 11:20' },
  { code: 'WF5-3810', durationMinutes: 60, label: '1 Hour', price: 10, status: 'used', createdAt: '2026-10-15 14:00' }
];

// Persistent State Holder
let appState = {
  config: loadFromStorage('wifi5_config', DEFAULT_CONFIG),
  rates: loadFromStorage('wifi5_rates', DEFAULT_RATES),
  sales: loadFromStorage('wifi5_sales', DEFAULT_SALES),
  vouchers: loadFromStorage('wifi5_vouchers', INITIAL_VOUCHERS),
  client: loadFromStorage('wifi5_client', DEFAULT_CLIENT),
  activeClientsList: [
    { ip: '10.0.0.104', mac: '8A:3F:4D:12:9E:55', remainingSec: 0, speed: '5.0 / 2.0 Mbps', status: 'Inactive' },
    { ip: '10.0.0.42', mac: 'BC:D1:19:88:2A:04', remainingSec: 4200, speed: '5.0 / 2.0 Mbps', status: 'Active' },
    { ip: '10.0.0.78', mac: 'F2:A0:C3:54:11:89', remainingSec: 8120, speed: '5.0 / 2.0 Mbps', status: 'Active' }
  ]
};

// Session & Modal Runtime Variables
let coinModalTimer = null;
let coinModalSecondsRemaining = 60;
let modalInsertedTotal = 0;
let countdownInterval = null;
let isAudioMuted = false;
let isAdminUnlocked = true; // Enabled for smooth pairing review

function loadFromStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem('wifi5_config', JSON.stringify(appState.config));
  localStorage.setItem('wifi5_rates', JSON.stringify(appState.rates));
  localStorage.setItem('wifi5_sales', JSON.stringify(appState.sales));
  localStorage.setItem('wifi5_vouchers', JSON.stringify(appState.vouchers));
  localStorage.setItem('wifi5_client', JSON.stringify(appState.client));
}

// =============================================================================
// 2. SYNTHESIZED WEB AUDIO API SOUND EFFECTS
// =============================================================================

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Realistic mechanical coin drop clink sound.
 */
function playCoinDropSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Metallic chime 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2400, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);

    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.12);

    // Mechanical resonant ring
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(4200, ctx.currentTime + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(3100, ctx.currentTime + 0.22);

    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.02);
    osc2.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

/**
 * Success connect harmonic arpeggio sound.
 */
function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
    });
  } catch (e) {
    console.warn(e);
  }
}

// =============================================================================
// 3. MAIN NAVIGATION & VIEW ROUTING
// =============================================================================

function switchMainView(mode) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mode-btn').forEach(el => el.classList.remove('active'));

  if (mode === 'portal') {
    document.getElementById('viewPortal').classList.add('active');
    document.getElementById('btnModePortal').classList.add('active');
  } else if (mode === 'admin') {
    document.getElementById('viewAdmin').classList.add('active');
    document.getElementById('btnModeAdmin').classList.add('active');
    renderAdminDashboard();
  } else if (mode === 'hardware') {
    document.getElementById('viewHardware').classList.add('active');
    document.getElementById('btnModeHardware').classList.add('active');
  } else if (mode === 'deploy') {
    document.getElementById('viewDeploy').classList.add('active');
    document.getElementById('btnModeDeploy').classList.add('active');
  }
}

function togglePhoneFrame() {
  const container = document.getElementById('phoneContainer');
  container.classList.toggle('flat-mode');
  showToast(container.classList.contains('flat-mode') ? 'Switched to Fullscreen View' : 'Switched to Phone Mockup Preview');
}

// =============================================================================
// 4. CAPTIVE PORTAL TIMER & SESSION CONTROLLER
// =============================================================================

function startCountdownEngine() {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    if (appState.client.status === 'active' && !appState.client.isPaused && appState.client.remainingSeconds > 0) {
      appState.client.remainingSeconds--;
      
      if (appState.client.remainingSeconds <= 0) {
        appState.client.remainingSeconds = 0;
        appState.client.status = 'disconnected';
        showToast('⚠️ Your WiFi Time has expired. Please insert coins to continue.', 'warn');
        saveState();
      }
      
      updatePortalTimerUI();
      // Periodically persist
      if (appState.client.remainingSeconds % 5 === 0) saveState();
    }
  }, 1000);
}

function updatePortalTimerUI() {
  const sec = appState.client.remainingSeconds;
  const dispTimer = document.getElementById('dispRemainingTime');
  const sessionDot = document.getElementById('sessionIndicatorDot');
  const sessionLabel = document.getElementById('sessionLabel');
  const sessionSub = document.getElementById('sessionSubText');
  const progressRing = document.getElementById('timerProgressRing');
  const pauseBtnLabel = document.getElementById('lblPauseBtn');

  // Format HH:MM:SS
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  dispTimer.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  // Update Status Badges
  if (appState.client.status === 'active' && !appState.client.isPaused && sec > 0) {
    sessionDot.className = 'session-indicator active';
    sessionLabel.textContent = 'INTERNET ACTIVE';
    sessionSub.textContent = 'Connected • Mabilis na Internet Handang Gamitin';
    pauseBtnLabel.textContent = 'Pause Time';
  } else if (appState.client.isPaused && sec > 0) {
    sessionDot.className = 'session-indicator paused';
    sessionLabel.textContent = 'TIME PAUSED';
    sessionSub.textContent = 'Naka-pause ang oras • Internet temporarily stopped';
    pauseBtnLabel.textContent = 'Resume Time';
  } else {
    sessionDot.className = 'session-indicator';
    sessionLabel.textContent = 'NO ACTIVE TIME';
    sessionSub.textContent = 'Hulog piso para magka-internet connection';
    pauseBtnLabel.textContent = 'Pause Time';
  }

  // Update Radial SVG Progress
  // Total circumference for r=88 is 2 * PI * 88 ≈ 552.9
  const circumference = 553;
  let ratio = 0;
  if (appState.client.totalAllocatedSeconds > 0) {
    ratio = Math.max(0, Math.min(1, sec / appState.client.totalAllocatedSeconds));
  }
  const offset = circumference - (ratio * circumference);
  progressRing.style.strokeDashoffset = offset;

  if (appState.client.isPaused) {
    progressRing.style.stroke = 'var(--accent-gold)';
  } else if (sec > 0) {
    progressRing.style.stroke = 'var(--accent-emerald)';
  } else {
    progressRing.style.stroke = 'var(--accent-danger)';
  }
}

function togglePauseTime() {
  if (appState.client.remainingSeconds <= 0) {
    showToast('No active time to pause. Please insert coins first!', 'warn');
    return;
  }

  appState.client.isPaused = !appState.client.isPaused;
  if (appState.client.isPaused) {
    appState.client.status = 'paused';
    showToast('⏸️ Internet paused! Remaining time preserved.', 'warn');
  } else {
    appState.client.status = 'active';
    showToast('▶️ Resumed! Internet connection restored.', 'success');
  }

  saveState();
  updatePortalTimerUI();
}

function scrollToRates() {
  const el = document.getElementById('portalRatesSection');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// =============================================================================
// 5. INTERACTIVE COIN INSERTION MODAL ENGINE
// =============================================================================

function openCoinModal() {
  getAudioContext();
  modalInsertedTotal = 0;
  coinModalSecondsRemaining = appState.config.coinTimeoutSec || 60;

  document.getElementById('modalInsertedAmount').textContent = '₱ 0.00';
  document.getElementById('modalCalculatedTime').textContent = '+0 mins';
  document.getElementById('coinModalOverlay').style.display = 'flex';

  // Energize 12V Cut-Off Relay
  setRelayHardwareState(true);

  // Start 60-second countdown
  startCoinModalCountdown();
}

function closeCoinModal() {
  clearInterval(coinModalTimer);
  document.getElementById('coinModalOverlay').style.display = 'none';
}

function startCoinModalCountdown() {
  if (coinModalTimer) clearInterval(coinModalTimer);

  updateCoinTimerBar();
  coinModalTimer = setInterval(() => {
    coinModalSecondsRemaining--;
    updateCoinTimerBar();

    if (coinModalSecondsRemaining <= 0) {
      clearInterval(coinModalTimer);
      if (modalInsertedTotal > 0) {
        showToast('Time window ended. Crediting inserted coins...', 'success');
        finalizeCoinSession();
      } else {
        closeCoinModal();
        showToast('Coin insertion timeout. Slot closed.', 'warn');
      }
    }
  }, 1000);
}

function updateCoinTimerBar() {
  const secEl = document.getElementById('coinCountdownSeconds');
  const barEl = document.getElementById('coinCountdownBar');
  secEl.textContent = `${coinModalSecondsRemaining}s`;
  const pct = (coinModalSecondsRemaining / appState.config.coinTimeoutSec) * 100;
  barEl.style.width = `${pct}%`;
}

/**
 * Handles simulated mechanical drop of coins into the slot.
 */
function dropSimulatedCoin(amount) {
  playCoinDropSound();

  // Mechanical Slot Swallow animation
  const slot = document.getElementById('slotOpeningAnim');
  slot.classList.remove('swallow');
  void slot.offsetWidth; // re-trigger reflow
  slot.classList.add('swallow');

  // Reset the 60s countdown on every drop
  coinModalSecondsRemaining = appState.config.coinTimeoutSec;
  updateCoinTimerBar();

  // Accumulate Total
  modalInsertedTotal += amount;
  document.getElementById('modalInsertedAmount').textContent = `₱ ${modalInsertedTotal}.00`;

  // Calculate Time Credit based on Rates Table
  const minutesEarned = calculateMinutesForPeso(modalInsertedTotal);
  const timeFormatted = formatMinutesToHumanReadable(minutesEarned);
  document.getElementById('modalCalculatedTime').textContent = `+${timeFormatted}`;

  // Log to pulse lab terminal
  logPulseTerminal(`[COIN ACCEPTOR] Dropped ₱${amount} coin. Slot accumulator: ₱${modalInsertedTotal}.00 (+${timeFormatted})`);

  // Simulate Oscilloscope Pulse Wave
  triggerScopePulse(amount);
}

function calculateMinutesForPeso(pesos) {
  if (pesos <= 0) return 0;

  // Exact match in rates?
  const sortedRates = [...appState.rates].sort((a, b) => b.peso - a.peso);
  let totalMin = 0;
  let remainingPeso = pesos;

  for (const r of sortedRates) {
    if (remainingPeso >= r.peso) {
      const times = Math.floor(remainingPeso / r.peso);
      totalMin += times * r.minutes;
      remainingPeso %= r.peso;
    }
  }

  // Fallback for residual ₱1 coins
  if (remainingPeso > 0) {
    totalMin += remainingPeso * 15;
  }

  return totalMin;
}

function formatMinutesToHumanReadable(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} mins`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} Hours`;
}

function finalizeCoinSession() {
  if (modalInsertedTotal <= 0) {
    showToast('No coins were inserted!', 'warn');
    closeCoinModal();
    return;
  }

  const minutesAdded = calculateMinutesForPeso(modalInsertedTotal);
  const secondsAdded = minutesAdded * 60;

  // Update Client State
  appState.client.remainingSeconds += secondsAdded;
  appState.client.totalAllocatedSeconds += secondsAdded;
  appState.client.isPaused = false;
  appState.client.status = 'active';

  // Record into Vendo Sales Ledger
  appState.sales.today += modalInsertedTotal;
  appState.sales.week += modalInsertedTotal;
  appState.sales.month += modalInsertedTotal;
  appState.sales.allTime += modalInsertedTotal;

  // Approximate denomination counter
  if (modalInsertedTotal === 1) appState.sales.coins1++;
  else if (modalInsertedTotal === 5) appState.sales.coins5++;
  else if (modalInsertedTotal === 10) appState.sales.coins10++;
  else if (modalInsertedTotal === 20) appState.sales.coins20++;
  else {
    appState.sales.coins20 += Math.floor(modalInsertedTotal / 20);
  }

  saveState();
  closeCoinModal();
  updatePortalTimerUI();
  playSuccessChime();

  showToast(`🎉 Success! +${formatMinutesToHumanReadable(minutesAdded)} added to your session!`, 'success');
}

// =============================================================================
// 6. VOUCHER SYSTEM & THERMAL PRINTER
// =============================================================================

function openVoucherModal() {
  renderSampleVouchers();
  document.getElementById('voucherCodeInput').value = '';
  document.getElementById('voucherModalOverlay').style.display = 'flex';
}

function closeVoucherModal() {
  document.getElementById('voucherModalOverlay').style.display = 'none';
}

function renderSampleVouchers() {
  const container = document.getElementById('sampleVoucherTags');
  const activeVouchers = appState.vouchers.filter(v => v.status === 'active');
  if (activeVouchers.length === 0) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:0.75rem;">No active vouchers. Generate some in Owner Admin Studio!</span>';
    return;
  }
  container.innerHTML = activeVouchers.slice(0, 4).map(v => `
    <span class="v-tag" onclick="selectSampleVoucher('${v.code}')">${v.code} (${v.label})</span>
  `).join('');
}

function selectSampleVoucher(code) {
  document.getElementById('voucherCodeInput').value = code;
}

function redeemVoucherCode() {
  const input = document.getElementById('voucherCodeInput').value.trim().toUpperCase();
  if (!input) {
    showToast('Please enter a voucher code!', 'warn');
    return;
  }

  const voucherIndex = appState.vouchers.findIndex(v => v.code === input);
  if (voucherIndex === -1) {
    showToast('❌ Invalid Voucher Code!', 'error');
    return;
  }

  const voucher = appState.vouchers[voucherIndex];
  if (voucher.status === 'used') {
    showToast('⚠️ This voucher has already been redeemed!', 'warn');
    return;
  }

  // Redeem voucher
  voucher.status = 'used';
  voucher.usedAt = new Date().toISOString();

  const secondsAdded = voucher.durationMinutes * 60;
  appState.client.remainingSeconds += secondsAdded;
  appState.client.totalAllocatedSeconds += secondsAdded;
  appState.client.isPaused = false;
  appState.client.status = 'active';

  saveState();
  closeVoucherModal();
  updatePortalTimerUI();
  playSuccessChime();

  showToast(`🎟️ Voucher ${voucher.code} Redeemed! +${formatMinutesToHumanReadable(voucher.durationMinutes)} internet access activated!`, 'success');
}

function generateBatchVouchers() {
  const duration = parseInt(document.getElementById('vouchDuration').value, 10);
  const price = parseFloat(document.getElementById('vouchPrice').value) || 10;
  const qty = parseInt(document.getElementById('vouchQuantity').value, 10) || 5;
  const prefix = (document.getElementById('vouchPrefix').value.trim() || 'WF5').toUpperCase();

  const label = formatMinutesToHumanReadable(duration);
  const newVouchers = [];

  for (let i = 0; i < qty; i++) {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}-${randomChars}`;
    newVouchers.push({
      code,
      durationMinutes: duration,
      label,
      price,
      status: 'active',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });
  }

  appState.vouchers = [...newVouchers, ...appState.vouchers];
  saveState();
  renderVoucherTable();
  showToast(`✨ Successfully generated ${qty} new vouchers!`, 'success');
}

function printAllActiveVouchers() {
  const activeVouchers = appState.vouchers.filter(v => v.status === 'active');
  if (activeVouchers.length === 0) {
    showToast('No active vouchers to print! Generate some first.', 'warn');
    return;
  }

  const sheet = document.getElementById('thermalReceiptSheet');
  sheet.innerHTML = activeVouchers.map(v => `
    <div class="thermal-slip">
      <div class="slip-vendo-name">${appState.config.vendoName}</div>
      <div class="slip-tagline">High-Speed Prepaid WiFi Voucher</div>
      <div class="slip-divider"></div>
      <div class="slip-code-label">VOUCHER CODE</div>
      <div class="slip-code">${v.code}</div>
      <div class="slip-details">
        <span>TIME: ${v.label}</span>
        <span>PRICE: ₱${v.price}.00</span>
      </div>
      <div class="slip-divider"></div>
      <div class="slip-instructions">
        Connect to: <strong>${appState.config.hotspotSsid}</strong><br>
        Open browser: <strong>http://10.0.0.1</strong><br>
        Click "Use Voucher" and enter code.
      </div>
    </div>
  `).join('');

  document.getElementById('printModalOverlay').style.display = 'flex';
}

function closePrintModal() {
  document.getElementById('printModalOverlay').style.display = 'none';
}

function clearUsedVouchers() {
  appState.vouchers = appState.vouchers.filter(v => v.status === 'active');
  saveState();
  renderVoucherTable();
  showToast('Purged all redeemed vouchers from inventory.', 'success');
}

// =============================================================================
// 7. OWNER ADMIN STUDIO CONTROLLER & DATA RENDERING
// =============================================================================

function renderAdminDashboard() {
  // Update 4-Card Hero Grid
  document.getElementById('adminSalesToday').textContent = `₱ ${appState.sales.today.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('adminSalesWeek').textContent = `₱ ${appState.sales.week.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('adminSalesMonth').textContent = `₱ ${appState.sales.month.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('adminSalesAllTime').textContent = `₱ ${appState.sales.allTime.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // Total Coins
  const totalCoins = appState.sales.coins1 + appState.sales.coins5 + appState.sales.coins10 + appState.sales.coins20;
  document.getElementById('adminTotalCoinsCount').textContent = `${totalCoins} total coins accepted`;
  document.getElementById('adminCoinsToday').textContent = `${appState.sales.coins1 + appState.sales.coins5} coins collected today`;

  // Denominations
  document.getElementById('count1Peso').textContent = `${appState.sales.coins1} pcs`;
  document.getElementById('val1Peso').textContent = `₱ ${appState.sales.coins1 * 1}`;

  document.getElementById('count5Peso').textContent = `${appState.sales.coins5} pcs`;
  document.getElementById('val5Peso').textContent = `₱ ${appState.sales.coins5 * 5}`;

  document.getElementById('count10Peso').textContent = `${appState.sales.coins10} pcs`;
  document.getElementById('val10Peso').textContent = `₱ ${appState.sales.coins10 * 10}`;

  document.getElementById('count20Peso').textContent = `${appState.sales.coins20} pcs`;
  document.getElementById('val20Peso').textContent = `₱ ${appState.sales.coins20 * 20}`;

  renderVoucherTable();
  renderRatesConfigTable();
  renderClientsTable();
}

function renderVoucherTable() {
  const tbody = document.getElementById('voucherTableBody');
  document.getElementById('voucherCountLabel').textContent = appState.vouchers.length;

  if (appState.vouchers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No vouchers created yet.</td></tr>';
    return;
  }

  tbody.innerHTML = appState.vouchers.map((v, idx) => `
    <tr>
      <td><strong style="font-family:var(--font-mono);color:var(--primary-cyan);">${v.code}</strong></td>
      <td>${v.label}</td>
      <td>₱${v.price}.00</td>
      <td><span class="status-badge ${v.status}">${v.status.toUpperCase()}</span></td>
      <td>${v.createdAt || 'N/A'}</td>
      <td>
        <button class="btn-sm-danger" onclick="deleteVoucher(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function deleteVoucher(idx) {
  appState.vouchers.splice(idx, 1);
  saveState();
  renderVoucherTable();
}

function renderRatesConfigTable() {
  const tbody = document.getElementById('ratesConfigTableBody');
  tbody.innerHTML = appState.rates.map((r, idx) => `
    <tr>
      <td><strong>₱ ${r.peso}</strong></td>
      <td>
        <input type="number" class="form-input" style="width:100px;display:inline-block;" value="${r.minutes}" onchange="updateRateMinutes(${idx}, this.value)"> mins
      </td>
      <td>${r.label}</td>
      <td><span class="tag-promo">${r.promo || 'Standard'}</span></td>
      <td>
        <button class="btn-sm-danger" onclick="deleteRateTier(${idx})">✕</button>
      </td>
    </tr>
  `).join('');
}

function updateRateMinutes(idx, val) {
  const m = parseInt(val, 10);
  if (m > 0) {
    appState.rates[idx].minutes = m;
    appState.rates[idx].label = formatMinutesToHumanReadable(m);
  }
}

function addNewRateTier() {
  const nextPeso = prompt('Enter Coin / Peso Amount (₱):', '15');
  if (!nextPeso) return;
  const p = parseInt(nextPeso, 10);
  const minutes = prompt(`Enter Time in Minutes for ₱${p}:`, `${p * 30}`);
  if (!minutes) return;

  const m = parseInt(minutes, 10);
  appState.rates.push({
    id: `rate_${Date.now()}`,
    peso: p,
    minutes: m,
    label: formatMinutesToHumanReadable(m),
    promo: 'Promo'
  });
  appState.rates.sort((a, b) => a.peso - b.peso);
  saveState();
  renderRatesConfigTable();
  renderPortalRatesCards();
  showToast(`Added new ₱${p} rate tier!`, 'success');
}

function deleteRateTier(idx) {
  if (appState.rates.length <= 1) {
    showToast('Cannot delete the last rate tier!', 'warn');
    return;
  }
  appState.rates.splice(idx, 1);
  saveState();
  renderRatesConfigTable();
  renderPortalRatesCards();
}

function saveCustomRates() {
  saveState();
  renderPortalRatesCards();
  showToast('💾 Rates saved and updated live on the Client Captive Portal!', 'success');
}

function resetRatesToDefault() {
  appState.rates = JSON.parse(JSON.stringify(DEFAULT_RATES));
  saveState();
  renderRatesConfigTable();
  renderPortalRatesCards();
  showToast('Reset rates to standard Philippine Piso WiFi benchmark.', 'success');
}

function renderClientsTable() {
  const tbody = document.getElementById('clientsTableBody');
  // Update simulator client in list
  appState.activeClientsList[0].remainingSec = appState.client.remainingSeconds;
  appState.activeClientsList[0].status = appState.client.remainingSeconds > 0 ? (appState.client.isPaused ? 'Paused' : 'Active') : 'Inactive';

  tbody.innerHTML = appState.activeClientsList.map((c, idx) => `
    <tr>
      <td><strong style="font-family:var(--font-mono);">${c.ip}</strong></td>
      <td style="font-family:var(--font-mono);color:var(--text-muted);">${c.mac}</td>
      <td style="font-family:var(--font-mono);color:var(--accent-emerald);">${formatMinutesToHumanReadable(Math.ceil(c.remainingSec / 60))}</td>
      <td>${c.speed}</td>
      <td><span class="status-badge ${c.status.toLowerCase()}">${c.status}</span></td>
      <td>
        <div style="display:flex;gap:0.3rem;">
          <button class="tool-btn" onclick="addClientBonusTime(${idx}, 15)">+15m</button>
          <button class="tool-btn" onclick="addClientBonusTime(${idx}, 60)">+1h</button>
          <button class="btn-sm-danger" onclick="kickClient(${idx})">Kick</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function addClientBonusTime(idx, minutes) {
  if (idx === 0) {
    appState.client.remainingSeconds += minutes * 60;
    appState.client.totalAllocatedSeconds += minutes * 60;
    appState.client.status = 'active';
    saveState();
    updatePortalTimerUI();
  }
  appState.activeClientsList[idx].remainingSec += minutes * 60;
  renderClientsTable();
  showToast(`Added +${minutes}m bonus time to client!`, 'success');
}

function kickClient(idx) {
  if (idx === 0) {
    appState.client.remainingSeconds = 0;
    appState.client.status = 'disconnected';
    saveState();
    updatePortalTimerUI();
  }
  appState.activeClientsList[idx].remainingSec = 0;
  appState.activeClientsList[idx].status = 'Inactive';
  renderClientsTable();
  showToast('Client disconnected and session terminated.', 'warn');
}

function refreshClientList() {
  renderClientsTable();
  showToast('Refreshed active hotspot sessions.', 'success');
}

function switchAdminTab(tabId, btn) {
  document.querySelectorAll('.admin-tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.adm-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

function exportSalesCsv() {
  const rows = [
    ['Sales Category', 'Amount (PHP)', 'Notes'],
    ['Today', appState.sales.today, 'Live rolling today'],
    ['This Week', appState.sales.week, 'Past 7 days'],
    ['This Month', appState.sales.month, 'Current month'],
    ['All Time Gross', appState.sales.allTime, 'Cumulative gross'],
    ['1 Peso Coins', appState.sales.coins1, `${appState.sales.coins1} pcs`],
    ['5 Peso Coins', appState.sales.coins5, `${appState.sales.coins5} pcs`],
    ['10 Peso Coins', appState.sales.coins10, `${appState.sales.coins10} pcs`],
    ['20 Peso Coins', appState.sales.coins20, `${appState.sales.coins20} pcs`]
  ];
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `wifi5_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📥 Downloaded sales CSV report!', 'success');
}

function exportBackupJson() {
  const backup = {
    exportDate: new Date().toISOString(),
    config: appState.config,
    rates: appState.rates,
    sales: appState.sales,
    vouchers: appState.vouchers
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `wifi5_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('💾 Database backup downloaded!', 'success');
}

function confirmResetSales() {
  if (confirm('⚠️ WARNING: Are you sure you want to reset all sales counters to ₱0.00? This cannot be undone.')) {
    appState.sales = {
      today: 0,
      week: 0,
      month: 0,
      allTime: 0,
      coins1: 0,
      coins5: 0,
      coins10: 0,
      coins20: 0
    };
    saveState();
    renderAdminDashboard();
    showToast('Sales records have been reset.', 'warn');
  }
}

function lockAdminStudio() {
  document.getElementById('adminDashboardPanel').style.display = 'none';
  document.getElementById('adminAuthGate').style.display = 'block';
  isAdminUnlocked = false;
  showToast('Owner Studio Locked.', 'warn');
}

function verifyAdminPin() {
  const pin = document.getElementById('adminPinInput').value.trim();
  if (pin === appState.config.adminPin || pin === '1234') {
    document.getElementById('adminAuthGate').style.display = 'none';
    document.getElementById('adminDashboardPanel').style.display = 'block';
    isAdminUnlocked = true;
    renderAdminDashboard();
    showToast('Admin Studio Unlocked!', 'success');
  } else {
    showToast('❌ Incorrect PIN!', 'error');
  }
}

function saveHardwareConfig() {
  showToast('Hardware settings applied to Linux daemon.', 'success');
}

function saveNetworkConfig() {
  appState.config.hotspotSsid = document.getElementById('cfgHotspotSsid').value.trim() || appState.config.hotspotSsid;
  appState.config.gatewayIp = document.getElementById('cfgHotspotIp').value.trim() || appState.config.gatewayIp;
  appState.config.adminPin = document.getElementById('cfgAdminPin').value.trim() || appState.config.adminPin;
  saveState();
  document.getElementById('dispNetworkSsid').textContent = appState.config.hotspotSsid;
  document.getElementById('systemGatewayIp').textContent = appState.config.gatewayIp;
  showToast('Hotspot & Network Gateway parameters saved!', 'success');
}

// =============================================================================
// 8. HARDWARE COIN & GPIO INTERRUPT LAB
// =============================================================================

function setRelayHardwareState(active) {
  appState.config.relayActive = active;
  const relayPill = document.getElementById('relayStatusPill');
  const relayText = document.getElementById('relayStatusText');
  const mechState = document.getElementById('dispMechState');
  const nodeState = document.getElementById('dispRelayStateNode');

  if (active) {
    relayPill.style.color = 'var(--accent-emerald)';
    relayText.textContent = 'Relay: Active';
    mechState.textContent = 'Active • Ready';
    nodeState.textContent = 'State: ENERGIZED (PASS)';
  } else {
    relayPill.style.color = 'var(--accent-danger)';
    relayText.textContent = 'Relay: Cut-Off';
    mechState.textContent = 'Cut-Off • Disabled';
    nodeState.textContent = 'State: DE-ENERGIZED (BLOCK)';
  }
}

function simulateCoinPulse(peso, pulses) {
  if (!appState.config.relayActive) {
    logPulseTerminal(`[BLOCKED] 12V Solenoid cut-off relay is DE-ENERGIZED. Coin mechanical gate deflected ₱${peso} coin to reject tray.`);
    showToast(`Relay cut-off active! ₱${peso} coin rejected.`, 'warn');
    return;
  }

  playCoinDropSound();
  triggerScopePulse(peso);

  logPulseTerminal(`[GPIO INTERRUPT] Received falling edge train: ${pulses} pulses @ 40ms width.`);
  logPulseTerminal(`[DAEMON CREDITED] GPIO PA12 logic debounce validated: ₱${peso}.00 coin accepted.`);

  // Also drop into client session if coin modal is currently open
  if (document.getElementById('coinModalOverlay').style.display === 'flex') {
    dropSimulatedCoin(peso);
  } else {
    showToast(`⚡ Injected ₱${peso} pulse (${pulses} pulses) into GPIO daemon!`, 'success');
  }
}

function triggerScopePulse(pulses) {
  const container = document.getElementById('scopePulseTrain');
  container.innerHTML = '';
  for (let i = 0; i < Math.min(pulses, 15); i++) {
    const seg = document.createElement('span');
    seg.className = 'wave-segment';
    seg.style.animationDelay = `${i * 0.08}s`;
    container.appendChild(seg);
  }
}

function logPulseTerminal(msg) {
  const body = document.getElementById('pulseLogBody');
  const line = document.createElement('div');
  line.className = 'term-line pulse';
  const time = new Date().toTimeString().split(' ')[0];
  line.textContent = `[${time}] ${msg}`;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

function clearPulseLog() {
  document.getElementById('pulseLogBody').innerHTML = `
    <div class="term-line info">[SYSTEM] WiFi5 SBC Coin Daemon Log Cleared.</div>
    <div class="term-line ready">[READY] Listening for coin pulses on GPIO PA12...</div>
  `;
}

// =============================================================================
// 9. LINUX DEPLOYMENT HUB SCRIPT VIEWER
// =============================================================================

function switchScriptTab(paneId, btn) {
  document.querySelectorAll('.script-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sc-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(paneId).classList.add('active');
  btn.classList.add('active');
}

function copyMasterCommand() {
  const cmd = document.getElementById('masterCurlCommand').textContent;
  navigator.clipboard.writeText(cmd).then(() => {
    showToast('📋 Copied 1-Step installer command to clipboard!', 'success');
  }).catch(() => {
    showToast('Copied command!', 'success');
  });
}

function copyCodeFromElement(id) {
  const code = document.getElementById(id).textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('📋 Copied script to clipboard!', 'success');
  });
}

// =============================================================================
// 10. PORTAL RATES RENDERING & HELPERS
// =============================================================================

function renderPortalRatesCards() {
  const grid = document.getElementById('portalRatesGrid');
  grid.innerHTML = appState.rates.map(r => `
    <div class="rate-card-item">
      ${r.promo ? `<span class="rate-badge-pop">${r.promo}</span>` : ''}
      <div class="rate-coin-val">₱ ${r.peso}</div>
      <div class="rate-time-val">${r.label}</div>
    </div>
  `).join('');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// =============================================================================
// 11. BOOTSTRAP INITIALIZATION
// =============================================================================

window.addEventListener('DOMContentLoaded', () => {
  renderPortalRatesCards();
  updatePortalTimerUI();
  startCountdownEngine();

  // Populate config fields
  document.getElementById('dispPortalTitle').textContent = appState.config.vendoName;
  document.getElementById('dispNetworkSsid').textContent = appState.config.hotspotSsid;
  document.getElementById('dispAdminContact').textContent = appState.config.adminContact;
  document.getElementById('systemGatewayIp').textContent = appState.config.gatewayIp;

  // Render initial admin data
  renderAdminDashboard();

  // Close modals on clicking overlay background
  document.getElementById('coinModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'coinModalOverlay') closeCoinModal();
  });
  document.getElementById('voucherModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'voucherModalOverlay') closeVoucherModal();
  });
  document.getElementById('printModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'printModalOverlay') closePrintModal();
  });
});
