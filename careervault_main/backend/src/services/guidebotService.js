const axios = require('axios');

const GUIDE_GROQ_API_URL = process.env.GUIDEBOT_GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GUIDE_GROQ_API_KEY = process.env.GUIDEBOT_GROQ_API_KEY;
const GUIDE_GROQ_MODEL = process.env.GUIDEBOT_GROQ_MODEL || 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are GuideBot for CareerVault, a UI-first assistant that helps users navigate the website.

Core behavior:
- Focus on guiding the user through interface actions and product basics only.
- Give concise, step-by-step instructions that match the current CareerVault UI.
- Explain career asset classification and folder organization in simple terms.
- If unsure, ask a short clarifying question.

CareerVault UI map:
- Home: dashboard metrics, quick actions.
- Upload: drag/drop or choose files (PDF/JPG/PNG up to 25MB), then use Upload All.
- Documents: category cards and folder-like groups (category/doc-type), create custom groups.
- Activity: timeline list with search and category filters.
- Export: JSON/CSV/clipboard actions and integrations.
- Feedback: collect user feedback.
- Settings: account and preferences.
- Career Assistant: page exists, but you are the global GuideBot.

Classification and folders:
- Typical categories include Resume, Certificate, Internship Letter, Offer Letter, Transcript, Achievement, Project Report, and Other.
- Documents are grouped into folder-like keys such as category/docType.
- Custom groups can be created by users and shown even when empty.

Privacy and safety rules:
- Never request, store, infer, or expose personal details.
- Do not include personal identifiers in replies (emails, phone numbers, IDs, account numbers, addresses).
- If user asks for personal data or sensitive extraction, refuse briefly and redirect to safe UI guidance.
- Do not claim access to private vault content unless explicitly provided in the current chat.

Response style:
- Use plain language and practical steps.
- Keep answers short unless user asks for detail.
- Mention exact menu/page names when giving navigation help.`;

const PII_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\b(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){10,13}\b/g,
  /\b[A-Z]{5}\d{4}[A-Z]\b/gi,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  /\b\d{9,18}\b/g
];

function redactPII(text) {
  if (!text) return '';
  return PII_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), String(text));
}

function toGroqMessages(history) {
  const trimmed = Array.isArray(history) ? history.slice(-12) : [];
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmed.map((msg) => ({
      role: msg && msg.role === 'assistant' ? 'assistant' : 'user',
      content: redactPII(msg && msg.text)
    }))
  ];
}

async function askGuideBot(history) {
  if (!GUIDE_GROQ_API_KEY) {
    throw new Error('GUIDEBOT_GROQ_API_KEY is not configured');
  }

  // Determine user intent from the latest message
  const lastMessage = history.find(m => m.role === 'user' || !m.role) || history[history.length - 1];
  const question = lastMessage ? lastMessage.text : '';

  let memoryContext = '';
  try {
    // Attempt to fetch memory context from ML service
    const ML_SERVICE_BASE_URL = (process.env.ML_API_URL || 'https://careervault.onrender.com').replace(/\/+$/, '').replace('/predict', '');
    const url = `${ML_SERVICE_BASE_URL}/memory/ask`;
    const resp = await axios.post(url, { question }, { timeout: 10000 });
    if (resp.data && resp.data.context) {
      memoryContext = resp.data.context;
    }
  } catch (err) {
    console.error('Failed to fetch memory context for GuideBot:', err?.message || err);
  }

  const groqMessages = toGroqMessages(history);
  
  if (memoryContext) {
    // Inject memory context into the system prompt
    groqMessages[0].content += `\n\nCareer Memory Context from Cognee Knowledge Graph:\n${memoryContext}\n\nUse this context to answer the user's questions about their career, skills, and projects.`;
  }

  const payload = {
    model: GUIDE_GROQ_MODEL,
    temperature: 0.3,
    max_tokens: 500,
    messages: groqMessages
  };

  const response = await axios.post(GUIDE_GROQ_API_URL, payload, {
    headers: {
      Authorization: `Bearer ${GUIDE_GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  const content = response && response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content;
  if (!content) {
    throw new Error('GuideBot returned an empty response');
  }

  return redactPII(content.trim());
}

module.exports = { askGuideBot };
