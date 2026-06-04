import torch
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from datasets import Dataset, DatasetDict
from transformers import (
    XLMRobertaTokenizer,  # 替换 XLMRobertaTokenizerFast
    BertTokenizer,  # 中文 RoBERTa
    DebertaV2Tokenizer,  # mDeBERTa
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding,
    EarlyStoppingCallback
)

CONFIG = {
    "data_path": "./label_20251102_10bt150.txt",
    # 模型选择：以下4个模型任选其一，取消注释即可
    "model_name": "cardiffnlp/twitter-xlm-roberta-base-sentiment",  # 多语言情感
    # "model_name": "hfl/chinese-roberta-wwm-ext",  # 中文专用
    # "model_name": "mrm8488/distilxlm-roberta-base-sentiment-3-class",  # 轻量化多语言情感
    # "model_name": "facebook/mdeberta-v3-base",  # 高性能多语言
    "num_labels": 3,
    "label_mapping": {"消极": 0, "中立": 1, "积极": 2},
    "max_length": 150,
    "batch_size": 16,
    "learning_rate": 1e-5,
    "num_epochs": 8,
    "output_dir": "./emotion_finetune_best_model",
    "seed": 42
}

if "chinese-roberta" in CONFIG["model_name"]:
    CONFIG["max_length"] = 128
    CONFIG["batch_size"] = 32
    CONFIG["learning_rate"] = 2e-5
elif "distil" in CONFIG["model_name"]:
    CONFIG["batch_size"] = 32
    CONFIG["learning_rate"] = 1.5e-5
elif "mdeberta" in CONFIG["model_name"]:
    CONFIG["learning_rate"] = 1e-5
    CONFIG["max_grad_norm"] = 0.5


def get_tokenizer(model_name):
    if "xlm-roberta" in model_name or "distilxlm" in model_name:
        # XLM-RoBERTa 系列使用 XLMRobertaTokenizer（慢速版）
        return XLMRobertaTokenizer.from_pretrained(model_name, use_fast=False)
    elif "chinese-roberta" in model_name:
        # 中文 RoBERTa 使用 BertTokenizer（慢速版）
        return BertTokenizer.from_pretrained(model_name, use_fast=False)
    elif "mdeberta" in model_name:
        # mDeBERTa 使用 DebertaV2Tokenizer（慢速版）
        return DebertaV2Tokenizer.from_pretrained(model_name, use_fast=False)
    else:
        raise ValueError(f"未支持的模型：{model_name}")


def load_and_process_data(data_path):
    texts, labels = [], []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            text, label = line.split("\t")
            texts.append(text)
            labels.append(CONFIG["label_mapping"][label])

    # 分层划分训练/测试集
    train_texts, test_texts, train_labels, test_labels = train_test_split(
        texts, labels, test_size=0.2, shuffle=True, random_state=CONFIG["seed"], stratify=labels
    )

    # 转换为Dataset格式
    dataset_dict = DatasetDict({
        "train": Dataset.from_dict({"text": train_texts, "label": train_labels}),
        "test": Dataset.from_dict({"text": test_texts, "label": test_labels})
    })

    # 修复：使用指定的分词器（禁用快速分词器）
    tokenizer = get_tokenizer(CONFIG["model_name"])

    # 分词函数（保持不变）
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=CONFIG["max_length"],
            padding="max_length" if CONFIG["batch_size"] > 1 else False,
            return_attention_mask=True,
            return_token_type_ids=("chinese-roberta" in CONFIG["model_name"])  # 仅BERT类模型需要token_type_ids
        )

    # 批量分词
    tokenized_datasets = dataset_dict.map(
        tokenize_function,
        batched=True,
        remove_columns=["text"]
    )
    tokenized_datasets.set_format("torch", columns=["input_ids", "attention_mask", "label"])

    print(f"数据加载完成！训练集：{len(tokenized_datasets['train'])} 条，测试集：{len(tokenized_datasets['test'])} 条")
    return tokenized_datasets, tokenizer


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = logits.argmax(axis=1)

    accuracy = accuracy_score(labels, preds)
    report = classification_report(
        labels, preds, target_names=["消极", "中立", "积极"], output_dict=True
    )

    return {
        "accuracy": accuracy,
        "macro_f1": report["macro avg"]["f1-score"],
        "weighted_f1": report["weighted avg"]["f1-score"],
        "negative_f1": report["消极"]["f1-score"],
        "neutral_f1": report["中立"]["f1-score"],
        "neutral_recall": report["中立"]["recall"],
        "positive_f1": report["积极"]["f1-score"]
    }


