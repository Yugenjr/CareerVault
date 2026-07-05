import logging
import asyncio
from typing import Dict, Any

from .memory_extractor import memory_extractor
from .memory_builder import memory_builder
from .cognee_service import cognee_service

logger = logging.getLogger(__name__)

class MemorySync:
    """
    Coordinates the memory generation pipeline:
    Extraction -> Building -> Cognee Ingestion
    """
    
    async def process_document_memory(self, user_id: str, user_name: str, doc_data: Dict[str, Any]) -> bool:
        """
        Process a single document to generate and store memories.
        
        Args:
            user_id: The ID of the user.
            user_name: The name of the user.
            doc_data: Dictionary containing document metadata, text, classification, etc.
            
        Returns:
            bool: True if memory was successfully ingested into Cognee, False otherwise.
        """
        try:
            doc_type = doc_data.get("classification", {}).get("document_type", "Unknown")
            extracted_text = doc_data.get("extracted_text", "")
            
            # Step 1: Extract structured facts
            extracted_facts = memory_extractor.extract_from_document(
                doc_type=doc_type,
                text=extracted_text,
                existing_metadata=doc_data
            )
            
            # Step 2: Build standardized memory schema
            memory_model = memory_builder.build_career_memory(
                user_id=user_id,
                user_name=user_name,
                extracted_facts=extracted_facts,
                doc_type=doc_type
            )
            
            # Link the source document
            memory_model["source_documents"].append(doc_data.get("_id", "Unknown ID"))
            
            # Step 3: Push to Cognee
            success = await cognee_service.add_memory(memory_model)
            
            if success:
                logger.info(f"Successfully processed memory for document: {doc_data.get('filename')}")
            else:
                logger.error(f"Failed to push memory to Cognee for document: {doc_data.get('filename')}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error in memory sync pipeline: {str(e)}")
            return False

memory_sync = MemorySync()
