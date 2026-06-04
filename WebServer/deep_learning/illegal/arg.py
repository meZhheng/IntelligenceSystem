import torch
import torch
import torch.nn.functional as F
from torch.autograd import Function
import math
from transformers import AutoTokenizer, AutoModel
from torch.utils.data import Dataset, DataLoader, TensorDataset
from torch import nn
from torch import optim
import pandas as pd
import time
import jieba
import random
import numpy as np
import json
from openai import OpenAI
from deep_learning.base_model import BaseModel

random.seed(666)
import re

def parse_response(response: str):
    """
    提取预测结果和分析内容。
    """
    # 提取开头的“0”或“1”作为预测值
    match_pred = re.search(r'^[01]', response.strip())
    pred = int(match_pred.group(0)) if match_pred else 2  # 如果没找到，就设为2（异常）

    # 提取“分析：”后面的内容
    match_analysis = re.search(r'分析[:：](.*)', response, re.DOTALL)
    rationale = match_analysis.group(1).strip() if match_analysis else ""

    return pred, rationale


'''
ARG 数据格式样例
{
    "content":"山东第一医科大学与华为技术有限公司签署战略合作协议华为的加入......",
    "label":"real",
    "time":1600876800000,
    "source_id":7170,
    "td_rationale":"这段消息使用了较为正式的措辞，涉及到具体的合作内容和目标，同时也提到了对学校发展的重要意义。",
    "td_pred":"real",
    "td_acc":1,
    "cs_rationale":"1，该消息提到的两个机构都是真实存在的，且合作内容也符合现代信息化发展趋势，",
    "cs_pred":"real",
    "cs_acc":1,
    "split":"test"
}
'''

class Qwen():
    def __init__(self):
        self.api_key = 'sk-2cd0d35cfde442c18f1af438d427b2f3'
        self.base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"

    def get_response(self, prompt):
        client = OpenAI(
            api_key=self.api_key, 
            base_url=self.base_url, 
        )

        completion = client.chat.completions.create(
            model="qwen-long",
            messages=[
                {'role': 'user', 'content': prompt}],
            temperature=0.8,
            top_p=0.8
            )
        output = completion.choices[0].message.content
        return output
    
    def rational_gen_text(self, claim):
        prompt = (
        'Q: 对于下面的新闻，预测它的真实性。如果它更可能是一个真新闻，返回0；否则返回1。请避免提供模棱两可的回复，比如不确定。'
        f'记住要从文本描述的角度出发判断，给一个简明的分析。这是声明：{claim}\n'
        
        'A: '
        )
        try:
            response_all = self.get_response(prompt)
        except Exception as e:
            print("调用失败：", e)
            response_all = claim

        td_pred, rationale = parse_response(response_all)

        return td_pred, rationale

    def rational_gen_common(self, claim):

        prompt = (
        'Q: 对于下面的新闻，预测它的真实性。如果它更可能是一个真新闻，返回0；否则返回1。请避免提供模棱两可的回复，比如不确定。'
        '记住要从文本描述的角度出发判断，给一个简明的分析。'
        f'这是声明: {claim}\n'
        
        'A: '
        )

        try:
            response_all = self.get_response(prompt)
        except Exception as e:
            print("调用失败：", e)
            response_all = claim

        cs_pred, rationale = parse_response(response_all)

        return cs_pred, rationale

qwen = Qwen()

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

def gen_ration(dict_list):
    res = []
    for data in dict_list:
        label = data['label']
        text = data['text']

        td_pred, td_ration = qwen.rational_gen_text(text)
        cd_pred, cd_ration = qwen.rational_gen_common(text)
        td_acc = 0
        cs_acc = 0
        if td_pred == label:
            td_acc = 1
        if cd_pred == label:
            cs_acc = 1
        
        arg_data = {
            "content":text,
            "label":label,
            "time": None,
            "source_id": None,
            "td_rationale":td_ration,
            "td_pred":td_pred,
            "td_acc":td_acc,
            "cs_rationale":cd_ration,
            "cs_pred":cd_pred,
            "cs_acc":cs_acc,
            "split":"test"
        }
        #print(arg_data)

        res.append(arg_data)

    return res


