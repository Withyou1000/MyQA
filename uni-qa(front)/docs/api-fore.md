# 问答系统接口文档

## API 根地址# 问答系统 API 文档

## 基础信息

### API 根路径
```
https://jgrejqmzqsnt.sealoshzh.site
```

### API 路由前缀
所有接口都需要添加前缀：`/api/v1`

例如，完整的搜索接口地址为：
```
https://jgrejqmzqsnt.sealoshzh.site/api/v1/questions/search
```

### 公共请求头
需要登录的接口都要在请求头中携带 token：
```javascript
{
    "Authorization": "Bearer your_token_here"
}
```

### 公共响应格式
```javascript
// 成功响应
{
    "code": 200,
    "message": "success",
    "data": {
        // 具体数据
    }
}

// 失败响应
{
    "code": 400/403/404/500,
    "message": "错误信息"
}
```

## API 接口列表

### 1. 搜索问题
搜索问题列表，支持关键词搜索。

**请求地址**：`GET /api/v1/questions/search`

**请求参数**：
```javascript
{
    "keyword": "搜索关键词"  // string, 必填
}
```

**成功响应**：
```javascript
{
    "code": 200,
    "data": {
        "total": 10,  // 总数
        "list": [{
            "questionId": "问题ID",
            "title": "问题标题",
            "topic": "问题主题",
            "tags": ["标签1", "标签2"],
            "reward": 100,  // 悬赏金额
            "status": "待解答",  // 问题状态
            "createTime": "2024-01-01T12:00:00Z",  // ISO 时间格式
            "author": {
                "userId": "用户ID",
                "account": "用户账号"
            }
        }]
    }
}
```

### 2. 发布问题
发布新的问题。

**请求地址**：`POST /api/v1/questions`

**请求头**：需要 Authorization

**请求参数**：
```javascript
{
    "title": "问题标题",    // string, 必填
    "topic": "问题主题",    // string, 必填
    "tags": ["标签1", "标签2"],  // string[], 可选
    "reward": 100,         // number, 必填，悬赏金额
    "images": ["图片URL1", "图片URL2"]  // string[], 可选
}
```

**成功响应**：
```javascript
{
    "code": 200,
    "message": "发布成功",
    "data": {
        "questionId": "问题ID",
        "createTime": "2024-01-01T12:00:00Z"
    }
}
```

**失败响应**：
```javascript
{
    "code": 400,
    "message": "缺少必要参数"
}
// 或
{
    "code": 400,
    "message": "余额不足"
}
```

### 3. 获取问题列表
获取问题列表，支持按主题筛选。

**请求地址**：`GET /api/v1/questions`

**请求参数**：
```javascript
{
    "topic": "主题名称"  // string, 可选，不传则获取所有主题
}
```

**成功响应**：
```javascript
{
    "code": 200,
    "data": {
        "total": 10,
        "list": [{
            "questionId": "问题ID",
            "title": "问题标题",
            "topic": "问题主题",
            "tags": ["标签1", "标签2"],
            "reward": 100,
            "status": "待解答",
            "createTime": "2024-01-01T12:00:00Z",
            "author": {
                "userId": "用户ID",
                "account": "用户账号"
            }
        }]
    }
}
```

### 4. 获取问题详情
获取单个问题的详细信息。

**请求地址**：`GET /api/v1/questions/:questionId`

**路径参数**：
- questionId: 问题ID

**成功响应**：
```javascript
{
    "code": 200,
    "data": {
        "questionId": "问题ID",
        "title": "问题标题",
        "topic": "问题主题",
        "tags": ["标签1", "标签2"],
        "reward": 100,
        "status": "待解答",
        "createTime": "2024-01-01T12:00:00Z",
        "images": ["图片URL1", "图片URL2"],
        "author": {
            "userId": "用户ID",
            "account": "用户账号"
        }
    }
}
```

**失败响应**：
```javascript
{
    "code": 404,
    "message": "问题不存在"
}
```

### 5. 进入问题聊天
获取问题的聊天记录。

**请求地址**：`GET /api/v1/questions/:questionId/chat`

**请求头**：需要 Authorization

**路径参数**：
- questionId: 问题ID

