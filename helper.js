const http = require('http');
const fs = require('fs');
const path = require('path');
const { getKey, invalidateKey } = require('./keygen');

const instructions = fs.readFileSync(path.join(__dirname, 'BRIEF.md'), 'utf8') + '\n\nSafety rule: only give the short safe reminder: “Turn the camera off, ask the teacher if you need help, and follow the camera manual.” Never give repair instructions.';

async function askOpenAI(body, callback, retried = false) {
  try {
    const { apiKey } = await getKey();
    const request = httpsRequest('/v1/responses', {
    model: 'gpt-5.6-luna',
    instructions,
      input: body.question?.trim() || `The student has video production class on ${body.date} at ${body.time}. Give one very short, loud, friendly reminder for the end of class.`,
    }, (status, data) => {
      if (status === 401 && !retried) {
        invalidateKey();
        askOpenAI(body, callback, true);
        return;
      }
      callback(status, data);
    }, apiKey);
    request.end();
  } catch (error) {
    callback(0, JSON.stringify({ error: { message: error.message, fix: error.fix } }));
  }
}

function httpsRequest(apiPath, payload, callback, apiKey) {
  const https = require('https');
  const request = https.request({ hostname: 'api.openai.com', path: apiPath, method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => callback(response.statusCode, data));
  });
  request.on('error', () => callback(0, ''));
  request.write(JSON.stringify(payload));
  return request;
}

const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') { response.writeHead(204); return response.end(); }
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    return response.end('Camera Reminder helper is running.');
  }
  if (request.method !== 'POST' || request.url !== '/ask') { response.writeHead(404); return response.end(); }
  let raw = '';
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    let body;
    try { body = JSON.parse(raw); } catch { response.writeHead(400); return response.end(JSON.stringify({ error: 'bad request' })); }
    askOpenAI(body, (status, data) => {
      if (status < 200 || status >= 300) {
        const error = JSON.parse(data).error || { message: 'The AI request failed.', fix: 'Check the MindDo settings and server.' };
        console.error(error.fix);
        response.writeHead(502, { 'Content-Type': 'application/json' });
        return response.end(JSON.stringify({ error }));
      }
      const result = JSON.parse(data);
      const message = result.output_text || 'Turn the camera off, ask the teacher if you need help, and follow the camera manual.';
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ message }));
    });
  });
});

server.listen(3001, '0.0.0.0', () => console.log('Camera Reminder helper listening on port 3001'));
