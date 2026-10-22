const PBKDF2_ITERATIONS = 100000;

function bufToHex(buffer) {
  const arr = new Uint8Array(buffer);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex) {
  const len = hex.length / 2;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const saltHex = bufToHex(saltBytes);
  const hashHex = bufToHex(derived);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHash = parts[3];
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    try {
      const derived = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: hexToBuf(saltHex), iterations, hash: 'SHA-256' },
        keyMaterial, 256
      );
      const actualHash = bufToHex(derived);
      return actualHash === expectedHash;
    } catch (e) {
      return false;
    }
  }
  if (stored.startsWith('sha256$')) {
    const encoder = new TextEncoder();
    const data = encoder.encode(stored.split('$')[1] + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === stored.split('$')[2];
  }
  return false;
}

function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

if (typeof crypto.subtle === 'undefined' || !crypto.subtle) {
  console.error('Web Crypto API no disponible. Usa http://localhost en lugar de file://');
  window.__cryptoUnavailable = true;
}

window.hashPassword = hashPassword;
window.verifyPassword = verifyPassword;
window.sanitizeHTML = sanitizeHTML;
window.secureEscapeAttr = escapeAttr;