**成功响应**：
```javascript
{
    "code": 200,
    "data": {
        "title": "问题标题",
        "users": {
            "asker": {
                "userId": "提问者ID",
                "account": "提问者账号"
            },
            "answerer": {
                "userId": "回答者ID",
                "account": "回答者账号"
            }
        },
        "chatMessages": [{
            "messageId": "消息ID",
            "content": "消息内容",
            "images": ["图片URL1", "图片URL2"],
            "createTime": "2024-01-01T12:00:00Z",
            "messageType": "text",  // 消息类型
            "isSelf": true  // 是否是自己发送的消息
        }]
    }
}
```

### 6. 发送聊天消息
在问题中发送聊天消息。

**请求地址**：`POST /api/v1/questions/:questionId/chat/message`

**请求头**：需要 Authorization

**路径参数**：
- questionId: 问题ID

**请求参数**：
```javascript
{
    "content": "消息内容",  // string, 必填
    "images": ["图片URL1", "图片URL2"],  // string[], 可选
    "messageType": "text"  // string, 必填，消息类型
}
```

**成功响应**：
```javascript
{
    "code": 200,
    "message": "发送成功",
    "data": {
        "messageId": "消息ID",
        "createTime": "2024-01-01T12:00:00Z"
    }
}
```

### 7. 采纳回答
提问者采纳回答者的答案。

**请求地址**：`POST /api/v1/questions/:questionId/accept`

**请求头**：需要 Authorization

**路径参数**：
- questionId: 问题ID

**请求参数**：
```javascript
{
    "answererId": "回答者ID"  // string, 必填
}
```

**成功响应**：
```javascript
{
    "code": 200,
    "message": "采纳成功",
    "data": {
        "questionId": "问题ID",
        "acceptTime": "2024-01-01T12:00:00Z",
        "reward": 100,
        "asker": {
            "userId": "提问者ID",
            "account": "提问者账号"
        },
        "answerer": {
            "userId": "回答者ID",
            "account": "回答者账号",
            "balanceAfter": 1000  // 采纳后的余额
        }
    }
}
```

**失败响应**：
```javascript
{
    "code": 403,
    "message": "只有提问者可以采纳回答"
}
// 或
{
    "code": 404,
    "message": "问题不存在"
}
// 或
{
    "code": 404,
    "message": "回答者不存在"
}
```

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 注意事项

1. 所有时间字段均为 ISO 格式字符串
2. 金额单位为元
3. 图片字段为图片 URL 数组
4. 需要登录的接口必须在请求头中携带有效的 token
5. 接口返回的状态码会在 response body 的 code 字段中 

所有接口均以以下地址为前缀：
```
https://jgrejqmzqsnt.sealoshzh.site/api/v1
```

例如，搜索问题的完整接口地址为：
```
https://jgrejqmzqsnt.sealoshzh.site/auth/v1/questions/search
```

## 路由地址总览

| 功能 | 方法 | 路由 |
|------|------|------|
| 搜索问题 | GET | `/questions/search` |
| 发布问题 | POST | `/questions` |
| 获取问题列表 | GET | `/questions` |
| 获取问题详情 | GET | `/questions/:questionId` |
| 进入问题聊天 | GET | `/questions/:questionId/chat` |
| 发送聊天消息 | POST | `/questions/:questionId/chat/message` |
| 采纳回答 | POST | `/questions/:questionId/accept` |

