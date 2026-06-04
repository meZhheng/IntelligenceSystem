import os
import re
import json
from functools import lru_cache
from typing import List, Dict, Optional, Any
from threading import Lock
import torch
from flask import Blueprint, jsonify, request, current_app
from transformers import AutoTokenizer, AutoModelForCausalLM
from werkzeug.exceptions import BadRequest

# 全局模型缓存和锁
model_cache = {}
model_lock = Lock()
DEFAULT_MODEL_DIR = "checkpoints/qwen_saved_models"

# 默认配置（安全值，生产环境应通过环境变量配置）
DEFAULT_CONFIG = {
    "emotion_categories": ["积极", "消极", "中立"],
    "stance_categories": ["支持", "反对", "中立"],
    "model_choice": "qwen3.5-0.8B",
    "model_paths": {
        "qwen3.5-0.8B": os.path.join(DEFAULT_MODEL_DIR, "qwen3.5-0.8B"),
        "qwen3.5-2B": os.path.join(DEFAULT_MODEL_DIR, "qwen3.5-2B"),
        "qwen3.5-9B": os.path.join(DEFAULT_MODEL_DIR, "qwen3.5-9B"),
    },
    "generation_params": {
        "max_new_tokens": 1024,  # 降低最大token数以提高性能
        "temperature": 0.3,
        "top_p": 0.7,
        "top_k": 20,
        "do_sample": False
    },
    "min_text_length": 5,
    "max_text_length": 500,
    "device": "cuda" if torch.cuda.is_available() else "cpu",
    "max_batch_size": 10  # 限制单次请求最大文本数量
}

# 配置参数白名单（允许前端修改的参数）
CONFIG_WHITELIST = {
    "generation_params": ["temperature", "top_p", "top_k", "do_sample"],
    "text_limits": ["min_text_length", "max_text_length"]
}

def validate_config(user_config: Dict[str, Any]) -> Dict[str, Any]:
    """验证并清理用户提供的配置参数"""
    safe_config = {}
    
    # 验证generation_params
    gen_params = user_config.get("generation_params", {})
    safe_gen_params = {}
    for param, value in gen_params.items():
        if param not in CONFIG_WHITELIST["generation_params"]:
            continue
            
        # 类型和范围验证
        if param == "temperature":
            if not isinstance(value, (int, float)) or not (0.1 <= value <= 1.0):
                continue
            safe_gen_params[param] = float(value)
        
        elif param == "top_p":
            if not isinstance(value, (int, float)) or not (0.1 <= value <= 1.0):
                continue
            safe_gen_params[param] = float(value)
        
        elif param == "top_k":
            if not isinstance(value, int) or not (1 <= value <= 100):
                continue
            safe_gen_params[param] = int(value)
        
        elif param == "do_sample":
            if not isinstance(value, bool):
                continue
            safe_gen_params[param] = bool(value)
    
    if safe_gen_params:
        safe_config["generation_params"] = safe_gen_params
    
    # 验证文本长度限制
    text_limits = {}
    for param in CONFIG_WHITELIST["text_limits"]:
        value = user_config.get(param)
        if value is None:
            continue
        
        if not isinstance(value, int):
            continue
            
        # 设置合理范围
        if param == "min_text_length" and 1 <= value <= 50:
            text_limits[param] = value
        elif param == "max_text_length" and 50 <= value <= 500:
            text_limits[param] = value
    
    safe_config.update(text_limits)
    
    return safe_config


def load_model(model_choice):
    """线程安全的模型加载，仅从本地加载"""
    with model_lock:
        if model_choice in model_cache:
            return model_cache[model_choice]
        
        model_path = DEFAULT_CONFIG["model_paths"][model_choice]
        
        if not os.path.exists(model_path) or not os.listdir(model_path):
            raise FileNotFoundError(f"本地模型不存在: {model_path}. 请先下载模型到该目录")
        
        try:
            print(f"加载本地Qwen模型: {model_path}")
            tokenizer = AutoTokenizer.from_pretrained(
                model_path,
                trust_remote_code=True,
                padding_side="right"
            )
            
            # 确保tokenizer有pad_token
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                trust_remote_code=True,
                torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None
            )
            
            model.eval()
            print(f"模型加载成功! 设备: {next(model.parameters()).device}")
            
            # 缓存模型
            model_cache[model_choice] = (tokenizer, model)
            return tokenizer, model
            
        except Exception as e:
            print(f"模型加载失败: {str(e)}")
            raise RuntimeError(f"模型加载失败: {str(e)}") from e

def preprocess_text(text, min_len, max_len):
    """预处理文本，过滤无效内容"""
    if not isinstance(text, str) or not text.strip():
        return None
    
    text = text.strip()
    text_len = len(text)
    
    if text_len < min_len:
        return None
    if text_len > max_len:
        text = text[:max_len]
    
    # 移除特殊字符，保留中文、英文、数字和基本标点
    return text if text else None

