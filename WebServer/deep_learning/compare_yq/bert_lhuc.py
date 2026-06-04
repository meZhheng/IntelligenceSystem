import torch
import torch.nn as nn
import re
import os
from datasets import Dataset
from transformers import (
    BertPreTrainedModel, BertModel, BertTokenizerFast,
    TrainingArguments, Trainer, DataCollatorWithPadding
)
from sklearn.metrics import accuracy_score, classification_report


class BertForEmotion(BertPreTrainedModel):
    """无LHUC的BERT模型：仅情感分类"""

    def __init__(self, config):
        super().__init__(config)
        self.config = config

        # 加载预训练BERT骨干
        self.bert = BertModel(config)

        # 情感分类头（三分类）
        self.emotion_classifier = nn.Sequential(
            nn.Dropout(config.hidden_dropout_prob),
            nn.Linear(config.hidden_size, 3)  # 情感三分类
        )

        self.post_init()  # 初始化权重

    def forward(
            self,
            input_ids=None,
            attention_mask=None,
            token_type_ids=None,
            emotion_labels=None
    ):
        # 获取BERT所有层的输出
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
            output_hidden_states=True  # 返回所有层的隐藏状态
        )
        hidden_states = outputs.hidden_states  # tuple(13,)，第0层是embedding

        # 直接使用原始特征（不经过LHUC调整）
        emotion_features = []
        for layer_idx in range(9, 13):  # 取1~12层Transformer输出
            # 直接取该层[CLS]特征，不做缩放和偏置
            layer_feat = hidden_states[layer_idx]
            emotion_features.append(layer_feat[:, 0, :])  # 取[CLS]
        emotion_cls = torch.mean(torch.stack(emotion_features), dim=0)  # 平均12层特征
        emotion_logits = self.emotion_classifier(emotion_cls)

        # 计算损失 - 使用加权损失函数
        loss = None
        if emotion_labels is not None:
            # 为中立类设置更高的权重（消极:1.0, 中立:1.5, 积极:1.0）
            # 可根据实际数据分布调整权重值
            class_weights = torch.tensor([1.0, 2.0, 1.0], device=self.device)
            loss_fct = nn.CrossEntropyLoss(weight=class_weights)
            loss = loss_fct(emotion_logits.view(-1, 3), emotion_labels.view(-1))

        return {
            "loss": loss,
            "emotion_logits": emotion_logits
        }


# 以下数据处理、评估指标、主函数部分与原代码一致，仅模型加载处需修改
def clean_text(text):
    """清洗文本保留中英文字符和关键标点"""
    text = re.sub(r"http\S+", "", text)  # 去除URL
    text = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9。，！？；：,.!?;:\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) > 5 else ""  # 过滤过短文本


def load_emotion_data(file_path):
    """加载情感数据（格式：文本,情感标签），并将文本标签转换为0/1/2"""
    label_mapping = {
        "消极": 0,
        "中立": 1,
        "积极": 2
    }

    texts, emotion_labels = [], []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line:
                continue
            parts = line.strip('\n').split('\t')
            if len(parts) != 2:
                continue
            text, emo_label_text = parts[0], parts[1]

            cleaned_text = clean_text(text)
            if not cleaned_text:
                continue

            if emo_label_text in label_mapping:
                emotion_labels.append(label_mapping[emo_label_text])
                texts.append(cleaned_text)

    dataset = Dataset.from_dict({
        "text": texts,
        "emotion_label": emotion_labels
    })
    return dataset.train_test_split(test_size=0.2, shuffle=True, seed=42)


def preprocess_function(examples, tokenizer, max_length=128):
    """分词处理函数"""
    tokenized = tokenizer(
        examples["text"],
        truncation=True,
        max_length=max_length,
        padding="max_length",
        return_attention_mask=True,
        return_token_type_ids=True
    )
    tokenized["emotion_labels"] = examples["emotion_label"]
    return tokenized


