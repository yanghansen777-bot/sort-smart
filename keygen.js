const fs = require('fs');
const path = require('path');

let cachedKey = null;
let cachedExpiresAt = 0;

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const line = text.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : '';
}

function keyError(message, fix) {
  const error = new Error(message);
  error.fix = fix;
  return error;
}

async function getKey(options = {}) {
  const now = Date.now();
  if (!options.force && cachedKey && now < cachedExpiresAt - 30000) return { apiKey: cachedKey, expiresAt: new Date(cachedExpiresAt).toISOString() };
  const keygenUrl = readEnv('KEYGEN_URL');
  const token = readEnv('KEYGEN_TOKEN');
  if (!keygenUrl || keygenUrl === 'paste-here' || !token || token === 'paste-here') throw keyError('MindDo key settings are missing.', 'Put KEYGEN_URL and KEYGEN_TOKEN in .env, then restart the server.');
  try {
    const response = await fetch(`${keygenUrl.replace(/\/$/, '')}/api/lookup-key`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw keyError('MindDo could not provide an AI key.', 'Check KEYGEN_URL and KEYGEN_TOKEN in .env.');
    if (!result.apiKey || !result.expiresAt) throw keyError('MindDo returned an incomplete AI key.', 'Ask MindDo for a response containing apiKey and expiresAt.');
    const expiresAt = Date.parse(result.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) throw keyError('MindDo returned an expired AI key.', 'Ask MindDo for a fresh key and expiresAt.');
    cachedKey = result.apiKey;
    cachedExpiresAt = expiresAt;
    return { apiKey: cachedKey, expiresAt: result.expiresAt };
  } catch (error) {
    if (error.fix) throw error;
    throw keyError('MindDo could not be reached.', 'Check your internet connection and KEYGEN_URL in .env.');
  }
}

module.exports = { getKey };
