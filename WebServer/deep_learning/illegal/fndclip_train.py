from fndclip import FNDCLIP
import torch.nn as nn
from PIL import Image
from torch import optim
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
import torch



#使用 20% 的数据训练
fnd_model = FNDCLIP(bert_path='../../../models/bert-base-chinese', clip_path='../../../models/clip-vit-base-patch32')
train_loader = fnd_model.get_loader(istrain=True, batch_size=16, path='../../../datas/weibo_img_text', ratio=0.2)

# 训练
epochs = 3
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(fnd_model.parameters(), lr=1e-3)
#fnd_model.train_model(train_loader, criterion, optimizer, epochs)
fnd_model.load_state_dict(torch.load('fndclip.pth'))

# 测试
test_loader = fnd_model.get_loader(istrain=False, batch_size=4, path='../../../datas/weibo_img_text', ratio=1.0)
labels, preds, scores = fnd_model.test_model(test_loader)
print('ACC: ', accuracy_score(labels, preds))
print('F1: ', f1_score(labels, preds))

# if accuracy_score(labels, preds) > 0.85:
#     torch.save(fnd_model.state_dict(), 'fndclip.pth')



