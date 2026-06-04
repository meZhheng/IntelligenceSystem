import torch
from transformers.models.bert import BertTokenizer, BertForSequenceClassification
from transformers import AutoTokenizer, AutoModel
from torch.utils.data import Dataset, DataLoader, TensorDataset
from torch import nn
from torch import optim
import os
import pandas as pd
import time
import numpy as np
import json
import torch.nn.functional as F
import re
from deep_learning.base_model import BaseModel
label_mapping = {
    0: '非冒犯文本',
    1: '冒犯性文本'
}

'''
data = {
    'id': self.id,
    'title': self.title,
    'publish_time': self.publish_time,
    'data': {
        'key_word': self.key_word,
        'text': self.text,
        'author': self.author,
    },
    'label': self.label,
    'dataset_id': self.dataset_id,
    'location': self.location if self.location else '未知',
}
'''

def  cold_to_dict_list(cold_df):
    id = list(cold_df['id'])
    topic = list(cold_df['topic'])
    label = list(cold_df['label'])
    text = list(cold_df['TEXT'])

    all_data = []
    for i in range(len(label)):

        data = {
        'id': id[i],
        'title': None,
        'publish_time': None,
        'data': {
            'key_word': topic[i],
            'text': text[i],
            'author': None,
        },
        'label': label[i],
        'dataset_id': None,
        'location': None,
        }

        all_data.append(data)
    
    return all_data

class COLDataset(Dataset):
    def __init__(self, cold_dicts):
        self.dicts = cold_dicts

    def __len__(self):
        return len(self.dicts)

    def __getitem__(self, idx):
        text = self.dicts[idx]['data']['text']
        label = torch.tensor(self.dicts[idx]['label']).long()
        one_hot_label = nn.functional.one_hot(label, num_classes=2).float()

        return text, one_hot_label

class COLDetector(nn.Module, BaseModel):
    def __init__(self, model_name='bert-base-chinese'):
        super().__init__()

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # print("Using device: ", self.device)

        model_path = os.path.join('/webfile/checkpoints/', model_name)
        if os.path.exists(model_path):
            # print('model loading')
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModel.from_pretrained(model_path).to(self.device)
            # print('model loading finished')
        else:
            print(f"模型路径 {model_path} 不存在，尝试从 Hugging Face Hub 下载。")
            # try:
            #     self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            #     self.model = AutoModel.from_pretrained(model_name)
            #     # 下载完成后保存到本地
            #     self.tokenizer.save_pretrained(model_path)
            #     self.model.save_pretrained(model_path)
            #     print(f"模型已下载并保存到 {model_path}。")
            # except Exception as e:
            #     print(f"下载模型时出现错误: {e}")

        self.linear = nn.Linear(768, 2).to(self.device)
        self.dropout = nn.Dropout(0.1).to(self.device)
        self.sigmoid = nn.Sigmoid().to(self.device)

    def get_loader(self, batch_size=1):
        '''
        dict_list: list of dict(), one dict is an instance in dataset
        '''
        cold_path = './datasets/COLDataset/'
        df = pd.read_csv(cold_path + 'test.csv')
        df = df.rename(columns={df.columns[0]: 'id'})
        cold_data = cold_to_dict_list(df)[:100]
        data_split = int(0.8*len(cold_data))
        train_set = cold_data[:data_split]
        test_set = cold_data[data_split:]

        train_dataset = COLDataset(train_set)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

        test_dataset = COLDataset(test_set)
        test_loader = DataLoader(test_dataset, batch_size=batch_size)

        return train_loader, test_loader

    @staticmethod
    def get_required_fields():
        return ['text']
    
    @staticmethod
    def convert_result(raw_result: dict):
        """
        将类似以下格式的字典：
            {
              "confidences": [[0.4807639420032501, 0.5192360877990723]],
              "data": [1],
              "status": "success"
            }
        转换为：取出 "data" 列表中的第一项，然后根据 label_mapping 映射成相应标签字符串并返回。

        参数：
          raw_result: 从模型推理接口返回的原始 JSON 结构（已解析为 dict）。
          label_mapping: 一个将整数标签映射到字符串标签的字典，例如 {0: "negative", 1: "positive"}。
        
        返回：
          如果 raw_result 中 "data" 列表非空且能在 label_mapping 中找到对应项，则返回映射后的字符串标签；
          否则返回 None。
        """
        # 1. 确保 raw_result 包含 "data" 字段且是一个非空列表
        data_list = raw_result.get("data", [])
        if not isinstance(data_list, list) or len(data_list) == 0:
            return None

        # 2. 取出 data 列表中的第一项
        label_idx = data_list[0]

        # 3. 根据 label_mapping 将整数标签映射为字符串
        return label_mapping.get(label_idx)

    def predict(self, text):
        '''
        text: dict() or list of dict(), where each dict has at least a 'text' 字段
        '''
        self.eval()

        # 1. 准备输入 texts 列表
        if isinstance(text, list) and all(isinstance(item, dict) and 'text' in item for item in text):
            texts = [item['text'] for item in text]
        else:
            texts = [text['text']]

        # 2. 执行模型前向，得到 logits
        with torch.no_grad():
            logits = self(texts)           # 假设返回形状 (N, C) 的 tensor
            logits_cpu = logits.cpu()      # 移到 CPU
            probs = F.softmax(logits_cpu, dim=-1)  # 计算各类别概率，形状 (N, C)

            # 3. 预测标签与置信度
            preds = probs.argmax(dim=-1).tolist()  # 每行最大概率索引
            confidences = probs.tolist()           # 转成 list of [p0, p1, …]

        return {
            'data': preds,           # [label0, label1, …]
            'confidences': confidences,  # [[p0_0, p0_1, …], [p1_0, p1_1, …], …]
            'status': 'success'
        }
    
    def forward(self, text):

        inputs = self.tokenizer(text, return_tensors='pt', truncation=True, padding=True).to(self.device)
        outputs = self.model(**inputs)

        x = outputs[1]
        x = x.view(-1, 768)
        #x = self.dropout(x)
        x = self.linear(x)
        x = self.sigmoid(x)

        return x

    def train_model(self, train_loader, criterion, optimizer, epochs):
        self.train()

        for epoch in range(epochs):
            epoch_loss = 0
            for index, (texts, labels) in enumerate(train_loader):

                optimizer.zero_grad()
                outputs = self(texts)
                loss = criterion(outputs, labels.to(self.device))
                loss.backward()
                optimizer.step()

                epoch_loss += loss.item()

               
            print(f'Epoch {epoch + 1}/{epochs}, Loss: {epoch_loss / len(train_loader)}')

    def test_model(self, test_set):
        preds = []
        scores = []
        labels = []
        for test_sample in test_set:
            label = test_sample['label']
            res = self.predict(test_sample)
            pred = res['data'][0]
            score = res['confidences'][0][1]

            preds.append(pred)
            labels.append(label)
            scores.append(score)
            
        return labels, preds, scores

