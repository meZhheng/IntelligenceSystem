import base64
import json
import torch
import pandas as pd
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from torch.optim import AdamW 
from tqdm import tqdm
import os
import time
import requests
from typing import Dict, Any, List
from openai import OpenAI
from PIL import Image
from dataclasses import dataclass
from sklearn.metrics import classification_report
from deep_learning.base_model import BaseModel

@dataclass
class MultiModalConfig:
    model_name: str = "/webfile/checkpoints/roberta-large"
    max_length: int = 256
    batch_size: int = 16
    epochs: int = 5
    lr: float = 1e-5
    label_names = ["negative", "neutral", "positive"]
    image_desc_path: str = "/webfile/checkpoints/sentiment/description_roberta.jsonl"
    model_save_path: str = "/webfile/checkpoints/sentiment/roberta_multi_modal_model.pth"
    tokenizer_args = None
    device: torch.device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")
    
    def __post_init__(self):
        self.tokenizer_args = {
            "use_fast": True,
            "add_prefix_space": True
        }

class MultiModalDataset(Dataset):
    def __init__(self, df, desc_map, tokenizer, config):
        self.df = df
        self.desc_map = desc_map
        self.tokenizer = tokenizer
        self.config = config

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        item = self.df.iloc[idx]
        image_desc = self.desc_map.get(item.image_id, "")
        text = f"{item.masked_text} </s> {item.target} </s> {image_desc}"
        
        encoding = self.tokenizer(
            text,
            max_length=self.config.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )
        
        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "label": torch.tensor(item.label, dtype=torch.long)
        }

