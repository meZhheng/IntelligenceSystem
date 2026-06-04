import os
import numpy as np
import torch as th
import torch
import random
from torch.utils.data import Dataset
from torch_geometric.data import Data, Batch
# from torch_scatter import scatter_mean
from torch_geometric.nn import global_mean_pool
import torch.nn.functional as F
from torch_geometric.loader import DataLoader
from tqdm import tqdm
from torch_geometric.nn import GCNConv
import copy
import pandas as pd

random.seed(666)

def evaluationclass(prediction, y):  # 2 dim
    TP1, FP1, FN1, TN1 = 0, 0, 0, 0
    TP2, FP2, FN2, TN2 = 0, 0, 0, 0
    for i in range(len(y)):
        Act, Pre = y[i], prediction[i]

        ## for class 1
        if Act == 0 and Pre == 0: TP1 += 1
        if Act == 0 and Pre != 0: FN1 += 1
        if Act != 0 and Pre == 0: FP1 += 1
        if Act != 0 and Pre != 0: TN1 += 1
        ## for class 2
        if Act == 1 and Pre == 1: TP2 += 1
        if Act == 1 and Pre != 1: FN2 += 1
        if Act != 1 and Pre == 1: FP2 += 1
        if Act != 1 and Pre != 1: TN2 += 1

    ## print result
    Acc_all = round(float(TP1 + TP2) / float(len(y) ), 4)
    Acc1 = round(float(TP1 + TN1) / float(TP1 + TN1 + FN1 + FP1), 4)
    if (TP1 + FP1)==0:
        Prec1 =0
    else:
        Prec1 = round(float(TP1) / float(TP1 + FP1), 4)
    if (TP1 + FN1 )==0:
        Recll1 =0
    else:
        Recll1 = round(float(TP1) / float(TP1 + FN1 ), 4)
    if (Prec1 + Recll1 )==0:
        F1 =0
    else:
        F1 = round(2 * Prec1 * Recll1 / (Prec1 + Recll1 ), 4)

    Acc2 = round(float(TP2 + TN2) / float(TP2 + TN2 + FN2 + FP2), 4)
    if (TP2 + FP2)==0:
        Prec2 =0
    else:
        Prec2 = round(float(TP2) / float(TP2 + FP2), 4)
    if (TP2 + FN2 )==0:
        Recll2 =0
    else:
        Recll2 = round(float(TP2) / float(TP2 + FN2 ), 4)
    if (Prec2 + Recll2 )==0:
        F2 =0
    else:
        F2 = round(2 * Prec2 * Recll2 / (Prec2 + Recll2 ), 4)

    return  Acc_all,Acc1, Prec1, Recll1, F1,Acc2, Prec2, Recll2, F2

class EarlyStopping():
    """Early stops the training if validation loss doesn't improve after a given patience."""
    def __init__(self, patience=7, verbose=False):
        """
        Args:
            patience (int): How long to wait after last time validation loss improved.
                            Default: 7
            verbose (bool): If True, prints a message for each validation loss improvement.
                            Default: False
        """
        self.patience = patience
        self.verbose = verbose
        self.counter = 0
        self.best_acc = None
        self.early_stop = False
        self.accs=0
        self.F1=0
        self.F2 = 0
        self.F3 = 0
        self.F4 = 0

    def __call__(self, val_loss, accs,acc1,acc2,pre1,pre2,rec1,rec2,F1,F2,model, save_path):


        if self.best_acc is None:
            self.best_acc = accs
            self.accs = accs
            self.acc1=acc1
            self.acc2=acc2
            self.pre1=pre1
            self.pre2=pre2
            self.rec1=rec1
            self.rec2=rec2
            self.F1 = F1
            self.F2 = F2
            self.save_checkpoint(val_loss, model, save_path)
        
        elif accs < self.best_acc:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        
        else:
            self.best_acc = accs
            self.accs = accs
            self.acc1=acc1
            self.acc2=acc2
            self.pre1=pre1
            self.pre2=pre2
            self.rec1=rec1
            self.rec2=rec2
            self.F1 = F1
            self.F2 = F2
            self.save_checkpoint(val_loss, model, save_path)
            self.counter = 0

    def save_checkpoint(self, val_loss, model, save_path = 'BiGCN_weibo.pth'):
        '''Saves model when validation loss decrease.'''
        if self.verbose:
            print('Saving model ...')
        torch.save(model.state_dict(), save_path)