class CMBQADataset(Dataset):
    def __init__(self, cold_dicts, main_question, sub_question, sep_token='[SEP]'):
        np.random.seed(666)

    
        self.dicts = cold_dicts

        clear_relate_pairs = []
        clear_random_pairs = []
        spam_no_pairs=[]
        spam_yes_pairs=[]
        common_clear_pairs=[]
        common_spam_pairs=[]
        

        for data in cold_dicts:
            key_wrod = data['data']['key_word']
            text = data['data']['text']
            label = data['label']

            if label == 0:
                clear_relate_pairs.append((sub_question[key_wrod] + sep_token + text, 0))
                common_clear_pairs.append((main_question + sep_token + text, 0))

                words = []
                for word in sub_question.keys():
                    if word != key_wrod:
                        words.append(word)
                rand_int = np.random.randint(0, len(words))
                clear_random_pairs.append((sub_question[words[rand_int]] + sep_token + text, 0))        

            else:
                spam_yes_pairs.append((sub_question[key_wrod] + sep_token + text, 1))
                common_spam_pairs.append((main_question + sep_token + text, 1))
                for word in sub_question.keys():
                    if word != key_wrod:
                        spam_no_pairs.append((sub_question[word] + sep_token + text,0))
            
        clear_random_pairs = self.random_select(clear_random_pairs, 0.4)
        clear_relate_pairs = self.random_select(clear_relate_pairs, 0.4)
        spam_no_pairs = self.random_select(spam_no_pairs, 0.5)
        spam_yes_pairs = self.random_select(spam_yes_pairs, 1)
        common_spam_pairs=self.random_select(common_spam_pairs, 0.3)
        common_clear_pairs=self.random_select(common_clear_pairs, 0.1)

        bqa_data = clear_random_pairs + clear_relate_pairs + spam_no_pairs + spam_yes_pairs + common_spam_pairs + common_clear_pairs
        np.random.shuffle(bqa_data)


        print("CMBQA train set length: ", len(bqa_data))
        self.bqa_data = bqa_data

    def random_select(self,items, p):
        mask = np.random.rand(len(items)) < p
        selected_items = [item for item, m in zip(items, mask) if m]
        return selected_items
    
    def __len__(self):
        return len(self.bqa_data)

    def __getitem__(self, idx):
        text = self.bqa_data[idx][0]
        label = torch.tensor(self.bqa_data[idx][1]).long()
        one_hot_label = nn.functional.one_hot(label, num_classes=2).float()

        return text, one_hot_label

