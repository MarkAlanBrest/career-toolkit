const API_BASE = 'https://career-toolkit-ruby.vercel.app';

const statusEl       = document.getElementById('status');
const statusLabel    = document.getElementById('status-label');
const statusDesc     = document.getElementById('status-desc');
const keyInput       = document.getElementById('key-input');
const activateBtn    = document.getElementById('activate-btn');
const feedback       = document.getElementById('feedback');
const upgradeSection = document.getElementById('upgrade-section');

function setStatus(active, plan) {
  if (active) {
    statusEl.className = 'status active';
    statusLabel.className = 'status-label active';
    statusLabel.textContent = plan === 'owner' ? 'Owner' : 'Pro Active';
    statusDesc.textContent = 'AI Builder and Quiz Maker are unlocked on Canvas.';
    upgradeSection.style.display = 'none';
  } else {
    statusEl.className = 'status locked';
    statusLabel.className = 'status-label locked';
    statusLabel.textContent = 'No License';
    statusDesc.textContent = 'Enter your license key below to unlock AI features.';
    upgradeSection.style.display = 'block';
  }
}

function showFeedback(msg, type) {
  feedback.textContent = msg;
  feedback.className = 'feedback ' + type;
}

keyInput.addEventListener('input', () => {
  let v = keyInput.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const parts = [];
  for (let i = 0; i < v.length && i < 16; i += 4) parts.push(v.slice(i, i + 4));
  keyInput.value = parts.join('-');
  feedback.textContent = '';
  feedback.className = 'feedback';
});

activateBtn.addEventListener('click', async () => {
  const key = keyInput.value.trim().toUpperCase();
  if (!key) { showFeedback('Enter a license key.', 'error'); return; }

  activateBtn.disabled = true;
  activateBtn.textContent = 'Validating…';
  feedback.textContent = '';
  feedback.className = 'feedback';

  try {
    const res = await fetch(`${API_BASE}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();

    if (data.valid) {
      await chrome.storage.local.set({ ce_license_key: key });
      setStatus(true, data.plan);
      showFeedback('License activated!', 'success');
      activateBtn.textContent = 'Change Key';
    } else {
      showFeedback(data.error || 'Invalid license key.', 'error');
      setStatus(false, '');
      activateBtn.textContent = 'Activate License';
    }
  } catch {
    showFeedback('Network error — try again.', 'error');
    activateBtn.textContent = 'Activate License';
  } finally {
    activateBtn.disabled = false;
  }
});

// Init — load stored key and reflect status
chrome.storage.local.get('ce_license_key', stored => {
  const key = stored.ce_license_key || '';
  if (key) {
    keyInput.value = key;
    activateBtn.textContent = 'Change Key';
    setStatus(true, 'pro');
  } else {
    setStatus(false, '');
  }
});
