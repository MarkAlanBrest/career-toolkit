// Shared package entitlement gate. Loaded before every paid toolbar.
(function () {
  'use strict';

  let statusPromise;

  function storedKeys() {
    return new Promise(resolve => chrome.storage.local.get(['ce_license_keys', 'ce_license_key'], stored => {
      const keys = Array.isArray(stored.ce_license_keys) && stored.ce_license_keys.length
        ? stored.ce_license_keys
        : String(stored.ce_license_key || '').split(/[\n,]+/);
      resolve(keys.map(key => String(key).trim()).filter(Boolean));
    }));
  }

  function load(force = false) {
    if (statusPromise && !force) return statusPromise;
    statusPromise = storedKeys().then(licenseKeys => new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'LICENSE_STATUS', payload: { licenseKeys } }, response => {
        if (chrome.runtime.lastError) return resolve({ valid: false, packages: {}, errors: [chrome.runtime.lastError.message] });
        resolve(response || { valid: false, packages: {}, errors: ['Could not check package access.'] });
      });
    })).catch(error => ({ valid: false, packages: {}, errors: [error.message] }));
    return statusPromise;
  }

  globalThis.CEEntitlements = {
    status: load,
    refresh: () => load(true),
    async has(packageName) {
      const status = await load();
      return Boolean(status?.packages?.[packageName]?.valid);
    },
  };
})();