class CMBQA(nn.Module, BaseModel):
    def __init__(self, device='cpu'):
        super().__init__()

        model_name='bert-base-chinese'
        COLD_MAIN_QUESTION = 'Does this content mention offensive language?'
        COLD_SUB_QUESTION = {
            'region': 'Does this content mention region?', 
            'race': 'Does this content mention race?',
            'gender': 'Does this content mention sex or gender identity?'                
        }

        self.main_question = COLD_MAIN_QUESTION
        self.sub_question = COLD_SUB_QUESTION

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        model_path = os.path.join('/webfile/checkpoints/', model_name)
        if os.path.exists(model_path):
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModel.from_pretrained(model_path).to(self.device)

        else:
            print(f"模型路径 {model_path} 不存在，尝试从 Hugging Face Hub 下载。")

        self.linear = nn.Linear(768, 2).to(self.device)
        self.dropout = nn.Dropout(0.1).to(self.device)
        self.sigmoid = nn.Sigmoid().to(self.device)

    def get_required_fields():
        return ['text', 'key_word']
    
    @staticmethod
    def convert_result(raw_result: dict):
        """
        将类似以下格式的字典：
            {
              "confidences": [[0.4807639420032501, 0.5192360877990723]],
              "data": [1],
              "status": "success"
            }
        转换为：取出 "data" 列表中的第一项，然后根据 label_mapping 映射成相应标签字符串并返回。

        参数：
          raw_result: 从模型推理接口返回的原始 JSON 结构（已解析为 dict）。
          label_mapping: 一个将整数标签映射到字符串标签的字典，例如 {0: "negative", 1: "positive"}。
        
        返回：
          如果 raw_result 中 "data" 列表非空且能在 label_mapping 中找到对应项，则返回映射后的字符串标签；
          否则返回 None。
        """
        # 1. 确保 raw_result 包含 "data" 字段且是一个非空列表
        data_list = raw_result.get("data", [])
        if not isinstance(data_list, list) or len(data_list) == 0:
            return None

        # 2. 取出 data 列表中的第一项
        label_idx = data_list[0]

        # 3. 根据 label_mapping 将整数标签映射为字符串
        return label_mapping.get(label_idx)
    
    def get_loader(self, batch_size=1):

        cold_path = './datasets/COLDataset/'
        df = pd.read_csv(cold_path + 'test.csv')
        df = df.rename(columns={df.columns[0]: 'id'})
        cold_data = cold_to_dict_list(df)[:100]
        data_split = int(0.8*len(cold_data))
        train_set = cold_data[:data_split]
        test_set = cold_data[data_split:]

        train_dataset = CMBQADataset(train_set, self.main_question, self.sub_question)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

        test_dataset = CMBQADataset(test_set, self.main_question, self.sub_question)
        test_loader = DataLoader(test_dataset, batch_size=batch_size)

        return train_loader, test_loader

    def predict(self, text, sep_token='[SEP]'):
        self.eval()

        # 1. 准备输入 texts 列表
        if isinstance(text, list) and all(isinstance(item, dict) and 'text' in item for item in text):
            texts = [item['text'] for item in text]
        else:
            texts = [text['text']]

        # 2. L1 推理
        main_texts = [self.main_question + sep_token + t for t in texts]
        with torch.no_grad():
            outputs = self(main_texts)                # 假设返回 logits 张量 shape=(N, C)
            logits = outputs.cpu()                    # 把 tensor 转到 CPU
            probs = F.softmax(logits, dim=-1)         # 计算每个类别的概率，shape=(N, C)
            preds = probs.argmax(dim=-1).tolist()     # 预测标签 list of int
            confidences = probs.tolist()              # 置信度 list of [prob_class0, prob_class1, …]

        # 3. 对预测为 1 的样本做 L2 细化判断
        for i, p in enumerate(preds):
            if p == 0:
                continue

            # 构造子问题输入
            sub_texts = [
                self.sub_question[key] + sep_token + texts[i]
                for key in self.sub_question.keys()
            ]
            with torch.no_grad():
                sub_logits = self(sub_texts).cpu()
                sub_probs = F.softmax(sub_logits, dim=-1)
                sub_preds = sub_probs.argmax(dim=-1).tolist()

            # 如果所有子预测都为 0，则将主预测改为 0
            if sum(sub_preds) == 0:
                preds[i] = 0
                # 可选地，你也可以更新该样本的 confidences[i]
                # 例如，将置信度设为 sub_probs 对应类 0 的最大值：
                # confidences[i] = [1 - sub_probs[:,1].max().item(), sub_probs[:,1].max().item()]

        return {
            'data': preds,            # 最终标签列表
            'confidences': confidences,  # L1 每个样本对每个类别的概率
            'status': 'success'
        }
    
    def forward(self, text):

        inputs = self.tokenizer(text, return_tensors='pt', truncation=True, padding=True).to(self.device)
        outputs = self.model(**inputs)

        x = outputs[1]
        x = x.view(-1, 768)
        #x = self.dropout(x)
        x = self.linear(x)
        x = self.sigmoid(x)

        return x

    def train_model(self, train_loader, criterion, optimizer, epochs):
        self.train()

        for epoch in range(epochs):
            epoch_loss = 0
            for index, (texts, labels) in enumerate(train_loader):

                optimizer.zero_grad()
                outputs = self(texts)
                loss = criterion(outputs, labels.to(self.device))
                loss.backward()
                optimizer.step()

                epoch_loss += loss.item()
               
                yield epoch_loss / len(train_loader)
    
    def test_model(self, test_set):
        preds = []
        labels = []
        scores = []
        for test_sample in test_set:
            label = test_sample['label']
            res = self.predict(test_sample)
            pred = res['data'][0]

            preds.append(pred)
            labels.append(label)
            
        return labels, preds, scores

