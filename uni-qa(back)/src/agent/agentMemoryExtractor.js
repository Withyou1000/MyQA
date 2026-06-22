const TOPIC_KEYWORDS = [
  '前端',
  '后端',
  'Java',
  'Vue',
  'React',
  'Node',
  'Python',
  '编程',
  '教育',
  '硬件',
  '游戏',
  '动画'
];

/**
 * 对数组做去空和去重。
 * 记忆字段会长期保存到数据库，因此这里先清理模型或规则产生的重复值。
 */
function uniqueList(values = []) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}

/**
 * 根据用户表达判断记忆补丁的操作类型。
 * “只推荐/改成”表示覆盖，“不要/取消”表示移除，其余默认追加。
 */
function detectOperation(text) {
  if (/只要|只推荐|只看|改成|换成|以后只|后续只|今后只/.test(text)) {
    return 'replace';
  }
  if (/不要|不想|别|取消|移除|删除/.test(text)) {
    return 'remove';
  }
  return 'add';
}

/**
 * 模型不可用时的记忆兜底。
 * 这套规则只覆盖常见技术主题和“以后/不要”等明显表达，目标是保证系统可用而不是替代模型理解。
 */
function buildFallbackMemoryPatch(goal) {
  const text = String(goal || '');
  const matchedTopics = TOPIC_KEYWORDS.filter((item) =>
    text.toLowerCase().includes(item.toLowerCase())
  );
  const rewardMatch = text.match(/(\d+)\s*(元|块|以上|高赏金)/);
  const shouldRemember = /以后|记住|偏好|优先|擅长|喜欢|不想|不要|别/.test(text);
  const avoidTopics = matchedTopics.filter((item) => {
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(不想|不要|别)[^，。；,;]*${escaped}`).test(text);
  });
  const positiveTopics = matchedTopics.filter((item) => !avoidTopics.includes(item));

  return {
    shouldRemember,
    operation: detectOperation(text),
    type: avoidTopics.length ? 'constraint' : 'preference',
    content: shouldRemember ? text : '',
    confidence: shouldRemember ? 0.72 : 0.3,
    validFrom: new Date(),
    validTo: null,
    ttlDays: 0,
    importance: shouldRemember ? 0.7 : 0.2,
    action: shouldRemember ? detectOperation(text) : 'ignore',
    topics: uniqueList(positiveTopics),
    keywords: uniqueList(positiveTopics),
    avoidTopics: uniqueList(avoidTopics),
    removeTopics: uniqueList(avoidTopics),
    removeKeywords: uniqueList(avoidTopics),
    removeAvoidTopics: [],
    minReward: rewardMatch ? Number(rewardMatch[1]) : 0,
    summary: shouldRemember ? text : '',
    source: 'fallback',
    sourceLabel: '规则兜底'
  };
}

/**
 * 统一清洗 memoryPatch。
 * 无论 patch 来自 AgentInputAnalyzer 模型还是规则兜底，都必须经过这里再写入记忆，防止非法字段污染 MongoDB。
 */
function normalizeMemoryPatch(rawPatch, goal, source = 'model') {
  const fallback = buildFallbackMemoryPatch(goal);
  const patch = rawPatch && typeof rawPatch === 'object' ? rawPatch : {};
  const normalizedSource = source === 'model' ? 'model' : 'fallback';
  const confidence = Number(patch.confidence ?? fallback.confidence ?? 0);
  const importance = Number(patch.importance ?? fallback.importance ?? 0);

  return {
    shouldRemember: Boolean(patch.shouldRemember ?? fallback.shouldRemember),
    operation: ['add', 'replace', 'remove'].includes(patch.operation) ? patch.operation : fallback.operation,
    type: ['preference', 'constraint', 'profile', 'context'].includes(patch.type) ? patch.type : fallback.type,
    content: String(patch.content || fallback.content || '').slice(0, 300),
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : fallback.confidence,
    validFrom: patch.validFrom || fallback.validFrom,
    validTo: patch.validTo || fallback.validTo,
    ttlDays: Math.max(Number(patch.ttlDays || fallback.ttlDays || 0), 0),
    importance: Number.isFinite(importance) ? Math.min(Math.max(importance, 0), 1) : fallback.importance,
    action: ['write', 'ignore', 'replace', 'remove', 'add'].includes(patch.action)
      ? patch.action
      : fallback.action,
    topics: uniqueList(Array.isArray(patch.topics) ? patch.topics : fallback.topics),
    keywords: uniqueList(Array.isArray(patch.keywords) ? patch.keywords : fallback.keywords),
    avoidTopics: uniqueList(Array.isArray(patch.avoidTopics) ? patch.avoidTopics : fallback.avoidTopics),
    removeTopics: uniqueList(Array.isArray(patch.removeTopics) ? patch.removeTopics : fallback.removeTopics),
    removeKeywords: uniqueList(Array.isArray(patch.removeKeywords) ? patch.removeKeywords : fallback.removeKeywords),
    removeAvoidTopics: uniqueList(Array.isArray(patch.removeAvoidTopics) ? patch.removeAvoidTopics : fallback.removeAvoidTopics),
    minReward: Number(patch.minReward || fallback.minReward || 0),
    summary: String(patch.summary || fallback.summary || '').slice(0, 200),
    source: normalizedSource,
    sourceLabel: normalizedSource === 'model' ? '模型提取' : '规则兜底'
  };
}

module.exports = {
  normalizeMemoryPatch,
  buildFallbackMemoryPatch
};
