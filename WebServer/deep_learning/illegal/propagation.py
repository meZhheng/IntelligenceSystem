from deep_learning.base_model import BaseModel
from deep_learning.illegal.propa.model import RobertaPromptTuningLM
from deep_learning.illegal.propa.dataloader import PropDataset
from deep_learning.illegal.propa.config import Config
import torch
import torch.nn.functional as F
from torch.nn.parallel import DataParallel
import os
from transformers import AutoTokenizer, AutoModel
from typing import List, Dict

class PropagationCrossDomain(BaseModel):
    def __init__(self, checkpoint_path='/webfile/checkpoints/xlm-roberta-base', model_path='/webfile/checkpoints/propa_cross/83.bin', num_class=2):
        super().__init__()

        # 如果 checkpoint 路径存在，加载预训练模型和分词器
        if os.path.exists(checkpoint_path):
            print('checkpoint loading')
            # 加载分词器
            self.tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)
            # 加载预训练 RoBERTa 模型，关闭 attention 输出
            self.roberta = AutoModel.from_pretrained(checkpoint_path, output_attentions=False)
            self.roberta.eval()  # 设置为评估模式，关闭 dropout
            print('checkpoint loading finished')
        else:
            print(f"模型路径 {checkpoint_path} 不存在，尝试从 Hugging Face Hub 下载。")

        # 模板相关变量
        self.template_ids = None
        self.template_mask = None
        # 定义模板字符串，包含一个 mask token 位置
        self.template = '<s> Here is a piece of news with <mask> information.'
        # 获取模板的编码和 mask 位置
        self.template_ids, self.template_mask = self.get_template()

        # 加载配置对象
        self.config = Config()
        # 设置 mask token 在模板中的位置
        self.config.mask_pos = self.mask_pos
        # 选择设备，优先 CUDA 否则 CPU
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print("Using device: ", self.device)

        # 类别数
        self.num_class = num_class

        # 初始化 PromptTuning 模型骨架，并移动到设备上
        print('Initializing PromptTuningLM from', checkpoint_path)
        self.model = RobertaPromptTuningLM.from_pretrained(
            checkpoint_path, extendConfig=self.config
        ).to(self.device)
        print('Base model loaded.')

        # 加载 fine-tuned 权重
        self.load_finetuned_model(model_path, device=self.device)

        # 测试集占位
        self.test_dataset = None
    
    def load_finetuned_model(self, model_path, device='cpu'):
        """
        加载 fine-tuned 模型参数到 self.model 中。

        :param model_path: 保存的 state_dict 文件路径
        :param device: 加载到哪个设备，'cuda' 或 'cpu'
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"模型文件不存在：{model_path}")

        # 如果模型是 DataParallel 包装的，先获取裸模型，否则用当前模型
        model_to_load = self.model.module if hasattr(self.model, 'module') else self.model

        print(f"Loading fine-tuned weights from {model_path} ...")
        # 加载权重字典
        state_dict = torch.load(model_path, map_location=device)

        # 加载权重，strict=False 允许部分键不匹配
        missing, unexpected = model_to_load.load_state_dict(state_dict, strict=False)

        # 提示未加载和多余的键
        if missing:
            print(f"警告：以下 keys 在模型中没有被加载：{missing}")
        if unexpected:
            print(f"警告：以下 keys 在 state_dict 中多余未使用：{unexpected}")

        # 移动模型到指定设备
        self.model.to(device)
        print("Model weights loaded successfully.")


    def get_template(self):
        """
        获取模板文本对应的 input_ids 和 attention_mask，以及 mask token 位置
        """
        if self.template_ids is None or self.template_mask is None:
            # 使用 tokenizer 编码模板，不自动添加特殊 token
            self.template = self.tokenizer(self.template, return_tensors='pt', add_special_tokens=False)
            self.template_ids = self.template['input_ids']
            self.template_mask = self.template['attention_mask']

            # 找到模板中 mask token 的位置，保存为 self.mask_pos
            self.mask_pos = torch.where(self.template_ids[0] == self.tokenizer.mask_token_id)

        return self.template_ids, self.template_mask
    
    def get_required_fields():
        """
        返回模型所需的输入字段名
        """
        return ['propagation']

    def wrap_tree_for_roberta(self, subtree, top_k=50) -> Dict[str, torch.Tensor]:
        """
        构造模型输入特征：
        - root_ids, root_mask: 根节点文本编码及掩码
        - edge_index_FD, edge_index_BD: 前向和反向边索引列表
        - abs_time: 节点的绝对时间信息（这里用深度代替）
        - rel_pos: 相对位置（深度）
        - ranking_indices: 节点索引列表
        - post_feature: RoBERTa 提取的节点文本特征 [N, hidden_size]
        - rootIndexs: 根节点索引（0）
        - labels: 标签占位，全零
        """

        # 输入的 subtree，节点列表，假设第一个是 root
        nodes = subtree

        # 对 root 文本进行编码
        root_text = nodes[0]['comment']['content']
        root_inputs = self.tokenizer(root_text, return_tensors='pt')
        root_ids = root_inputs['input_ids']  # token id序列
        root_mask = root_inputs['attention_mask']

        # 初始化图结构边列表和特征列表
        edge_forward = [[], []]  # 父->子 边
        edge_backward = [[], []] # 子->父 边
        abs_time = []  # 绝对时间，用深度代替
        rel_pos = []   # 相对位置，深度
        post_texts = []  # 节点文本列表

        # 构造边并收集节点特征
        for idx, node in enumerate(nodes):
            # 记录深度作为时间信息和相对位置
            abs_time.append(float(node['depth']))
            rel_pos.append(node['depth'])
            post_texts.append(node['comment']['content'])

            # 父节点ID
            pid = node['comment']['parent_id']
            if pid is not None:
                # 找父节点索引
                parent_idx = next((i for i, n in enumerate(nodes) if n['comment']['id'] == pid), None)
                if parent_idx is not None:
                    # 添加前向和反向边
                    edge_forward[0].append(parent_idx)
                    edge_forward[1].append(idx)
                    edge_backward[0].append(idx)
                    edge_backward[1].append(parent_idx)

        num_nodes = len(nodes)

        # 节点排序索引，这里用简单的0..N-1编号
        ranking_indices = torch.arange(num_nodes, dtype=torch.long)

        # 用 RoBERTa 编码节点文本，得到特征向量
        inputs = self.tokenizer(post_texts, return_tensors='pt', padding=True, truncation=True)
        with torch.no_grad():
            outputs = self.roberta(inputs['input_ids'], attention_mask=inputs['attention_mask'])
        post_feature = outputs.pooler_output  # shape (N, hidden_size)

        # 标签占位，全零
        labels = torch.zeros(len(nodes), dtype=torch.long)

        return {
            'root_ids': root_ids,
            'root_mask': root_mask,
            'edge_index_FD': torch.tensor(edge_forward, dtype=torch.long),
            'edge_index_BD': torch.tensor(edge_backward, dtype=torch.long),
            'abs_time': torch.tensor(abs_time, dtype=torch.float),
            'rel_pos': torch.tensor(rel_pos, dtype=torch.long),
            'ranking_indices': ranking_indices[:top_k],
            'post_feature': post_feature,
            'rootIndexs': torch.tensor([0], dtype=torch.long),
            'labels': labels
        }

    def predict(self, tree):
        """
        给定一个树结构，进行模型推理预测：
        - 将树包装为模型输入格式
        - 调用 forward 计算 logits
        - 计算预测类别和置信度概率
        - 返回字典包含预测结果和置信度
        """
        self.model.eval()

        # 构造输入
        inputs = self.wrap_tree_for_roberta(tree['subtree'])

        # 前向计算
        logits = self.forward(inputs)

        # 取最大概率对应的类别索引作为预测
        predictions = torch.argmax(logits, dim=1)
        predictions = [p.item() for p in predictions]

        # 计算 softmax 得到概率置信度
        probs = F.softmax(logits, dim=1)
        confidences = probs.detach().cpu().tolist()  # 转成列表，方便序列化

        return {
            'data': predictions,
            'confidences': confidences,
            'status': 'success'
        }
    
    def get_total_steps(self):
        """
        获取测试集总的 batch 数量
        """
        # 如果尚未加载测试集，则加载
        if not self.test_dataset:
            self.test_dataset = PropDataset(
                self.config.data_test,
                tokenizer=self.tokenizer,
                template=self.config.template,
                batch_size=self.config.batch_size_test,
                train=False,
                selection=self.config.ranking,
                top_k=self.config.n_tokens
            )

        return len(self.test_dataset.batches)

    def test_model(self):
        """
        测试模型，遍历测试集，yield 每个 batch 的索引，最终 yield 全部预测和标签
        """
        self.model.eval()

        with torch.no_grad():
            label_lst = []
            prediction_lst = []
            step = 0
            # 逐 batch 获取测试数据
            for batch in self.test_dataset.get_next_thread():
                logits = self.forward(batch)
                predictions = torch.argmax(logits, dim=1)
                predictions = [p.item() for p in predictions]

                prediction_lst.extend(predictions)
                label_lst.extend([l.item() for l in batch['labels']])
                step += 1
                yield step
        
        # 最后输出所有预测和标签
        yield (prediction_lst, label_lst)

    def forward(self, inputs: Dict[str, torch.Tensor]):
        """
        模型前向函数，负责将输入数据送入 PromptTuningLM 模型，返回 logits。

        输入 inputs 字典包含：
        - root_ids, root_mask: 根文本编码和掩码
        - edge_index_FD, edge_index_BD: 边索引（前向和反向）
        - abs_time, rel_pos: 时间和位置特征
        - ranking_indices: 节点排序索引
        - post_feature: 节点文本特征
        - rootIndexs: 根节点索引
        - labels: 标签

        返回模型输出 logits 张量
        """
        root_ids      = inputs['root_ids'].to(self.device)
        root_mask     = inputs['root_mask'].to(self.device)
        edge_index_FD = inputs['edge_index_FD'].to(self.device)
        edge_index_BD = inputs['edge_index_BD'].to(self.device)
        abs_time      = inputs['abs_time'].to(self.device)
        rel_pos       = inputs['rel_pos'].to(self.device)
        ranking_indices = inputs['ranking_indices'].to(self.device)

        post_feature = inputs['post_feature'].to(self.device)
        rootIndexs   = inputs['rootIndexs'].to(self.device)
        labels       = inputs['labels'].to(self.device)

        # 调用模型，传入全部参数，返回 logits
        return self.model(
            root_ids, root_mask, 
            self.template_ids, self.template_mask,
            edge_index_FD, edge_index_BD, 
            rootIndexs, labels, abs_time, rel_pos, ranking_indices, post_feature
        )