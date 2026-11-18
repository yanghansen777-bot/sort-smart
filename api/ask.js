const fs = require('fs');
const path = require('path');
const { getKey, invalidateKey } = require('../keygen');

function readBrief() {
  return fs.readFileSync(path.join(process.cwd(), 'BRIEF.md'), 'utf8');
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Use POST.' });
  const { date, time } = request.body || {};
  if (!date || !time) return response.status(400).json({ error: { message: 'Date and time are required.', fix: 'Enter both the class date and end time.' } });

  try {
    const { apiKey } = await getKey();
    const instructions = `${readBrief()}\n\nSafety rule: only give the short safe reminder: “Turn the camera off, ask the teacher if you need help, and follow the camera manual.” Never give repair instructions.`;
    let openAIResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5.6-luna',
      instructions,
      input: `The student has video production class on ${date} at ${time}. Give one very short, loud, friendly reminder for the end of class.`,
    }),
    });
    if (openAIResponse.status === 401) {
      invalidateKey();
      const fresh = await getKey({ force: true });
      openAIResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { Authorization: `Bearer ${fresh.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-5.6-luna', instructions, input: `The student has video production class on ${date} at ${time}. Give one very short, loud, friendly reminder for the end of class.` }),
      });
    }

    if (!openAIResponse.ok) throw Object.assign(new Error('OpenAI could not answer.'), { fix: 'Check the MindDo key or try again later.' });
    const result = await openAIResponse.json();
    return response.status(200).json({ message: result.output_text || 'Turn the camera off, ask the teacher if you need help, and follow the camera manual.' });
  } catch (error) {
    const safeError = error.fix ? error : Object.assign(new Error('The AI request failed.'), { fix: 'Check the MindDo settings, internet connection, and Vercel environment variables.' });
    console.error(safeError.fix);
    return response.status(502).json({ error: { message: safeError.message, fix: safeError.fix } });
  }
};