def _try_extract_json(content: str):
    """
    尝试从模型输出中提取第一个 JSON 对象并返回 dict，
    失败时返回 None。
    """
    # 找到第一个 { 和最后一个 } 的子串，尝试解析。
    start = content.find('{')
    end = content.rfind('}')
    if start != -1 and end != -1 and end > start:
        sub = content[start:end+1]
        try:
            return json.loads(sub)
        except Exception:
            # 可能是单引号或中文引号，尝试替换为标准引号再解析
            try:
                normalized = sub.replace("'", '"').replace('，', ',').replace('：', ':')
                return json.loads(normalized)
            except Exception:
                return None
    return None

def predict_emotion(text, tokenizer, model, config):
    """情感分析预测
    返回: dict {"label": str, "raw": str, "score": float|None}
    """
    system_prompt = (
        "你是情感分类器（用于机器调用）。仅允许三类：积极、消极、中立。\n"
        "无论用户文本是什么语言，你的所有回复必须使用中文。\n"
        "严格输出一个可解析的 JSON 对象（仅一行或几行 JSON），格式必须完全遵守：\n"
        '{"label":"<积极|消极|中立>","reason":"<1-2句中文简短判定依据，包含支持该判断的关键词或文本证据，不超过80字>"}\n'
        "不要输出任何除这个 JSON 之外的文字、说明或多余标点。\n"
        "注意：label 字段必须是上述三个中文词之一（完全一致）。"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"文本：{text}\n请按要求输出。"}
    ]

    chat_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False
    )

    model_inputs = tokenizer(
        [chat_text],
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=1024
    ).to(model.device)

    gen_params = config.get("generation_params", DEFAULT_CONFIG["generation_params"])

    with torch.no_grad():
        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=gen_params["max_new_tokens"],
            temperature=gen_params["temperature"],
            top_p=gen_params["top_p"],
            top_k=gen_params["top_k"],
            do_sample=gen_params["do_sample"],
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id
        )

    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):]
    content = tokenizer.decode(output_ids, skip_special_tokens=True).strip()

    # 尝试 JSON 解析优先
    parsed = _try_extract_json(content)
    label = None
    reason_text = content  # 默认 raw 为整个模型输出

    if parsed:
        label = parsed.get("label")
        reason_text = parsed.get("reason", content)
    else:
        # 原有的清洗与关键词回退策略（保留，作为回退）
        cleaned_content = re.sub(r'\s+', '', content)
        emotion_categories = config.get("emotion_categories", DEFAULT_CONFIG["emotion_categories"])
        for category in emotion_categories:
            if category in cleaned_content:
                label = category
                break

        if label is None:
            if any(word in text for word in ["好", "赞", "喜欢", "支持", "优秀", "满意"]):
                label = "积极"
            elif any(word in text for word in ["差", "糟", "讨厌", "反对", "垃圾", "失望"]):
                label = "消极"
            else:
                label = "中立"

    return {"label": label, "raw": reason_text, "score": None}


def predict_stance(text, target, tokenizer, model, config):
    """立场分析预测
    返回: dict {"label": str, "raw": str, "score": float|None}
    """
    system_prompt = (
        "你是立场分类器，用于判定文本对给定目标（target）的态度，仅允许三类：支持、反对、中立。\n"
        "无论用户文本是什么语言，你的所有回复必须使用中文。\n"
        "严格输出一个可解析的 JSON 对象（仅一行或几行 JSON），格式必须完全遵守：\n"
        '{"label":"<支持|反对|中立>","reason":"<1-2句中文简短判定依据，指出与目标相关的证据或关键词，不超过80字>"}\n'
        "不要输出任何除这个 JSON 之外的文字、说明或多余标点。\n"
        "注意：label 字段必须是上述三个中文词之一（完全一致）。"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"文本：{text}\n目标：{target}\n请按要求输出。"}
    ]

    chat_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False
    )

    model_inputs = tokenizer(
        [chat_text],
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=1024
    ).to(model.device)

    gen_params = config.get("generation_params", DEFAULT_CONFIG["generation_params"])

    with torch.no_grad():
        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=gen_params["max_new_tokens"],
            temperature=gen_params["temperature"],
            top_p=gen_params["top_p"],
            top_k=gen_params["top_k"],
            do_sample=gen_params["do_sample"],
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id
        )

    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):]
    content = tokenizer.decode(output_ids, skip_special_tokens=True).strip()

    parsed = _try_extract_json(content)
    label = None
    reason_text = content

    if parsed:
        label = parsed.get("label")
        reason_text = parsed.get("reason", content)
    else:
        cleaned_content = re.sub(r'\s+', '', content)
        stance_categories = config.get("stance_categories", DEFAULT_CONFIG["stance_categories"])
        for category in stance_categories:
            if category in cleaned_content:
                label = category
                break

        if label is None:
            if any(word in text for word in ["支持", "赞同", "肯定", "维护", "促进"]):
                label = "支持"
            elif any(word in text for word in ["反对", "抵制", "批评", "破坏", "损害"]):
                label = "反对"
            else:
                label = "中立"

    return {"label": label, "raw": reason_text, "score": None}