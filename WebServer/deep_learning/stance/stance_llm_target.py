import json
import re
from dataclasses import dataclass
from typing import Dict, Generator, List, Any
from typing import Generator, Dict, Optional
from openai import OpenAI
from deep_learning.base_model import LLMBaseModel, to_builtin
import json
from json import JSONDecodeError,JSONDecoder
from typing import Generator
# $env:PYTHONPATH = "G:\sys\WebServer;$env:PYTHONPATH" 

@dataclass
class Result:
    text: str
    target: str
    reason: str
    stance: str

class Stance_LLM_Target(LLMBaseModel):
    def __init__(self, model_name: str = "qwen-max"):
        super().__init__(model_name,api_key=None)
        self.model_name = model_name
        self.client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        
        # 增强的三阶段模板系统
        self.templates = {
            "stance_judgment": (
                "该文本针对目标的立场：\n"
                "文本：{text}\n目标：{target}\n"
            )
        }

    def stance_judgement(self, text: str, target :str) -> Result:
        system_prompt = """请严格使用以下JSON格式返回结果，必须包含'result'字段：
                            {
                            "result":
                                {
                                "text": "文本内容",
                                "target": "名词性短语/事件", 
                                "reason": "给出立场的判断理由",
                                "stance": 支持/反对/中立
                                }
                            }
                            请确保输出是有效的JSON，不要包含换行符等特殊字符、注释或额外文本。"""
        try:
            prompt = self.templates["stance_judgment"]
            prompt = prompt.replace("{text}", text)
            prompt = prompt.replace("{target}", target)
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
            return to_builtin(Result(text=data['result']['text'],target=data['result']['target'],reason=data['result']['reason'],stance=data['result']['stance']))
        except Exception as e:
            print(f"主体识别失败: {str(e)}")
            return Result()
    def get_required_fields():
        return ['text', 'target']

    def predict(self, data: Dict) -> Result:
        return [self.stance_judgement(data['text'], data['target'])]
    
    def predict_stream(self, prompt, additional_params = None):
        return super().predict_stream(prompt, additional_params)
    