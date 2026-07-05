import logging
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MemoryExtractor:
    """
    Extracts structured career facts from raw document text based on document type.
    In a fully productionized setup, this uses LLMs (e.g. OpenAI or Groq) to pull out JSON.
    For this integration, we simulate the extraction logic or wrap the existing LLM service.
    """
    
    def extract_from_document(self, doc_type: str, text: str, existing_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Route extraction based on the document type.
        Rules:
        - Resume: Skills, Projects, Education, Experience, Organizations, Achievements
        - Certificate: Certificate Name, Provider, Technology, Date
        - Internship: Company, Role, Duration, Skills
        - Project Report: Project Name, Tech Stack, Description
        - Achievement: Award, Competition, Rank
        """
        doc_type = doc_type.lower() if doc_type else "unknown"
        logger.info(f"Extracting facts for document type: {doc_type}")
        
        extracted_facts = {}
        
        # If we already have LLM analysis from the existing metadata (e.g. key_fields), use it.
        key_fields = existing_metadata.get("llm_analysis", {}).get("key_fields", {}) if existing_metadata else {}
        
        if "resume" in doc_type:
            extracted_facts = self._extract_resume(text, key_fields)
        elif "certificate" in doc_type:
            extracted_facts = self._extract_certificate(text, key_fields)
        elif "internship" in doc_type:
            extracted_facts = self._extract_internship(text, key_fields)
        elif "project" in doc_type:
            extracted_facts = self._extract_project_report(text, key_fields)
        elif "achievement" in doc_type or "award" in doc_type:
            extracted_facts = self._extract_achievement(text, key_fields)
        else:
            extracted_facts = {"general_facts": key_fields}
            
        return extracted_facts

    def _extract_resume(self, text: str, key_fields: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "skills": key_fields.get("skills", []),
            "projects": key_fields.get("projects", []),
            "education": key_fields.get("education", []),
            "experience": key_fields.get("experience", []),
            "organizations": key_fields.get("organizations", []),
            "achievements": key_fields.get("achievements", [])
        }

    def _extract_certificate(self, text: str, key_fields: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "certificate_name": key_fields.get("certificate_name", "Unknown Certificate"),
            "provider": key_fields.get("provider", "Unknown Provider"),
            "technology": key_fields.get("technology", []),
            "date": key_fields.get("date", "Unknown Date")
        }

    def _extract_internship(self, text: str, key_fields: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "company": key_fields.get("company", "Unknown Company"),
            "role": key_fields.get("role", "Unknown Role"),
            "duration": key_fields.get("duration", "Unknown Duration"),
            "skills": key_fields.get("skills", [])
        }

    def _extract_project_report(self, text: str, key_fields: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "project_name": key_fields.get("project_name", "Unknown Project"),
            "tech_stack": key_fields.get("tech_stack", []),
            "description": key_fields.get("description", "")
        }

    def _extract_achievement(self, text: str, key_fields: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "award": key_fields.get("award", "Unknown Award"),
            "competition": key_fields.get("competition", "Unknown Competition"),
            "rank": key_fields.get("rank", "Unknown Rank")
        }

memory_extractor = MemoryExtractor()
