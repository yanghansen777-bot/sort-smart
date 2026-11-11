const http = require('http');
const fs = require('fs');
const path = require('path');

function readEnv() {
  const text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const line = text.split(/\r?\n/).find((item) => item.startsWith('OPENAI_API_KEY='));
  return line ? line.slice('OPENAI_API_KEY='.length).trim() : '';
}

const apiKey = readEnv();
const instructions = fs.readFileSync(path.join(__dirname, 'BRIEF.md'), 'utf8') + '\n\nSafety rule: only give the short safe reminder: “Turn the camera off, ask the teacher if you need help, and follow the camera manual.” Never give repair instructions.';

function askOpenAI(body, callback) {
  const request = httpsRequest('/v1/responses', {
    model: 'gpt-5.6-luna',
    instructions,
    input: `The student has video production class on ${body.date} at ${body.time}. Give one very short, loud, friendly reminder for the end of class.`,
  }, callback);
  request.end();
}

function httpsRequest(apiPath, payload, callback) {
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
  if (request.method !== 'POST' || request.url !== '/ask') { response.writeHead(404); return response.end(); }
  let raw = '';
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    let body;
    try { body = JSON.parse(raw); } catch { response.writeHead(400); return response.end(JSON.stringify({ error: 'bad request' })); }
    if (!apiKey || apiKey === 'paste-your-key-here') { response.writeHead(500); return response.end(JSON.stringify({ error: 'missing key' })); }
    askOpenAI(body, (status, data) => {
      if (status < 200 || status >= 300) { response.writeHead(502); return response.end(JSON.stringify({ error: 'OpenAI unavailable' })); }
      const result = JSON.parse(data);
      const message = result.output_text || 'Turn the camera off, ask the teacher if you need help, and follow the camera manual.';
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ message }));
    });
  });
});

server.listen(3001, '0.0.0.0', () => console.log('Camera Reminder helper listening on port 3001'));
