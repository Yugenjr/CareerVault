const axios = require("axios");
const fs = require("fs");
const path = require("path");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPPORTED_CATEGORIES = ['Resume', 'Certificate', 'Internship', 'Project', 'Achievement', 'Academic', 'Professional', 'Other'];

const SYSTEM_PROMPT = `You are an intelligent multimodal document classification and extraction engine for a system called CareerVault.

Return STRICT JSON only. Do NOT add prose or explanation.

OBJECTIVE:
1. Perform OCR on the provided image.
2. Return full extracted text from OCR in an "extracted_text" field.
3. Identify the specific document type in "document_type" (examples: Resume, Certificate, Internship, Project, Achievement, Academic, Professional, Unknown).
3. Extract key fields when present (name, id_number, date_of_birth, document_number, issuing_authority).
4. Assign storage category in "category" using ONLY one of: Resume, Certificate, Internship, Project, Achievement, Academic, Professional, Other.
5. IMPORTANT: category must be broad taxonomy based on the career asset type.
6. CATEGORY-TO-FOLDER ENFORCEMENT: folder MUST always start with the exact category name followed by '/' and then a clean document type (example: Resume/Resume).
7. CATEGORY MAPPING RULES (STRICT):
  - Resume: CVs, resumes, professional summaries, career profiles.
  - Certificate: certificates, certifications, badges, awards, hackathon achievements.
  - Internship: internship offers, training letters, internship completion letters, certificate of internship.
  - Professional: formal job offers, recommendation letters, appointment letters, joining letters.
  - Academic: academic transcripts, grade cards, mark sheets, degree documents.
  - Achievement: recognitions, accolades, publications, honor statements.
  - Project: project reports, case studies, proposals, portfolio reports.
  - Other: only when document clearly does not fit any category above.
6. Suggest folder as Category/Document_Type.
10. Provide both "confidence" and "accuracy" as percentage between 0 and 100 (integer preferred). "accuracy" must represent this Vision analysis confidence.
11. If content does NOT clearly fit one of the supported career asset types, set category to "Other" and keep a meaningful alternate name in "document_type".

RULES:
- NEVER return text outside JSON.
- NEVER hallucinate fields — if missing set to null.
- If unreadable or fully ambiguous -> document_type = "Unknown", category = "Other".

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "extracted_text": "",
  "document_type": "",
  "category": "",
  "folder": "",
  "accuracy": 0,
  "confidence": 0,
  "key_fields": {
    "name": null,
    "id_number": null,
    "date_of_birth": null,
    "document_number": null,
    "issuing_authority": null
  }
}
`;

function normalizeCategoryName(value) {
  if (!value) return 'Other';

  const raw = String(value).trim();
  if (!raw) return 'Other';

  const lowered = raw.toLowerCase();
  const aliases = {
    resume: 'Resume',
    cv: 'Resume',
    'curriculum vitae': 'Resume',
    certificate: 'Certificate',
    certification: 'Certificate',
    'certificate of completion': 'Certificate',
    'completion certificate': 'Certificate',
    credential: 'Certificate',
    badge: 'Certificate',
    award: 'Certificate',
    'hackathon achievement': 'Certificate',
    achievement: 'Achievement',
    recognition: 'Achievement',
    accolade: 'Achievement',
    publication: 'Achievement',
    honor: 'Achievement',
    internship: 'Internship',
    'internship letter': 'Internship',
    'certificate of internship': 'Internship',
    'training letter': 'Internship',
    offer: 'Professional',
    'offer letter': 'Professional',
    recommendation: 'Professional',
    'recommendation letter': 'Professional',
    'appointment letter': 'Professional',
    joining: 'Professional',
    transcript: 'Academic',
    'grade card': 'Academic',
    marksheet: 'Academic',
    'mark sheet': 'Academic',
    degree: 'Academic',
    project: 'Project',
    report: 'Project',
    proposal: 'Project',
    'case study': 'Project',
    portfolio: 'Project',
    other: 'Other',
    unknown: 'Other'
  };

  if (aliases[lowered]) return aliases[lowered];
  return SUPPORTED_CATEGORIES.includes(raw) ? raw : 'Other';
}