'''layers'''
class ReverseLayerF(Function):
    @staticmethod
    def forward(ctx, input_, alpha):
        ctx.alpha = alpha
        return input_

    @staticmethod
    def backward(ctx, grad_output):
        output = grad_output.neg() * ctx.alpha
        return output, None

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

class MaskAttention(torch.nn.Module):
    """
    Compute attention layer
    """
    def __init__(self, input_shape):
        super(MaskAttention, self).__init__()
        self.attention_layer = torch.nn.Linear(input_shape, 1)

    def forward(self, inputs, mask=None):
        scores = self.attention_layer(inputs).view(-1, inputs.size(1))
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))
        scores = torch.softmax(scores, dim=-1).unsqueeze(1)
        outputs = torch.matmul(scores, inputs).squeeze(1)

        return outputs, scores

class Attention(torch.nn.Module):
    """
    Compute 'Scaled Dot Product Attention
    """

    def forward(self, query, key, value, mask=None, dropout=None):
        scores = torch.matmul(query, key.transpose(-2, -1)) \
                 / math.sqrt(query.size(-1))

        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))

        p_attn = F.softmax(scores, dim=-1)

        if dropout is not None:
            p_attn = dropout(p_attn)

        return torch.matmul(p_attn, value), p_attn

class MultiHeadedAttention(torch.nn.Module):
    """
    Take in model size and number of heads.
    """

    def __init__(self, h, d_model, dropout=0.1):
        super(MultiHeadedAttention, self).__init__()
        assert d_model % h == 0

        # We assume d_v always equals d_k
        self.d_k = d_model // h
        self.h = h

        self.linear_layers = torch.nn.ModuleList([torch.nn.Linear(d_model, d_model) for _ in range(3)])
        self.output_linear = torch.nn.Linear(d_model, d_model)
        self.attention = Attention()

        self.dropout = nn.Dropout(p=dropout)

    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)
        if mask is not None:
            mask = mask.repeat(1, self.h, 1, 1)
        # 1) Do all the linear projections in batch from d_model => h x d_k
        query, key, value = [l(x).view(batch_size, -1, self.h, self.d_k).transpose(1, 2)
                             for l, x in zip(self.linear_layers, (query, key, value))]

        # 2) Apply attention on all the projected vectors in batch.
        x, attn = self.attention(query, key, value, mask=mask, dropout=self.dropout)
        # print('x shape after self attention: {}'.format(x.shape))

        # 3) "Concat" using a view and apply a final linear.
        x = x.transpose(1, 2).contiguous().view(batch_size, -1, self.h * self.d_k)

        return self.output_linear(x), attn

class SelfAttentionFeatureExtract(torch.nn.Module):
    def __init__(self, multi_head_num, input_size, output_size=None):
        super(SelfAttentionFeatureExtract, self).__init__()
        self.attention = MultiHeadedAttention(multi_head_num, input_size)
    def forward(self, inputs, query, mask=None):
        mask = mask.view(mask.size(0), 1, 1, mask.size(-1))

        feature, attn = self.attention(query=query,
                                 value=inputs,
                                 key=inputs,
                                 mask=mask
                                 )
        return feature, attn

def masked_softmax(scores, mask):
    """Apply source length masking then softmax.
    Input and output have shape bsz x src_len"""

    # Fill pad positions with -inf
    scores = scores.masked_fill(mask == 0, -np.inf)
 
    # Cast to float and then back again to prevent loss explosion under fp16.
    return F.softmax(scores.float(), dim=-1).type_as(scores)
 
