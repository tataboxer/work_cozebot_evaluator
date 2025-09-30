# API 接口文档

## 认证

大部分API接口需要在请求头中包含访问密钥：

```http
X-Access-Key: your_access_key
```

**无需认证的接口：**
- `POST /process-excel`
- `POST /api/verify-access`

**需要认证的接口：**
- 所有 `/api/*` 接口（除verify-access外）

## 数据处理接口

### POST /process-excel
处理Excel文件并生成AI回复（无需认证）

**请求**
- Content-Type: `multipart/form-data`
- Body: Excel文件 (excelFile)

**响应**
```json
{
  "success": true,
  "message": "Excel处理完成",
  "data": {
    "inputFile": "test_data.xlsx",
    "inputRows": 100,
    "outputRecords": 150,
    "previewData": [
      {
        "question_id": "Q001",
        "question_type": "门票咨询",
        "question_text": "问题内容",
        "context": "上下文JSON字符串",
        "chatid": "chat_12345",
        "block_type": "answer",
        "block_subtype": "文本回复",
        "block_result": "AI回复内容",
        "block_start": 2.5,
        "block_end": 15.8,
        "expected_answer": "期望答案"
      }
    ]
  }
}
```

## 评估接口

### POST /api/run-assessment
执行质量评估（需要认证）

**请求**
```json
{
  "data": [
    {
      "question_text": "问题内容",
      "block_result": "AI回复",
      "context": "上下文字符串",
      "expected_answer": "期望答案",
      "block_type": "answer",
      "block_subtype": "文本回复"
    }
  ]
}
```

**响应**
```json
{
  "success": true,
  "message": "评估完成",
  "data": [
    {
      "question_text": "问题内容",
      "block_result": "AI回复",
      "准确率": 85,
      "准确率_理由": "评估理由",
      "专业度": 90,
      "专业度_理由": "评估理由",
      "语气合理": 88,
      "语气合理_理由": "评估理由"
    }
  ]
}
```

## 会话管理接口

### GET /api/sessions
获取会话列表

**查询参数**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `startDate`: 开始日期
- `endDate`: 结束日期
- `sessionName`: 会话名称搜索

**响应**
```json
{
  "sessions": [
    {
      "session_id": "uuid",
      "session_name": "会话名称",
      "created_at": "2025-01-01T00:00:00.000Z",
      "total_questions": 100,
      "evaluation_summary": {
        "avgAccuracy": 85.5,
        "avgProfessionalism": 88.2,
        "avgToneReasonableness": 87.1
      },
      "first_token_avg_duration": 2.5,
      "first_token_min_duration": 1.2,
      "first_token_max_duration": 4.8,
      "avg_block_duration": 15.3,
      "config": {
        "ip": "192.168.1.100",
        "model": "doubao-1-5-pro-32k-250115"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalCount": 100
  }
}
```

### DELETE /api/sessions/:sessionId
删除指定会话

**响应**
```json
{
  "success": true,
  "message": "会话删除成功"
}
```

## 会话详情接口

### GET /api/sessions/:sessionId/results
获取会话详细结果

**响应**
```json
{
  "success": true,
  "session": {
    "session_id": "session_12345",
    "session_name": "会话名称",
    "created_at": "2025-01-01T00:00:00.000Z",
    "config": {
      "model": "doubao-1-5-pro-32k-250115",
      "ip": "192.168.1.100"
    }
  },
  "results": [
    {
      "question_text": "问题内容",
      "context": {
        "role": "user",
        "content": "上下文内容"
      },
      "ai_response": "AI回复内容",
      "block_start": 2.5,
      "block_end": 15.8,
      "expected_answer": "期望答案",
      "evaluation_results": {
        "accuracy": {
          "score": 85,
          "reason": "评估理由"
        },
        "professionalism": {
          "score": 90,
          "reason": "评估理由"
        },
        "tone_reasonableness": {
          "score": 88,
          "reason": "评估理由"
        }
      },
      "question_id": "Q001",
      "question_type": "门票咨询",
      "chatid": "chat_12345",
      "block_type": "answer",
      "block_subtype": "文本回复"
    }
  ]
}
```



### POST /api/verify-access
验证访问密钥（无需认证）

**请求**
```json
{
  "key": "your_access_key"
}
```

**响应**
```json
{
  "success": true,
  "message": "访问验证成功"
}
```

### GET /api/logs
SSE日志流（通过URL参数认证）

**查询参数**
- `accessKey`: 访问密钥

**响应**
- Content-Type: `text/event-stream`
- 实时日志消息流

### GET /api/sessions/:sessionId/export
导出会话数据CSV