class BiGraphDataset(Dataset):
    def __init__(self, fold_x, treeDic,lower=2, upper=100000, tddroprate=0,budroprate=0,
                 data_path='E:/BiGCN/Weibograph/'):
        self.fold_x = list(filter(lambda id: id in treeDic and len(treeDic[id]) >= lower and len(treeDic[id]) <= upper, fold_x))
        self.treeDic = treeDic
        self.data_path = data_path
        self.tddroprate = tddroprate
        self.budroprate = budroprate

    def __len__(self):
        return len(self.fold_x)

    def __getitem__(self, index):
        id =self.fold_x[index]
        #print('loading', id)
        data=np.load(os.path.join(self.data_path, id + ".npz"), allow_pickle=True)

        edgeindex = data['edgeindex']
        if self.tddroprate > 0:
            row = list(edgeindex[0])
            col = list(edgeindex[1])
            length = len(row)
            poslist = random.sample(range(length), int(length * (1 - self.tddroprate)))
            poslist = sorted(poslist)
            row = list(np.array(row)[poslist])
            col = list(np.array(col)[poslist])
            new_edgeindex = [row, col]
        else:
            new_edgeindex = edgeindex

        burow = list(edgeindex[1])
        bucol = list(edgeindex[0])
        if self.budroprate > 0:
            length = len(burow)
            poslist = random.sample(range(length), int(length * (1 - self.budroprate)))
            poslist = sorted(poslist)
            row = list(np.array(burow)[poslist])
            col = list(np.array(bucol)[poslist])
            bunew_edgeindex = [row, col]
        else:
            bunew_edgeindex = [burow,bucol]
        return Data(x=torch.tensor(data['x'],dtype=torch.float32),
                    edge_index=torch.LongTensor(new_edgeindex),BU_edge_index=torch.LongTensor(bunew_edgeindex),
             y=torch.LongTensor([int(data['y'])]), root=torch.LongTensor(data['root']),
             rootindex=torch.LongTensor([int(data['rootindex'])]))

def loadTree(treePath):
    print("reading Weibo tree")
    treeDic = {}
    for line in open(treePath):
        line = line.rstrip()
        eid, indexP, indexC,Vec = line.split('\t')[0], line.split('\t')[1], int(line.split('\t')[2]),line.split('\t')[3]

        if not treeDic.__contains__(eid):
            treeDic[eid] = {}
        treeDic[eid][indexC] = {'parent': indexP, 'vec': Vec}
    print('tree no:', len(treeDic))
    return treeDic

def loadBiData(treeDic, fold_x_train, fold_x_test, TDdroprate=0, BUdroprate=0, data_path=None):
    print("loading train set", )
    traindata_list = BiGraphDataset(fold_x_train, treeDic, tddroprate=TDdroprate, budroprate=BUdroprate, data_path=data_path)
    print("train no:", len(traindata_list))
    print("loading test set", )
    testdata_list = BiGraphDataset(fold_x_test, treeDic, data_path=data_path)
    print("test no:", len(testdata_list))
    return traindata_list, testdata_list


'''
def loadFoldData(label_path='./data/Weibo/weibo_id_label.txt'):
    
    labelPath = label_path
    print("loading weibo label:")
    F, T = [], []
    labelDic = {}
    for line in open(labelPath):
        line = line.rstrip()
        eid,label = line.split(' ')[0], line.split(' ')[1]

        if not os.path.exists(f'E:/BiGCN/Weibograph/{eid}.npz'):
            continue

        labelDic[eid] = int(label)
        if labelDic[eid]==0:
            F.append(eid)
        if labelDic[eid]==1:
            T.append(eid)

    print(len(labelDic))
    random.shuffle(F)
    random.shuffle(T)

    print(F[0], len(F))
    print(T[0], len(T))

    F = F[:500]
    T = T[:500]

    l1 = len(F)
    l2 = len(T)

    fold0_x_test = []
    fold0_x_train = []
    leng1 = int(l1 * 0.2)
    leng2 = int(l2 * 0.2)
    fold0_x_test.extend(F[0:leng1])
    fold0_x_test.extend(T[0:leng2])
    fold0_x_train.extend(F[leng1:])
    fold0_x_train.extend(T[leng2:])
    
    fold0_test = list(fold0_x_test)
    random.shuffle(fold0_test)
    fold0_train = list(fold0_x_train)
    random.shuffle(fold0_train)
    
    return list(fold0_train), list(fold0_test)
'''
    

