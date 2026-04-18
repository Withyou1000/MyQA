const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss;
const connections = new Map(); // 使用Map存储用户连接

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    // 心跳检测
    let isAlive = true;
    const heartbeatInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return clearInterval(heartbeatInterval);
      }
      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        // console.log('Received message:', data);
        if (data.type === 'auth' && data.token) {
          // 这里应该验证token并获取userId
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
          const userId = decoded.userId;
          ws.userId = userId;
          connections.set(userId, ws);
          console.log('init', connections.has(userId));
        }
      } catch (e) {
        console.error('Invalid message:', e);
      }
    });

    ws.on('close', () => {
      clearInterval(heartbeatInterval);
      if (ws.userId) {
        connections.delete(ws.userId);
      }
      console.log('WebSocket disconnected');
    });
  });
}

function getIO() {
  return wss;
}

function notifyUser(userId, data) {
    console.log(connections.has(userId), userId, data);
  if (!connections.has(userId)) return;

  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    console.log('已发送');
  }
}

function isUserOnline(userId) {
  return connections.has(userId);
}

module.exports = {
  initWebSocket,
  getIO,
  notifyUser,
  isUserOnline
};
