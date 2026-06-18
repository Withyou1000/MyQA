const { searchKnowledge } = require('./ragServiceClient');
const { buildBusinessContext } = require('./businessContextBuilder');
const { createStructuredReply } = require('./aiClient');

function detectForcedHandoff(text) {
  const content = String(text || '');
  const rules = [
    /人工客服|转人工|人工处理/,
    /投诉|申诉|差评|举报/,
    /账号|登录|封号|冻结|密码/,
    /退款\s*(争议|纠纷|不满意|仲裁)/
  ];

  return rules.some((pattern) => pattern.test(content));
}

function buildSystemPrompt() {
  return [
    '你是 MyQA 平台的智能客服助手。',
    '你的职责是根据提供的检索知识、实时业务数据和最近聊天记录回答用户问题。',
    '必须遵守这些规则：',
    '1. 规则类问题优先依据检索知识回答，不允许编造平台规则。',
    '2. 用户个人进度、退款状态、问题状态优先依据实时业务数据回答。',
    '3. 如果知识和数据都不足，必须明确说明不确定，并建议转人工客服。',
    '4. 输出必须是 JSON，对象字段包括 replyText、confidence、intent、suggestHandoff、handoffReason。',
    '5. confidence 是 0 到 1 的数字。',
    '6. replyText 使用简体中文，简洁直接。'
  ].join('\n');
}

function buildUserPrompt({ messageText, knowledgeChunks, businessContext, recentMessages }) {
  const knowledgeText = knowledgeChunks.length
    ? knowledgeChunks
        .map((item, index) => `【知识${index + 1}】${item.docTitle} / ${item.sectionTitle}\n${item.text}`)
        .join('\n\n')
    : '无可用知识片段';

  const recentMessageText = recentMessages.length
    ? recentMessages.map((item) => `[${item.senderType}/${item.messageType}] ${item.text}`).join('\n')
    : '无最近聊天记录';

  return [
    `用户最新问题：${messageText}`,
    '',
    '检索知识：',
    knowledgeText,
    '',
    '实时业务上下文：',
    JSON.stringify(businessContext, null, 2),
    '',
    '最近聊天记录：',
    recentMessageText
  ].join('\n');
}

async function generateCustomerServiceReply({ customerId, sessionId, messageText }) {
  const trimmedMessage = String(messageText || '').trim();
  const businessContext = await buildBusinessContext({ customerId });
  let knowledgeChunks = [];

  if (!detectForcedHandoff(trimmedMessage)) {
    try {
      knowledgeChunks = await searchKnowledge(trimmedMessage);
    } catch (error) {
      console.error('[AI] RAG 服务检索失败:', {
        customerId: String(customerId || ''),
        sessionId: String(sessionId || ''),
        messageText: trimmedMessage,
        errorMessage: error.message,
        errorStack: error.stack
      });
    }
  }

  if (detectForcedHandoff(trimmedMessage)) {
    return {
      replyText: '这类问题更适合由人工客服继续处理。如果你愿意，我可以现在帮你转接人工客服。',
      confidence: 1,
      intent: 'handoff_request',
      suggestHandoff: true,
      handoffReason: '用户明确要求人工或问题属于敏感场景',
      knowledgeChunks,
      businessContext
    };
  }

  if (!knowledgeChunks.length) {
    return {
      replyText: '我暂时没有检索到足够准确的规则信息。如果你需要，我可以帮你转接人工客服继续处理。',
      confidence: 0.2,
      intent: 'unknown',
      suggestHandoff: true,
      handoffReason: '未检索到足够可靠的知识片段',
      knowledgeChunks,
      businessContext
    };
  }

  try {
    const modelResult = await createStructuredReply([
      {
        role: 'system',
        content: buildSystemPrompt()
      },
      {
        role: 'user',
        content: buildUserPrompt({
          messageText: trimmedMessage,
          knowledgeChunks,
          businessContext,
          recentMessages: businessContext.recentMessages || []
        })
      }
    ]);

    const confidence = Number(modelResult.confidence || 0);
    const suggestHandoff = Boolean(modelResult.suggestHandoff) || confidence < 0.45;

    return {
      replyText: String(modelResult.replyText || '').trim() || '我已经收到你的问题，但当前信息还不够充分，建议转人工继续处理。',
      confidence,
      intent: modelResult.intent || 'platform_rule',
      suggestHandoff,
      handoffReason: modelResult.handoffReason || (suggestHandoff ? '模型置信度较低' : ''),
      knowledgeChunks,
      businessContext
    };
  } catch (error) {
    console.error('[AI] 客服编排层生成回复失败:', {
      customerId: String(customerId || ''),
      sessionId: String(sessionId || ''),
      messageText: trimmedMessage,
      knowledgeChunkCount: knowledgeChunks.length,
      errorMessage: error.message,
      errorStack: error.stack
    });

    return {
      replyText: '我已经收到你的问题，但当前智能客服暂时无法稳定处理。你可以继续留言，或者我现在帮你转接人工客服。',
      confidence: 0.1,
      intent: 'unknown',
      suggestHandoff: true,
      handoffReason: error.message || '模型调用失败',
      knowledgeChunks,
      businessContext
    };
  }
}

module.exports = {
  generateCustomerServiceReply
};