def load_train_test_data(train_path = './weibo_dataset/train.csv', test_path = './weibo_dataset/test.csv'):
    df1 = pd.read_csv(train_path)
    df2 = pd.read_csv(test_path)

    train_set = [ str(eid) for eid in list(df1['id'])]
    test_set = [ str(eid) for eid in list(df2['id'])]

    return train_set, test_set
    
    
class TDrumorGCN(th.nn.Module):
    def __init__(self,in_feats,hid_feats,out_feats):
        super(TDrumorGCN, self).__init__()
        self.conv1 = GCNConv(in_feats, hid_feats)
        self.conv2 = GCNConv(hid_feats+in_feats, out_feats)
        self.device = th.device('cuda' if th.cuda.is_available() else 'cpu')

    def forward(self, data):
        x, edge_index = data.x, data.edge_index
        x1=copy.copy(x.float())
        x = self.conv1(x, edge_index)
        x2=copy.copy(x)
        rootindex = data.rootindex
        root_extend = th.zeros(len(data.batch), x1.size(1)).to(self.device)
        batch_size = max(data.batch) + 1
        for num_batch in range(batch_size):
            index = (th.eq(data.batch, num_batch))
            root_extend[index] = x1[rootindex[num_batch]]
        x = th.cat((x,root_extend), 1)
        x = F.relu(x)
        x = F.dropout(x, training=self.training)
        x = self.conv2(x, edge_index)
        x=F.relu(x)
        root_extend = th.zeros(len(data.batch), x2.size(1)).to(self.device)
        for num_batch in range(batch_size):
            index = (th.eq(data.batch, num_batch))
            root_extend[index] = x2[rootindex[num_batch]]
        x = th.cat((x,root_extend), 1)
        x= global_mean_pool(x, data.batch)
        return x

class BUrumorGCN(th.nn.Module):
    def __init__(self,in_feats,hid_feats,out_feats):
        super(BUrumorGCN, self).__init__()
        self.conv1 = GCNConv(in_feats, hid_feats)
        self.conv2 = GCNConv(hid_feats+in_feats, out_feats)
        self.device = th.device('cuda' if th.cuda.is_available() else 'cpu')

    def forward(self, data):
        x, edge_index = data.x, data.BU_edge_index
        x1 = copy.copy(x.float())
        x = self.conv1(x, edge_index)
        x2 = copy.copy(x)
        rootindex = data.rootindex
        root_extend = th.zeros(len(data.batch), x1.size(1)).to(self.device)
        batch_size = max(data.batch) + 1
        for num_batch in range(batch_size):
            index = (th.eq(data.batch, num_batch))
            root_extend[index] = x1[rootindex[num_batch]]
        x = th.cat((x,root_extend), 1)
        x = F.relu(x)
        x = F.dropout(x, training=self.training)
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        root_extend = th.zeros(len(data.batch), x2.size(1)).to(self.device)
        for num_batch in range(batch_size):
            index = (th.eq(data.batch, num_batch))
            root_extend[index] = x2[rootindex[num_batch]]
        x = th.cat((x,root_extend), 1)
        x= global_mean_pool(x, data.batch)
        return x