class ParallelCoAttentionNetwork(nn.Module):
 
    def __init__(self, hidden_dim, co_attention_dim, mask_in=False):
        super(ParallelCoAttentionNetwork, self).__init__()
 
        self.hidden_dim = hidden_dim
        self.co_attention_dim = co_attention_dim
        self.mask_in = mask_in
        # self.src_length_masking = src_length_masking
 
        # [hid_dim, hid_dim]
        self.W_b = nn.Parameter(torch.randn(self.hidden_dim, self.hidden_dim))
        # [co_dim, hid_dim]
        self.W_v = nn.Parameter(torch.randn(self.co_attention_dim, self.hidden_dim))
        # [co_dim, hid_dim]
        self.W_q = nn.Parameter(torch.randn(self.co_attention_dim, self.hidden_dim))
        # [co_dim, 1]
        self.w_hv = nn.Parameter(torch.randn(self.co_attention_dim, 1))
        # [co_dim, 1]
        self.w_hq = nn.Parameter(torch.randn(self.co_attention_dim, 1))
 
    def forward(self, V, Q, V_mask=None, Q_mask=None):
        """ ori_setting
        :param V: batch_size * hidden_dim * region_num, eg B x 512 x 196
        :param Q: batch_size * seq_len * hidden_dim, eg B x L x 512
        :param Q_lengths: batch_size
        :return:batch_size * 1 * region_num, batch_size * 1 * seq_len,
        batch_size * hidden_dim, batch_size * hidden_dim
        """
        """ new_setting
        :param V: news content, batch_size * hidden_dim * content_length , eg B x 768 x 170
        :param Q: FTR info, batch_size * FTR_length * hidden_dim, eg B x 512 x 768
        :param batch_size: batch_size
        :return:batch_size * 1 * region_num, batch_size * 1 * seq_len,
        batch_size * hidden_dim, batch_size * hidden_dim
        """

        C = torch.matmul(Q, torch.matmul(self.W_b, V))
        # (batch_size, co_attention_dim, region_num)
        H_v = nn.Tanh()(torch.matmul(self.W_v, V) + torch.matmul(torch.matmul(self.W_q, Q.permute(0, 2, 1)), C))
        # (batch_size, co_attention_dim, seq_len)
        H_q = nn.Tanh()(
            torch.matmul(self.W_q, Q.permute(0, 2, 1)) + torch.matmul(torch.matmul(self.W_v, V), C.permute(0, 2, 1)))
 
        # (batch_size, 1, region_num)
        a_v = F.softmax(torch.matmul(torch.t(self.w_hv), H_v), dim=2)
        # (batch_size, 1, seq_len)
        a_q = F.softmax(torch.matmul(torch.t(self.w_hq), H_q), dim=2)

        if self.mask_in:
            # # (batch_size, 1, region_num)
            masked_a_v = masked_softmax(
                a_v.squeeze(1), V_mask
            ).unsqueeze(1)
    
            # # (batch_size, 1, seq_len)
            masked_a_q = masked_softmax(
                a_q.squeeze(1), Q_mask
            ).unsqueeze(1)
 
            # (batch_size, hidden_dim)
            v = torch.squeeze(torch.matmul(masked_a_v, V.permute(0, 2, 1)))
            # (batch_size, hidden_dim)
            q = torch.squeeze(torch.matmul(masked_a_q, Q))
    
            return masked_a_v, masked_a_q, v, q
        else:
            # (batch_size, hidden_dim)
            v = torch.squeeze(torch.matmul(a_v, V.permute(0, 2, 1)))
            # (batch_size, hidden_dim)
            q = torch.squeeze(torch.matmul(a_q, Q))
    
            return a_v, a_q, v, q


'''dataset'''
label_dict = {
    "real": 0,
    "fake": 1,
    0: 0,
    1: 1
}

label_dict_ftr_pred = {
    "real": 0,
    "fake": 1,
    "other": 2,
    0: 0,
    1: 1,
    2: 2
}

def word2input(texts, tokenizer, max_len=170):
    #tokenizer = AutoTokenizer.from_pretrained('../../models/bert-base-chinese')
    inputs = tokenizer(texts, padding="max_length", truncation=True, return_tensors="pt", max_length=max_len)
    return inputs['input_ids'], inputs['attention_mask']