def compute_metrics(eval_pred):
    """计算情感分类评估指标"""
    emotion_logits = eval_pred.predictions

    if len(emotion_logits.shape) == 1:
        emotion_logits = emotion_logits.reshape(-1, 3)
    elif len(emotion_logits.shape) == 3 and emotion_logits.shape[0] == 1:
        emotion_logits = emotion_logits.squeeze(0)

    labels = eval_pred.label_ids
    emotion_preds = emotion_logits.argmax(axis=1)

    accuracy = accuracy_score(labels, emotion_preds)
    report = classification_report(
        labels,
        emotion_preds,
        target_names=["消极", "中立", "积极"],
        output_dict=True
    )

    return {
        "emotion_accuracy": accuracy,
        "negative_precision": report["消极"]["precision"],
        "negative_recall": report["消极"]["recall"],
        "negative_f1": report["消极"]["f1-score"],
        "neutral_precision": report["中立"]["precision"],
        "neutral_recall": report["中立"]["recall"],
        "neutral_f1": report["中立"]["f1-score"],
        "positive_precision": report["积极"]["precision"],
        "positive_recall": report["积极"]["recall"],
        "positive_f1": report["积极"]["f1-score"],
        "macro_avg_f1": report["macro avg"]["f1-score"],
        "weighted_avg_f1": report["weighted avg"]["f1-score"]
    }


def main():
    config = {
        "pretrained_model_path": "./multilingual_domain_bert/final",
        "data_path": "./label_20251102_filtered.txt",
        "output_dir": "./no_lhuc_emotion_results_v3",  # 修改输出目录，避免覆盖
        "max_length": 512,
        "num_train_epochs": 5,
        "per_device_train_batch_size": 8,
        "per_device_eval_batch_size": 8,
        "learning_rate": 1.5e-5,  # 学习率从3e-5降至2e-5
        "logging_steps": 100,
        "save_steps": 400,
        "eval_steps": 200,
        "hidden_dropout_prob": 0.5
    }

    tokenizer = BertTokenizerFast.from_pretrained(config["pretrained_model_path"])

    raw_datasets = load_emotion_data(config["data_path"])
    tokenized_datasets = raw_datasets.map(
        lambda x: preprocess_function(x, tokenizer, config["max_length"]),
        batched=True,
        remove_columns=["text", "emotion_label"]
    )

    # 加载修改后的无LHUC模型
    model = BertForEmotion.from_pretrained(config["pretrained_model_path"])
    print(f"成功加载无LHUC的模型: {config['pretrained_model_path']}")

    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    training_args = TrainingArguments(
        output_dir=config["output_dir"],
        overwrite_output_dir=True,
        num_train_epochs=config["num_train_epochs"],
        per_device_train_batch_size=config["per_device_train_batch_size"],
        per_device_eval_batch_size=config["per_device_eval_batch_size"],
        learning_rate=config["learning_rate"],
        weight_decay=0.2,
        warmup_steps=500,  # 减少warmup步数，延长余弦退火周期
        logging_dir=f"{config['output_dir']}/logs",
        logging_steps=config["logging_steps"],
        save_steps=config["save_steps"],
        eval_steps=config["eval_steps"],
        eval_strategy="steps",
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="emotion_accuracy",
        fp16=torch.cuda.is_available(),
        # 配置余弦退火学习率调度器
        lr_scheduler_type="cosine_with_restarts",
        # 启用梯度裁剪，设置裁剪阈值
        max_grad_norm=0.5,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["test"],
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )

    print("开始无LHUC的情感任务训练...")
    trainer.train()

    final_save_dir = f"{config['output_dir']}/final"
    model.save_pretrained(final_save_dir)
    tokenizer.save_pretrained(final_save_dir)
    print(f"训练完成，模型保存至: {final_save_dir}")

    print("最终评估结果:")
    eval_results = trainer.evaluate()
    print(eval_results)


if __name__ == "__main__":
    main()