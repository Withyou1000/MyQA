const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/auth');
const AgentTraceModel = require('../models/AgentTraceModel');
const { listTools } = require('../agent/agentToolRegistry');
const { getOrCreateMemory, serializeMemory } = require('../agent/agentMemoryService');
const { runAgentTask, confirmAgentAction } = require('../agent/agentExecutor');
const {
  listLedgerEvents,
  getMemoryViews,
  forgetMemory
} = require('../agent/agentMemoryLedgerService');

function serializeTrace(trace) {
  return {
    runId: trace._id,
    goal: trace.goal,
    status: trace.status,
    plan: trace.plan || [],
    steps: trace.steps || [],
    finalAnswer: trace.finalAnswer || '',
    resultCards: trace.resultCards || [],
    actionCards: trace.actionCards || [],
    memorySnapshot: trace.memorySnapshot || null,
    createdAt: trace.createdAt,
    updatedAt: trace.updatedAt
  };
}

router.get('/tools', authMiddleware, (req, res) => {
  res.status(200).json({
    code: 200,
    data: listTools()
  });
});

router.get('/memory', authMiddleware, async (req, res) => {
  try {
    const memory = await getOrCreateMemory(req.user.userId);
    res.status(200).json({
      code: 200,
      data: serializeMemory(memory)
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '获取 Agent 记忆失败'
    });
  }
});

router.get('/memory/ledger', authMiddleware, async (req, res) => {
  try {
    // Ledger 是跨任务的原始账本，用于追溯“什么时候读写了什么记忆”。
    const events = await listLedgerEvents(req.user.userId, req.query.limit);
    res.status(200).json({
      code: 200,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '获取 Agent 记忆账本失败'
    });
  }
});

router.get('/memory/views', authMiddleware, async (req, res) => {
  try {
    // Views 是从 Ledger 和当前记忆派生出的当前快照，给 Planner 和前端直接使用。
    const views = await getMemoryViews(req.user.userId);
    res.status(200).json({
      code: 200,
      data: views
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '获取 Agent 记忆视图失败'
    });
  }
});

router.post('/memory/forget', authMiddleware, async (req, res) => {
  try {
    // 遗忘操作不删除 Ledger 历史，而是追加 memory_forget 事件，保留可追溯性。
    const event = await forgetMemory({
      userId: req.user.userId,
      memoryType: req.body?.memoryType || 'preference',
      reason: req.body?.reason || '用户主动遗忘记忆'
    });
    res.status(200).json({
      code: 200,
      message: '已记录遗忘事件',
      data: event
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: error.message || '遗忘记忆失败'
    });
  }
});

router.post('/runs', authMiddleware, async (req, res) => {
  try {
    const goal = String(req.body?.goal || '').trim();
    if (!goal) {
      return res.status(400).json({
        code: 400,
        message: '请输入 Agent 任务目标'
      });
    }

    // 首版采用同步执行，方便前端一次性展示完整 trace；后续可以平滑升级成 WebSocket 流式 trace。
    const trace = await runAgentTask({
      userId: req.user.userId,
      goal
    });

    res.status(200).json({
      code: 200,
      data: serializeTrace(trace)
    });
  } catch (error) {
    console.error('Agent 任务执行失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Agent 任务执行失败'
    });
  }
});

router.get('/runs', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const traces = await AgentTraceModel.find({
      userId: req.user.userId
    })
      .sort({ updatedAt: -1 })
      .limit(limit);

    res.status(200).json({
      code: 200,
      data: traces.map((trace) => serializeTrace(trace))
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '获取 Agent 历史记录失败'
    });
  }
});

router.get('/runs/:runId', authMiddleware, async (req, res) => {
  try {
    const trace = await AgentTraceModel.findOne({
      _id: req.params.runId,
      userId: req.user.userId
    });

    if (!trace) {
      return res.status(404).json({
        code: 404,
        message: 'Agent 任务不存在'
      });
    }

    res.status(200).json({
      code: 200,
      data: serializeTrace(trace)
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '获取 Agent 任务失败'
    });
  }
});

router.post('/action-confirm', authMiddleware, async (req, res) => {
  try {
    const { runId, actionType, payload } = req.body || {};
    if (!runId || !actionType) {
      return res.status(400).json({
        code: 400,
        message: '缺少确认动作参数'
      });
    }

    const result = await confirmAgentAction({
      userId: req.user.userId,
      runId,
      actionType,
      payload
    });

    res.status(200).json({
      code: 200,
      message: '确认动作已执行',
      data: {
        output: result.output,
        trace: serializeTrace(result.trace)
      }
    });
  } catch (error) {
    res.status(400).json({
      code: 400,
      message: error.message || '确认动作失败'
    });
  }
});

module.exports = router;
