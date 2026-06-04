import torch
import torch
from transformers import AutoTokenizer, AutoModel
from torch.utils.data import Dataset, DataLoader, TensorDataset
from torch import nn
from torch import optim
import os
import pandas as pd
import time
import jieba
import random
import spacy
import numpy as np
import torch.nn.functional as F
from deep_learning.base_model import BaseModel
label_mapping = {
    0: '虚假信息',
    1: '真实信息'
}

random.seed(666)
#nlp = spacy.load("zh_core_web_trf")

def weibo_to_dict_list(weibo_df):
    texts = weibo_df['content']
    labels = weibo_df['label']
    key_words = weibo_df['category']

    all_data = []
    for i in range(len(texts)):

        data = {
        'id': i,
        'title': None,
        'publish_time': None,
        'data': {
            'key_word': key_words[i],
            'text': texts[i],
            'author': None,
        },
        'label': labels[i],
        'dataset_id': None,
        'location': None,
        }

        all_data.append(data)
    
    return all_data

def word2input(texts, tokenizer, max_len=170):
    #tokenizer = AutoTokenizer.from_pretrained('../../models/bert-base-chinese')
    inputs = tokenizer(texts, padding="max_length", truncation=True, return_tensors="pt", max_length=max_len)
    return inputs['input_ids'], inputs['attention_mask']

def extract_entity_list(text, model):
    entity_list = []
    doc = model(text)
    for ent in doc.ents:
        entity_list.append({"entity" : ent.text})
    return entity_list

def get_entity(entity_list):
    entity_content = []
    for item in entity_list:
        entity_content.append(item["entity"])
    entity_content = '[SEP]'.join(entity_content)
    return entity_content

def data_augment(content, entity_list, aug_prob=0.1):
    entity_content = []
    random_num = random.randint(1,100)
    if random_num <= 50:
        for item in entity_list:
            random_num = random.randint(1,100)
            if random_num <= int(aug_prob * 100):
                content = content.replace(item["entity"], '[MASK]')
            elif random_num <= int(2 * aug_prob * 100):
                content = content.replace(item["entity"], '')
            else:
                entity_content.append(item["entity"])
        entity_content = '[SEP]'.join(entity_content)
    else:
        content = list(jieba.cut(content))
        for index in range(len(content) - 1, -1, -1):
            random_num = random.randint(1,100)
            if random_num <= int(aug_prob * 100):
                del content[index]
            elif random_num <= int(2 * aug_prob * 100):
                content[index] = '[MASK]'
        content = ''.join(content)
        entity_content = get_entity(entity_list)

    return content, entity_content

class ENDEFDataset(Dataset):
    def __init__(self, dict_list, tokenizer, nlp):
        self.data = dict_list
        
        contents = []
        entity_contents = []
        for item in dict_list:
            content = item['data']['text']
            entity_list = extract_entity_list(content, nlp)

            # 数据增强
            content, entity_content = data_augment(content, entity_list)
            contents.append(content)
            entity_contents.append(entity_content)

        content_token_ids, content_masks = word2input(contents, tokenizer, 170)
        entity_token_ids, entity_masks = word2input(entity_contents, tokenizer, 50)

        self.content_token_ids = content_token_ids
        self.content_masks = content_masks
        self.entity_token_ids = entity_token_ids
        self.entity_masks = entity_masks

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        label = self.data[idx]['label']
        content_id = self.content_token_ids[idx]
        content_mask = self.content_masks[idx]
        entity_id = self.entity_token_ids[idx]
        entity_mask = self.entity_masks[idx]
        
        return content_id, content_mask, entity_id, entity_mask, label

class cnn_extractor(nn.Module):
    def __init__(self, feature_kernel, input_size):
        super(cnn_extractor, self).__init__()
        self.convs = torch.nn.ModuleList(
            [torch.nn.Conv1d(input_size, feature_num, kernel)
             for kernel, feature_num in feature_kernel.items()])
        input_shape = sum([feature_kernel[kernel] for kernel in feature_kernel])

    def forward(self, input_data):
        share_input_data = input_data.permute(0, 2, 1)
        feature = [conv(share_input_data) for conv in self.convs]
        feature = [torch.max_pool1d(f, f.shape[-1]) for f in feature]
        feature = torch.cat(feature, dim=1)
        feature = feature.view([-1, feature.shape[1]])
        return feature
    
