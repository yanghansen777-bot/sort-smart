const fs = require('fs');
const path = require('path');

function readBrief() {
  return fs.readFileSync(path.join(process.cwd(), 'BRIEF.md'), 'utf8');
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Use POST.' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return response.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });

  const { date, time } = request.body || {};
  if (!date || !time) return response.status(400).json({ error: 'Date and time are required.' });

  const instructions = `${readBrief()}\n\nSafety rule: only give the short safe reminder: “Turn the camera off, ask the teacher if you need help, and follow the camera manual.” Never give repair instructions.`;
  const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5.6-luna',
      instructions,
      input: `The student has video production class on ${date} at ${time}. Give one very short, loud, friendly reminder for the end of class.`,
    }),
  });

  if (!openAIResponse.ok) return response.status(502).json({ error: 'OpenAI is unavailable.' });
  const result = await openAIResponse.json();
  return response.status(200).json({ message: result.output_text || 'Turn the camera off, ask the teacher if you need help, and follow the camera manual.' });
};
