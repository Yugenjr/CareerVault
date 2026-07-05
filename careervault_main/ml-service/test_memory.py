import pytest
from unittest.mock import patch, MagicMock
from memory.memory_builder import build_career_memory
from memory.memory_extractor import extract_memory_facts
from memory.memory_sync import memory_sync

def test_extract_memory_facts_resume():
    doc_data = {
        'classification': {'document_type': 'Resume'},
        'llm_analysis': {
            'key_fields': {
                'name': 'John Doe',
                'skills': 'Python, React, Node.js'
            }
        }
    }
    facts = extract_memory_facts(doc_data)
    assert 'John Doe' in facts
    assert 'Python' in facts

def test_extract_memory_facts_unknown():
    doc_data = {
        'classification': {'document_type': 'Unknown'},
        'llm_analysis': {'key_fields': {}}
    }
    facts = extract_memory_facts(doc_data)
    assert facts == ""

def test_build_career_memory():
    doc_data = {
        '_id': 'doc123',
        'fileName': 'resume.pdf',
        'classification': {'document_type': 'Resume', 'category': 'Resume'},
        'llm_analysis': {'key_fields': {'name': 'John', 'skills': 'Python'}}
    }
    facts = "Skills: Python, Node"
    memory = build_career_memory('user123', 'John', doc_data, facts)
    
    assert memory.user_id == 'user123'
    assert memory.name == 'John Career Profile'
    assert len(memory.documents) == 1
    assert memory.documents[0].filename == 'resume.pdf'
    assert len(memory.skills) > 0
    assert memory.skills[0].name == 'Python'

@patch('memory.memory_sync.cognee_service')
@patch('memory.memory_sync.build_career_memory')
@pytest.mark.asyncio
async def test_process_document_memory(mock_build, mock_cognee):
    mock_cognee.add_memory = MagicMock(return_value=True)
    mock_cognee.cognify = MagicMock(return_value=True)
    
    doc_data = {
        '_id': 'doc123',
        'classification': {'document_type': 'Resume'},
        'llm_analysis': {'key_fields': {}}
    }
    
    result = await memory_sync.process_document_memory('user123', 'John', doc_data)
    assert result is True
    mock_cognee.add_memory.assert_called_once()
    mock_cognee.cognify.assert_called_once()
