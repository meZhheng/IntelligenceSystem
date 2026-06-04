# scripts/import_prop_comments.py
import os
import sys

# 下面这句会把 <项目根> 加入 sys.path，方便导入项目模块
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pickle
from flask import Flask
from app import create_app, db
from app.models import PropagationComment, PropagationCommentClosure, DatasetType, Dataset

PKL_FILE = '/uploads/Weibo/thread_data_all.pkl'  # 存储传播树的 pickle 文件路径，每行是一个 pickle.dump 的 dict 对象
BATCH_SIZE = 10  # 处理时批量大小，方便监控进度

import torch

def load_thread_dicts(pkl_path):
    """
    从 pickle 文件中逐个读取序列化的传播树 dict 对象。
    这里用 pickle.load 而非 torch.load（注释中提到 torch.load 映射到 CPU 的用法）。
    :param pkl_path: pickle 文件路径
    :yield: 读取到的一个传播树 dict 对象
    """
    with open(pkl_path, 'rb') as f:
        while True:
            try:
                # 读取下一个 pickle 对象，文件读完会抛出 EOFError
                tree_dict = pickle.load(f)
                yield tree_dict
            except EOFError:
                # 读完文件，退出循环
                break

def import_tree(tree_dict, dataset_id):
    """
    将单棵传播树（tree_dict）导入数据库，包含传播评论和传播闭包关系表。
    结构说明：
      - tree_dict['id_']：对应帖子 ID（post_id）
      - tree_dict['edge_index'][0][i]：父节点 external_id
      - tree_dict['edge_index'][1][i]：子节点 external_id
      - tree_dict['content']：节点内容字典，key 是 external_id，value 是文本
      - tree_dict['root_text']：根节点内容文本
    :param tree_dict: 单棵传播树的字典表示
    :param dataset_id: 关联的数据集 ID
    """
    external_to_db = {}  # 外部 ID 到数据库中自增 ID 的映射，方便构建 parent-child 关系

    post_id = tree_dict['id_']
    parents, children = tree_dict['edge_index']

    # 找出所有节点的 external_id
    all_nodes = set(parents) | set(children)
    # 根节点是没有父节点的节点
    roots = all_nodes - set(children)

    content = tree_dict['content']

    # 1) 先插入所有根节点（根评论）
    for ext in roots:
        c = PropagationComment(
            dataset_id=dataset_id,
            split='test',  # 这里写死为 'test'，可按需要修改为 'train' 或 'val'
            post_id=post_id,
            content=tree_dict['root_text'],  # 根节点内容
            parent_id=None  # 根节点没有父节点
        )
        db.session.add(c)
        db.session.flush()  # 先 flush，获得 c.id
        external_to_db[ext] = c.id

    # 2) 插入其他节点（子评论）
    for p_ext, c_ext in zip(parents, children):
        # 确保父节点已经插入
        if p_ext not in external_to_db:
            # 如果父节点尚未插入，则先插入父节点，parent_id 设为 None
            parent = PropagationComment(
                dataset_id=dataset_id,
                split='test',
                post_id=post_id,
                content=content[p_ext],
                parent_id=None
            )
            db.session.add(parent)
            db.session.flush()
            external_to_db[p_ext] = parent.id

        # 插入子节点，parent_id 指向父节点的数据库 ID
        child = PropagationComment(
            dataset_id=dataset_id,
            split='test',
            post_id=post_id,
            content=content[c_ext],
            parent_id=external_to_db[p_ext]
        )
        db.session.add(child)
        db.session.flush()
        external_to_db[c_ext] = child.id

    # 3) 插入传播闭包表（PropagationCommentClosure），用于存储祖先-后代关系
    # 这里只插入节点自身的闭包关系(depth=0)和父子关系(depth=1)
    for ext, db_id in external_to_db.items():
        # 自己到自己，depth=0
        db.session.add(PropagationCommentClosure(
            dataset_id=dataset_id,
            split='test',
            ancestor_id=db_id,
            descendant_id=db_id,
            depth=0
        ))
    for p_ext, c_ext in zip(parents, children):
        # 父节点到子节点，depth=1
        db.session.add(PropagationCommentClosure(
            dataset_id=dataset_id,
            split='test',
            ancestor_id=external_to_db[p_ext],
            descendant_id=external_to_db[c_ext],
            depth=1
        ))

    # 提交所有变更到数据库
    db.session.commit()

def main():
    app = create_app()
    with app.app_context():
        # 1. 创建新的数据集实例，标识为传播类数据集
        ds_type = DatasetType.PROPAGATION
        dataset = Dataset(
            name="违法违规和敏感信息传播数据集",
            description=ds_type.description,
            dataset_type=ds_type.name,
            user_id=4,
            valid_fields=['propagation']
        )
        db.session.add(dataset)
        db.session.commit()
        print(f"已创建数据集: id={dataset.id}, name={dataset.name}")

        count = 0
        # 逐个读取 pickle 文件中的传播树字典，导入数据库
        for tree_dict in load_thread_dicts(PKL_FILE):
            import_tree(tree_dict, dataset.id)
            count += 1
            if count % BATCH_SIZE == 0:
                print(f'已导入 {count} 棵树...')
        print(f'导入完成，总共 {count} 棵树。')

# 以下函数和变量用于加载指定 dataset_id 的所有 post_id 并写入文本文件

OUTPUT_TXT = 'post_ids.txt'
TARGET_DATASET_ID = 50

def load_post_ids():
    """
    从数据库中读取指定 dataset_id 的所有去重 post_id，并写入到文本文件。
    """
    app = create_app()
    with app.app_context():
        print(f'正在读取 dataset_id = {TARGET_DATASET_ID} 的所有 post_id...')
        # 查询该数据集下所有不同的 post_id
        post_ids = db.session.query(PropagationComment.post_id)\
            .filter(PropagationComment.dataset_id == TARGET_DATASET_ID)\
            .distinct()\
            .all()

        # SQLAlchemy 返回的是 [(post_id,), ...] 格式，提取出具体值
        post_id_list = [pid[0] for pid in post_ids]

        # 写入到文本文件
        with open(OUTPUT_TXT, 'w', encoding='utf-8') as f:
            for pid in post_id_list:
                f.write(str(pid) + '\n')

        print(f'已写入 {len(post_id_list)} 个 post_id 到 {OUTPUT_TXT}')

if __name__ == '__main__':
    # 运行脚本时执行加载 post_id 并写入文件
    load_post_ids()
