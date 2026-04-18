 # 问答社区 API 文档

## 基础信息
- 基础URL: `/api/v1`
- 响应格式: JSON
- 认证方式: Bearer Token (除登录注册外的接口都需要在 Header 中携带 `Authorization: Bearer <token>`)

## 错误码说明
- 200: 成功
- 400: 请求参数错误
- 401: 未认证或认证失效
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误

## 接口列表

### 1. 用户认证相关

#### 1.1 用户注册
- **接口**: POST `/auth/register`
- **描述**: 新用户注册
- **请求参数**:
  ```json
  {
    "account": "string",     // 账号
    "password": "string",    // 密码
    "phone": "string",       // 手机号
    "verificationCode": "string"  // 验证码
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "注册成功",
    "data": {
      "userId": "string",
      "account": "string",
      "token": "string"
    }
  }
  ```

#### 1.2 发送验证码
- **接口**: POST `/auth/send-code`
- **描述**: 发送手机验证码
- **请求参数**:
  ```json
  {
    "phone": "string"  // 手机号
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "发送成功",
    "data": {
      "expireTime": "number"  // 验证码有效期（秒）
    }
  }
  ```

#### 1.3 用户登录
- **接口**: POST `/auth/login`
- **描述**: 账号密码登录
- **请求参数**:
  ```json
  {
    "account": "string",  // 账号
    "password": "string"  // 密码
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "登录成功",
    "data": {
      "userId": "string",
      "account": "string",
      "token": "string",
      "reputation": "number"  // 用户声望值
    }
  }
  ```

### 2. 问题相关

#### 2.1 搜索问题
- **接口**: GET `/questions/search`
- **描述**: 搜索问题，支持标题和标签模糊匹配
- **请求参数**:
  ```
  keyword: string    // 搜索关键词

  ```
- **响应**:
  ```json
  {
    "code": 200,
    "data": {
      "total": "number",
      "list": [{
        "questionId": "string",
        "title": "string",
        "tags": ["string"],     // 问题标签列表
        "reward": "number",     // 悬赏金额
        "status": "string",     // 待解答/已解答
        "createTime": "string", // 创建时间
        "author": {             // 提问者信息
          "userId": "string",
          "account": "string"
        }
      }]
    }
  }
  ```

#### 2.2 发布问题
- **接口**: POST `/questions`
- **描述**: 发布新问题
- **请求参数**:
  ```json
  {
    "title": "string",      // 问题标题
    "content": "string",    // 问题详细描述
    "categoryName": "string", // 问题分类ID
    "tags": ["string"],     // 问题标签列表
    "reward": "number",     // 悬赏金额
    "images": ["string"]    // 图片URL数组
    "author": {             // 提问者信息
          "userId": "string",
          "account": "string"
        }
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "发布成功",
    "data": {
      "questionId": "string",
      "createTime": "string"
    }
  }
  ```

#### 2.3 获取某个分类下的所有问题列表
- **接口**: GET `/questions`
- **描述**: 获取问题列表，支持按分类筛选和分页
- **请求参数**:
  ```
  categoryName: string  // 分类名称（如：编程、教育等）
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "data": {
      "total": "number",
      "list": [{
        "questionId": "string",
        "title": "string",
        "tags": ["string"],     // 问题标签列表
        "reward": "number",     // 悬赏金额
        "status": "string",     // 待解答/已解答
        "createTime": "string", // 创建时间
       
        "author": {             // 提问者信息
          "userId": "string",
          "account": "string"
        }
      }]
    }
  }
  ```

#### 2.4 获取问题详情
- **接口**: GET `/questions/{questionId}`
- **描述**: 获取问题详细信息
- **响应**:
  ```json
  {
    "code": 200,
    "data": {
      "questionId": "string",
      "title": "string",
      "categoryName": "string",
      "reward": "number",
      "status": "string",
      "createTime": "string",
      "images": ["string"],
      "author": {
        "userId": "string",
        "account": "string",
      }
    }
  }
  ```

