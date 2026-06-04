API 接口规范说明

**认证方式**：所有需要认证的接口使用 Basic Auth，格式为 Authorization: Basic base64(username:password)  
**路径参数**：<int:group_id> 等表示路径参数  
**请求格式**：POST 请求默认为 JSON 格式  
**响应格式**：统一返回 JSON 格式数据  

### 获取认证令牌  
post http://127.0.0.1:5173/api/auth/tokens
Authorization: Basic base64(admin:123)


输出示例：  
```json
{
    "permissions": "administrator",
    "token": "nyjX8+41WPZnDdlM4JLK0UahxSGLwo1A",
    "user_id": 4,
    "user_name": "admin"
}
```
#### 1. 获取应用组列表
​​Method​​: GET
​​Endpoint​​: /application/groups
​​认证​​: 需要
​​请求格式​​: 无请求体
​​响应格式​​:
```json
{
    "app": [
        {
            "datasets": [
                {
                    "id": 14,
                    "name": "\u6c14\u7403\u4e8b\u4ef6",
                    "task_type": [
                        "dp_sentiment"
                    ]
                },
                {
                    "id": 15,
                    "name": "\u4e2d\u7f8e\u8d38\u6613\u6218",
                    "task_type": [
                        "dp_sentiment"
                    ]
                }
            ],
            "default": false,
            "id": 9,
            "name": "\u6d4b\u8bd5",
            "task_type": "stance"
        },
        {
            "datasets": [
                {
                    "id": 14,
                    "name": "\u6c14\u7403\u4e8b\u4ef6",
                    "task_type": [
                        "dp_sentiment"
                    ]
                }
            ],
            "default": false,
            "id": 14,
            "name": "\u60c5\u611f\u8bc6\u522b",
            "task_type": "emotion"
        }
    ],
    "default": [
        ... 详细数据已折叠 ...
    ]
}
```
#### 2. 获取单个应用组详情
​​Method​​: POST
​​Endpoint​​: /application/groups/<int:group_id>
​​认证​​: 需要
​​请求格式​​: 无请求体
​​响应格式​​:
```json
{
    "datasets": [
        {
            "id": 13,
            "name": "\u4f69\u6d1b\u897f\u8bbf\u53f0",
            "task_type": [
                "ana"
            ]
        },
        ... 详细数据已折叠 ...
    ],
    "default": true,
    "id": 10,
    "name": "\u793a\u4f8b\uff1a\u7528\u6237\u60c5\u611f\u8bc6\u522b",
    "task_type": "emotion"
}
```
#### 3. 获取应用组结果
​​Method​​: POST
​​Endpoint​​: /application/groups/<int:group_id>/result
​​认证​​: 需要
​​请求格式​​: 无请求体
​​响应格式​​:
```json
[
  {
    "group_id": 1,
    "dataset_id": 1,
    "data_id": 100,
    "model_id": 18,
    "result": {
      "sentiment": "正面",
      "confidence": 0.92
    }
  }
]
```
#### 4. 获取单个结果
​​Method​​: POST
​​Endpoint​​: /application/groups/SingleResult
​​认证​​: 需要
​​请求格式​​:
```json
{
  group_id: "10", 
  dataset_id: "28", 
  data_id: "35377", 
  model_id: 20}
```
​​响应格式​​:
```json
{
    "data_id": 35377,
    "dataset": 28,
    "group": 10,
    "model": 20,
    "result": {
        ... 详细数据已折叠 ...
    },
    "timestamp": "Tue, 10 Jun 2025 14:13:24 GMT"
}
```
#### 5. 获取单条原始数据
​​Method​​: POST
​​Endpoint​​: /application/groups/<int:group_id>/SingleData
​​认证​​: 需要
​​请求格式​​:
```json
{
  dataset_id: "28", 
  data_id: "35377"}
```
​​响应格式​​:
```json
{
    "dataset_id": 28,
    "id": 35377,
    "images": [
        {
            "path": "rumor_images/a71ac854gw1dytin2zmk9j.jpg"
        }
    ],
    "label_rumor": 0,
    "processed_input": "A bucket of consumption oil is equivalent to more than 40 yuan in Chinese supermarkets. It was 1.6 US dollars in Wal -Mart in New York, and Christmas fell to $ 1",
    "text": "\u9707\u60ca\uff0c\u8f6c\u53d1\u6c42\u8bc1\uff1a\u3010\u60f3\u90fd\u4e0d\u6562\u60f3 \uff0c\u5728\u7f8e\u56fd\u4e00\u6876\u91d1\u9f99\u9c7c\u98df\u7528\u6cb9\u53ea\u89818\u5143\u4eba\u6c11\u5e01\u3011 ..."
}
```
#### 6. 获取可用数据集
​​Method​​: GET
​​Endpoint​​: /application/groups/<int:group_id>/AvaiableDataset
​​认证​​: 需要
​​响应格式​​:
```json
{
    "dataset_type": [
        {
            "alias": "\u793e\u4ea4\u5a92\u4f53\u6587\u672c\u6570\u636e",
            "name": "SOCIAL"
        },
        ... 详细数据已折叠 ...
    ],
    "datasets": [
        {
            "created_time": "2025-04-14 02:59:19",
            "description": "COLD\u6570\u636e\u96c6\uff1a\u7528\u4e8e\u653b\u51fb\u6027\u6587\u672c\u68c0\u6d4b",
            ... 详细数据已折叠 ...
            "value": 11
        },
        ... 其余数据集已折叠 ...
    ],
    "except": [
        13,
        15,
        28,
        39
    ]
}
```