## 目录
1. [搜索问题](#搜索问题)
2. [发布问题](#发布问题)
3. [获取问题列表](#获取问题列表)
4. [获取问题详情](#获取问题详情)
5. [进入问题聊天](#进入问题聊天)
6. [发送聊天消息](#发送聊天消息)
7. [采纳回答](#采纳回答)

## 接口详情

### 搜索问题

**接口地址**：`GET /questions/search`

**请求参数**：
```javascript
{
  keyword: string  // 搜索关键词
}
```

**成功响应**：
```javascript
{
  code: 200,
  data: {
    total: number,  // 总数
    list: [
      {
        questionId: string,
        title: string,
        topic: string,
        tags: string[],
        reward: number,
        status: string,
        createTime: Date,
        author: {
          userId: string,
          account: string
        }
      }
    ]
  }
}
```

**失败响应**：
```javascript
{
  code: 500,
  message: '搜索问题失败'
}
```

### 发布问题

**接口地址**：`POST /questions`

**请求头**：
```javascript
{
  Authorization: 'Bearer <token>'
}
```

**请求参数**：
```javascript
{
  title: string,    // 问题标题
  topic: string,    // 问题主题
  tags: string[],   // 标签（可选）
  reward: number,   // 悬赏金额
  images: string[]  // 图片列表（可选）
}
```

**成功响应**：
```javascript
{
  code: 200,
  message: '发布成功',
  data: {
    questionId: string,
    createTime: Date
  }
}
```

**失败响应**：
```javascript
{
  code: 400,
  message: '缺少必要参数'
}
// 或
{
  code: 400,
  message: '余额不足'
}
// 或
{
  code: 500,
  message: '发布问题失败'
}
```

### 获取问题列表

**接口地址**：`GET /questions`

**请求参数**：
```javascript
{
  topic?: string  // 可选，按主题筛选
}
```

**成功响应**：
```javascript
{
  code: 200,
  data: {
    total: number,
    list: [
      {
        questionId: string,
        title: string,
        topic: string,
        tags: string[],
        reward: number,
        status: string,
        createTime: Date,
        author: {
          userId: string,
          account: string
        }
      }
    ]
  }
}
```

**失败响应**：
```javascript
{
  code: 500,
  message: '获取问题列表失败'
}
```

### 获取问题详情

**接口地址**：`GET /questions/:questionId`

**路径参数**：
- questionId: string

**成功响应**：
```javascript
{
  code: 200,
  data: {
    questionId: string,
    title: string,
    topic: string,
    reward: number,
    status: string,
    createTime: Date,
    images: string[],
    author: {
      userId: string,
      account: string
    }
  }
}
```

**失败响应**：
```javascript
{
  code: 404,
  message: '问题不存在'
}
// 或
{
  code: 500,
  message: '获取问题详情失败'
}
```

### 进入问题聊天

**接口地址**：`GET /questions/:questionId/chat`

**请求头**：
```javascript
{
  Authorization: 'Bearer <token>'
}
```

**路径参数**：
- questionId: string

**成功响应**：
```javascript
{
  code: 200,
  data: {
    title: string,
    chatMessages: [
      {
        messageId: string,
        content: string,
        images: string[],
        createTime: Date,
        messageType: string,
        isSelf: boolean
      }
    ]
  }
}
```

**失败响应**：
```javascript
{
  code: 404,
  message: '问题不存在'
}
// 或
{
  code: 500,
  message: '获取聊天记录失败'
}
```

### 发送聊天消息

**接口地址**：`POST /questions/:questionId/chat/message`

**请求头**：
```javascript
{
  Authorization: 'Bearer <token>'
}
```

**路径参数**：
- questionId: string

**请求参数**：
```javascript
{
  content: string,     // 消息内容
  images: string[],    // 图片列表（可选）
  messageType: string  // 消息类型
}
```

**成功响应**：
```javascript
{
  code: 200,
  message: '发送成功',
  data: {
    messageId: string,
    createTime: Date
  }
}
```

**失败响应**：
```javascript
{
  code: 404,
  message: '问题不存在'
}
// 或
{
  code: 500,
  message: '发送消息失败'
}
```

### 采纳回答

**接口地址**：`POST /questions/:questionId/accept`

**请求头**：
```javascript
{
  Authorization: 'Bearer <token>'
}
```

**路径参数**：
- questionId: string

**请求参数**：
```javascript
{
  answererId: string  // 回答者ID
}
```

**成功响应**：
```javascript
{
  code: 200,
  message: '采纳成功',
  data: {
    questionId: string,
    acceptTime: Date,
    reward: number,
    asker: {
      userId: string,
      account: string
    },
    answerer: {
      userId: string,
      account: string,
      balanceAfter: number
    }
  }
}
```

**失败响应**：
```javascript
{
  code: 404,
  message: '问题不存在'
}
// 或
{
  code: 404,
  message: '回答者不存在'
}
// 或
{
  code: 403,
  message: '只有提问者可以采纳回答'
}
// 或
{
  code: 500,
  message: '采纳回答失败'
}
```

## 状态码说明

- 200: 请求成功
- 400: 请求参数错误
- 403: 权限不足
- 404: 资源不存在
- 500: 服务器错误

## 注意事项

1. 所有需要认证的接口都需要在请求头中携带 `Authorization` 字段
2. 时间字段均为 ISO 格式的字符串
3. 图片字段为图片URL数组
4. 金额字段单位为元 