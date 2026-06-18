const config = require('../../config/config');
const { requestJson } = require('../utils/httpClient');

function normalizeChunk(item = {}) {
  return {
    score: Number(item.score || 0),
    docId: item.doc_id || '',
    docTitle: item.doc_title || '',
    sectionTitle: item.section_title || '',
    chunkId: item.chunk_id || '',
    text: item.text || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    sourcePath: item.source_path || ''
  };
}

async function searchKnowledge(query, limit = config.RAG_TOP_K) {
  const safeQuery = String(query || '').trim();
  if (!safeQuery) {
    return [];
  }

  const response = await requestJson(`${config.RAG_SERVICE_URL}/search`, {
    method: 'POST',
    timeout: config.RAG_SERVICE_TIMEOUT_MS,
    body: {
      query: safeQuery,
      limit
    }
  });

  const results = Array.isArray(response?.results) ? response.results : [];
  return results.map(normalizeChunk);
}

module.exports = {
  searchKnowledge
};
