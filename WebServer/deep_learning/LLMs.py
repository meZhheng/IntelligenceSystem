import json
from openai import OpenAI
import time
from deep_learning.base_model import LLMBaseModel

class DeepSeek(LLMBaseModel):
    def __init__(self):

        self.client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

        self.system_prompt = """
        用户会提供给你一段微博平台上的新闻文本内容，以及它所属的话题（关键词）和作者昵称。请你分别分析该段新闻文本中各方对不同客体的情感倾向。请在返回的最后一行返回一个结构化的总结，全文只有一个“结构化总结”，总结格式为<【客体1】:【情感倾向1】><【客体2】:【情感倾向2】>依次类推，其中的'【','】','<','>',':'需要实际输出和显示。
        """
    def get_required_fields():
        return ['text', 'author', 'key_word']

    def predict(self, item):
        # user_prompt = item['data']
        # idx = item['id']

        # messages = [{"role": "system", "content": self.system_prompt},
        #             {"role": "user", "content": json.dumps(user_prompt)}]

        # try:
        #     response = self.client.chat.completions.create(
        #         model="qwen-max",
        #         messages=messages,
        #     )

        # except Exception as e:
        #     return {
        #         'id': idx,
        #         'data': '推理失败: {}'.format(e),
        #         'status': 'failed'
        #     }

        # response_content = response.choices[0].message.content.strip().split('\n', 1)[-1].rsplit('\n', 1)[0]

        # return {
        #     'id': idx,
        #     'data': response_content,
        #     'status': 'success'
        # }
        time.sleep(0.1)
        return {
            'data': 'Placeholder',
            'status': 'success'
        }

    def predict_stream(self, item):
        """
        流式推理，返回一个生成器，每次 yield 一个 JSON 字符串
        """
        user_prompt = {
            'text': item['text'],
            'author': item['author'],
            'key_word': item['key_word'],
        }
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)}
        ]

        try:
            # 开启流式推理
            completion = self.client.chat.completions.create(
                model="qwq-32b",
                messages=messages,
                stream=True,  # 启用流式输出
            )
        except Exception as e:
            yield json.dumps({
                'data': f'推理失败: {e}',
                'status': 'failed'
            }) + "\n"
            return

        reasoning_content = ""  # 存储完整的推理过程
        answer_content = ""     # 存储完整的正式回答
        is_answering = False    # 标记是否进入正式回复阶段

        # 遍历流式响应
        for chunk in completion:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta

            # 处理推理过程（reasoning）
            if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                reasoning_content += delta.reasoning_content
                yield json.dumps({
                    'data': delta.reasoning_content,
                    'status': 'reasoning'
                }) + "\n"

            # 处理正式回复（content）
            elif hasattr(delta, 'content') and delta.content:
                if not is_answering:
                    # 首次进入正式回复阶段
                    is_answering = True

                answer_content += delta.content
                yield json.dumps({
                    'data': delta.content,
                    'status': 'streaming'
                }) + "\n"

        # 推理完成后返回最终结果
        yield json.dumps({
            'answer_content': answer_content,
            'reasoning_content': reasoning_content,
            'status': 'success'
        }) + "\n"