class ARGdataset(Dataset):
    def __init__(self, arg_dict_list, tokenizer):
        self.data = arg_dict_list
        self.tokenizer = tokenizer

        self.contents = [item['content'] for item in self.data]
        self.labels = [label_dict[item['label']] for item in self.data]

        self.FTR_2 = [item['td_rationale'] for item in self.data]
        self.FTR_2_pred = [label_dict_ftr_pred[item['td_pred']] for item in self.data]
        self.FTR_2_acc = [item['td_acc'] for item in self.data]

        self.FTR_3 = [item['cs_rationale'] for item in self.data]
        self.FTR_3_pred = [label_dict_ftr_pred[item['cs_pred']] for item in self.data]
        self.FTR_3_acc = [item['cs_acc'] for item in self.data]

        self.content_token_ids, self.content_masks = word2input(self.contents, tokenizer)
        self.FTR_2_token_ids, self.FTR_2_masks = word2input(self.FTR_2, tokenizer)
        self.FTR_3_token_ids, self.FTR_3_masks = word2input(self.FTR_3, tokenizer)
        
        
    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        res = (
            self.content_token_ids[idx],
            self.content_masks[idx],
            self.FTR_2_pred[idx],
            self.FTR_2_acc[idx],
            self.FTR_3_pred[idx],
            self.FTR_3_acc[idx],
            self.FTR_2_token_ids[idx],
            self.FTR_2_masks[idx],
            self.FTR_3_token_ids[idx],
            self.FTR_3_masks[idx],
            self.labels[idx]
            )
        return res


