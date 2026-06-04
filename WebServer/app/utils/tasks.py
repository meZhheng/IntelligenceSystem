import sys
import time
from rq import get_current_job  # RQ任务队列中获取当前执行任务的API
from app.extensions import db  # 导入数据库实例
from app import create_app  # 导入创建Flask应用的工厂函数
from app.models import User, Task, Dataset, SocialMediaDataset, Model, ApplicationResult, ModelCheckpoint, get_dataset_type, CheckpointResult  # 导入数据库模型
from config import Config  # 导入配置类
from deep_learning.LLMs import DeepSeek  # 深度学习相关模型（此处未使用）
import subprocess  # 用于执行子进程命令（此处未使用）
from flask import Flask, request, Response  # Flask相关组件（此处未使用）
from flask import stream_with_context  # Flask流式响应工具（此处未使用）

import torch  # PyTorch深度学习库（此处未使用）
import torch.nn as nn  # PyTorch神经网络模块（此处未使用）
import torch.optim as optim  # PyTorch优化器模块（此处未使用）
import os  # 操作系统接口（此处未使用）
from app.utils.IterableDataset import IterableDataset
from torch.utils.data import DataLoader
import torch.nn.functional as F

from evaluation.interface import compute_evaluation

# RQ worker 是独立于 Flask 主进程的后台任务进程，因此需要手动创建Flask应用实例
app = create_app(Config)
# 由于需要在worker中访问数据库等Flask上下文相关资源，必须手动推送应用上下文
app.app_context().push()

def test_rq(num):
    '''测试用的简单任务函数，打印数字并等待1秒，模拟耗时任务'''
    print('Starting task')
    for i in range(num):
        print(i)
        time.sleep(1)
    print('Task completed')
    return 'Done'

def _set_task_progress(progress, result=None):
    '''
    设置当前任务的进度和可选的结果
    参数:
        progress: 任务完成的百分比（0~100）
        result: 可选，任务执行结果保存到数据库
    '''
    job = get_current_job()  # 获取当前正在执行的后台任务对象
    if job:
        job.meta['progress'] = progress  # 在任务元数据中更新进度信息
        job.save_meta()  # 保存元数据到Redis
        task = Task.query.get(job.get_id())  # 根据任务ID从数据库查找对应Task记录

        if result:
            task.result = result  # 更新任务结果字段

        if progress >= 100:
            task.complete = True  # 标记任务为完成状态

        db.session.commit()  # 提交数据库事务，保存修改

