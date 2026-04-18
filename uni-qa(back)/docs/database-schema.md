# 数据库模型关系图

## ER 图 (Mermaid)

```mermaid
erDiagram
    USER ||--o{ QUESTION : "发布"
    USER ||--o{ USERQA : "申请回答"
    USER ||--o{ RATING : "评价他人"
    USER ||--o{ RATING : "被评价"
    USER ||--o{ CHAT : "发送消息"
    USER ||--o{ CHAT : "接收消息"
    USER ||--o{ APPLYACCEPT : "作为作者"
    
    QUESTION ||--o{ USERQA : "被申请"
    QUESTION ||--o{ RATING : "被评价"
    QUESTION ||--o{ CHAT : "关联消息"
    QUESTION ||--o{ APPLYACCEPT : "被接受"
    QUESTION }o--|| USER : "被回答"

    USER {
        string _id PK
        string account UK
        string password
        number reputation "信誉值"
        number ratingScore "好评率"
        number ratingCount "评价次数"
        number level "等级"
        number balance "余额"
        number isVip "VIP状态"
        string avatar "头像"
        date createTime
    }

    QUESTION {
        string _id PK
        string title "标题"
        string topic "分类"
        string tags "标签数组"
        number reward "悬赏金额"
        string images "图片数组"
        string status "状态"
        date createTime
        string answerer FK "回答者ID"
        number applicationCount "申请人数"
        string author FK "提问者ID"
    }

    USERQA {
        string _id PK
        string userId FK "申请者ID"
        string questionId FK "问题ID"
    }

    RATING {
        string _id PK
        string raterId FK "评价者ID"
        string ratedId FK "被评价者ID"
        string questionId FK "问题ID"
        string content "评价内容"
        string images "评价图片数组"
        number score "评分1-5星"
        string raterName "评价者名称"
        string raterAvatar "评价者头像"
        date createTime
    }

    CHAT {
        string _id PK
        string questionId FK "问题ID"
        string senderId FK "发送者ID"
        string recipientId FK "接收者ID"
        string text "文本内容"
        string image "图片"
        date createTime
        string messageType "类型"
    }

    APPLYACCEPT {
        string _id PK
        string questionId FK "问题ID"
        string authorId FK "作者ID"
        string answererName "回答者名称"
        boolean finish "是否完成"
        date createdAt
    }
```

## 模型关系说明

### 1. User (用户表)
- **主键**: `_id`
- **唯一索引**: `account` (账号)
- **关联关系**:
  - 一对多 → Question (作为提问者 author)
  - 一对多 → Question (作为回答者 answerer)
  - 一对多 → UserQA (申请回答问题)
  - 一对多 → Rating (作为评价者 raterId)
  - 一对多 → Rating (作为被评价者 ratedId)
  - 一对多 → Chat (作为发送者 senderId)
  - 一对多 → Chat (作为接收者 recipientId)
  - 一对多 → ApplyAccept (作为作者 authorId)

### 2. Question (问题表)
- **主键**: `_id`
- **外键**: 
  - `author` → User._id (提问者)
  - `answerer` → User._id (回答者，可为空)
- **关联关系**:
  - 多对一 → User (提问者)
  - 多对一 → User (回答者)
  - 一对多 → UserQA (申请记录)
  - 一对多 → Rating (评价记录)
  - 一对多 → Chat (聊天记录)
  - 一对多 → ApplyAccept (接受申请记录)

### 3. UserQA (用户-问题关联表)
- **主键**: `_id`
- **外键**:
  - `userId` → User._id (申请者)
  - `questionId` → Question._id (问题)
- **作用**: 记录用户申请回答某问题的关系

### 4. Rating (评价表)
- **主键**: `_id`
- **外键**:
  - `raterId` → User._id (评价者)
  - `ratedId` → User._id (被评价者)
  - `questionId` → Question._id (关联问题)
- **作用**: 双向评价系统，评价者和被评价者互相评价

### 5. Chat (聊天表)
- **主键**: `_id`
- **外键**:
  - `questionId` → Question._id (关联问题)
  - `senderId` → User._id (发送者)
  - `recipientId` → User._id (接收者)
- **索引**: `senderId`, `recipientId`
- **作用**: 问题相关的私聊消息

### 6. ApplyAccept (申请接受表)
- **主键**: `_id`
- **外键**:
  - `questionId` → Question._id (问题)
  - `authorId` → User._id (作者)
- **复合索引**: `{ authorId: 1, finish: 1 }`
- **作用**: 记录作者接受某个回答者申请的信息

## 业务流程关系

```
┌─────────────┐     发布      ┌─────────────┐
│    User     │──────────────→│  Question   │
│   (提问者)   │               │   (问题)    │
└─────────────┘               └──────┬──────┘
       │                             │
       │                             │ 被申请
       │                             ▼
       │                      ┌─────────────┐
       │                      │   UserQA    │
       │                      │  (申请记录)  │
       │                      └──────┬──────┘
       │                             │
       │ 接受申请                     │ 申请
       │◄────────────────────────────┤
       │                             │
       ▼                             ▼
┌─────────────┐               ┌─────────────┐
│ ApplyAccept │               │    User     │
│ (接受记录)   │               │   (回答者)   │
└─────────────┘               └──────┬──────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
       │    Chat     │       │   Rating    │       │   Rating    │
       │   (聊天)    │       │ (评价回答者) │       │ (评价提问者) │
       └─────────────┘       └─────────────┘       └─────────────┘
```

## 核心业务流程

1. **发布问题**: User → Question
2. **申请回答**: User → UserQA → Question
3. **接受申请**: Question作者 → ApplyAccept → 选定回答者
4. **开始聊天**: User (双方) → Chat (关联Question)
5. **完成评价**: 双方 → Rating (更新User评分数据)