class MLP(torch.nn.Module):

    def __init__(self, input_dim, embed_dims, dropout, output_layer=True):
        super().__init__()
        layers = list()
        for embed_dim in embed_dims:
            layers.append(torch.nn.Linear(input_dim, embed_dim))
            #layers.append(torch.nn.BatchNorm1d(embed_dim))
            layers.append(torch.nn.ReLU())
            layers.append(torch.nn.Dropout(p=dropout))
            input_dim = embed_dim
        if output_layer:
            layers.append(torch.nn.Linear(input_dim, 1))
        self.mlp = torch.nn.Sequential(*layers)

    def forward(self, x):
        """
        :param x: Float tensor of size ``(batch_size, embed_dim)``
        """
        return self.mlp(x)
    
class MaskAttention(torch.nn.Module):
    """
    Compute attention layer
    """
    def __init__(self, input_shape):
        super(MaskAttention, self).__init__()
        self.attention_layer = torch.nn.Linear(input_shape, 1)

    def forward(self, inputs, mask=None):
        # print("inputs: ", inputs.shape)     #(128, 170, 768)
        scores = self.attention_layer(inputs).view(-1, inputs.size(1))
        # print("scores: ", scores.shape)     #(128, 170)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))
        scores = torch.softmax(scores, dim=-1).unsqueeze(1)
        # print("scores: ", scores.shape)     #(128, 1, 170)
        outputs = torch.matmul(scores, inputs).squeeze(1)
        # print("outputs: ", outputs.shape)   #(128, 768)

        return outputs, scores
    
