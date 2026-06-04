import pandas as pd
import random
from sklearn.metrics import f1_score, accuracy_score,recall_score
import torch
from transformers import AutoTokenizer, AutoModel
from torch.utils.data import Dataset, DataLoader
from torch import nn
from torch import optim
import os
from deep_learning.illegal.bert import Bert_classifier, test_model
import json

random.seed(999)



def fever_to_dict_list(path = 'fever.jsonl'):
    data = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            sample = json.loads(line)
            data.append(sample)
    
    dict_list = []
    

    for sample in data:

        claim = sample['claim']
        label = sample['label']
        evidence = sample['evidence']

        text = claim

        for e in evidence:
            text += '[SEP]'
            text += e
        
        if label == 'SUPPORTS':
            label = 0
        else:
            label = 1

        dict_list.append({'data':{'text':text}, 'label':label})

    return dict_list



train_set = fever_to_dict_list('../../my_test/fever_train.jsonl')[:2000]
test_set = fever_to_dict_list('../../my_test/fever_train.jsonl')

fever = Bert_classifier(model_path='../../../models/bert-base-uncased')
train_loader = fever.get_loader(train_set, batch_size=8)
#训练
epochs = 6
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(fever.parameters(), lr=2e-5)
fever.train_model(train_loader, criterion, optimizer, epochs, test_set)


torch.save(fever.state_dict(), 'bert_fever.pth')
#cold.load_state_dict(torch.load('./bert_weights/bert_涉J性别歧视.pth'))


