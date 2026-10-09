# HelloMe 智能体使用返点 · Skill 接入规范

参与「智能体使用返点」的 FDE，必须按本规范接入。下载本文件只表示已报名并领取规范。智能体通过接入检查并开启返点后，之后产生的官方模型消费才会归属并计算返点。

## 1. 哪些消费参与返点

- 使用 HelloMe 自动发放的官方 API Key。
- 调用 HelloMe 指定的官方模型入口。
- 该智能体已开启返点资格，且消费发生在资格生效之后。
- 金额口径是用户实际付费的模型消费。免费额度和赠送额度不参与。

## 2. 哪些消费不参与

- 用户自配 API Key。
- 其他非官方渠道。
- 资格开通之前的历史消费。
- 返点资格被暂停期间的新消费。

自配渠道仍应上报运行记录，便于 FDE 看到「已使用 · 自配模型 · 无官方计费记录 · 不参与返点」。

## 3. 每次模型调用必须带上的身份

运行引擎应自动附加，不要让 FDE 在提示词里手写：

| 字段 | 说明 |
|---|---|
| userId | 当前登录用户 |
| officialKeyId | 官方 Key 的内部标识。自配渠道留空 |
| agentId | 正在运行的智能体，由平台或本地引擎绑定并校验 |
| expertId | 智能体所属 FDE |
| modelId | 官方或自配模型标识 |
| channel | `official` 或 `self` |
| occurredAt | 运行时间 |
| tokens | Token 用量 |
| amountCents | 官方实际付费金额，单位分。自配渠道为 0 |
| idempotencyKey | 同一次运行的唯一键，重复上报必须相同 |

同一个用户的官方 Key 可以用于多个智能体，因此必须同时提交智能体标识。FDE 后台不会展示用户的完整 API Key。

## 4. 上报入口

本地运行引擎在一次运行结束后调用：

```http
POST /api/me/rebate/runs
Content-Type: application/json

{
  "idempotencyKey": "run_...",
  "agentId": "agt_...",
  "modelId": "hellome-pro",
  "channel": "official",
  "tokens": 1200,
  "amountCents": 80,
  "occurredAt": "2026-10-08T02:00:00.000Z"
}
```

调用方必须是产生消费的登录用户。平台用智能体作者确定 FDE，用该用户已发放的官方 Key 关联计费。消费是否计返点，以平台写入的计费记录为准，不以客户端自报的返点金额为准。

## 5. 接入检查

1. 智能体只通过 HelloMe 指定入口调用官方模型。
2. 官方调用带 `channel=official`，自配调用带 `channel=self`。
3. 引擎绑定并校验 agentId，不接受调用方随意改写归属。
4. 同一 `idempotencyKey` 重试不会新增第二条收入。
5. 上报失败时应保留本地记录并重试，不要更换 idempotencyKey。

检查通过后，由 FDE 在工作台开启该智能体的返点。开启时间即资格生效时间。