function normalizeVisionResult(parsed) {
  const base = parsed && typeof parsed === 'object' ? parsed : {};
  const safeCategory = normalizeCategoryName(base.category || base.document_type || base.type || 'Other');
  const safeDocumentType = String(base.document_type || base.type || (safeCategory === 'Other' ? 'Unknown' : safeCategory)).trim() || 'Unknown';
  const safeKeyFields = base.key_fields && typeof base.key_fields === 'object' ? base.key_fields : {};
  const normalized = {
    ...base,
    document_type: safeDocumentType,
    category: safeCategory,
    folder: `${safeCategory}/${String(safeDocumentType).replace(/[^a-zA-Z0-9 ]/g, ' ').trim().replace(/\s+/g, '_') || safeCategory}`,
    accuracy: normalizeConfidencePercent(base.accuracy ?? base.confidence),
    confidence: normalizeConfidencePercent(base.confidence),
    key_fields: {
      name: safeKeyFields.name ?? null,
      id_number: safeKeyFields.id_number ?? null,
      date_of_birth: safeKeyFields.date_of_birth ?? null,
      document_number: safeKeyFields.document_number ?? null,
      issuing_authority: safeKeyFields.issuing_authority ?? null
    }
  };
  if (!normalized.confidence && normalized.accuracy) {
    normalized.confidence = normalized.accuracy;
  }
  return normalized;
}

function normalizeConfidencePercent(value) {
  if (value === null || value === undefined) return 0;

  let num = value;
  if (typeof num === 'string') {
    const cleaned = num.replace('%', '').trim();
    num = Number(cleaned);
  }

  if (!Number.isFinite(num)) return 0;

  // Convert 0..1 fractions into 0..100 percentages.
  if (num > 0 && num <= 1) {
    num = num * 100;
  }

  if (num < 0) return 0;
  if (num > 100) return 100;
  return Math.round(num);
}

async function analyzeImageWithLLM(filePath) {
  try {
    const imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

    // Detect image format from file extension
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/jpeg'; // default
    if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    }
    console.log(`[visionLLM] Processing ${ext} file as ${mimeType}, size: ${imageBase64.length} chars`);

    const payload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this document image and return JSON." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
          ]
        }
      ],
      temperature: 0.2
    };

    // Debug: small preview
    try {
      console.log('Vision LLM payload size:', String(JSON.stringify(payload).length));
    } catch (e) {}

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );

    let output = null;
    try {
      output = response.data.choices[0].message.content;
      if (typeof output === 'string') output = output.trim();
    } catch (e) {
      console.error('Vision LLM: unexpected response shape', e);
      throw new Error('Vision LLM invalid response');
    }

    // Extract JSON substring safely
    if (typeof output === 'string') {
      const start = output.indexOf('{');
      const end = output.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const jsonStr = output.slice(start, end + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          parsed.extracted_text = typeof parsed.extracted_text === 'string' ? parsed.extracted_text : '';
          return normalizeVisionResult(parsed);
        } catch (e) {
          console.error('Vision LLM JSON parse error:', e.message);
        }
      }
    }

    // If provider returned structured object already
    if (typeof output === 'object') {
      output.extracted_text = typeof output.extracted_text === 'string' ? output.extracted_text : '';
      return normalizeVisionResult(output);
    }

    // Fallback
    return {
      extracted_text: '',
      document_type: 'Unknown',
      category: 'Other',
      folder: 'Other/Unknown',
      accuracy: 0,
      confidence: 0,
      key_fields: {
        name: null,
        id_number: null,
        date_of_birth: null,
        document_number: null,
        issuing_authority: null
      }
    };

  } catch (err) {
    try {
      console.error('VISION LLM ERROR:', err.response?.status, err.response?.data || err.message || err);
    } catch (e) {
      console.error('VISION LLM ERROR fallback:', err.message || err);
    }
    return {
      extracted_text: '',
      document_type: 'Unknown',
      category: 'Other',
      folder: 'Other/Unknown',
      accuracy: 0,
      confidence: 0,
      key_fields: {
        name: null,
        id_number: null,
        date_of_birth: null,
        document_number: null,
        issuing_authority: null
      }
    };
  }
}

module.exports = { analyzeImageWithLLM };
