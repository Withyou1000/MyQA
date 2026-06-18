const {
  AI_BASE_URL,
  AI_API_KEY,
  AI_MODEL,
  AI_TIMEOUT_MS
} = require('../../config/config');
const { requestJson } = require('../utils/httpClient');

function parseJsonBlock(text) {
  const safeText = String(text || '').trim();
  if (!safeText) return null;

  try {
    return JSON.parse(safeText);
  } catch (error) {
    const match = safeText.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (secondError) {
      return null;
    }
  }
}

async function createStructuredReply(messages) {
  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    throw new Error('AI 模型配置不完整，请检查 AI_BASE_URL / AI_API_KEY / AI_MODEL');
  }

  const baseUrl = AI_BASE_URL.replace(/\/$/, '');

  try {
    const response = await requestJson(`${baseUrl}/chat/completions`, {
      method: 'POST',
      timeout: AI_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`
      },
      body: {
        model: AI_MODEL,
        temperature: 0.2,
        messages,
        response_format: {
          type: 'json_object'
        }
      }
    });

    const content = response?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonBlock(content);
    if (!parsed) {
      console.error('[AI] 模型返回内容无法解析为 JSON:', {
        model: AI_MODEL,
        baseUrl,
        contentPreview: String(content).slice(0, 500)
      });
      throw new Error('模型未返回可解析的 JSON 结构');
    }

    return parsed;
  } catch (error) {
    console.error('[AI] createStructuredReply 调用失败:', {
      baseUrl,
      model: AI_MODEL,
      timeout: AI_TIMEOUT_MS,
      messageCount: Array.isArray(messages) ? messages.length : 0,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw error;
  }
}

module.exports = {
  createStructuredReply
};
