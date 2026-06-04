import torch
import pandas as pd
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModel
from sklearn.preprocessing import LabelEncoder
from torch.optim import AdamW
import pandas as pd
import re
from tqdm import tqdm
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
from deep_learning.base_model import BaseModel
# 配置参数
MAX_LEN = 128
BATCH_SIZE = 32
EPOCHS = 5
LR = 5e-6
# MODEL_NAME = "hfl/chinese-xlnet-mid"
MODEL_NAME = "/webfile/checkpoints/chinese-xlnet-mid"
device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")

# 标签编码
label_encoder = LabelEncoder().fit(["支持", "反对", "中立"])

def sanitize(obj):
    if isinstance(obj, dict):
        return {sanitize(k): sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize(x) for x in obj]
    elif hasattr(obj, 'item') and not isinstance(obj, str):
        return obj.item()
    else:
        return obj
    
# 增强数据集类
class StanceDataset(Dataset):
    def __init__(self, df, tokenizer):
        self.texts = df["Text"].tolist()
        self.targets = df["Target 1"].tolist()
        self.labels = label_encoder.transform(df["Stance 1"])
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        combined_text = f"{self.texts[idx]}[SEP]{self.targets[idx]}"
        encoding = self.tokenizer(
            combined_text,
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

class XLNetStanceClassifier2(torch.nn.Module, BaseModel):
    def __init__(self, model_path="/webfile/checkpoints/stance/covid_epidemic_subtask2.pth", device='cuda', max_len=128):
        super().__init__()
        self.device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")
        self.max_len = max_len
        self.label_encoder = LabelEncoder().fit(["支持", "反对", "中立"])
        # 初始化基础组件
        self.xlnet = AutoModel.from_pretrained(MODEL_NAME, local_files_only=True).to(self.device)
        self.dropout = torch.nn.Dropout(0.1)
        self.classifier = torch.nn.Linear(self.xlnet.config.hidden_size, 3).to(self.device)
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, local_files_only=True)
        
        # 加载预训练权重
        if model_path:
            self.load_state_dict(torch.load(model_path, map_location=self.device))
        
        # 初始化推理服务
        self.client = OpenAI(
            api_key="sk-0d9d541401854429b0d932a6f619af66",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.llm_model = "qwen-max"
        
        self.to(self.device)

    def get_required_fields() -> List[str]:
        return ['text', 'target']
    def forward(self, input_ids, attention_mask, **kwargs):
        outputs = self.xlnet(input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, -1, :]
        return self.classifier(self.dropout(pooled))

    def train_model(self, dataloaders, optimizer, epochs=10):
        criterion = torch.nn.CrossEntropyLoss()
        for epoch in range(epochs):
            print(f"Epoch {epoch+1}/{epochs}")
            self._train_epoch(dataloaders['train'], optimizer, criterion)
            val_report = self.evaluate(dataloaders['val'], self.label_encoder)
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

    def get_total_steps(self):
        test_df = pd.read_csv("/webfile/test_data/few_shot/covid_epidemic.csv")

        # 初始化组件
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        dataloader = DataLoader(StanceDataset(test_df, tokenizer), batch_size=BATCH_SIZE)
        return len(dataloader)
    def test_model(self):
        test_df = pd.read_csv("/webfile/test_data/few_shot/covid_epidemic.csv")

        # 初始化组件
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        dataloader = DataLoader(StanceDataset(test_df, tokenizer), batch_size=BATCH_SIZE)
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
                
                all_preds.extend(preds)
                all_labels.extend(labels)
                step += 1
                yield step 
        yield (all_preds, all_labels)
        # return classification_report(
        #     all_labels, all_preds,
        #     target_names=self.label_encoder.classes_,
        #     output_dict=True
        # )

    # def test_model(self):
    #     test_df = pd.read_csv("covid_epidemic/test.csv")

    #     # 初始化组件
    #     tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    #     test_loader = DataLoader(StanceDataset(test_df, tokenizer), batch_size=BATCH_SIZE)
    #     # report = self.evaluate(test_loader, self.label_encoder)
    #     # print("\nTest Report:")
    #     # print(pd.DataFrame(report).transpose())
    #     # return report
    #     return self.evaluate(test_loader, self.label_encoder)
    
    def get_required_fields():
        return ['text', 'target']

    def predict(self, inputs):
        if isinstance(inputs, list) and all(isinstance(item, dict) and 'text' in item for item in inputs):
            texts = [item['text'] for item in inputs]
        else:
            texts = [{'text': inputs['text'], 'target': inputs['target']}]

        self.eval()
        results = []
        for item in texts:
            encoding = self._preprocess_input(item["text"], item["target"])
            probs = self._get_predictions(encoding)
            prediction = self._format_prediction(probs, self.label_encoder)
            reasoning = self._generate_reasoning(item["text"], item["target"], prediction)
            
            results.append({
                **item,
                "prediction": prediction,
                "probabilities": dict(zip(label_encoder.classes_, probs)),
                "reasoning": reasoning
            })

        if len(results) == 1:
            result = sanitize(results[0])
            return result
        
        return results

    def _preprocess_input(self, text, target):
        combined = f"{text}[SEP]{target}"
        return self.tokenizer(
            combined,
            max_length=self.max_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        ).to(self.device)

    def _get_predictions(self, encoding):
        with torch.no_grad():
            outputs = self(**encoding)
            return torch.softmax(outputs, dim=1).cpu().numpy()[0]

    def _format_prediction(self, probs, label_encoder):
        return label_encoder.inverse_transform([probs.argmax()])[0]

    def _generate_reasoning(self, text, target, prediction):
        system_prompt = """请严格使用以下JSON格式返回结果：
        {
            "text": "输入文本",
            "target": "目标名称",
            "prediction": "支持/反对/中立",
            "reasoning": "生成的理由",
        }
        请确保输出是有效的JSON，不要包含换行符等特殊字符、注释或额外文本。"""
        prompt = f"请给出{text}中对{target}的立场是{prediction}的理由。"
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
    train_df = pd.read_csv("few_shot/world_event_few_shot.csv")
    val_df = pd.read_csv("few_shot/covid_epidemic.csv")
    test_df = pd.read_csv("few_shot/covid_epidemic.csv")

    # 初始化组件
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    dataloaders = {
        "train": DataLoader(StanceDataset(train_df, tokenizer), batch_size=BATCH_SIZE, shuffle=True),
        "val": DataLoader(StanceDataset(val_df, tokenizer), batch_size=BATCH_SIZE)
    }
    test_loader = DataLoader(StanceDataset(test_df, tokenizer), batch_size=BATCH_SIZE)

    # 训练流程
    model = XLNetStanceClassifier2().to(device)
    optimizer = AdamW(model.parameters(), lr=LR)
    
    model.train(model, dataloaders, optimizer)
    model.test(model, test_loader)
    
    # # 保存模型
    # torch.save(model.state_dict(), "covid_epidemic_subtask2.pth")
    
    # # 预测示例
    # predictor = StancePredictor("covid_epidemic_subtask2.pth")
    # result = predictor.predict(
    #     text="嘛六记的产品质量可靠，值得推荐",
    #     target="张兰带货嘛六记"
    # )
    # print("\nPrediction Result:", result)
    # 0. 配置参数
    # INPUT_FILE = "佩洛西访台-2023-04-17.xlsx"         # 输入Excel文件路径
    # OUTPUT_FILE = "output.csv"        # 输出CSV文件路径
    # MODEL_PATH = "zero_shot_stance_model.pth"  # 模型文件路径
    # TARGET = "佩洛西访台"                   # 固定分析目标

    # # 1. 加载立场检测模型
    # try:
    #     predictor = StancePredictor(MODEL_PATH)
    #     print("模型加载成功")
    # except Exception as e:
    #     print(f"模型加载失败: {str(e)}")
    #     exit()

    # # 2. 读取Excel数据
    # try:
    #     df = pd.read_excel(INPUT_FILE)
    #     print(f"成功读取数据，共 {len(df)} 条记录")
    # except Exception as e:
    #     print(f"文件读取失败: {str(e)}")
    #     exit()

    # # 3. 初始化结果容器
    # results = []

    # # 4. 逐条进行立场分析
    # for index, row in tqdm(df.iterrows(), total=len(df), desc="分析进度"):
    #     try:
    #         text_content = str(row["内容"])  # 强制转换为字符串防止空值
    #         weibo_id = row["微博id"]
    #         finial_text=clean_text(text_content)
    #         # 执行预测
    #         stance = predictor.predict(
    #             text=finial_text,
    #             target=TARGET
    #         )
            
    #         # 保存结果
    #         results.append({
    #             "id": weibo_id,
    #             "text": finial_text,
    #             "target": TARGET,
    #             "stance": stance['prediction'],
    #         })
    #     except Exception as e:
    #         print(f"第 {index+1} 条分析失败: {str(e)}")
    #         continue

    # # 5. 保存结果到CSV
    # if len(results) > 0:
    #     output_df = pd.DataFrame(results)
    #     output_df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")  # 使用中文兼容编码
    #     print(f"分析完成，结果已保存至: {OUTPUT_FILE}")
    # else:
    #     print("没有有效分析结果可保存")

    # # 输出统计信息
    # print("\n分析统计：")
    # print(f"成功分析: {len(results)} 条")
    # print(f"失败分析: {len(df) - len(results)} 条")