import logging
from typing import Dict, Any, List

from .cognee_service import cognee_service

logger = logging.getLogger(__name__)

class MemoryQueries:
    """
    Exposes high-level methods to query the memory graph.
    Used by the Career Assistant and the Insights Dashboard.
    """
    
    async def get_insights(self) -> Dict[str, Any]:
        """
        Retrieve data for the Insights Dashboard.
        Note: In a fully configured Cognee graph, you would use specific 
        traversals to count nodes. Here we mock the shape based on search.
        """
        # In a real scenario, this would query specific node types in the graph.
        return {
            "total_memories": 0,
            "skills_stored": 0,
            "projects_stored": 0,
            "organizations_stored": 0,
            "achievements_stored": 0,
            "top_skills": [],
            "most_referenced_technologies": [],
            "career_timeline": []
        }

    async def get_assistant_context(self, question: str) -> str:
        """
        Retrieve relevant memories for the Career Assistant based on the user's question.
        """
        logger.info(f"Retrieving memory context for question: '{question}'")
        try:
            results = await cognee_service.search_memory(question)
            
            if not results:
                return "No specific career memories found related to this topic."
                
            context_lines = []
            for idx, res in enumerate(results):
                # Ensure the result is formatted as a string text block
                context_lines.append(f"Fact {idx + 1}: {res.get('result', '')}")
                
            return "\n".join(context_lines)
            
        except Exception as e:
            logger.error(f"Error retrieving assistant context: {str(e)}")
            return "Failed to retrieve memory context due to an internal error."

memory_queries = MemoryQueries()
