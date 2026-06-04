import torch
import pandas as pd
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder
from torch.optim import AdamW
from tqdm import tqdm
import json
from deep_learning.base_model import BaseModel
import re
from dataclasses import dataclass
from typing import Dict, Generator, List, Any
from typing import Generator, Dict, Optional
from openai import OpenAI
import json
from json import JSONDecodeError,JSONDecoder
from typing import Generator
from datetime import datetime

# 配置参数
MAX_LEN = 128
BATCH_SIZE = 32
EPOCHS = 5
LR = 5e-6
MODEL_NAME = "/webfile/checkpoints/chinese-xlnet-mid"
device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")

# 先写一个映射字典
num2str = {0: "负向", 1: "正向"}

# fit 中文标签
label_encoder = LabelEncoder().fit(["负向", "正向"])


def sanitize(obj):
    if isinstance(obj, dict):
        return {sanitize(k): sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize(x) for x in obj]
    elif hasattr(obj, 'item') and not isinstance(obj, str):
        return obj.item()
    else:
        return obj

# 数据集类
class SentimentDataset(Dataset):
    def __init__(self, df, tokenizer):
        self.texts = df["review"].tolist()
        str_labels = df["label"].astype(int).map(num2str).tolist()
        self.labels = label_encoder.transform(str_labels)
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            max_length=MAX_LEN,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "labels": torch.tensor(self.labels[idx], dtype=torch.long)
        }