class LexiconMatcher():
    def __init__(self, lexicon_path='/webfile/checkpoints/lexicon'):
        files = [f for f in os.listdir(lexicon_path) if os.path.isfile(os.path.join(lexicon_path, f))]
        self.lexicon = {}
        for f_name in files:
            with open(os.path.join(lexicon_path, f_name), 'r', encoding='utf-8') as f:
                data = json.load(f)
                name = f_name.split('.')[0]
                self.lexicon[name] = list(data.keys())

    @staticmethod
    def get_required_fields():
        return ['text']

    def predict(self, text):
        if isinstance(text, list) and all(isinstance(item, dict) and 'data' in item for item in text):
            texts = [item['text'] for item in text]
        else:
            texts = [text['text']]
        
        pred = [0]*len(texts)
        offensive_type = []
        matched_words = []  # 新增匹配词存储
        
        for i in range(len(texts)):
            text = texts[i]
            offensive = []
            matches = []  # 存储当前文本的匹配记录
            
            # 按类别顺序遍历词库
            for category in self.lexicon.keys():
                for word in self.lexicon[category]:
                    # 使用精确匹配（避免部分匹配）
                    if re.search(r'\b' + re.escape(word) + r'\b', text):
                        pred[i] = 1
                        matches.append({
                            'word': word,
                            'category': category,
                            'positions': [
                                m.start() for m in re.finditer(re.escape(word), text)
                            ]  # 记录所有出现位置
                        })
                        if category not in offensive:
                            offensive.append(category)
            
            # 去重处理（保留最后出现的匹配）
            seen = set()
            unique_matches = []
            for m in reversed(matches):
                key = (m['word'], m['category'])
                if key not in seen:
                    seen.add(key)
                    unique_matches.append(m)
            unique_matches.reverse()
            
            offensive_type.append(offensive)
            matched_words.append({
                'types': offensive,
                'details': unique_matches
            })
        
        return {
            'data': pred,
            'text': texts[0],
            'matches': matched_words,  # 结构化匹配结果
            'status': 'success',
        }
    
if __name__ == '__main__':
    # 读取df
    cold_path = 'D:/Models/COLDataset/'
    df = pd.read_csv(cold_path + 'test.csv')
    df = df.rename(columns={df.columns[0]: 'id'})
    print(df.head())

    # 初始化模型
    #model = CMBQA()
    model = COLDetector()

    # 转换为规定的dict，并划分训练集构造loader
    cold_data = cold_to_dict_list(df)[:1000]
    data_split = int(0.8*len(cold_data))
    train_set = cold_data[:data_split]
    test_set = cold_data[data_split:]
    train_loader = model.get_loader(train_set, batch_size=8)

    #训练
    epochs = 3
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=2e-5)
    model.train_model(train_loader, criterion, optimizer, epochs)

    #测试 
    preds = []
    labels = []
    for i in range(len(test_set)):
        
        data = test_set[i]
        label = [data['label']]

        # 一次预测多个示例
        # data = [test_set[i], test_set[i+1]]
        # label = [test_set[i]['label'], test_set[i+1]['label']]

        pred = model.predict(data)

        if i < 3:
            print(data)
            print(pred)
        
        preds += pred['data']
        labels += label
    
    acc = torch.eq(torch.tensor(labels), torch.tensor(preds)).float().mean() 
    print("ACC: ", acc)