class BERT_ENDEFModel(torch.nn.Module, BaseModel):
    def __init__(self, emb_dim=768, mlp_dims=[384], dropout=0.2, model_name = 'bert-base-chinese'):
        super(BERT_ENDEFModel, self).__init__()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.entity_extractor = spacy.load("zh_core_web_trf")

        self.bert = AutoModel.from_pretrained(f'/webfile/checkpoints/{model_name}').requires_grad_(False)
        self.bert = self.bert.to(self.device)
        self.tokenizer = AutoTokenizer.from_pretrained(f'/webfile/checkpoints/{model_name}')
        self.embedding = self.bert.embeddings
        
        for name, param in self.bert.named_parameters():
            if name.startswith("encoder.layer.11"): \
                    #or name.startswith('encoder.layer.10') \
                    #or name.startswith('encoder.layer.9'): \
                    # or name.startswith('encoder.layer.8') \
                    # or name.startswith('encoder.layer.7') \
                    # or name.startswith('encoder.layer.6')\
                    # or name.startswith('encoder.layer.5') \
                    # or name.startswith('encoder.layer.4')\
                    # or name.startswith('encoder.layer.3'):
                param.requires_grad = True
            else:
                param.requires_grad = False

        self.mlp = MLP(emb_dim, mlp_dims, dropout).to(self.device)
        self.attention = MaskAttention(emb_dim).to(self.device)
        
        feature_kernel = {1: 64, 2: 64, 3: 64, 5: 64, 10: 64}
        self.entity_convs = cnn_extractor(feature_kernel, emb_dim).to(self.device)
        mlp_input_shape = sum([feature_kernel[kernel] for kernel in feature_kernel])
        self.entity_mlp = MLP(mlp_input_shape, mlp_dims, dropout).to(self.device)
        self.entity_net = torch.nn.Sequential(self.entity_convs, self.entity_mlp).to(self.device)

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
        label_idx = data_list[0]['prediction']

        # 3. 根据 label_mapping 将整数标签映射为字符串
        return label_mapping.get(label_idx)

    def get_required_fields():
        return ['text']
    
    def get_loader(self, batch_size):
        df = pd.read_pickle('./datasets/Weibo21/test.pkl')
        weibo_dict_list = weibo_to_dict_list(df)
        random.shuffle(weibo_dict_list)
        weibo_dict_list = weibo_dict_list[:100]
        
        data_split = int(0.8*len(weibo_dict_list))
        train_set = weibo_dict_list[:data_split]
        test_set = weibo_dict_list[data_split:]

        train_dataset = ENDEFDataset(train_set, self.tokenizer, self.entity_extractor)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

        test_dataset = ENDEFDataset(test_set, self.tokenizer, self.entity_extractor)
        test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=True)

        return train_loader, test_loader
    
    def forward(self, data):
        #print(data[0].shape)
        inputs = data[0].to(self.device) # 'content_id'
        masks = data[1].to(self.device) # 'content_masks'
        bert_feature = self.bert(inputs, attention_mask = masks)[0]
        feature, _ = self.attention(bert_feature, masks)
        bias_pred = self.mlp(feature).squeeze(1)

        entity = data[2].to(self.device) # ['entity']
        masks = data[3].to(self.device) # ['entity_masks']
        entity_feature = self.bert(entity, attention_mask = masks)[0]
        entity_prob = self.entity_net(entity_feature).squeeze(1)

        return torch.sigmoid(0.9 * bias_pred + 0.1 * entity_prob), torch.sigmoid(entity_prob), torch.sigmoid(bias_pred)

    def predict(self, text):
        self.eval()

        # 1. 获取输入文本列表
        if isinstance(text, list) and all(isinstance(item, dict) and 'data' in item for item in text):
            texts = [item['text'] for item in text]
        else:
            texts = [text['text']]
        
        # 2. 实体提取
        entity_contents = [get_entity(extract_entity_list(t, self.entity_extractor)) for t in texts]

        # 3. 编码输入
        content_token_ids, content_masks = word2input(texts, self.tokenizer, 170)
        entity_token_ids, entity_masks = word2input(entity_contents, self.tokenizer, 50)

        input_data = (content_token_ids, content_masks, entity_token_ids, entity_masks, -1)

        # 4. 推理
        with torch.no_grad():
            bias_score, entity_score, final_score = self(input_data)  # 三个均为 sigmoid 输出
            final_score = final_score.cpu()
            entity_score = entity_score.cpu()
            bias_score = bias_score.cpu()

            results = []
            for i in range(len(texts)):
                score = final_score[i].item()
                entity_s = entity_score[i].item()
                bias_s = bias_score[i].item()

                # 1) 预测标签
                pred = int(score >= 0.5)

                # 3) raw_scores：针对预测类别，取对应置信度
                raw_final = score if pred == 1 else (1 - score)
                raw_bias = bias_s if pred == 1 else (1 - bias_s)
                raw_entity = entity_s if pred == 1 else (1 - entity_s)

                results.append({
                    'text': texts[i],
                    'entities': entity_contents[i],
                    'prediction': pred,
                    'confidence': [
                        round(1 - score, 4),
                        round(score, 4)
                    ],
                    'raw_scores': {
                        'final': round(raw_final, 4),
                        'bias_contrib': round(raw_bias, 4),
                        'entity_contrib': round(raw_entity, 4)
                    }
                })

        return {
            'data': results,
            'status': 'success'
        }

    def train_model(self, train_loader, criterion, optimizer, epochs):
        self.train()

        for epoch in range(epochs):
            epoch_loss = 0
            for index, batch_data in enumerate(train_loader):
                label = batch_data[4].to(self.device)
                pred, entity_pred, _ = self(batch_data)
                loss = criterion(pred, label.float()) + 0.2 * criterion(entity_pred, label.float())

                optimizer.zero_grad()
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
            pred = res['data'][0]['prediction']
            score = res['data'][0]['confidence'][1]

            preds.append(pred)
            labels.append(label)
            scores.append(score)
            
        return labels, preds, scores


if __name__ == "__main__":
    
    # 加载weibo21数据集，并转换为dict_list
    df = pd.read_pickle("D:/Models/weibo21/test.pkl")
    print(df.head())
    print(len(df))
    weibo_dict_list = weibo_to_dict_list(df)
    random.shuffle(weibo_dict_list)
    weibo_dict_list = weibo_dict_list[:1000]
    
    data_split = int(0.8*len(weibo_dict_list))
    train_set = weibo_dict_list[:data_split]
    test_set = weibo_dict_list[data_split:]
    

    # 初始化模型
    endef = BERT_ENDEFModel()
    train_loader = endef.get_loader(train_set, batch_size=8)
    print(len(train_loader))

    #训练
    epochs = 5
    criterion = nn.BCELoss()
    optimizer = optim.Adam(endef.parameters(), lr=2e-5)
    #endef.train_model(train_loader, criterion, optimizer, epochs)

    #测试
    count = 0
    count_label = [0,0]
    for i in range(len(test_set)):
        
        data = test_set[i]
        label = data['label']
        pred = endef.predict(data)

        if label == 0:
            count_label[0] += 1
        else:
            count_label[1] += 1
        
        if i < 3:
            print(data)
            print(pred)
        
        if pred['data'][0] == label:
            count += 1
    print("ACC: ", count/len(test_set))
    print(count_label)

    