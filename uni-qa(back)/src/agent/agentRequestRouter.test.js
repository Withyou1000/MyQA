const test = require('node:test');
const assert = require('node:assert/strict');

const {
  finalizeRoute,
  normalizeConfidence,
  TASK_CONFIDENCE_THRESHOLD
} = require('./agentRequestRouter');

const emptyMemoryExtraction = {
  shouldRemember: false
};

test('normalizeConfidence 兼容百分制并限制在 0 到 1', () => {
  assert.equal(normalizeConfidence(85), 0.85);
  assert.equal(normalizeConfidence(-1), 0);
  assert.equal(normalizeConfidence(2), 0.02);
  assert.equal(normalizeConfidence(120), 1);
});

test('低置信度且没有明确执行 Guard 的任务会先追问', () => {
  const route = finalizeRoute('看看这个', emptyMemoryExtraction, {
    mode: 'task',
    confidence: TASK_CONFIDENCE_THRESHOLD - 0.1,
    shouldExecuteTools: true
  });

  assert.equal(route.mode, 'clarification');
  assert.equal(route.shouldExecuteTools, false);
  assert.equal(route.confidenceDecision, 'below_task_threshold');
});

test('明确且参数完整的执行指令可以由 Guard 放行', () => {
  const route = finalizeRoute('帮我查 Java 问题', emptyMemoryExtraction, {
    mode: 'task',
    confidence: 0.4,
    shouldExecuteTools: true
  });

  assert.equal(route.mode, 'task');
  assert.equal(route.shouldExecuteTools, true);
  assert.equal(route.confidenceDecision, 'accepted');
});

test('缺少关键参数时不会被执行关键词强行改回 task', () => {
  const route = finalizeRoute('查看这个问题的申请者', emptyMemoryExtraction, {
    mode: 'task',
    confidence: 0.9,
    shouldExecuteTools: true,
    missingFields: ['questionId'],
    clarificationQuestion: '请告诉我具体问题标题。'
  });

  assert.equal(route.mode, 'clarification');
  assert.equal(route.shouldExecuteTools, false);
  assert.deepEqual(route.missingFields, ['questionId']);
});

test('未来偏好表达只更新记忆，不立即执行工具', () => {
  const route = finalizeRoute('以后帮我推荐硬件问题', {
    shouldRemember: true
  }, {
    mode: 'task',
    confidence: 0.8,
    shouldExecuteTools: true
  });

  assert.equal(route.mode, 'memory_only');
  assert.equal(route.shouldExecuteTools, false);
});

test('同一句同时包含当前任务和未来偏好时保留 task', () => {
  const route = finalizeRoute('帮我找 Java 高赏金问题，以后也优先推荐 Java', {
    shouldRemember: true
  }, {
    mode: 'task',
    confidence: 0.8,
    shouldExecuteTools: true
  });

  assert.equal(route.mode, 'task');
  assert.equal(route.shouldExecuteTools, true);
  assert.equal(route.confidenceDecision, 'accepted');
});

test('发布问题属于明确执行任务，会进入确认型工具流程', () => {
  const route = finalizeRoute('帮我发布一个 Java 多线程问题，赏金 30 元', emptyMemoryExtraction, {
    mode: 'chat',
    confidence: 0.3,
    shouldExecuteTools: false
  });

  assert.equal(route.mode, 'task');
  assert.equal(route.shouldExecuteTools, true);
  assert.equal(route.confidenceDecision, 'accepted');
});