'''model'''
class ARGModel(torch.nn.Module, BaseModel):
    def __init__(self, model_name='bert-base-chinese', emb_dim=768, mlp_dims=[384], mlp_dropout=0.2, co_attention_dim=300):
        super(ARGModel, self).__init__()
        config = {
            'model_path': f'/webfile/checkpoints/{model_name}',
            'emb_dim':emb_dim,
            'co_attention_dim': co_attention_dim,
            'model': {'mlp': {'dims': mlp_dims, 'dropout':mlp_dropout}}
        }
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.bert_content = AutoModel.from_pretrained(config['model_path']).requires_grad_(False).to(self.device)
        self.bert_FTR = AutoModel.from_pretrained(config['model_path']).requires_grad_(False).to(self.device)
        self.tokenizer = AutoTokenizer.from_pretrained(config['model_path'])

        for name, param in self.bert_content.named_parameters():
            if name.startswith("encoder.layer.11"):
                param.requires_grad = True
            else:
                param.requires_grad = False
        for name, param in self.bert_FTR.named_parameters():
            if name.startswith("encoder.layer.11"):
                param.requires_grad = True
            else:
                param.requires_grad = False

        # '--emb_dim', type=int, default=768
        # 'mlp': {'dims': [384], 'dropout': 0.2}
        # '--co_attention_dim', type=int, default=300
        self.aggregator = MaskAttention(config['emb_dim']).to(self.device)
        self.mlp = MLP(config['emb_dim'], config['model']['mlp']['dims'], config['model']['mlp']['dropout']).to(self.device)

        self.hard_ftr_2_attention = MaskAttention(config['emb_dim']).to(self.device)
        self.hard_mlp_ftr_2 = nn.Sequential(nn.Linear(config['emb_dim'], config['model']['mlp']['dims'][-1]),
            nn.ReLU(),
            nn.Linear(config['model']['mlp']['dims'][-1], 1),
            nn.Sigmoid()
        ).to(self.device)
        self.score_mapper_ftr_2 = nn.Sequential(nn.Linear(config['emb_dim'], config['model']['mlp']['dims'][-1]),
            nn.BatchNorm1d(config['model']['mlp']['dims'][-1]),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(config['model']['mlp']['dims'][-1], 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 1),
            nn.Sigmoid()
        ).to(self.device)

        self.hard_ftr_3_attention = MaskAttention(config['emb_dim']).to(self.device)
        self.hard_mlp_ftr_3 = nn.Sequential(nn.Linear(config['emb_dim'], config['model']['mlp']['dims'][-1]),
            nn.ReLU(),
            nn.Linear(config['model']['mlp']['dims'][-1], 1),
            nn.Sigmoid()
        ).to(self.device)
        self.score_mapper_ftr_3 = nn.Sequential(nn.Linear(config['emb_dim'], config['model']['mlp']['dims'][-1]),
            nn.BatchNorm1d(config['model']['mlp']['dims'][-1]),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(config['model']['mlp']['dims'][-1], 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 1),
            nn.Sigmoid()
        ).to(self.device)

        self.simple_ftr_2_attention = MaskAttention(config['emb_dim']).to(self.device)
        self.simple_mlp_ftr_2 = nn.Sequential(nn.Linear(config['emb_dim'], config['model']['mlp']['dims'][-1]),
            nn.ReLU(),
            nn.Linear(config['model']['mlp']['dims'][-1], 3)).to(self.device)
        self.simple_ftr_3_attention = MaskAttention(config['emb_dim']).to(self.device)
        self.simple_mlp_ftr_3 = nn.Sequential(nn.Linear(config['emb_dim'], config['model']['mlp']['dims'][-1]),
            nn.ReLU(),
            nn.Linear(config['model']['mlp']['dims'][-1], 3)).to(self.device)

        self.content_attention = MaskAttention(config['emb_dim']).to(self.device)    

        self.co_attention_2 = ParallelCoAttentionNetwork(config['emb_dim'], config['co_attention_dim'], mask_in=True).to(self.device)
        self.co_attention_3 = ParallelCoAttentionNetwork(config['emb_dim'], config['co_attention_dim'], mask_in=True).to(self.device)

        self.cross_attention_content_2 = SelfAttentionFeatureExtract(1, config['emb_dim']).to(self.device)
        self.cross_attention_content_3 = SelfAttentionFeatureExtract(1, config['emb_dim']).to(self.device)

        self.cross_attention_ftr_2 = SelfAttentionFeatureExtract(1, config['emb_dim']).to(self.device)
        self.cross_attention_ftr_3 = SelfAttentionFeatureExtract(1, config['emb_dim']).to(self.device)

    def get_required_fields():
        return ['text', 'label']

    def get_loader_from_arg_data(self, path, batch_size, length):
        arg_data = json.load(open(path, 'r',encoding='utf-8'))[:length]
        dataset = ARGdataset(arg_data, self.tokenizer)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        return loader
    
    def get_loader(self, dict_list, batch_size):
        arg_data = gen_ration(dict_list)
        dataset = ARGdataset(arg_data, self.tokenizer)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        return loader
    
    def predict(self, text):
        self.eval()

        if isinstance(text, dict):
            text = [text]
        
        if 'td_pred' not in text[0].keys():
            arg_data = gen_ration(text)
        else:
            arg_data = text

        contents = [item['content'] for item in arg_data]
        labels = [label_dict[item['label']] for item in arg_data]

        FTR_2 = [item['td_rationale'] for item in arg_data]
        FTR_2_pred = [label_dict_ftr_pred[item['td_pred']] for item in arg_data]
        FTR_2_acc = [item['td_acc'] for item in arg_data]

        FTR_3 = [item['cs_rationale'] for item in arg_data]
        FTR_3_pred = [label_dict_ftr_pred[item['cs_pred']] for item in arg_data]
        FTR_3_acc = [item['cs_acc'] for item in arg_data]

        content_token_ids, content_masks = word2input(contents, self.tokenizer)
        FTR_2_token_ids, FTR_2_masks = word2input(FTR_2, self.tokenizer)
        FTR_3_token_ids, FTR_3_masks = word2input(FTR_3, self.tokenizer)

        input_data = (
            content_token_ids,
            content_masks,
            FTR_2_pred,
            FTR_2_acc,
            FTR_3_pred,
            FTR_3_acc,
            FTR_2_token_ids,
            FTR_2_masks,
            FTR_3_token_ids,
            FTR_3_masks,
            labels
        )
        
        res = self(input_data)
        probs = res['classify_pred']               # tensor of shape (batch,)
        labels = (probs > 0.5).long()              # tensor of 0/1
        confidences = torch.where(
            labels == 1,
            probs,
            1 - probs
        )

        # 转成 Python List
        predictions = labels.cpu().tolist()
        confidence = [round(x.item(), 2) for x in confidences.cpu()]

        TDEvaluation = res['hard_ftr_2_pred'].cpu()
        CSEvaluation = res['hard_ftr_3_pred'].cpu()

        logs = []
        for i in range(len(contents)):
            log = {}
            log['TextualDescriptionRationale'] = FTR_2[i]
            log['TextualDescriptionJudgement'] = FTR_2_pred[i]
            log['CommonsenseRationale'] = FTR_3[i]
            log['CommonsenseJudgement'] = FTR_3_pred[i]
            log['TDEvaluation'] = round(TDEvaluation[i].item(), 2)
            log['CSEvaluation'] = round(CSEvaluation[i].item(), 2)
            log['Confidence'] = confidence[i]
            logs.append(log)

        return {
            'data': predictions[0],
            'status': 'success',
            'log': logs[0]
        }

    def forward(self, data):
        content, content_masks = data[0].to(self.device), data[1].to(self.device)

        FTR_2, FTR_2_masks = data[6].to(self.device), data[7].to(self.device)
        FTR_3, FTR_3_masks = data[8].to(self.device), data[9].to(self.device)

        content_feature = self.bert_content(content, attention_mask = content_masks)[0]
        content_feature_1, content_feature_2 = content_feature, content_feature

        FTR_2_feature = self.bert_FTR(FTR_2, attention_mask = FTR_2_masks)[0]
        FTR_3_feature = self.bert_FTR(FTR_3, attention_mask = FTR_3_masks)[0]

        mutual_content_FTR_2, _ = self.cross_attention_content_2( \
            content_feature_2, FTR_2_feature, content_masks)
        expert_2 = torch.mean(mutual_content_FTR_2, dim=1)
    
        mutual_content_FTR_3, _ = self.cross_attention_content_3( \
            content_feature_2, FTR_3_feature, content_masks)
        expert_3 = torch.mean(mutual_content_FTR_3, dim=1)

        mutual_FTR_content_2, _ = self.cross_attention_ftr_2( \
            FTR_2_feature, content_feature_2, FTR_2_masks)
        mutual_FTR_content_2 = torch.mean(mutual_FTR_content_2, dim=1)

        mutual_FTR_content_3, _ = self.cross_attention_ftr_3( \
            FTR_3_feature, content_feature_2, FTR_3_masks)
        mutual_FTR_content_3 = torch.mean(mutual_FTR_content_3, dim=1)

        hard_ftr_2_pred = self.hard_mlp_ftr_2(mutual_FTR_content_2).squeeze(1)
        hard_ftr_3_pred = self.hard_mlp_ftr_3(mutual_FTR_content_3).squeeze(1)

        simple_ftr_2_pred = self.simple_mlp_ftr_2(self.simple_ftr_2_attention(FTR_2_feature)[0]).squeeze(1)
        simple_ftr_3_pred = self.simple_mlp_ftr_3(self.simple_ftr_3_attention(FTR_3_feature)[0]).squeeze(1)    

        attn_content, _ = self.content_attention(content_feature_1, mask=content_masks)

        reweight_score_ftr_2 = self.score_mapper_ftr_2(mutual_FTR_content_2)
        reweight_score_ftr_3 = self.score_mapper_ftr_3(mutual_FTR_content_3)

        reweight_expert_2 = reweight_score_ftr_2 * expert_2
        reweight_expert_3 = reweight_score_ftr_3 * expert_3

        all_feature = torch.cat(
            (attn_content.unsqueeze(1), reweight_expert_2.unsqueeze(1), reweight_expert_3.unsqueeze(1)), 
            dim = 1
        )
        final_feature, _ = self.aggregator(all_feature)

        label_pred = self.mlp(final_feature)
        gate_value = torch.concat([
            reweight_score_ftr_2,
            reweight_score_ftr_3
        ], dim=1)

        res = {
            'classify_pred': torch.sigmoid(label_pred.squeeze(1)),
            'gate_value': gate_value,
            'final_feature': final_feature,
            'content_feature': attn_content,
            'ftr_2_feature': reweight_expert_2,
            'ftr_3_feature': reweight_expert_3            
        }

        res['hard_ftr_2_pred'] = hard_ftr_2_pred
        res['hard_ftr_3_pred'] = hard_ftr_3_pred

        res['simple_ftr_2_pred'] = simple_ftr_2_pred
        res['simple_ftr_3_pred'] = simple_ftr_3_pred

        return res

    def train_model(self, train_loader, criterion, optimizer, epochs):
        self.train()

        for epoch in range(epochs):
            epoch_loss = 0
            for index, batch_data in enumerate(train_loader):

                label = batch_data[10].to(self.device)

                hard_ftr_2_label = batch_data[3].to(self.device)
                hard_ftr_3_label = batch_data[5].to(self.device)

                simple_ftr_2_label = batch_data[2].to(self.device)
                simple_ftr_3_label = batch_data[4].to(self.device)


                res = self(batch_data)
                loss_classify = criterion(res['classify_pred'], label.float())

                loss_hard_aux_fn = torch.nn.BCELoss()
                loss_hard_aux = loss_hard_aux_fn(res['hard_ftr_2_pred'], hard_ftr_2_label.float()) + loss_hard_aux_fn(res['hard_ftr_3_pred'], hard_ftr_3_label.float())
            
                loss_simple_aux_fn = torch.nn.CrossEntropyLoss()
                loss_simple_aux = loss_simple_aux_fn(res['simple_ftr_2_pred'], simple_ftr_2_label.long()) + loss_simple_aux_fn(res['simple_ftr_3_pred'], simple_ftr_3_label.long())

                # 'llm_judgment_predictor_weight': 1.0
                # 'rationale_usefulness_evaluator_weight': 1.5
                # num_expert: 2
                loss = loss_classify
                loss += 1.0 * loss_hard_aux / 2
                loss += 1.5 * loss_simple_aux / 2

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

                pred = res['data']
                score = res['log']['confidence']
                if pred == 0:
                    score = 1-score

                preds.append(pred)
                labels.append(label)
                scores.append(score)
                
            return labels, preds, scores