class BiGCN(th.nn.Module):
    def __init__(self,in_feats=5000,hid_feats=64,out_feats=64, tree_path='/webfile/test_data/BiGCN/weibo_dataset/weibotree.txt', graph_path='/webfile/test_data/BiGCN/Weibograph/'):
        super(BiGCN, self).__init__()
        self.TDrumorGCN = TDrumorGCN(in_feats, hid_feats, out_feats)
        self.BUrumorGCN = BUrumorGCN(in_feats, hid_feats, out_feats)
        self.fc=th.nn.Linear((out_feats+hid_feats)*2,2)
        self.device = th.device('cuda' if th.cuda.is_available() else 'cpu')
        self.tree_path = tree_path
        self.tree_dic = loadTree(treePath=tree_path)
        self.graph_path = graph_path
        self.early_stopping = None

        self.to(self.device)

    def forward(self, data):
        TD_x = self.TDrumorGCN(data)
        BU_x = self.BUrumorGCN(data)
        x = th.cat((BU_x,TD_x), 1)
        x=self.fc(x)
        x = F.log_softmax(x, dim=1)
        return x

    def get_required_fields():
        return ['propagation']

    def predict(self, ids):
        self.eval()
        if not isinstance(ids, list):
            ids = [ids]

        inputs = []
        for id in ids:

            if not os.path.exists(os.path.join(self.graph_path, id + ".npz")):
                print('Please load graph first')
                return


            data=np.load(os.path.join(self.graph_path, id + ".npz"), allow_pickle=True)
            edgeindex = data['edgeindex']

            burow = list(edgeindex[1])
            bucol = list(edgeindex[0])
            bunew_edgeindex = [burow,bucol]


            inputs.append(Data(x=torch.tensor(data['x'],dtype=torch.float32),
                        edge_index=torch.LongTensor(edgeindex),BU_edge_index=torch.LongTensor(bunew_edgeindex),
                y=torch.LongTensor([int(data['y'])]), root=torch.LongTensor(data['root']),
                rootindex=torch.LongTensor([int(data['rootindex'])])))
    
        batch = Batch.from_data_list(inputs).to(self.device)
        
        out_labels = self(batch)
        
        _, pred = out_labels.max(dim=1)

        pred = [p.cpu().item() for p in pred]

        return {
            'data': pred,
            'status': 'success',
        }
    
    def get_loader(self, x_train,x_test, batchsize=8, TDdroprate=0,BUdroprate=0):
        #treeDic = loadTree(self.tree_path)
        treeDic = self.tree_dic
        traindata_list, testdata_list = loadBiData(treeDic, x_train, x_test, TDdroprate,BUdroprate, data_path=self.graph_path)
        train_loader = DataLoader(traindata_list, batch_size=batchsize,
                                shuffle=False)
        test_loader = DataLoader(testdata_list, batch_size=1,
                                shuffle=True)
        
        return train_loader, test_loader
    
    def train_model(self, train_loader, test_loader, n_epochs=10, lr=0.01, weight_decay=1e-4, patience=3):
        BU_params=list(map(id, self.BUrumorGCN.conv1.parameters()))
        BU_params += list(map(id, self.BUrumorGCN.conv2.parameters()))
        base_params=filter(lambda p:id(p) not in BU_params, self.parameters())
        optimizer = th.optim.Adam([
            {'params':base_params},
            {'params':self.BUrumorGCN.conv1.parameters(),'lr':lr/5},
            {'params': self.BUrumorGCN.conv2.parameters(), 'lr': lr/5}
        ], lr=lr, weight_decay=weight_decay)
        
        train_losses,train_accs = [],[]
        self.early_stopping = EarlyStopping(patience=patience, verbose=True)
        for epoch in range(n_epochs):
            print('Strat Epoch: ', epoch)
            self.train()
            
            avg_loss,avg_acc = [],[]
            batch_idx = 0
            for Batch_data in train_loader:
                #print(f"Allocated: {torch.cuda.memory_allocated() / 1024**2:.1f} MB")
                #print(f"Cached: {torch.cuda.memory_reserved() / 1024**2:.1f} MB")
                print(f'Epoch: {epoch}  ', f'Batch: {batch_idx}')
                Batch_data.to(self.device)
                out_labels = self(Batch_data)
                loss = F.nll_loss(out_labels, Batch_data.y)
                optimizer.zero_grad()
                loss.backward()
                avg_loss.append(loss.item())
                optimizer.step()
                _, pred = out_labels.max(dim=-1)
                correct = pred.eq(Batch_data.y).sum().item()
                train_acc = correct / len(Batch_data.y)
                avg_acc.append(train_acc)
                batch_idx = batch_idx + 1

            train_losses.append(np.mean(avg_loss))
            train_accs.append(np.mean(avg_acc))

            print('Epoch: ', epoch)
            res = self.val_model(test_loader, early=True)
            torch.cuda.empty_cache()

            if res[0] > 0.9:
                torch.save(self.state_dict(), 'BiGCN_weibo.pth')
                break

        return train_losses, train_accs
    
    def val_model(self, test_loader, early = False):
        val_losses, val_accs = [], []
        temp_val_losses,temp_val_accs,temp_val_Acc_all, temp_val_Acc1, temp_val_Prec1, temp_val_Recll1, temp_val_F1, \
        temp_val_Acc2, temp_val_Prec2, temp_val_Recll2, temp_val_F2 = [],[],[], [], [], [], [], [], [], [], []
        self.eval()

        for Batch_data in test_loader:
            Batch_data.to(self.device)
            val_out = self(Batch_data)
            val_loss = F.nll_loss(val_out, Batch_data.y)
            temp_val_losses.append(val_loss.item())
            _, val_pred = val_out.max(dim=1)
            correct = val_pred.eq(Batch_data.y).sum().item()
            val_acc = correct / len(Batch_data.y)
            Acc_all, Acc1, Prec1, Recll1, F1, Acc2, Prec2, Recll2, F2 = evaluationclass(
                val_pred, Batch_data.y)
            temp_val_Acc_all.append(Acc_all), temp_val_Acc1.append(Acc1), temp_val_Prec1.append(
                Prec1), temp_val_Recll1.append(Recll1), temp_val_F1.append(F1), \
            temp_val_Acc2.append(Acc2), temp_val_Prec2.append(Prec2), temp_val_Recll2.append(
                Recll2), temp_val_F2.append(F2)
            temp_val_accs.append(val_acc)
        val_losses.append(np.mean(temp_val_losses))
        val_accs.append(np.mean(temp_val_accs))
        print("Val_Loss {:.4f}| Val_Accuracy {:.4f}".format(np.mean(temp_val_losses), np.mean(temp_val_accs)))

        res = ['acc:{:.4f}'.format(np.mean(temp_val_Acc_all)),
            'C1:{:.4f},{:.4f},{:.4f},{:.4f}'.format(np.mean(temp_val_Acc1), np.mean(temp_val_Prec1),
                                                    np.mean(temp_val_Recll1), np.mean(temp_val_F1)),
            'C2:{:.4f},{:.4f},{:.4f},{:.4f}'.format(np.mean(temp_val_Acc2), np.mean(temp_val_Prec2),
                                                    np.mean(temp_val_Recll2), np.mean(temp_val_F2))]
        print('results:', res)
        if early:
            self.early_stopping(np.mean(temp_val_losses), np.mean(temp_val_Acc_all), np.mean(temp_val_Acc1),
                        np.mean(temp_val_Acc2), np.mean(temp_val_Prec1),
                        np.mean(temp_val_Prec2), np.mean(temp_val_Recll1), np.mean(temp_val_Recll2),
                        np.mean(temp_val_F1),
                        np.mean(temp_val_F2), self, 'BiGCN_weibo.pth')
        accs = np.mean(temp_val_Acc_all)
        acc1 = np.mean(temp_val_Acc1)
        acc2 = np.mean(temp_val_Acc2)
        pre1 = np.mean(temp_val_Prec1)
        pre2 = np.mean(temp_val_Prec2)
        rec1 = np.mean(temp_val_Recll1)
        rec2 = np.mean(temp_val_Recll2)
        F1 = np.mean(temp_val_F1)
        F2 = np.mean(temp_val_F2)

        return accs, acc1, pre1, rec1, F1, acc2, pre2, rec2, F2

    def get_total_steps(self, test_path = '/webfile/test_data/weibo_prob/test.csv'): 
        train_set, test_set = load_train_test_data(train_path=test_path, test_path=test_path)
        train_loader, test_loader = self.get_loader(train_set, test_set)

        return len(test_loader)


    def test_model(self, test_path = '/webfile/test_data/weibo_prob/test.csv'):

        self.load_state_dict(torch.load('/webfile/checkpoints/illegal/BiGCN_weibo.pth', map_location=self.device))
        
        train_set, test_set = load_train_test_data(train_path=test_path, test_path=test_path)

        train_loader, test_loader = self.get_loader(train_set, test_set)

        true_labels = []
        pred_labels = []

        step = 0

        for Batch_data in test_loader:
            Batch_data.to(self.device)
            val_out = self(Batch_data)

            _, val_pred = val_out.max(dim=1)

            label = [l.cpu() for l in Batch_data.y]

            pred = [p.cpu().item() for p in val_pred]

            pred_labels += pred
            true_labels += label

            step+=1

            yield step
        
        yield (pred_labels, true_labels)
        #return true_labels, pred_labels



    


if __name__ == '__main__':

    bigcn = BiGCN()

    # random sample train, test set
    #train_set, test_set = loadFoldData()
    #print(len(train_set), len(test_set))

    # with open('train.txt', 'w') as f:
    #     for item in train_set:
    #         f.write(str(item) + '\n')
    # with open('test.txt', 'w') as f:
    #     for item in test_set:
    #         f.write(str(item) + '\n')


    train_set, test_set = load_train_test_data()
    print(len(train_set), len(test_set))

    train_loader, test_loader = bigcn.get_loader(train_set, test_set)

    #bigcn.train_model(train_loader, test_loader)
    bigcn.load_state_dict(torch.load('BiGCN_weibo.pth'))
    bigcn.val_model(test_loader, early=False)

    pred = bigcn.predict(['3508583058869083', '3909231033736573'])
    print(pred)

