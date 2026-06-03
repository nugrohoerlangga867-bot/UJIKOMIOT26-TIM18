import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Auth guard
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = 'login.html';
});

document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await signOut(auth);
  window.location.href = 'login.html';
});

// ====================================
// SENSOR DATA — hanya Suhu & Cahaya
// ====================================
const sensorRef = ref(db, 'sensor');

onValue(sensorRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) {
    loadDummy();
    return;
  }
  updateStats(data);
  updateTable(data.history || []);
  // Teruskan ke chart
  window.__sensorData = data;
  if (window.renderChart) window.renderChart(data.chart);
}, () => loadDummy());

function updateStats(data) {
  const suhu = data.suhu ?? '--';
  const kelembapan = data.kelembapan ?? '--';
  const tekanan = data.tekanan ?? '--';
  const cahaya = data.cahaya ?? '--';

  const suhuText = suhu !== '--' ? `${suhu}°C` : '--';
  const kelembapanText = kelembapan !== '--' ? `${kelembapan}%` : '--';
  const tekananText = tekanan !== '--' ? `${tekanan} hPa` : '--';
  const cahayaText = cahaya !== '--' ? `${cahaya} lx` : '--';

  document.getElementById('statSuhu').textContent = suhuText;
  document.getElementById('statKelembapan').textContent = kelembapanText;
  document.getElementById('statTekanan').textContent = tekananText;
  document.getElementById('statCahaya').textContent = cahayaText;

  const suhuNum = Number(suhu);
  const cahayaNum = Number(cahaya);

  const trendSuhu = document.getElementById('trendSuhu');
  if (trendSuhu && Number.isFinite(suhuNum)) {
    trendSuhu.textContent = suhuNum > 35 ? '↑ Panas!' : suhuNum > 28 ? '↑ Normal' : '↓ Dingin';
    trendSuhu.className = 'trend ' + (suhuNum > 35 ? 'down' : 'up');
  }

  const trendCahaya = document.getElementById('trendCahaya');
  if (trendCahaya && Number.isFinite(cahayaNum)) {
    trendCahaya.textContent = cahayaNum > 400 ? '↑ Terang' : cahayaNum > 100 ? '↑ Redup' : '↓ Gelap';
    trendCahaya.className = 'trend ' + (cahayaNum > 100 ? 'up' : 'down');
  }
}

function updateTable(rows) {
  const tbody = document.getElementById('dataTable');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.waktu}</td>
      <td>${r.sensor}</td>
      <td>${r.nilai}</td>
      <td><span class="badge-pill ${r.status === 'OK' ? 'ok' : r.status === 'WARN' ? 'warn' : 'err'}">${r.status}</span></td>
    </tr>
  `).join('');
}

// Fallback ke dummy.json
async function loadDummy() {
  try {
    const res = await fetch('data/dummy.json');
    const data = await res.json();
    updateStats(data);
    updateTable(data.history || []);
    window.__sensorData = data;
    if (window.renderChart) window.renderChart(data.chart);
  } catch (e) {
    console.warn('Tidak bisa memuat data dummy:', e);
  }
}

// ====================================
// RELAY CONTROL
// ====================================
const relayRef = ref(db, 'relay/1');
let relayToggle = null;
let relayLabel = null;
let relayStatus = null;

function updateRelayUi(isOn) {
  if (relayToggle) relayToggle.checked = isOn;
  if (relayLabel)  relayLabel.textContent = isOn ? 'ON' : 'OFF';
  if (relayLabel)  relayLabel.style.color = isOn ? '#10b981' : 'var(--muted)';
  if (relayStatus) relayStatus.textContent =
    'Status: ' + (isOn ? '🟢 Menyala — perangkat aktif' : '🔴 Mati — perangkat non-aktif');
}

// Dengarkan perubahan relay dari Firebase (realtime)
onValue(relayRef, (snapshot) => {
  const val = snapshot.val();
  const isOn = val === 1 || val === true || val === '1';
  updateRelayUi(isOn);
});

window.addEventListener('DOMContentLoaded', () => {
  relayToggle = document.getElementById('relayToggle');
  relayLabel = document.getElementById('relayLabel');
  relayStatus = document.getElementById('relayStatus');

  if (!relayToggle) {
    console.warn('Relay toggle element tidak ditemukan di dashboard.html');
    return;
  }

  relayToggle.addEventListener('change', async () => {
    const newState = relayToggle.checked ? 1 : 0;
    const labelState = newState === 1 ? 'ON' : 'OFF';
    try {
      // 1. Update status relay
      await set(relayRef, newState);
      console.log('Relay 1 set to:', newState);

      // 2. Tambahkan log ke history sensor di Firebase
      const historyRef = ref(db, 'sensor/history');
      const historySnapshot = await get(historyRef);
      let history = historySnapshot.val() || [];
      if (!Array.isArray(history)) {
        history = history ? Object.values(history) : [];
      }

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const dateStr = now.toISOString().split('T')[0];

      history.push({
        waktu: timeStr,
        tanggal: dateStr,
        sensor: 'Relay 1',
        nilai: labelState,
        status: 'OK'
      });

      if (history.length > 50) {
        history = history.slice(-50);
      }

      await set(historyRef, history);

    } catch (err) {
      console.error('Gagal mengubah relay atau mencatat riwayat:', err);
      relayToggle.checked = !relayToggle.checked;
    }
  });
});
