(() => {
  // Keep in sync with content.js
  const DEV_MODE = true;
  const PROD_URL = 'https://YOUR-PROJECT.vercel.app';
  const API_BASE = DEV_MODE ? 'http://localhost:3000' : PROD_URL;
  const TRIAL_DAYS = 14;

  const statusBox = document.getElementById('status-box');
  const statusLabel = document.getElementById('status-label');
  const statusDesc = document.getElementById('status-desc');
  const progressWrap = document.getElementById('progress-wrap');
  const progressFill = document.getElementById('progress-fill');
  const licenseSection = document.getElementById('license-section');
  const upgradeSection = document.getElementById('upgrade-section');
  const keyInput = document.getElementById('key-input');
  const activateBtn = document.getElementById('activate-btn');
  const feedback = document.getElementById('feedback');

  function showState(licenseValid, trialDaysLeft) {
    if (licenseValid) {
      statusBox.className = 'status-box active';
      statusLabel.className = 'status-label active';
      statusLabel.textContent = 'Pro — Active';
      statusDesc.textContent = 'All components and templates are unlocked.';
      progressWrap.style.display = 'none';
      licenseSection.style.display = 'none';
      upgradeSection.style.display = 'none';
      return;
    }

    if (trialDaysLeft > 0) {
      statusBox.className = 'status-box trial';
      statusLabel.className = 'status-label trial';
      statusLabel.textContent = 'Free Trial';
      statusDesc.textContent = `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining — all Pro components unlocked.`;
      progressWrap.style.display = 'block';
      progressFill.style.width = `${(trialDaysLeft / TRIAL_DAYS) * 100}%`;
      licenseSection.style.display = 'block';
      upgradeSection.style.display = 'block';
    } else {
      statusBox.className = 'status-box expired';
      statusLabel.className = 'status-label expired';
      statusLabel.textContent = 'Trial Expired';
      statusDesc.textContent = 'Pro components are locked. Enter a license key or upgrade to continue.';
      progressWrap.style.display = 'none';
      licenseSection.style.display = 'block';
      upgradeSection.style.display = 'block';
    }
  }

  function validateKeyFormat(key) {
    // Basic format: 4 groups of 4 alphanumeric chars separated by dashes
    return /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(key.trim());
  }

  activateBtn.addEventListener('click', () => {
    const key = keyInput.value.trim().toUpperCase();
    feedback.textContent = '';
    feedback.className = 'feedback';

    if (!key) {
      feedback.textContent = 'Please enter your license key.';
      feedback.className = 'feedback error';
      return;
    }

    if (!validateKeyFormat(key)) {
      feedback.textContent = 'Invalid key format. Expected: XXXX-XXXX-XXXX-XXXX';
      feedback.className = 'feedback error';
      return;
    }

    activateBtn.disabled = true;
    activateBtn.textContent = 'Activating…';

    fetch(`${API_BASE}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          chrome.storage.sync.set({ licenseValid: true, licenseKey: key }, () => {
            feedback.textContent = '✅ License activated! All components are now unlocked.';
            feedback.className = 'feedback success';
            activateBtn.textContent = 'Activated';
            showState(true, 0);
          });
        } else {
          feedback.textContent = data.error ?? 'Invalid license key.';
          feedback.className = 'feedback error';
          activateBtn.disabled = false;
          activateBtn.textContent = 'Activate License';
        }
      })
      .catch(() => {
        feedback.textContent = 'Could not reach the server. Check your connection.';
        feedback.className = 'feedback error';
        activateBtn.disabled = false;
        activateBtn.textContent = 'Activate License';
      });
  });

  // Load state on popup open
  chrome.storage.sync.get(['installDate', 'licenseValid'], data => {
    const licenseValid = !!data.licenseValid;
    let trialDaysLeft = TRIAL_DAYS;

    if (data.installDate) {
      const elapsed = Math.floor((Date.now() - data.installDate) / 86400000);
      trialDaysLeft = Math.max(0, TRIAL_DAYS - elapsed);
    }

    showState(licenseValid, trialDaysLeft);
  });
})();
