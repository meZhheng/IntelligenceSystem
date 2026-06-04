import json
import re
from dataclasses import dataclass
from typing import Dict, Generator, List, Any
from typing import Generator, Dict, Optional
from openai import OpenAI
from deep_learning.base_model import LLMBaseModel
import json
from json import JSONDecodeError,JSONDecoder
from typing import Generator
@dataclass
class Subject:
    name: str
    source: str  # "author"或"text"
    context: str
    attention_score: float = 0.0  # 注意力权重

@dataclass 
class Opinion:
    subject: Subject
    keywords: List[str]
    polarity: str
    confidence: float

class StreamParser:
    def __init__(self):
        self.decoder = JSONDecoder()
        self.buffer = ""
        
    def feed(self, chunk: str) -> Generator[Dict, None, None]:
        self.buffer += chunk
        while True:
            try:
                obj, idx = self.decoder.raw_decode(self.buffer)
                self.buffer = self.buffer[idx:].lstrip()
                yield obj
            except JSONDecodeError:
                break

class MUSE(LLMBaseModel):
    def __init__(self, model_name: str = "qwen-max"):
        super().__init__(model_name,api_key=None)
        self.client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        
        # 增强的三阶段模板系统
        self.templates = {
            "subject_extraction": (
                "从文本中识别情感分析主体：\n"
                "1. 发布者（作者）[必须识别]\n"
                "2. 文本中的实体（人物/组织/产品）\n"
                "3. 上下文关联度评分（0-1）\n"
                "文本：{text}\n"
            ),
            "opinion_mining": (
                "基于注意力机制提取观点词：\n"
                "主体：{subject}\n上下文：{context}\n"
                "要求：\n"
                "1. 提取形容词/评价性短语（带情感强度）\n"
                "2. 输出注意力权重（0-1）\n"
            ),
            "polarity_judgment": (
                "多维度情感分析：\n"
                "主体：{subject}\n关键词：{keywords}\n上下文：{text}\n"
            )
        }

    def get_required_fields():
        return ['text']

    def predict(self, data: Dict) -> Dict:
        """修复版三阶段流水线"""
        processed = data
        
        # 第一阶段：主体识别
        subjects = self._extract_subjects(processed['text'])
        
        # 第二阶段：多阶段处理
        opinions = []
        for subject in subjects:
            try:
                # 观点词提取
                keywords = self._mine_opinions(subject)
                
                # 情感极性判断（含置信度）
                polarity_data = self._judge_polarity(subject, keywords)
                
                # 数据校验
                if not self._validate_polarity(polarity_data):
                    continue  # 跳过无效数据
                    
                # 正确实例化Opinion对象
                opinions.append(Opinion(
                    subject=subject,
                    keywords=keywords,
                    polarity=polarity_data['polarity'],
                    confidence=round(polarity_data['confidence'], 2)  # 保留两位小数
                ))
            except KeyError as e:
                # 异常处理（网页5错误处理规范）
                print(f"KeyError in processing {subject.name}: {str(e)}")
                continue
        
        return self._format_result(subjects, opinions)
    
    def _validate_polarity(self, data: Dict) -> bool:
        """数据验证"""
        required_keys = {'polarity', 'confidence'}
        if not required_keys.issubset(data.keys()):
            return False
        if data['polarity'] not in {'积极', '中立', '消极'}:
            return False
        if not 0 <= data['confidence'] <= 1:
            return False
        return True
    
    def _format_result(self, subjects: List[Subject], opinions: List[Opinion]) -> Dict:
        return {
            "subjects": [s.__dict__ for s in subjects],
            "opinions": [{
                "subject": o.subject.name,
                "keywords": o.keywords,
                "polarity": o.polarity,
                "confidence": o.confidence
            } for o in opinions]
        }

    # 核心方法实现
    def _extract_subjects(self, text: str) -> List[Subject]:
        """主体识别专用API调用"""
        system_prompt = """请严格使用以下JSON格式返回结果，必须包含'subjects'字段：
        {
            "subjects": [
                {
                    "name": "实1体名称",
                    "source": "author/text", 
                    "context": "出现上下文",
                    "score": 0.0
                }
            ]
        }
        请确保输出是有效的JSON，不要包含换行符等特殊字符、注释或额外文本。"""
        # print("1")
        try:
            # print("2")
            # prompt = self.templates["subject_extraction"].format(text=text)
            prompt = self.templates["subject_extraction"]
            prompt = prompt.replace("{text}", text)
            # print(prompt)
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": prompt }
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            # print(response)
            data = json.loads(response.choices[0].message.content)
            return [Subject(name=s['name'], source=s['source'], 
                          context=s['context'], attention_score=s['score']) 
                   for s in data['subjects']]
        
        except Exception as e:
            print(f"主体识别失败: {str(e)}")
            return []

    def _mine_opinions(self, subject: Subject) -> List[str]:
        """观点挖掘专用API调用"""
        # 结构化系统提示
        system_prompt = """请严格按以下JSON格式返回观点词及权重：
        {
            "keywords": [
                ["形容词或评价短语", 0.0],
                ["示例词", 0.85]
            ]
        }
        请确保输出是有效的JSON，不要包含换行符等特殊字符、注释或额外文本。"""
        try:
            prompt = self.templates["opinion_mining"]
            prompt = prompt.replace("{subject}", subject.name)
            prompt = prompt.replace("{context}", subject.context)
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            # print(response)
            data = json.loads(response.choices[0].message.content)
            return [kw[0] for kw in data['keywords']]
        except Exception as e:
            print(f"观点挖掘失败: {str(e)}")
            return []

    def _judge_polarity(self, subject: Subject, keywords: List[str]) -> Dict:
        """情感判断专用API调用"""
        system_prompt = """请严格按以下JSON格式返回观点词及权重：
        {
            "polarity": "积极/中立/消极",
            "confidence": 0.0
        }
        请确保输出是有效的JSON，不要包含换行符等特殊字符、注释或额外文本。"""
        try:
            prompt = self.templates["polarity_judgment"]
            prompt = prompt.replace("{subject}", subject.name)
            prompt = prompt.replace("{keywords}", json.dumps(keywords, ensure_ascii=False))
            prompt = prompt.replace("{text}", subject.context)
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            # print(response)
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"情感判断失败: {str(e)}")
            return {"polarity": "未知", "confidence": 0.0}
        
    def predict_stream(self, prompt, additional_params = None):
        return super().predict_stream(prompt, additional_params)
