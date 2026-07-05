import os
import logging
import asyncio
from typing import Dict, Any, List
import cognee

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class CogneeService:
    """
    Singleton wrapper for Cognee.
    Responsible for all Cognee interactions: adding, updating, deleting, and searching memories.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CogneeService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        # Configure Cognee using environment variables or defaults
        # Assume vector db and graph db are configured globally via cognee.config
        self._initialized = True
        logger.info("CogneeService initialized.")

    async def add_memory(self, memory_data: Dict[str, Any]) -> bool:
        """Add a new memory to the Cognee graph."""
        try:
            name = memory_data.get("name", "Unknown")
            logger.info(f"Adding memory for entity: {name}")
            
            # Use cognee.add to add the structured text or object
            # In a real setup, cognee uses pydantic models or text to build the graph
            # We are sending structured facts as text representation for now to let cognee reason it
            memory_text = self._dict_to_text(memory_data)
            await cognee.add(memory_text, dataset_name="career_vault")
            await cognee.cognify()
            return True
        except Exception as e:
            logger.error(f"Failed to add memory: {str(e)}")
            return False

    async def update_memory(self, memory_data: Dict[str, Any]) -> bool:
        """Update an existing memory in the Cognee graph."""
        try:
            # Cognee handles updates by appending and cognifying
            logger.info("Updating memory.")
            memory_text = self._dict_to_text(memory_data)
            await cognee.add(memory_text, dataset_name="career_vault")
            await cognee.cognify()
            return True
        except Exception as e:
            logger.error(f"Failed to update memory: {str(e)}")
            return False

    async def delete_memory(self, entity_id: str) -> bool:
        """Delete memories associated with an entity."""
        try:
            # Note: actual cognee deletion might require specific dataset pruning
            # Currently we clear and rebuild or prune specific nodes if supported.
            # Assuming a prune method or delete by dataset if implemented:
            logger.info(f"Deleting memory for entity {entity_id}.")
            # Placeholder for delete logic since Cognee's delete API depends on version
            return True
        except Exception as e:
            logger.error(f"Failed to delete memory: {str(e)}")
            return False

    async def search_memory(self, query: str) -> List[Dict[str, Any]]:
        """Search the memory graph semantically."""
        try:
            results = await cognee.search(query)
            return [{"result": str(res)} for res in results]
        except Exception as e:
            logger.error(f"Failed to search memory: {str(e)}")
            return []

    async def rebuild_memory(self, all_documents_data: List[Dict[str, Any]]) -> bool:
        """Regenerate the memory graph from existing documents."""
        try:
            logger.info("Rebuilding entire memory graph.")
            await cognee.prune.prune_data()
            await cognee.prune.prune_system()
            
            for doc in all_documents_data:
                memory_text = self._dict_to_text(doc)
                await cognee.add(memory_text, dataset_name="career_vault")
            
            await cognee.cognify()
            return True
        except Exception as e:
            logger.error(f"Failed to rebuild memory: {str(e)}")
            return False
            
    def _dict_to_text(self, data: Dict[str, Any]) -> str:
        """Convert a structured dictionary into a clear text narrative for Cognee to process."""
        lines = []
        if "name" in data:
            lines.append(f"Person: {data['name']}")
        
        for key, val in data.items():
            if key == "name": continue
            if isinstance(val, list):
                if val:
                    lines.append(f"{key.capitalize()}: {', '.join(map(str, val))}")
            else:
                lines.append(f"{key.capitalize()}: {val}")
                
        return ". ".join(lines) + "."

cognee_service = CogneeService()
