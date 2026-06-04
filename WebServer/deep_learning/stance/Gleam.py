import json
import re
from dataclasses import dataclass
from typing import Dict, Generator, List, Any
from typing import Generator, Dict, Optional
from openai import OpenAI
from deep_learning.base_model import LLMBaseModel

@dataclass
class Hypothesis:
    stance_type: str  # Accept/Reject/NoStance
    content: str

@dataclass
class Explanation:
    stance_type: str
    reasoning: str
    key_evidence: List[str]

@dataclass
class FinalDecision:
    selected_stance: str
    confidence: float
    contrastive_analysis: str

    def to_markdown(self) -> str:
        """
        返回 Markdown 列表格式的字符串，并将字段转换为中文描述。
        示例输出：
          - 选定立场：xxx
          - 置信度：0.95
          - 对比分析：xxx
        """
        md = (
            f"- 选定立场：{self.selected_stance}\n"
            f"- 置信度：{self.confidence}\n"
            f"- 对比分析：{self.contrastive_analysis}\n"
        )
        return md

class Gleam(LLMBaseModel):
    """三阶段立场分析模型（兼容图示架构）"""
    
    def __init__(self, api_key: str = None, model_name: str = "qwq-32b", temperature: float = 0.3, max_tokens: int = 4096):
        super().__init__(model_name, api_key, temperature, max_tokens)
        self.client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.templates = {
            "hypothesis": (
                "为以下内容生成三种立场假设：\n"
                "内容：{text}\n"
                "话题：{topic}\n"
                "格式要求：\n"
                "Hypothesis Accept: [内容]\n"
                "Hypothesis Reject: [内容]\n"
                "Hypothesis NoStance: [内容]"
            ),
            "explanation": (
                "假设内容对[{topic}]持{stance}立场，请逐步解释：\n"
                "1. 文本中的关键证据\n"
                "2. 隐含的立场暗示\n"
                "3. 逻辑推导过程\n"
                "原文：{text}"
            ),
            "verification": (
                "请对比分析以下三种解释的合理性：\n"
                "支持立场解释：{accept_exp}\n"
                "反对立场解释：{reject_exp}\n"
                "无立场解释：{no_exp}\n"
                "要求：\n"
                "1. 评估证据相关性（0-5）\n"
                "2. 分析逻辑一致性（0-5）\n"
                "3. 最终选择最合理立场（仅返回Accept/Reject/NoStance）"
            )
        }
        self.hypo_pattern = re.compile(r"Hypothesis (Accept|Reject|NoStance): (.+)")

    def preposscess(self, data) -> Dict:

        return {
            "text": data['text'], 
            "topic": data['key_word'],
            "author": data['author'],
            "metadata": {
                "post_time": data['publish_time'],
                "platform": data['source_station'],
                "interaction_stats": {
                    "likes": data['count_likes'],
                    "retweets": data['count_forward'],
                    "replies": data['count_comments']
                }
            }
        }

    def get_required_fields():
        return ["text", "key_word", "author", "publish_time", "source_station", "count_likes", "count_forward", "count_comments"]

    def predict(self, data: Dict) -> Dict:

        prompt = self.preposscess(data)
        """三阶段同步推理"""
        try:
            # Phase A: 反事实树构建
            hypotheses = self._generate_hypotheses(prompt)
            # print(hypotheses)
            # Phase B: 链式解释生成
            explanations = {
                "Accept": self._generate_explanation(prompt, hypotheses[0]),
                "Reject": self._generate_explanation(prompt, hypotheses[1]),
                "NoStance": self._generate_explanation(prompt, hypotheses[2])
            }
            # Phase C: 对比验证
            decision = self._verify_decision(explanations)
            return {
                "hypotheses": [h.__dict__ for h in hypotheses],
                "explanations": {k:v.__dict__ for k,v in explanations.items()},
                "decision": decision.__dict__
            }
        except Exception as e:
            return {"error": str(e), "status": "failed"}

    def predict_stream(self, data: Dict) -> Generator[str, None, None]:
        prompt = self.preposscess(data)
        """三阶段流式推理（全流程流式适配）"""
        try:
            # Phase A: 流式生成假设
            hypotheses = []
            buffer = []
            for chunk in self._stream_stage(prompt, "hypothesis"):
                buffer.append(chunk)
                yield json.dumps({"phase": "构建反事实树", "data": chunk, "status": 'streaming'})  + "\n"

            phase_hypo = "".join(buffer)
            # 解析假设必须包含三种立场
            parsed_hypo = self._parse_hypotheses(phase_hypo)
            if len(parsed_hypo) != 3:
                yield json.dumps({"error": str(phase_hypo), "status": "failed", "message": f"假设解析失败，需要3个立场，实际得到{len(parsed_hypo)}个"})
            hypotheses = parsed_hypo
            
            # Phase B: 并行流式生成解释
            explanations = {
                "Accept": self._stream_explanation(prompt, hypotheses[0]),
                "Reject": self._stream_explanation(prompt, hypotheses[1]),
                "NoStance": self._stream_explanation(prompt, hypotheses[2])
            }
            
            phase_exp = {
                "Accept": {'data': ''},
                "Reject": {'data': ''},
                "NoStance": {'data': ''}
            }
            # 多路解释流合并
            for stance in ["Accept", "Reject", "NoStance"]:
                exp_buffer = []
                for chunk in explanations[stance]:
                    exp_buffer.append(chunk)
                    yield json.dumps({
                        "phase": "stances",
                        "stance": stance,
                        "data": chunk,
                        "status": 'streaming'
                    }) + "\n"
                
                phase_exp[stance]['data'] += "".join(exp_buffer)
                # 实时解析解释结果
                explanations[stance] = self._parse_explanation("".join(exp_buffer))
            
            # Phase C: 流式验证
            verification_buffer = []
            for chunk in self._stream_verification(explanations):
                verification_buffer.append(chunk)
                yield json.dumps({"phase": "反事实对比链验证", "data": chunk, "status": 'streaming'}) + "\n"
            
            phase_ver = "".join(verification_buffer)
            # 最终决策解析
            decision = self._parse_verification(phase_ver)
            yield json.dumps({"phase": "最终决策", "data": decision.__dict__, "status": 'streaming'}) + "\n"

            yield json.dumps({
                "thinking": False,
                "status": "success",
                "answer_content": [
                    {"phase": "构建反事实树", "data": phase_hypo},
                    {"phase": "stances", "stances": phase_exp},
                    {"phase": "反事实对比链验证", "data": phase_ver},
                    # {"phase": "最终决策", "data": decision.to_markdown()},
                ],
                "reasoning_content": ''
            })
            
        except Exception as e:
            yield json.dumps({"error": str(e), "status": "failed"}) + "\n"
        
    # 核心阶段实现
    def _generate_hypotheses(self, prompt: Dict) -> List[Hypothesis]:
        messages = [{"role": "user", "content": self.templates["hypothesis"].format(
            text=prompt['text'], 
            topic=prompt['topic']
        )}]
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.7,
            max_tokens=self.max_tokens
        )
        return self._parse_hypotheses(response.choices[0].message.content)

    def _parse_hypotheses(self, text: str) -> List[Hypothesis]:
        return [Hypothesis(match[0], match[1]) 
            for match in self.hypo_pattern.findall(text)]
    # Phase B 链式解释生成
    def _generate_explanation(self, prompt: Dict, hypothesis: Hypothesis) -> Explanation:
        """为单个假设生成解释链"""
        template = self.templates["explanation"].format(
            topic=prompt['topic'],
            stance=hypothesis.stance_type,
            text=prompt['text']
        )
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": template}],
            temperature=0.3,
            max_tokens=1024
        )
        return self._parse_explanation(response.choices[0].message.content)

    def _parse_explanation(self, raw_text: str) -> Explanation:
        """解析解释文本结构"""
        # 使用正则提取关键证据点（示例模式需根据实际输出调整）
        evidence_pattern = re.compile(r"关键证据\d+: (.+?)(?=\n|$)")
        return Explanation(
            stance_type=self._detect_stance(raw_text),
            reasoning=raw_text,
            key_evidence=evidence_pattern.findall(raw_text)[:3]  # 取前三项关键证据
        )

    def _detect_stance(self, text: str) -> str:
        """从解释文本中检测立场类型"""
        if "支持" in text or "Accept" in text:
            return "Accept"
        elif "反对" in text or "Reject" in text:
            return "Reject"
        return "NoStance"

    # Phase C 对比验证
    def _verify_decision(self, explanations: Dict) -> FinalDecision:
        """执行对比验证决策"""
        verification_prompt = self.templates["verification"].format(
            accept_exp=explanations["Accept"].reasoning,
            reject_exp=explanations["Reject"].reasoning,
            no_exp=explanations["NoStance"].reasoning
        )
        
        response = self.client.chat.completions.create(
            model=self.model_name,  # 使用长文本优化模型
            messages=[{"role": "user", "content": verification_prompt}],
            temperature=0.1,
            # response_format={"type": "json_object"}
        )
        return self._parse_verification(response.choices[0].message.content)

    def _parse_verification(self, raw_json: str) -> FinalDecision:
        """解析验证结果JSON"""
        try:
            data = json.loads(raw_json)
            return FinalDecision(
                selected_stance=data.get("selected_stance", "NoStance"),
                confidence=float(data.get("confidence", 0.5)),
                contrastive_analysis=data.get("analysis", "")
            )
        except json.JSONDecodeError:
            return FinalDecision("NoStance", 0.0, "结果解析失败")
    def _stream_stage(self, prompt: Dict, phase: str) -> Generator[str, None, None]:
        """分阶段流式处理核心方法"""
        try:
            # 根据阶段选择模板
            template = self.templates[phase].format(
                text=prompt['text'],
                topic=prompt.get('topic', ''),
                author=prompt.get('author', '匿名用户')
            )
            
            # 构建消息队列
            messages = [{
                "role": "user",
                "content": template
            }]
            
            # 调整不同阶段的参数
            temperature_map = {
                "hypothesis": 0.7,
                "explanation": 0.3,
                "verification": 0.1
            }
            
            # 调用流式API
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                stream=True,
                temperature=temperature_map.get(phase, 0.5),
                max_tokens=self.max_tokens
            )
            
            # 流式返回结果
            for chunk in response:
                if content := chunk.choices[0].delta.content:
                    yield content
                    
        except Exception as e:
            yield f"Error in {phase} streaming: {str(e)}"  + "\n"
    # 流式处理方法
    def _stream_explanation(self, prompt: Dict, hypothesis: Hypothesis) -> Generator[str, None, None]:
        """流式生成解释"""
        template = self.templates["explanation"].format(
            topic=prompt['topic'],
            stance=hypothesis.stance_type,
            text=prompt['text']
        )
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": template}],
            temperature=0.3,
            stream=True,
            max_tokens=1024
        )
        
        for chunk in response:
            if content := chunk.choices[0].delta.content:
                yield content

    def _stream_verification(self, explanations: Dict) -> Generator[str, None, None]:
        """流式对比验证"""
        verification_prompt = self.templates["verification"].format(
            accept_exp=explanations["Accept"].reasoning,
            reject_exp=explanations["Reject"].reasoning,
            no_exp=explanations["NoStance"].reasoning
        )
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": verification_prompt}],
            temperature=0.1,
            stream=True,
        )
        
        for chunk in response:
            if content := chunk.choices[0].delta.content:
                yield content
