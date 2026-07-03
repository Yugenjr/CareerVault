const assert = require('assert');
const { heuristicParse, normalizeCategoryName } = require('./llmService');

function run() {
  const resume = heuristicParse('This resume highlights experience, skills, and education for a software engineer.');
  assert.strictEqual(resume.category, 'Resume');
  assert.strictEqual(resume.document_type, 'Resume');
  assert.strictEqual(resume.folder, 'Resume/Resume');

  const achievement = heuristicParse('Recognition award and publication details from a hackathon competition.');
  assert.strictEqual(achievement.category, 'Achievement');
  assert.strictEqual(achievement.document_type, 'Achievement');
  assert.strictEqual(achievement.folder, 'Achievement/Achievement');

  const offer = heuristicParse('Offer Letter with appointment letter and joining date details.');
  assert.strictEqual(offer.category, 'Professional');
  assert.strictEqual(offer.document_type, 'Professional');
  assert.strictEqual(offer.folder, 'Professional/Professional');

  const certificate = heuristicParse('Certificate of Completion for Oracle Java SE 21 Developer Professional with certificate no and issuing authority Udemy.');
  assert.strictEqual(certificate.category, 'Certificate');
  assert.strictEqual(certificate.document_type, 'Certificate');
  assert.strictEqual(certificate.folder, 'Certificate/Certificate');

  const normalized = normalizeCategoryName('Certificate of Completion');
  assert.strictEqual(normalized, 'Certificate');

  const resumeOther = heuristicParse("TARUN V Phone: 9894242146 | Email : tarun.v2024aids@sece.ac.in | GITHUB | LINKEDIN | PORTFOLIO EDUCATION Sri Eshwar College of Engineering Peepal Prodigy School Peepal Prodigy School B.TECH (AI&DS) HSC SSLC CGPA 8.1 (Upto 3rd Semester) 79% 88% 2024-2028 2022-2024 2021-2022 INTERNSHIP Tensorik — AI/ML Intern Built Built intelligent ETL pipelines, AI-powered chatbots, and document systems using LangChain on AWS EC2 for dynamic response generation. Optimized GCP Cloud Run scalability along with AWS Lambda and S3, while developing efficient and well-documented RESTful APIs. Innoboon Technologies - SDE Intern Built intelligent ETL pipelines, AI-powered chatbots, and document systems using LangChain. Optimized GCP Cloud Run scalability, while developing efficient and well documented RESTful APIs. PROJECTS Apiris — AI-Powered API Trust Framework Architected a deterministic AI-driven API trust engine with anomaly detection and latency prediction for secure service validation. Built an explainable ML pipeline with CVE-based risk scoring launched as an open-source,provider-agnostic Python SDK on PyPI. DocuMind — RAG-Based Document Intelligence System Developed a RAG-based LLM system (LangChain + Gemini) with embedding-driven retrieval using Pinecone for context -aware querying. Automated multi-format document pipelines (PDF/DOCX/OCR), reducing analysis time by 70% and achieving 95%+ retrieval accuracy. MCPSERVER Engineered a production-grade MCP server with FAISS-based vector memory and JWT-secured APIs for scalable AI tool integration. Optimized vector indexing and retrieval, improving request Handling by 40%; enabled modular agent orchestration pipelines. TrackWise — AI-Powered Learning Analytics Platform Built AI-powered learning management and student progress tracking systems with intelligent task generation, AI tutoring, and real-time analytics. Contributed to end-to-end platform development, backend APIs, frontend integration, and deployment of a scalable educational workflow architecture. Vaermai — AI Virtual Herbal Garden Platform Built AI-powered herbal health assistance and plant recommendation systems using Gemini AI, AR visualization, and voice-cloning technologies. Contributed to backend development, frontend integration, Firebase infrastructure, and deployment of a scalable full-stack platform. CERTIFICATIONS Certified in Generative AI with Large Language Models | Coursera Computer Use with Anthropic & AI Agentic Design Patterns with AutoGen | DeepLearning.AI 2026 2026 Certified in AWS Cloud Quest: Cloud Practitioner Badge | AWS Certified in Azure AI Fundamentals | Azure Certified in Intermediate and Advanced Certification in MySQL | HackerRank Certified in Datascience for Engineering | NPTEL Certified in Mastering Data Structures in C and C++ by Abdul Bari | Udemy 2025 2025 2025 2024 ACHIEVEMENTS Technical Club Secretary, Sri Eshwar College of Engineering. 2 X Best Student Innovator Award for the academic years 2024-2025 and 2025-2026 Winner, Adya AI Hackathon - 1 Lakh prize pool and secured a PPO internship. Secured Second place in the 30-hour National Level Hackathon Achieved 1st place in Department and 3rd place College-wide in the Freshathon competition Top 10 in Guidewire Devtrails Hackathon SKILLS Programming Language C | C++ | Python | OOPS Technical ML | NLP | LLM | Gen AI | SQL | NoSQL | Fine Tuning | Vector DB | AI Agents Frameworks/Libraries LangChain | Flask | Django | FastAPI | PyTorch | Transformers | Streamlit | Ollama Web Technologies HTML | CSS | React JS | Node.js | Nest.js Tools Git | GitHub | Docker | AWS | Google Colab | Kaggle | Notion | VS Code | Postman");
  assert.strictEqual(resumeOther.category, 'Resume');
  assert.strictEqual(resumeOther.document_type, 'Resume');
  assert.strictEqual(resumeOther.folder, 'Resume/Resume');

  console.log('llmService classification checks passed');
}

run();