### 3. 回答相关

#### 3.1 进入问题聊天
- **接口**: GET `/questions/{questionId}/chat`
- **描述**: 获取与提问者的聊天记录
- **响应**:
  ```json
  {
    "code": 200,
    "data": {
      
        "title": "string",//标题就是问题
       
      "users": {
        "asker": {           // 提问者信息
          "userId": "string",
          "account": "string",
        },
        "answerer": {        // 回答者信息
          "userId": "string",
          "account": "string",
        }
      },
      "chatMessages": [{
        "messageId": "string",
        "content": "string",
        "images": ["string"],
        "createTime": "string",
        "messageType": "string",  // text/image/system
        "isSelf": "boolean",     // true: 自己发送的消息, false: 对方发送的消息
      }]
    }
  }
  ```


#### 3.2 发送聊天消息
- **接口**: POST `/questions/{questionId}/chat/message`
- **描述**: 在问题聊天中发送消息
- **请求参数**:
  ```json
  {
    "content": "string",    // 消息内容
    "images": ["string"],   // 图片URL数组（可选）
    "messageType": "string" // 消息类型：text/image
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "发送成功",
    "data": {
      "messageId": "string",
      "createTime": "string"
    }
  }
  ```


#### 3.4 采纳回答
- **接口**: POST `/questions/{questionId}/accept`
- **描述**: 提问者采纳回答，采纳后提问者扣除悬赏金额，回答者增加悬赏金额
- **响应**:
  ```json
  {
    "code": 200,
    "message": "采纳成功",
    "data": {
      "questionId": "string",
      "acceptTime": "string",
      "reward": "number",    // 悬赏金额
      "asker": {            // 提问者信息
        "userId": "string",
        "account": "string",
        "balanceAfter": "number"  // 扣除悬赏后的余额
      },
      "answerer": {         // 回答者信息
        "userId": "string",
        "account": "string",
        "balanceAfter": "number"  // 收到悬赏后的余额
      }
    }
  }
  ```

### 4. 用户相关

#### 4.1 获取用户信息
- **接口**: GET `/user/info`
- **描述**: 获取当前登录用户的详细信息
- **响应**:
  ```json
  {
    "code": 200,
    "data": {
      "userId": "string",
      "account": "string",
      "avatar": "string",
      "reputation": "number",  // 信誉分，最开始有100
      "level": "number",      // 等级 默认一级
      "balance": "number",     // 余额（元），最开始每个用户有100元
      "isvip":"number"//是否为vip，默认是没有
    }
  }
  ```

#### 4.2 获取我的提问列表
- **接口**: GET `/user/myquestions`
- **描述**: 获取当前用户发布的问题列表
-**请求参数**:
  ```
 通过token里的用户id来请求
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "data": {
      "total": "number",
      "list": [{
        "questionId": "string",
        "title": "string",
        "tags": ["string"],     // 问题标签列表
        "reward": "number",
        "status": "string",//待解答/已解答
        "createTime": "string",
      }]
    }
  }
  ```

#### 4.3 获取我的回答列表
- **接口**: GET `/user/myanswers`
- **描述**: 获取当前用户的回答列表
- **请求参数**:
  ```
 通过token里的用户id来请求
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "data": {
      "total": "number",
      "list": [{
        "answerId": "string",
        "questionId": "string",
        "title": "string",      // 问题标题
        "tags": ["string"],     // 问题标签列表
        "reward": "number",
        "status": "string",     // 待采纳/已采纳
        "createTime": "string",
      }]
    }
  }
  ``` 


## 注意事项

1. 所有需要认证的接口在请求头中需要携带 token:
   ```
   Authorization: Bearer <token>
   ```

2. 图片上传大小限制：
   - 单张图片不超过5MB
   - 支持格式：jpg、jpeg、png、gif

3. 接口返回格式统一为：
   ```json
   {
     "code": "number",    // 状态码
     "message": "string", // 提示信息
     "data": "object"     // 响应数据
   }
   ```