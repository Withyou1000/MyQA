const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * 使用 Node 原生 http/https 发起 JSON 请求，避免再引入新的网络依赖。
 */
function requestJson(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeout = 30000
  } = options;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers
        },
        timeout
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const statusCode = res.statusCode || 500;
          let parsed = null;

          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch (error) {
              parsed = raw;
            }
          }

          if (statusCode < 200 || statusCode >= 300) {
            const message =
              typeof parsed === 'object' && parsed
                ? parsed.status?.error || parsed.message || `HTTP ${statusCode}`
                : `HTTP ${statusCode}`;
            return reject(new Error(message));
          }

          resolve(parsed);
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`请求超时: ${url}`));
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

module.exports = {
  requestJson
};
