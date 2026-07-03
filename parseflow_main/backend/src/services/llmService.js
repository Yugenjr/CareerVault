const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPPORTED_CATEGORIES = ['Resume', 'Certificate', 'Internship', 'Project', 'Achievement', 'Academic', 'Professional', 'Other'];

const SYSTEM_PROMPT = `You are an intelligent document classification and organization engine for a system called CareerVault.

Your task is to analyze OCR-extracted text from uploaded career documents and return a STRICT JSON response.

You MUST NOT generate explanations. You MUST ONLY return valid JSON.

OBJECTIVE:
1. Identify the document type based on content.
2. Extract important metadata fields.
3. Assign the correct storage category.
4. Suggest a folder name for storage.
5. Provide a confidence score based on clarity of text.

SUPPORTED DOCUMENT TYPES:
Resume, Certificate, Internship, Project, Achievement, Academic, Professional, Unknown

STORAGE CATEGORIES:
Resume, Certificate, Internship, Project, Achievement, Academic, Professional, Other

FOLDER NAMING RULE:
Return a clean folder name in this format: <category>/<document_type> (e.g., Resume/Resume)

CATEGORY MAPPING RULES (STRICT):
- Resume: CVs, resumes, professional summaries, career profiles.
- Certificate: certificates, certifications, badges, awards, hackathon achievements.
- Internship: internship offers, training letters, internship completion letters, certificate of internship.
- Professional: offer letters, recommendation letters, appointment letters, joining letters.
- Academic: transcripts, grade cards, marksheets, degree documents.
- Achievement: recognitions, accolades, publications, honor statements.
- Project: project reports, case studies, proposals, portfolio reports.
- Other: only when none of the above categories applies.

KEY FIELD EXTRACTION (PRIORITY RULES):
- Resume: extract name, email, phone, degree, experience, company names when present.
- Certificate: extract name, issuer, issue date, credential name when present.
- Professional: extract organization, position title, compensation, start date when present.
- Academic: extract institution, degree, GPA, semester details when present.

Extract ONLY if available: name, id_number, date_of_birth, document_number, issuing_authority

CONFIDENCE LOGIC:
High (0.8–1.0): Clear structured document (headers, names, dates, organizations)
Medium (0.5–0.79): Partial or noisy text
Low (<0.5): Unclear or insufficient data

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "document_type": "",
  "category": "",
  "folder": "",
  "confidence": 0.0,
  "key_fields": {
    "name": null,
    "id_number": null,
    "date_of_birth": null,
    "document_number": null,
    "issuing_authority": null
  }
}

RULES:
* NEVER return text outside JSON.
* NEVER hallucinate fields — if a field is not present, set it to null.
* NEVER invent document types outside the supported list.
* If unsure → document_type = "Unknown", category = "Other".
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

function normalizeFolderName(category, documentType) {
  const safeCategory = normalizeCategoryName(category);
  const safeType = String(documentType || safeCategory || 'Unknown')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, '_') || 'Unknown';
  return `${safeCategory}/${safeType}`;
}

function normalizeParsedResult(parsed, fallbackText) {
  const base = parsed && typeof parsed === 'object' ? parsed : {};
  const safeCategory = normalizeCategoryName(base.category || base.document_type || base.type || fallbackText || 'Other');
  const safeDocumentType = String(base.document_type || base.type || (safeCategory === 'Other' ? 'Unknown' : safeCategory)).trim() || 'Unknown';
  const safeKeyFields = base.key_fields && typeof base.key_fields === 'object' ? base.key_fields : {};

  return {
    ...base,
    document_type: safeDocumentType,
    category: safeCategory,
    folder: normalizeFolderName(safeCategory, safeDocumentType),
    confidence: typeof base.confidence === 'number' ? base.confidence : 0.0,
    key_fields: {
      name: safeKeyFields.name ?? null,
      id_number: safeKeyFields.id_number ?? null,
      date_of_birth: safeKeyFields.date_of_birth ?? null,
      document_number: safeKeyFields.document_number ?? null,
      issuing_authority: safeKeyFields.issuing_authority ?? null
    }
  };
}

async function analyzeWithLLM(text) {
  try {
    const payload = {
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.2
    };

    // DEBUG: log payload size and first chars (avoid logging very large text)
    try {
      console.log('LLM payload size:', String(JSON.stringify(payload).length));
      console.log('LLM payload preview:', String(JSON.stringify(payload)).slice(0, 1000));
    } catch (e) {
      // ignore
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const output = response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content;

    try {
      const parsed = JSON.parse(output);
      return normalizeParsedResult(parsed, text);
    } catch (err) {
      console.error('LLM parse error:', err && err.message, 'raw output:', output);
      // Fall back to heuristic parsing if LLM returned non-JSON
      return normalizeParsedResult(heuristicParse(text), text);
    }

  } catch (err) {
    // Log full provider response when available
    try {
      if (err && err.response) {
        console.error('LLM ERROR status:', err.response.status);
        console.error('LLM ERROR data:', JSON.stringify(err.response.data));
      } else {
        console.error('LLM ERROR:', err.message || err);
      }
    } catch (e) {
      console.error('LLM ERROR (fallback):', err);
    }
    // If request failed, fall back to local heuristic parser
    try {
      return normalizeParsedResult(heuristicParse(text), text);
    } catch (e) {
      return {
        document_type: "Unknown",
        category: "Other",
        folder: "Other/Unknown",
        confidence: 0,
        key_fields: {}
      };
    }
  }
}

function heuristicParse(text) {
  const t = String(text || '');
  const result = {
    document_type: 'Unknown',
    category: 'Other',
    folder: 'Other/Unknown',
    confidence: 0.0,
    key_fields: {
      name: null,
      id_number: null,
      date_of_birth: null,
      document_number: null,
      issuing_authority: null
    }
  };

  if (/resume|curriculum vitae|experience|skills|education|objective/i.test(t)) {
    result.document_type = 'Resume';
    result.category = 'Resume';
    result.folder = 'Resume/Resume';
    result.confidence = 0.75;
    return result;
  }

  if (/recognition|accolade|publication|honor/i.test(t)) {
    result.document_type = 'Achievement';
    result.category = 'Achievement';
    result.folder = 'Achievement/Achievement';
    result.confidence = 0.74;
    return result;
  }

  if (/certificate|certification|credential|badge|award|hackathon|completion certificate|certificate of completion/i.test(t)) {
    result.document_type = 'Certificate';
    result.category = 'Certificate';
    result.folder = 'Certificate/Certificate';
    result.confidence = 0.78;
    return result;
  }

  if (/internship|training letter|certificate of internship|intern/i.test(t)) {
    result.document_type = 'Internship';
    result.category = 'Internship';
    result.folder = 'Internship/Internship';
    result.confidence = 0.72;
    return result;
  }

  if (/offer letter|recommendation letter|offer|appointment letter|joining date|salary/i.test(t)) {
    result.document_type = 'Professional';
    result.category = 'Professional';
    result.folder = 'Professional/Professional';
    result.confidence = 0.7;
    return result;
  }

  if (/transcript|grade card|marksheet|semester|gpa|cgpa|degree/i.test(t)) {
    result.document_type = 'Academic';
    result.category = 'Academic';
    result.folder = 'Academic/Academic';
    result.confidence = 0.74;
    return result;
  }

  if (/project report|case study|proposal|portfolio|report/i.test(t)) {
    result.document_type = 'Project';
    result.category = 'Project';
    result.folder = 'Project/Project';
    result.confidence = 0.66;
    return result;
  }

  // Default unknown
  return result;
}

module.exports = { analyzeWithLLM, heuristicParse };