def inference(*args, **kwargs):
    '''
    模型推理主函数，供RQ worker执行
    处理流程：
        1. 初始化进度为0%
        2. 根据传入参数获取数据集和模型
        3. 逐条执行推理，存储结果（如果需要）
        4. 实时更新任务进度
        5. 异常捕获并记录日志
    '''
    try:
        _set_task_progress(0)  # 任务开始，设置进度为0%
        i = 0  # 记录已处理条目数量

        # 从关键字参数获取输入数据集（字典格式，键为dataset_id，值为数据列表）
        datasets = kwargs.get('datasets')

        # 从关键字参数获取模型ID，并加载对应模型实例
        model_id = kwargs.get('model_id')
        model = Model.query.get_or_404(model_id)  # 查询数据库中的模型对象，找不到会抛出404错误
        model_class = model.get_instance()  # 动态获取模型类
        model_instance = model_class()  # 实例化模型

        # 是否需要存储推理结果
        is_stored = kwargs.get('store_result')

        total_item = kwargs.get('total')  # 总数据条数，用于计算进度百分比
        # 遍历数据集中的所有数据项，执行推理
        for dataset_id, dataset in datasets.items():
            for item in dataset:
                inputs = item.to_dict()  # 将数据项转换成字典形式供模型输入
                result = model_instance.predict(inputs)  # 模型预测

                if is_stored:  # 如果需要存储，则生成ApplicationResult对象保存结果
                    object = ApplicationResult(
                        group_id=kwargs.get('group_id'),
                        dataset_id=dataset_id,
                        model_id=model_id,
                        data_id=item.id,
                        result=result
                    )
                    db.session.add(object)  # 添加到数据库会话
                    db.session.commit()  # 提交写入数据库

                i += 1  # 处理计数加一
                _set_task_progress(100 * i // total_item)  # 更新任务进度，向下取整为整数百分比

    except Exception:
        # 出现任何异常时，写入日志，方便排查
        app.logger.error('后台任务出错了', exc_info=sys.exc_info())


# 支持的损失函数映射字典，方便根据字符串选择对应的损失函数实例
loss_functions = {
    'CE': nn.CrossEntropyLoss(),  # 交叉熵损失，常用于分类任务
    'MSE': nn.MSELoss(),          # 均方误差损失，常用于回归任务
    'L1': nn.L1Loss(),            # L1损失（平均绝对误差）
    'BCE': nn.BCELoss(),          # 二元交叉熵损失，常用于二分类任务
}

# 支持的优化器映射字典，根据字符串获取对应优化器类（还需传入参数实例化）
optimizers = {
    'SGD': optim.SGD,       # 随机梯度下降优化器
    'AdamW': optim.AdamW    # 带权重衰减的Adam优化器
}

def get_free_gpu():
    '''
    查询当前可用的GPU索引（内存使用为0的GPU）
    返回：
        可用GPU的索引(int)，如果没有空闲GPU或查询失败返回None
    具体实现：
        1. 通过 subprocess 调用 nvidia-smi 命令，获取所有GPU已使用显存（单位MB）
        2. 将输出按行拆分，转换成整数列表
        3. 遍历显存使用列表，返回第一个内存使用为0的GPU索引
        4. 若无空闲GPU则返回None
        5. 捕获异常并打印错误，保证函数稳定性
    '''
    try:
        # 运行nvidia-smi命令查询所有GPU的已用显存，不带单位和表头，便于解析
        result = subprocess.run(['nvidia-smi', '--query-gpu=memory.used', '--format=csv,nounits,noheader'],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        # 解析命令输出，每一行代表一个GPU的已用显存数值（单位MB）
        gpu_memory_used = [int(memory) for memory in result.stdout.strip().split('\n')]
        # 找到第一个显存使用为0的GPU索引，表示该GPU空闲
        for i, memory in enumerate(gpu_memory_used):
            if memory == 0:
                return i
        # 如果没有空闲GPU，返回None
        return None
    except Exception as e:
        # 捕获异常（比如nvidia-smi未安装、无GPU或权限不足），打印错误信息
        print(f"Error getting GPU information: {e}")
        return None

def train(*args, **kwargs):
    '''模型训练函数，供RQ后台任务调用'''
    try:  # rq worker独立进程运行，捕获异常防止崩溃
        _set_task_progress(0)  # 任务开始，进度设置为0%

        # 从数据库中获取训练检查点对象（包含模型、用户信息等）
        checkpoint = ModelCheckpoint.query.get(kwargs.get('checkpoint_id'))
        # 从传入参数中获取训练超参数字典
        hyperparameters = kwargs.get('hyperparameters')

        # 根据checkpoint关联的模型ID，动态获取模型类并实例化
        model_class = Model.query.get_or_404(checkpoint.model_id).get_instance()
        model = model_class()

        # 获取训练和测试数据加载器，批大小固定为1（注释代码中有可传入批大小的示例）
        # train_loader, test_loader = model.get_loader(hyperparameters['batch_size'])
        dataset = get_dataset_type(Dataset.query.get_or_404(checkpoint.trainset_id).dataset_type)
        required_fields=model.get_required_fields()
        # 强制确保 'label' 在里面
        if 'label' not in required_fields:
            required_fields.append('label')
        if 'id' not in required_fields:
            required_fields.append('id')

        stream_ds = IterableDataset(
            session_factory=db.session,
            dataset_class=dataset,
            dataset_id=checkpoint.trainset_id,
            required_fields=required_fields
        )

        # device = torch.device(hyperparameters['device'])

        train_loader = DataLoader(stream_ds, batch_size=hyperparameters['batch_size'])
        test_loader = DataLoader(stream_ds, batch_size=hyperparameters['batch_size'])
        
        # 获取损失函数名称，默认交叉熵损失
        loss_name = hyperparameters.get('loss_function', 'CE')
        # 检查损失函数是否支持，否则打印错误
        if loss_name not in loss_functions:
            print("Unsupported loss function: {loss_name}", 400)
        criterion = loss_functions[loss_name]  # 根据名称获取损失函数实例

        # 获取优化器名称和学习率，默认SGD和0.01
        optimizer_name = hyperparameters.get('optimizer', 'SGD')
        lr = hyperparameters.get('learning_rate', 0.01)
        if optimizer_name not in optimizers:
            print("Unsupported optimizer: {optimizer_name}", 400)
        # 创建优化器实例，传入模型参数和学习率
        optimizer = optimizers[optimizer_name](model.model.parameters(), lr=lr)

        # 获取训练轮数，默认10轮
        epochs = hyperparameters.get('epochs', 10)

        # 用于保存训练过程的损失值，供任务进度展示或后续分析
        result = {
            'loss': []
        }

        # 将超参数保存到检查点对象，写入数据库
        checkpoint.hyperparameters = hyperparameters
        db.session.commit()

        total_steps = epochs * len(train_loader)  # 总训练步数（批次数 * 轮数）
        step = 0  # 当前训练步数计数器
        model.model.train()  # 切换模型到训练模式
        for epoch in range(epochs):  # 迭代每个epoch
            epoch_loss = 0  # 记录该轮的累计损失
            for index, batch in enumerate(train_loader):  # 迭代每个batch
                optimizer.zero_grad()  # 梯度清零，准备反向传播
                # 1. 准备好输入和标签
                labels = batch['label']  # e.g. tensor([…, sequence_length])
                inputs = batch['text']   # e.g. tensor([0,1,0,1])

                # 2. 前向，得到 preds
                #    假设 model 输出 raw logits or 已做 sigmoid/softmax 后的概率
                preds = model.model(inputs)             # e.g. torch.Size([batch, 2])

                # 3. 计算 loss
                if loss_name == 'CE':
                    # CrossEntropyLoss 接受 raw logits + class idx
                    # 如果你的 model 已经在输出层做了 softmax，请改为传 logits（去掉 softmax）
                    loss = criterion(preds, labels)

                else:
                    # 其它损失都需要 one-hot 或概率对比
                    # 把 labels 转成 one-hot，各损失才能和 preds（shape=[B,2]）对齐
                    labels_onehot = F.one_hot(labels, num_classes=preds.size(1)).float()

                    if loss_name in ('MSE', 'L1'):
                        # MSE/L1：对比概率（或 logits），一般配合 sigmoid/softmax 后的 preds
                        loss = criterion(preds, labels_onehot)

                    elif loss_name == 'BCE':
                        # BCE 要求输入是概率（0~1）且 target 在 [0,1]
                        # 如果你的 model 输出 logits，建议换成 BCEWithLogitsLoss
                        loss = criterion(preds, labels_onehot)

                    else:
                        raise ValueError(f"Unknown loss_name: {loss_name}")
                
                # 4. 反向 + 更新
                loss.backward()  # 反向传播计算梯度
                optimizer.step()  # 参数更新
                epoch_loss += loss.item()  # 累加损失值

                # 将当前步的平均损失保存到结果字典
                result['loss'].append({
                    'step': step,
                    'loss': epoch_loss / (index + 1)
                })
                
                step += 1
                # 更新任务进度，传入当前进度和训练损失结果
                _set_task_progress(100 * step // total_steps, result=result)

        # 训练完成后，准备保存模型权重
        base_path = "/deeplearning/checkpoints"  # 权重保存的根目录

        # 构造以用户ID命名的子目录，确保目录存在
        user_dir = os.path.join(base_path, str(checkpoint.user_id))
        os.makedirs(user_dir, exist_ok=True)

        # 构造权重文件的完整路径，文件名使用checkpoint的ID，后缀.pth
        save_path = os.path.join(user_dir, f"{checkpoint.id}.pth")

        torch.save(model.model.state_dict(), save_path)  # 保存模型参数字典到文件
        # print(os.path.getsize(save_path))  # 打印保存文件大小，确认文件写入情况
        
        # 如果文件存在且大小大于0，更新checkpoint对象中的路径和大小信息
        if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
            checkpoint.checkpoint_path = save_path
            checkpoint.size = os.path.getsize(save_path)
            db.session.commit()  # 提交数据库修改
        else:
            print("文件保存失败或为空")  # 保存失败的提示

        # 在 test 集上评估，收集所有 labels 和 preds
        model.model.eval()
        all_labels = []
        all_preds  = []
        data_ids = []
        with torch.no_grad():
            for batch in test_loader:
                inputs = batch['text']
                labels = batch['label']
                
                outputs = model.model(inputs)           # [B, C] logits 或概率
                # 如果是多分类，用 argmax；二分类用 sigmoid + 0.5 threshold 也可以
                _, preds = torch.max(outputs, dim=1)    # preds: [B]
                
                all_labels.extend(labels.cpu().tolist())
                all_preds.extend(preds.cpu().tolist())
                data_ids.extend(batch['id'].cpu().tolist())

        class_names = model.get_class_names()
        metrics = compute_evaluation(all_preds, all_labels, class_names)
        checkpoint.metrics = metrics
        db.session.commit()

        for pred, data_id in zip(all_preds, data_ids):
            checkpoint_result = CheckpointResult(
                dataset_id=checkpoint.trainset_id,
                checkpoint_id=checkpoint.id,
                data_id=data_id,
                result=class_names[pred]
            )
            db.session.add(checkpoint_result)

        db.session.commit()

    except Exception:
        # 出现异常时写入日志，方便排查
        app.logger.error('后台训练任务出错了', exc_info=sys.exc_info())
