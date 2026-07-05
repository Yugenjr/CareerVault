import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class MemoryBuilder:
    """
    Constructs a standardized memory schema from the extracted facts.
    Produces a payload suitable for Cognee ingestion.
    """
    
    def build_career_memory(self, user_id: str, user_name: str, extracted_facts: Dict[str, Any], doc_type: str) -> Dict[str, Any]:
        """
        Merge extracted facts into the standard Career Memory Schema.
        
        Example Output:
        {
            "entity_type": "person",
            "name": "Yugendra N",
            "skills": ["Python", "React"],
            "projects": ["ParseFlow"],
            "organizations": ["GoPluto"],
            "achievements": ["Agentica 2.0 Winner"],
            "experiences": [],
            "education": []
        }
        """
        logger.info(f"Building career memory for user: {user_name}")
        
        # Base schema
        memory_model = {
            "entity_type": "person",
            "name": user_name,
            "skills": [],
            "projects": [],
            "organizations": [],
            "achievements": [],
            "experiences": [],
            "education": [],
            "technologies": [],
            "certificates": [],
            "source_documents": []
        }
        
        # Helper to ensure lists
        def _ensure_list(val):
            if not val:
                return []
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                return [s.strip() for s in val.split(",")]
            return [str(val)]
        
        # Populate from facts
        if "skills" in extracted_facts:
            memory_model["skills"].extend(_ensure_list(extracted_facts["skills"]))
            
        if "projects" in extracted_facts:
            memory_model["projects"].extend(_ensure_list(extracted_facts["projects"]))
            
        if "project_name" in extracted_facts:
            memory_model["projects"].append(extracted_facts["project_name"])
            
        if "organizations" in extracted_facts:
            memory_model["organizations"].extend(_ensure_list(extracted_facts["organizations"]))
            
        if "company" in extracted_facts:
            memory_model["organizations"].append(extracted_facts["company"])
            
        if "achievements" in extracted_facts:
            memory_model["achievements"].extend(_ensure_list(extracted_facts["achievements"]))
            
        if "award" in extracted_facts:
            memory_model["achievements"].append(extracted_facts["award"])
            
        if "education" in extracted_facts:
            memory_model["education"].extend(_ensure_list(extracted_facts["education"]))
            
        if "experience" in extracted_facts:
            memory_model["experiences"].extend(_ensure_list(extracted_facts["experience"]))
            
        if "role" in extracted_facts:
            memory_model["experiences"].append(f"{extracted_facts.get('role')} at {extracted_facts.get('company')}")
            
        if "technology" in extracted_facts or "tech_stack" in extracted_facts:
            memory_model["technologies"].extend(_ensure_list(extracted_facts.get("technology", [])))
            memory_model["technologies"].extend(_ensure_list(extracted_facts.get("tech_stack", [])))
            
        if "certificate_name" in extracted_facts:
            memory_model["certificates"].append(f"{extracted_facts['certificate_name']} from {extracted_facts.get('provider', 'Unknown')}")

        # Deduplicate lists
        for key in memory_model:
            if isinstance(memory_model[key], list) and key != "source_documents":
                memory_model[key] = list(set(memory_model[key]))
                
        return memory_model

memory_builder = MemoryBuilder()