if __name__ == "__main__":
    # 初始化模型
    arg = ARGModel()

    # 加载已经有ration的arg数据进行训练，以一定格式存储
    train_loader = arg.get_loader_from_arg_data("D:/Models/weibo21_arg/val.json", batch_size=8, length=800)

    # 加载没有ration的数据进行训练，会调用大模型生成ration
    # train_loader = arg.get_loader(dict_list，batch_size)

    # 训练模型
    epochs = 3
    criterion = nn.BCELoss()
    optimizer = optim.Adam(arg.parameters(), lr=2e-5)
    arg.train_model(train_loader, criterion, optimizer, epochs)

    # 用arg数据测试模型分类效果
    count = 0
    count_label = [0,0]
    test_set = json.load(open("D:/Models/weibo21_arg/val.json", 'r',encoding='utf-8'))[800:1000]

    for i in range(len(test_set)):
        data = test_set[i]
        label = label_dict[data['label']]
        pred = arg.predict(data)

        if label == 0:
            count_label[0] += 1
        else:
            count_label[1] += 1
        
        if i < 3:
            print(data)
            print(pred)
            print('*' * 100)

        if pred['data'][0] == label:
            count += 1

    print("ACC: ", count/len(test_set))
    print(count_label)

    # 对于没有ration的数据测试
    # 加载weibo21数据集，并转换为dict_list
    df = pd.read_pickle("D:/Models/weibo21/test.pkl")
    weibo_dict_list = weibo_to_dict_list(df)
    random.shuffle(weibo_dict_list)
    weibo_dict_list = weibo_dict_list[:5]
    test_set = weibo_dict_list

    # 会在predict中实时使用大模型进行ration生成
    for data in test_set:
        print("数据")
        print(data)
        print("预测")
        print(arg.predict(data))