def train_model():
    tokenized_datasets, tokenizer = load_and_process_data(CONFIG["data_path"])

    model = AutoModelForSequenceClassification.from_pretrained(
        CONFIG["model_name"],
        num_labels=CONFIG["num_labels"],
        ignore_mismatched_sizes=True,
        device_map="auto"
    )

    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    training_args = TrainingArguments(
        output_dir=CONFIG["output_dir"],
        overwrite_output_dir=True,
        num_train_epochs=CONFIG["num_epochs"],
        per_device_train_batch_size=CONFIG["batch_size"],
        per_device_eval_batch_size=CONFIG["batch_size"] * 2,
        learning_rate=CONFIG["learning_rate"],
        weight_decay=0.1 if "chinese-roberta" in CONFIG["model_name"] else 0.05,
        warmup_steps=30 if "distil" in CONFIG["model_name"] else 50,
        logging_dir=f"{CONFIG['output_dir']}/logs",
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=30 if "sentiment" in CONFIG["model_name"] else 50,
        save_strategy="steps",
        save_steps=30 if "sentiment" in CONFIG["model_name"] else 50,
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="neutral_f1",
        greater_is_better=True,
        fp16=torch.cuda.is_available(),
        max_grad_norm=CONFIG.get("max_grad_norm", 1.0),
        lr_scheduler_type="cosine" if "sentiment" in CONFIG["model_name"] else "cosine_with_restarts",
        seed=CONFIG["seed"]
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["test"],
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
    )

    # 6. 训练
    print(f"开始微调模型：{CONFIG['model_name']}")
    trainer.train()

    # 7. 最终评估
    print("\n===== 最终测试集评估结果 =====")
    final_metrics = trainer.evaluate()
    for key, value in final_metrics.items():
        if "eval_" in key:
            print(f"{key.replace('eval_', '')}: {value:.4f}")

    # 8. 保存模型
    best_model_dir = f"{CONFIG['output_dir']}/best_model"
    trainer.save_model(best_model_dir)
    tokenizer.save_pretrained(best_model_dir)
    print(f"\n最佳模型已保存至：{best_model_dir}")


def predict(text, model_dir):
    """预测时：直接从模型目录加载保存好的分词器，无需判断模型名称"""
    # 修复：用AutoTokenizer加载保存的分词器（自动匹配模型类型）
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval().to(torch.device("cuda" if torch.cuda.is_available() else "cpu"))

    inputs = tokenizer(
        text,
        truncation=True,
        max_length=CONFIG["max_length"],
        padding="max_length",
        return_tensors="pt"
    ).to(model.device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        pred_id = logits.argmax(dim=1).item()

    reverse_label_mapping = {v: k for k, v in CONFIG["label_mapping"].items()}
    return reverse_label_mapping[pred_id]


# ===================== 主函数 =====================
if __name__ == "__main__":
    # train_model()  # 训练完成后可注释，避免重复训练

    # 测试预测（训练完成后执行）
    test_texts = [
        "这款产品质量很差，完全不符合预期，不推荐购买。",
        "产品中规中矩，没有特别的亮点，也没有明显的缺点。",
        "超出预期的好用，功能强大，体验感极佳！"
    ]
    best_model_path = f"{CONFIG['output_dir']}/best_model"
    for text in test_texts:
        pred = predict(text, best_model_path)
        print(f"\n测试文本：{text}")
        print(f"预测情感：{pred}")