# 模型类
class XLNetSentimentClassifier(torch.nn.Module, BaseModel):
    def __init__(self, model_path="/webfile/checkpoints/sentiment/xlnet_sentiment_model.pth", device=device, max_len=MAX_LEN):
        super().__init__()
        self.device = device
        self.max_len = max_len
        self.label_encoder = label_encoder
        
        # 初始化模型组件
        self.xlnet = AutoModel.from_pretrained(MODEL_NAME).to(device)
        self.dropout = torch.nn.Dropout(0.1)
        self.classifier = torch.nn.Linear(self.xlnet.config.hidden_size, 2).to(device)
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        
        # 加载预训练权重
        if model_path:
            self.load_state_dict(torch.load(model_path, map_location=device))
        # 初始化推理服务
        self.client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.llm_model = "qwen-max"
        
        self.to(device)

    @staticmethod
    def get_required_fields() -> List[str]:
        return ['text']

    def forward(self, input_ids, attention_mask, **kwargs):
        outputs = self.xlnet(input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, -1, :]
        return self.classifier(self.dropout(pooled))

    def train_model(self, dataloaders, optimizer, epochs=EPOCHS):
        criterion = torch.nn.CrossEntropyLoss()
        for epoch in range(epochs):
            print(f"Epoch {epoch+1}/{epochs}")
            self._train_epoch(dataloaders['train'], optimizer, criterion)
            val_report = self.evaluate(dataloaders['val'])
            print("Validation Report:\n", pd.DataFrame(val_report).transpose())

    def _train_epoch(self, dataloader, optimizer, criterion):
        self.train()
        total_loss = 0
        for batch in tqdm(dataloader, desc="Training"):
            optimizer.zero_grad()
            
            inputs = batch["input_ids"].to(self.device)
            masks = batch["attention_mask"].to(self.device)
            labels = batch["labels"].to(self.device)
            
            outputs = self(inputs, masks)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
        print(f"Train Loss: {total_loss/len(dataloader):.4f}")

    def evaluate(self, dataloader):
        self.eval()
        all_preds, all_labels = [], []
        step = 0
        with torch.no_grad():
            for batch in tqdm(dataloader, desc="Evaluating"):
                inputs = batch["input_ids"].to(self.device)
                masks = batch["attention_mask"].to(self.device)
                labels = batch["labels"].cpu().numpy()
                
                outputs = self(inputs, masks)
                preds = torch.argmax(outputs, dim=1).cpu().numpy()

                # 互换 0<->1
                preds = 1 - preds

                
                all_preds.extend(preds)
                all_labels.extend(labels)
                step += 1
                yield step

        yield (all_preds, all_labels)


    def get_total_steps(self):
        test_df = pd.read_csv("/webfile/test_data/split_data/weibo_test.csv")

        # 初始化组件
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        test_loader = DataLoader(SentimentDataset(test_df, tokenizer), batch_size=BATCH_SIZE)

        return len(test_loader)
    
    def test_model(self):
        # report = self.evaluate(test_loader)
        # print("\nTest Report:")
        # print(pd.DataFrame(report).transpose())
        # return report
        test_df = pd.read_csv("/webfile/test_data/split_data/weibo_test.csv")

        # 初始化组件
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        test_loader = DataLoader(SentimentDataset(test_df, tokenizer), batch_size=BATCH_SIZE)
        return self.evaluate(test_loader)

    def predict(self, inputs):
        if isinstance(inputs, list) and all(isinstance(item, dict) for item in inputs):
            texts = [item['text'] for item in inputs]
        else:
            texts = [inputs['text']]

        self.eval()
        results = []
        for item in texts:
            encoding = self._preprocess_input(item)
            probs = self._get_predictions(encoding)
            prediction = self._format_prediction(probs)
            
            results.append({
                "prediction": prediction,
                "probabilities": dict(zip(label_encoder.classes_, probs)),
                "reasoning": self._generate_reasoning(item, prediction)
            })

        if len(results) == 1:
            result = sanitize(results[0])
            return result

        return results

    def _preprocess_input(self, text):
        return self.tokenizer(
            text,
            max_length=self.max_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        ).to(self.device)

    def _get_predictions(self, encoding):
        with torch.no_grad():
            outputs = self(**encoding)
            return torch.softmax(outputs, dim=1).cpu().numpy()[0]

    def _format_prediction(self, probs):
        f_label_encoder = LabelEncoder().fit(["负向", "正向"])
        return f_label_encoder.inverse_transform([probs.argmax()])[0]

    def _generate_reasoning(self, text, prediction):
        system_prompt = """请严格使用以下JSON格式返回结果：
        {
            "text": "输入文本",
            "prediction": "正面/负面/中立",
            "reasoning": "生成的理由",
        }
        请确保输出是有效的JSON，不要包含换行符等特殊字符、注释或额外文本。"""
        prompt = f"请给出{text}的情感分析为{prediction}的理由。"
        response = self.client.chat.completions.create(
            model=self.llm_model,
            
            messages=[{ "role": "system", "content": system_prompt },
                    { "role": "user", "content": prompt }],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        clean_reasoning = data["reasoning"].strip().replace('\n', ' ')
        return clean_reasoning

# 使用示例
if __name__ == "__main__":
    # 加载数据
    train_df = pd.read_csv("./split_data/weibo_train.csv")
    val_df = pd.read_csv("./split_data/weibo_val.csv")
    test_df = pd.read_csv("./split_data/weibo_test.csv")

    # 初始化组件
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    dataloaders = {
        "train": DataLoader(SentimentDataset(train_df, tokenizer), batch_size=BATCH_SIZE, shuffle=True),
        "val": DataLoader(SentimentDataset(val_df, tokenizer), batch_size=BATCH_SIZE)
    }
    test_loader = DataLoader(SentimentDataset(test_df, tokenizer), batch_size=BATCH_SIZE)

    # 训练流程
    model = XLNetSentimentClassifier().to(device)
    optimizer = AdamW(model.parameters(), lr=LR)
    
    model.train_model(dataloaders, optimizer)
    model.test(test_loader)
    
    # 保存模型
    torch.save(model.state_dict(), "xlnet_sentiment_model.pth")
    
    # 预测示例
    test_input = {"text": "这家餐厅的菜品非常美味，服务也很周到！"}
    result = model.predict(test_input)
    print("\nPrediction Result:", result)


# import torch
# import pandas as pd
# from torch.utils.data import Dataset, DataLoader
# from transformers import AutoTokenizer, AutoModel
# from sklearn.metrics import classification_report
# from torch.optim import AdamW
# from tqdm import tqdm

# # 配置参数
# MAX_LEN = 128
# BATCH_SIZE = 32
# EPOCHS = 5
# LR = 5e-6
# MODEL_NAME = "chinese-xlnet-mid"
# device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")

# # 情感数据集类
# class SentimentDataset(Dataset):
#     def __init__(self, df, tokenizer):
#         self.texts = df["review"].tolist()
#         self.labels = df["label"].values  # 直接使用数值标签
#         self.tokenizer = tokenizer

#     def __len__(self):
#         return len(self.texts)

#     def __getitem__(self, idx):
#         encoding = self.tokenizer(
#             self.texts[idx],
#             max_length=MAX_LEN,
#             padding="max_length",
#             truncation=True,
#             return_tensors="pt"
#         )
#         return {
#             "input_ids": encoding["input_ids"].squeeze(),
#             "attention_mask": encoding["attention_mask"].squeeze(),
#             "labels": torch.tensor(self.labels[idx], dtype=torch.long)
#         }

# # 模型定义（保持类似结构）
# class XLNetSentimentClassifier(torch.nn.Module):
#     def __init__(self):
#         super().__init__()
#         self.xlnet = AutoModel.from_pretrained(MODEL_NAME)
#         self.dropout = torch.nn.Dropout(0.1)
#         self.classifier = torch.nn.Linear(self.xlnet.config.hidden_size, 2)  # 二分类

#     def forward(self, input_ids, attention_mask):
#         outputs = self.xlnet(input_ids, attention_mask=attention_mask)
#         pooled = outputs.last_hidden_state[:, -1, :]  # 取最后位置表征
#         pooled = self.dropout(pooled)
#         return self.classifier(pooled)

# # 训练函数（保持相同结构）
# def train(model, dataloaders, optimizer):
#     model.train()
#     criterion = torch.nn.CrossEntropyLoss()
    
#     for epoch in range(EPOCHS):
#         print(f"Epoch {epoch+1}/{EPOCHS}")
#         total_loss = 0
#         for batch in tqdm(dataloaders['train'], desc="Training..."):
#             optimizer.zero_grad()
            
#             inputs = {
#                 "input_ids": batch["input_ids"].to(device),
#                 "attention_mask": batch["attention_mask"].to(device)
#             }
#             labels = batch["labels"].to(device)
            
#             outputs = model(**inputs)
#             loss = criterion(outputs, labels)
#             loss.backward()
#             optimizer.step()
            
#             total_loss += loss.item()
        
#         # 验证阶段
#         val_report = evaluate(model, dataloaders['val'])
#         print(f"Train Loss: {total_loss/len(dataloaders['train']):.4f}")
#         print("Validation Report:\n", classification_report(
#             val_report["true_labels"],
#             val_report["pred_labels"],
#             target_names=["负向", "正向"],
#             digits=4
#         ))

# # 评估函数（适配二分类）
# def evaluate(model, dataloader):
#     model.eval()
#     all_preds, all_labels = [], []
    
#     with torch.no_grad():
#         for batch in tqdm(dataloader):
#             inputs = {
#                 "input_ids": batch["input_ids"].to(device),
#                 "attention_mask": batch["attention_mask"].to(device)
#             }
#             labels = batch["labels"].cpu().numpy()
            
#             outputs = model(**inputs)
#             preds = torch.argmax(outputs, dim=1).cpu().numpy()
            
#             all_preds.extend(preds)
#             all_labels.extend(labels)
    
#     return {
#         "true_labels": all_labels,
#         "pred_labels": all_preds,
#         "report": classification_report(all_labels, all_preds, target_names=["负向", "正向"], output_dict=True)
#     }

# # 测试函数
# def test(model, test_loader):
#     results = evaluate(model, test_loader)
#     print("\nTest Report:")
#     print(pd.DataFrame(results["report"]).transpose())

# # 预测接口（简化版）
# class SentimentPredictor:
#     def __init__(self, model_path):
#         self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
#         self.model = XLNetSentimentClassifier().to(device)
#         self.model.load_state_dict(torch.load(model_path))
#         self.model.eval()
    
#     def predict(self, text):
#         encoding = self.tokenizer(
#             text,
#             max_length=MAX_LEN,
#             padding="max_length",
#             truncation=True,
#             return_token_type_ids=False,  # 关键修改
#             return_tensors="pt"
#         ).to(device)
        
#         with torch.no_grad():
#             outputs = self.model(**encoding)
#             probs = torch.softmax(outputs, dim=1)
        
#         return {
#             "prediction": "正向" if probs.argmax().item() == 1 else "负向",
#             "confidence": probs.max().item()
#         }

# # 使用示例
# if __name__ == "__main__":
#     # # 加载数据（假设已经划分）
#     # 加载已拆分的数据
#     train_df = pd.read_csv("./split_data/weibo_train.csv")
#     val_df = pd.read_csv("./split_data/weibo_val.csv")
#     test_df = pd.read_csv("./split_data/weibo_test.csv")
    
#     # 打印加载结果验证
#     print("\n已加载拆分数据集:")
#     print(f"训练集样本数: {len(train_df):,}")
#     print(f"验证集样本数: {len(val_df):,}")
#     print(f"测试集样本数: {len(test_df):,}")

#     # 初始化组件
#     tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
#     dataloaders = {
#         "train": DataLoader(SentimentDataset(train_df, tokenizer), batch_size=BATCH_SIZE, shuffle=True),
#         "val": DataLoader(SentimentDataset(val_df, tokenizer), batch_size=BATCH_SIZE)
#     }
#     test_loader = DataLoader(SentimentDataset(test_df, tokenizer), batch_size=BATCH_SIZE)

#     # 训练流程
#     model = XLNetSentimentClassifier().to(device)
#     optimizer = AdamW(model.parameters(), lr=LR)
    
#     train(model, dataloaders, optimizer)
#     test(model, test_loader)
    
#     # 保存模型
#     torch.save(model.state_dict(), "xlnet_sentiment_model.pth")
    
#     # 预测示例
#     predictor = SentimentPredictor("xlnet_sentiment_model.pth")
#     result = predictor.predict("这家餐厅的菜品非常美味，服务也很周到！")
#     print("\nPrediction Result:", result)
#     # Prediction Result: {'prediction': '正向', 'confidence': 0.9937157034873962}