**响应**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="session_export.csv"`
- BOM支持中文显示

## 评估器管理接口

### GET /api/evaluators
获取评估器列表

**响应**
```json
{
  "evaluators": [
    {
      "id": 1,
      "name": "默认评估器",
      "description": "通用评估器",
      "question_type": null,
      "is_default": true,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "evaluator_versions": [
        {
          "id": 1,
          "version": "v1",
          "is_latest": true,
          "created_at": "2025-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### POST /api/evaluators
创建新评估器

**请求**
```json
{
  "name": "门票咨询评估器",
  "description": "专门用于门票相关问题的评估",
  "question_type": "ticket",
  "is_default": false,
  "assistant_name": "苏州科技馆智能助手",
  "assistant_description": "为游客提供科技馆相关信息服务",
  "criteria": [
    {
      "name": "准确率",
      "description": "回答内容的准确性和正确性",
      "weight": 40
    },
    {
      "name": "专业度",
      "description": "回答的专业性和权威性",
      "weight": 30
    },
    {
      "name": "语气合理",
      "description": "回答语气的友好性和合理性",
      "weight": 30
    }
  ],
  "change_notes": "初始版本"
}
```

**响应**
```json
{
  "evaluator": {
    "id": 2,
    "name": "门票咨询评估器",
    "description": "专门用于门票相关问题的评估",
    "question_type": "ticket",
    "is_default": false,
    "is_active": true
  },
  "version": {
    "id": 2,
    "evaluator_id": 2,
    "version": "v1",
    "is_latest": true,
    "change_notes": "初始版本"
  }
}
```

### PUT /api/evaluators/:id
更新评估器基本信息

**请求**
```json
{
  "name": "更新后的评估器名称",
  "description": "更新后的描述",
  "question_type": "exhibition",
  "is_default": false,
  "is_active": true
}
```

### GET /api/evaluators/:id/versions
获取评估器版本历史

**响应**
```json
{
  "versions": [
    {
      "id": 2,
      "evaluator_id": 1,
      "version": "v2",
      "is_latest": true,
      "evaluation_criteria": {
        "assistant_name": "苏州科技馆智能助手",
        "assistant_description": "为游客提供科技馆相关信息服务",
        "criteria": [
          {
            "name": "准确率",
            "description": "回答内容的准确性和正确性",
            "weight": 40
          }
        ]
      },
      "change_notes": "优化评估标准",
      "created_at": "2025-01-02T00:00:00.000Z"
    }
  ]
}
```

### POST /api/evaluators/:id/versions
创建新版本

**请求**
```json
{
  "assistant_name": "苏州科技馆智能助手",
  "assistant_description": "为游客提供科技馆相关信息服务",
  "criteria": [
    {
      "name": "准确率",
      "description": "回答内容的准确性和正确性",
      "weight": 50
    },
    {
      "name": "专业度",
      "description": "回答的专业性和权威性",
      "weight": 50
    }
  ],
  "change_notes": "调整权重分配"
}
```

### DELETE /api/evaluators/:id
删除评估器（默认评估器不能删除）

**响应**
```json
{
  "success": true
}
```

## 评估器测试接口

### GET /api/evaluators/test-selection
测试评估器选择逻辑

**响应**
```json
{
  "success": true,
  "message": "评估器选择测试完成",
  "data": {
    "questionStats": {
      "ticket": 2,
      "exhibition": 1,
      "general": 2
    },
    "totalQuestions": 5,
    "selection": {
      "ticket": {
        "evaluatorName": "门票咨询评估器",
        "evaluatorId": 2,
        "version": "v1",
        "versionId": 2,
        "questionCount": 2,
        "isDefault": false
      }
    }
  }
}
```

### POST /api/evaluators/test-prompt
测试提示词生成

**请求**
```json
{
  "evaluatorVersionId": 1,
  "question": "门票多少钱？",
  "answer": "成人票30元，学生票20元",
  "expectedAnswer": "成人票30元，学生票20元"
}
```

**响应**
```json
{
  "success": true,
  "message": "提示词生成测试完成",
  "data": {
    "evaluator": {
      "name": "默认评估器",
      "version": "v1",
      "assistantName": "苏州科技馆智能助手"
    },
    "prompt": "你是一个专业的AI评估专家...",
    "promptLength": 1024,
    "dimensions": ["准确率", "专业度", "语气合理"]
  }
}
```

## 扣子ID管理接口

### GET /api/coze-bot-id
获取当前扣子ID

**响应**
```json
{
  "success": true,
  "cozeBotId": "7550204987524169763"
}
```

### PUT /api/coze-bot-id
更新扣子ID

**请求**
```json
{
  "cozeBotId": "7550204987524169763"
}
```

**响应**
```json
{
  "success": true,
  "message": "扣子ID更新成功",
  "cozeBotId": "7550204987524169763"
}
```

**错误响应**
```json
{
  "success": false,
  "message": "扣子ID格式不正确，应为纯数字"
}
```

## 问题搜索接口

### GET /api/question-search
搜索问题明细

**查询参数**
- `question`: 问题内容关键词
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)

**响应**
```json
{
  "results": [
    {
      "id": 1,
      "created_at": "2025-01-01T10:00:00.000Z",
      "question_text": "门票多少钱？",
      "context": [{"role": "user", "content": "你好"}],
      "ai_response": "成人票30元，学生票20元",
      "expected_answer": "成人票30元，学生票20元",
      "evaluation_results": {
        "accuracy": {"score": 85, "reason": "回答准确"},
        "professionalism": {"score": 90, "reason": "表达专业"},
        "tone_reasonableness": {"score": 88, "reason": "语气友好"}
      },
      "chatid": "chat_12345",
      "question_id": "Q001",
      "question_type": "ticket",
      "block_start": 2.5,
      "block_end": 15.8,
      "assessment_sessions": {
        "session_name": "测试会话"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## 错误响应

所有接口在出错时返回统一格式：

```json
{
  "success": false,
  "error": "错误信息"
}
```

**常见错误码**
- `401`: 未授权访问（缺少或无效的访问密钥）
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误