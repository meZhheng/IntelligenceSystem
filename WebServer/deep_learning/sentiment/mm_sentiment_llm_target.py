import base64
import json
import os
import re
from dataclasses import dataclass
from typing import Dict, Generator, List, Any
from typing import Generator, Dict, Optional
from openai import OpenAI
from deep_learning.base_model import LLMBaseModel, to_builtin
import json
from PIL import Image
import os
import time
import requests
from typing import Dict, Any, List
from json import JSONDecodeError,JSONDecoder
from typing import Generator
# $env:PYTHONPATH = "G:\sys\WebServer;$env:PYTHONPATH" 

@dataclass
class Result:
    text: str
    target: str
    image_description: str
    reason: str
    sentiment: str


class MM_Sentiment_LLM_Target(LLMBaseModel):
    def __init__(self, model_name: str = "qwen-max"):
        super().__init__(model_name,api_key=None)
        self.model_name = model_name
        self.client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.image_client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.image_model = "qwen-vl-max"
        # 增强的三阶段模板系统
        self.templates = {
            "sentiment_judgment": (
                "该文本和图片针对目标的情感：\n"
                "文本：{text}\n图片描述:{image_description}目标：{target}\n"
            )
        }

    def sentiment_judgement(self, text: str, target :str, image_description :str) -> Result:
        system_prompt = """请严格使用以下JSON格式返回结果，必须包含'result'字段：
                            {
                            "result":
                                {
                                "text": "文本内容",
                                "target": "名词性短语/事件",
                                "image_description": "图片描述",
                                "reason": "给出立场的判断理由",
                                "sentiment": 正面/负面/中立
                                }
                            }
                            请确保输出是有效的JSON，不要包含换行符等特殊字符、注释或额外文本。"""
        try:
            prompt = self.templates["sentiment_judgment"]
            prompt = prompt.replace("{text}", text)
            prompt = prompt.replace("{target}", target)
            prompt = prompt.replace("{image_description}", image_description)
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                            {
                                "role": "system", 
                                "content": system_prompt  # 确保系统提示包含'json'
                            },
                            {
                                "role": "user", 
                                "content": prompt
                            }
                        ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            # print(response)
            data = json.loads(response.choices[0].message.content)
            return Result(text=data['result']['text'],target=data['result']['target'],image_description=data['result']['image_description'],reason=data['result']['reason'], sentiment=data['result']['sentiment'])

        except Exception as e:
            print(f"主体识别失败: {str(e)}")
            return Result()
    def get_required_fields():
        return ['text', 'target', 'image_path']
    
    def predict(self, data: Dict) -> Result:
        """完整的图像描述生成实现"""
        image_path = data['image_path']
        def validate_image(image_path: str):
            """验证图片文件有效性"""
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"图片文件不存在: {image_path}")
            try:
                with Image.open(image_path) as img:
                    img.verify()
            except Exception as e:
                raise ValueError(f"无效的图片文件: {str(e)}")

        def encode_image(image_path: str) -> str:
            """Base64编码图片"""
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')

        system_prompt = """请严格按以下JSON格式生成描述：
        {
            "description": "详细描述内容",
            "objects": ["主要物体列表"],
            "emotion": "画面情感分析"
        }"""

        user_prompt = """请分析这张图片：
        1. 主要人物/物体的外观特征
        2. 场景的环境特征
        3. 情感氛围
        4. 可能的相关隐喻"""

        try:
            # 验证图片有效性
            validate_image(image_path)
            
            # 准备请求数据
            base64_image = encode_image(image_path)
            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]

            # 带重试机制的请求
            for attempt in range(3):
                try:
                    response = self.image_client.chat.completions.create(
                        model=self.image_model,
                        messages=messages,
                        temperature=0.3,
                        response_format={"type": "json_object"},
                        timeout=30
                    )
                    desc_data = json.loads(response.choices[0].message.content)
                    return self.sentiment_judgement(data['text'],data['target'],desc_data.get("description", ""))
                    # return desc_data.get("description", "")
                    
                except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
                    if attempt == 2:
                        raise
                    time.sleep(2 ** attempt)

        except Exception as e:
            print(f"图像描述生成失败: {str(e)}")
            return "无法生成图片描述"
    def predict_stream(self, prompt, additional_params = None):
        return super().predict_stream(prompt, additional_params)
    
# # 测试主体识别
# print("测试情感识别:")
# model = sentiment_llm_target("qwen-max")
# result = model.predict({
#     "text": "今天天气不错，适合出门散步。",
#     "target": "天气"
# })
# print(f"文本: {result.text} | 目标: {result.target} | 理由: {result.reason} | 情感: {result.sentiment}")