class MultiModalSentimentClassifier(torch.nn.Module, BaseModel):
    def __init__(self):
        super().__init__()
        config = MultiModalConfig()
        self.config = config
        self.tokenizer = AutoTokenizer.from_pretrained(
            config.model_name,
            **config.tokenizer_args
        )
        self.model = AutoModelForSequenceClassification.from_pretrained(
            config.model_name, 
            num_labels=3,
            hidden_dropout_prob=0.2
        ).to(config.device)
        
        # Image processing components
        self.image_client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.image_model = "qwen-vl-max"
        self.desc_map = self._load_image_descriptions()
        self.test_dataset = None

    def _load_image_descriptions(self):
        desc_map = {}
        if os.path.exists(self.config.image_desc_path):
            with open(self.config.image_desc_path) as f:
                for line in f:
                    data = json.loads(line)
                    desc_map[data["image_name"]] = data["description"]
        return desc_map

    def forward(self, input_ids, attention_mask, labels=None):
        return self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels
        )

    def train_model(self, train_tsv: str, dev_tsv: str):
        train_df = self._load_dataframe(train_tsv)
        dev_df = self._load_dataframe(dev_tsv)
        
        train_loader = self._create_loader(train_df)
        dev_loader = self._create_loader(dev_df)
        
        optimizer = AdamW(self.parameters(), lr=self.config.lr, weight_decay=0.01)
        criterion = torch.nn.CrossEntropyLoss()

        best_acc = 0
        for epoch in range(self.config.epochs):
            print(f"Epoch {epoch+1}/{self.config.epochs}")
            train_loss = self._train_epoch(train_loader, optimizer, criterion)
            val_acc = self._evaluate(dev_loader)
            
            print(f"Train Loss: {train_loss:.4f} | Val Acc: {val_acc:.4f}")
            if val_acc > best_acc:
                best_acc = val_acc
                self.save_model()
                print("Saved best model!")

    def _load_dataframe(self, tsv_path: str):
        df = pd.read_csv(
            tsv_path, 
            sep='\t',
            header=None,
            skiprows=1,
            names=["index", "label", "image_id", "masked_text", "target"]
        )
        df["label"] = pd.to_numeric(df["label"], errors="coerce").fillna(0).astype(int)
        return df[df["label"].isin([0, 1, 2])]

    def _create_loader(self, df):
        dataset = MultiModalDataset(df, self.desc_map, self.tokenizer, self.config)
        return DataLoader(
            dataset,
            batch_size=self.config.batch_size,
            shuffle=True
        )

    def _train_epoch(self, loader, optimizer, criterion):
        self.train()
        total_loss = 0
        for batch in tqdm(loader, desc="Training"):
            optimizer.zero_grad()
            
            inputs = {
                "input_ids": batch["input_ids"].to(self.config.device),
                "attention_mask": batch["attention_mask"].to(self.config.device),
                "labels": batch["label"].to(self.config.device)
            }
            
            outputs = self(**inputs)
            loss = outputs.loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.parameters(), 1.0)
            optimizer.step()
            
            total_loss += loss.item()
        return total_loss / len(loader)

    def _evaluate(self, loader):
        self.eval()
        correct = 0
        total = 0
        
        with torch.no_grad():
            for batch in tqdm(loader, desc="Evaluating"):
                inputs = {
                    "input_ids": batch["input_ids"].to(self.config.device),
                    "attention_mask": batch["attention_mask"].to(self.config.device)
                }
                labels = batch["label"].to(self.config.device)
                
                outputs = self(**inputs)
                _, preds = torch.max(outputs.logits, dim=1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        
        return correct / total
    def get_total_steps(self):
        if not self.test_dataset:
            self.test_dataset = "/webfile/test_data/twitter2017/test.tsv"
            test_df = self._load_dataframe(self.test_dataset)
            test_loader = self._create_loader(test_df)

        return len(test_loader)
    
    def test_model(self):
        test_tsv = "/webfile/test_data/twitter2017/test.tsv"
        test_df = self._load_dataframe(test_tsv)
        test_loader = self._create_loader(test_df)
        self.model.load_state_dict(
            torch.load(
                self.config.model_save_path, 
                map_location=torch.device(self.config.device)
        ))
        true_labels, pred_labels = [], []
        # stream per-batch
        self.model.eval()
        for i, batch in enumerate(tqdm(test_loader, desc="Testing")):
            inputs = {
                "input_ids": batch["input_ids"].to(self.config.device),
                "attention_mask": batch["attention_mask"].to(self.config.device)
            }
            labels = batch["label"].cpu().numpy()
            with torch.no_grad():
                outputs = self.model(**inputs)
                preds = torch.argmax(outputs.logits, dim=1)
            true_labels.extend(labels)
            pred_labels.extend(preds.cpu().numpy())

            # if you want to yield progress step-by-step:
            yield i + 1
        # after loop, yield the final labels
        yield (pred_labels, true_labels)
    
    def get_class_names(self):
        return ['正向', '中性', '负向']


    def _evaluate_details(self, loader):
        """返回完整预测结果和真实标签"""
        self.eval()
        true_labels = []
        pred_labels = []
        step = 0
        with torch.no_grad():
            for batch in tqdm(loader, desc="Testing"):
                inputs = {
                    "input_ids": batch["input_ids"].to(self.config.device),
                    "attention_mask": batch["attention_mask"].to(self.config.device)
                }
                labels = batch["label"].cpu().numpy()
                
                outputs = self(**inputs)
                _, preds = torch.max(outputs.logits, dim=1)
                
                true_labels.extend(labels)
                pred_labels.extend(preds.cpu().numpy())
                step +=1
                yield step
        
        return true_labels, pred_labels
    

    def save_model(self):
        torch.save(self.state_dict(), self.config.model_save_path)

    def load_model(self):
        self.load_state_dict(torch.load(self.config.model_save_path))
        self.to(self.config.device)
        self.eval()

    def get_required_fields():
        return ['text', 'image_path', 'target']

    def predict(self, inputs: List[Dict]) -> List[Dict]:
        if not isinstance(inputs, list):
            inputs = [inputs]

        results = []
        for item in inputs:
            image_path = os.path.join('/uploads', 'images', str(item['dataset_id']), item['images'][0]['path'])
            image_desc = self._generate_image_desc(image_path)
            prediction = self._predict_sentiment(
                item["text"],
                item["target"],
                image_desc
            )
            results.append({
                "prediction": prediction["prediction"],
                "probabilities": prediction["probabilities"],
                "image_description": image_desc
            })
        return results

    def _generate_image_desc(self, image_path: str) -> str:
        """完整的图像描述生成实现"""
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
                    return desc_data.get("description", "")
                    
                except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
                    if attempt == 2:
                        raise
                    time.sleep(2 ** attempt)

        except Exception as e:
            print(f"图像描述生成失败: {str(e)}")
            return "无法生成图片描述"

        return ""

    def _predict_sentiment(self, masked_text: str, target: str, image_desc: str):
        text = f"{masked_text} </s> {target} </s> {image_desc}"
        encoding = self.tokenizer(
            text,
            max_length=self.config.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        ).to(self.config.device)
        
        with torch.no_grad():
            outputs = self(**encoding)
            probs = torch.softmax(outputs.logits, dim=1)
        
        return {
            "prediction": self.config.label_names[probs.argmax().item()],
            "probabilities": {
                label: probs[0][i].item() 
                for i, label in enumerate(self.config.label_names)
            }
        }

# 使用示例
if __name__ == "__main__":
    config = MultiModalConfig()
    model = MultiModalSentimentClassifier(config)
    
    # 训练流程
    model.train_model("twitter2017/train.tsv", "twitter2017/dev.tsv")
    test_results = model.test_model("twitter2017/test.tsv")
    # 预测示例
    model.load_model()
    results = model.predict([
        {
            "masked_text": "How $T$ is changing the influencer game",
            "target": "Jake Paul",
            "image_path": "visual/17_06_10389.jpg"
        }
    ])
    print(json.dumps(results, indent=2))