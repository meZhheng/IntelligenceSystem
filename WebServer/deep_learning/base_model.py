# deep_learning/base_model.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any
import openai
from typing import List, Dict, Generator, Optional
from dataclasses import asdict
def to_builtin(o):
  # 如果是 dataclass，就用 asdict
  if hasattr(o, '__dataclass_fields__'):
    return asdict(o)
  # 如果是 list，就递归转换
  if isinstance(o, list):
    return [to_builtin(x) for x in o]
  # 其它原生类型直接返回
  return o

class BaseModel(ABC):
  """
  BaseModel 是所有深度学习模型的基类，用于训练和推理。

  子类必须实现：
    - forward(inputs: List[Dict]) -> Any : 处理输入列表并返回输出（可以是列表或者聚合后的结果）

  可选重载：
    - predict(inputs: List[Dict]) -> Any : 封装 forward 的调用，实现前后处理

  属性：
    input_fields: List[str] 声明该模型需要的输入字段
  """
  
  input_fields: List[str] = []  # 例如 ['text', 'key_word']

  @staticmethod
  @abstractmethod
  def get_required_fields() -> List[str]:
    """
    获取模型的输入字段列表。
    """
    pass

  @abstractmethod
  def forward(self, inputs: List[Dict]) -> Any:
    """
    核心推理函数，接受一个包含多个输入字典的列表。
    每个输入字典的键应与 input_fields 中声明的字段一致。
    :param inputs: List[Dict]
    :return: 模型原始输出，通常为列表形式或聚合结果
    """
    pass

  def predict(self, inputs: List[Dict]) -> Any:
    """
    默认的预测函数，调用 forward 方法。
    这里简单将每个输入单独处理并返回列表结果。
    子类可以根据需要重载此方法实现前后处理。
    :param inputs: List[Dict]
    :return: List[Any] 每个输入的预测结果
    """
    # 如果 forward 处理的是批量数据，直接调用即可
    return self.forward(inputs)

class LLMBaseModel(ABC):
  """
  基类：封装 OpenAI API 调用，支持普通推理和流式输出。
  """
  def __init__(self, model_name: str, api_key: str, temperature: float = 0.3, max_tokens: int = 8192):
    """
    初始化 LLM 模型调用类。

    :param model_name: 要使用的 OpenAI 模型名称（如 'gpt-4'）。
    :param api_key: OpenAI API 密钥。
    :param temperature: 生成文本的随机性（越低越确定）。
    :param max_tokens: 生成文本的最大 token 长度。
    """
    self.model_name = model_name
    self.api_key = api_key
    self.temperature = temperature
    self.max_tokens = max_tokens
    openai.api_key = self.api_key  # 设置 API 密钥

  @staticmethod
  @abstractmethod
  def get_required_fields() -> List[str]:
    """
    获取模型的输入字段列表。
    """
    pass

  @abstractmethod
  def predict(self, prompt: str, additional_params: Optional[Dict] = None) -> str:
    """
    普通推理：向 OpenAI 发送请求并返回完整的响应文本。

    :param prompt: 需要发送的提示词。
    :param additional_params: 可选的额外 API 参数，如 `stop` 等。
    :return: 生成的文本。
    """
    params = {
      "model": self.model_name,
      "prompt": prompt,
      "temperature": self.temperature,
      "max_tokens": self.max_tokens
    }

    # 合并用户提供的额外参数
    if additional_params:
      params.update(additional_params)

    response = openai.Completion.create(**params)
    return response["choices"][0]["text"].strip()

  @abstractmethod
  def predict_stream(self, prompt: str, additional_params: Optional[Dict] = None) -> Generator[str, None, None]:
    """
    流式推理：逐步返回生成的文本，适用于实时输出。

    :param prompt: 需要发送的提示词。
    :param additional_params: 可选的额外 API 参数。
    :yield: 逐步生成的文本片段。
    """
    params = {
      "model": self.model_name,
      "prompt": prompt,
      "temperature": self.temperature,
      "max_tokens": self.max_tokens,
      "stream": True
    }

    if additional_params:
      params.update(additional_params)

    response = openai.Completion.create(**params)

    for chunk in response:
      if "text" in chunk["choices"][0]:
        yield chunk["choices"][0]["text"]

  def set_params(self, temperature: Optional[float] = None, max_tokens: Optional[int] = None):
    """
    动态更新 `temperature` 和 `max_tokens` 参数。

    :param temperature: 生成文本的随机性（可选）。
    :param max_tokens: 生成文本的最大 token 长度（可选）。
    """
    if temperature is not None:
      self.temperature = temperature
    if max_tokens is not None:
      self.max_tokens = max_tokens