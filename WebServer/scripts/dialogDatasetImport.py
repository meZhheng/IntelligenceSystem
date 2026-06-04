import os
import json
import sys

# 将项目根目录（当前文件所在目录的上级目录）加入系统模块搜索路径 sys.path
# 这样可以方便地导入项目中的其他模块
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import DialogSession, DialogUtterance, DatasetType, Dataset

# --- 配置相关常量 ---
BASE_DIR = '/uploads/IEMOCAP'  # 数据根目录，包含对话顺序文件和原始文本目录
ORDERED_FILE = os.path.join(BASE_DIR, 'utterance-ordered.json')  # 会话顺序 JSON 文件路径
RAW_TEXTS_DIR = os.path.join(BASE_DIR, 'raw-texts')  # 原始文本文件夹路径，包含 train/ val/ test 子目录


def load_json(path):
    """
    读取指定路径的 JSON 文件，并返回解析后的 Python 对象
    :param path: JSON 文件路径
    :return: JSON 解析结果（通常是 dict 或 list）
    """
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    # 创建 Flask 应用实例，并进入应用上下文，保证数据库操作等正常运行
    app = create_app()
    with app.app_context():
        # 1. 新建一个 Dataset 实例，用于存储该交互式对话数据集的信息
        # DatasetType.INTERACTIVE_DIALOGUE 是枚举类型，包含数据集类型和描述
        ds_type = DatasetType.INTERACTIVE_DIALOGUE
        dataset = Dataset(
            name="交互式对话数据集",                # 数据集名称
            description=ds_type.description,       # 数据集描述，来自 DatasetType 枚举
            dataset_type=ds_type.name,             # 数据集类型标识字符串
            user_id=4,                            # 关联的用户 ID，假设用户 4 是创建者
            valid_fields=['text', 'start_time', 'end_time', 'speaker', 'emotion']  # 数据有效字段
        )
        # 将新数据集添加到数据库会话中
        db.session.add(dataset)
        # 提交事务，写入数据库
        db.session.commit()
        print(f"已创建数据集: id={dataset.id}, name={dataset.name}")

        # 2. 载入会话顺序的 JSON 文件，获取不同数据划分(split)及对应的会话列表
        ordered = load_json(ORDERED_FILE)

        # 3. 遍历每个数据划分(split)，逐个插入父级会话节点及其子条目
        for split, sessions in ordered.items():
            print(f"处理 split: {split}, 会话数量: {len(sessions)}")
            # 对应该 split 的原始文本目录路径
            split_dir = os.path.join(RAW_TEXTS_DIR, split)

            # 遍历所有会话，每个会话由会话编码和其包含的 utterance 编码列表组成
            for session_code, utter_ids in sessions.items():
                # 查询数据库中是否已有该会话记录（同一数据集下，唯一 session_code）
                existing_sess = DialogSession.query.filter_by(
                    dataset_id=dataset.id,
                    session_code=session_code
                ).first()
                if not existing_sess:
                    # 如果不存在，则新建该会话实体
                    sess = DialogSession(
                        dataset_id=dataset.id,
                        split=split,
                        session_code=session_code,
                        utterance_ids=utter_ids  # 该会话包含的 utterance ID 列表
                    )
                    # 添加到数据库会话
                    db.session.add(sess)
                else:
                    # 若已存在，则直接复用
                    sess = existing_sess

                # 遍历该会话中的每条 utterance 编码
                for utt_code in utter_ids:
                    # 判断该 utterance 是否已经存在数据库中，避免重复插入
                    if DialogUtterance.query.filter_by(
                        dataset_id=dataset.id,
                        utterance_code=utt_code
                    ).first():
                        continue  # 已存在则跳过

                    # 构造该 utterance 的 JSON 文件路径
                    utt_file = os.path.join(split_dir, f'{utt_code}.json')
                    # 如果文件不存在，则输出警告并跳过
                    if not os.path.exists(utt_file):
                        print(f"缺少 utterance 文件: {utt_file}")
                        continue

                    # 载入 utterance 具体数据
                    data = load_json(utt_file)
                    # 创建 DialogUtterance 实例，存储一条对话语句的详细信息
                    utt = DialogUtterance(
                        dataset_id=dataset.id,
                        split=split,
                        utterance_code=utt_code,
                        text=data.get('Utterance', ''),             # 对话文本内容
                        start_time=float(data.get('StartTime', 0)), # 起始时间，转为浮点数
                        end_time=float(data.get('EndTime', 0)),     # 结束时间，转为浮点数
                        speaker=data.get('Speaker'),                  # 说话人
                        emotion=data.get('Emotion'),                  # 情绪标签
                        session_code=session_code                      # 所属会话编码
                    )
                    # 添加到数据库会话中
                    db.session.add(utt)

            # 每处理完一个 split，统一提交数据库事务，避免过长事务
            db.session.commit()
            print(f"Completed import for split: {split}")

        # 所有数据导入完成的提示
        print("所有数据已导入完成！")


# 脚本入口，直接运行时执行 main 函数
if __name__ == '__main__':
    main()
