# utils/export_helpers.py
from app.models import DatasetType, SocialMediaDataset, MultiModalImageDataset, PropagationComment, PropagationCommentClosure, Dataset, DialogUtterance, DialogSession, IllegalAccountDetection, AccountRoleRecognition
from openpyxl import Workbook  # Excel操作库
import io, zipfile, os
from flask import current_app, send_file, after_this_request, abort  # Flask上下文及文件发送函数
from app.extensions import db
import json
import re
from sqlalchemy import asc
import tempfile

def export_dialog_dataset(items, dataset: Dataset):
    '''
    导出对话数据集，包括DialogSession和DialogUtterance两张表的数据，
    保存为Excel文件，返回Flask的send_file用于文件下载。
    参数:
        items: DialogSession列表
        dataset: Dataset对象，主要用于命名文件
    '''
    # 初始化Excel工作簿和第一个工作表（Sessions）
    wb = Workbook()
    ws_sessions = wb.active
    ws_sessions.title = "Sessions"

    # 如果存在DialogSession数据，则写入表头和数据行
    if items:
        session_headers = ['id', 'dataset_id', 'split', 'session_code', 'utterance_ids', 'created_at', 'updated_at']
        ws_sessions.append(session_headers)
        for session in items:
            row = [
                session.id,
                session.dataset_id,
                session.split,
                session.session_code,
                json.dumps(session.utterance_ids, ensure_ascii=False),  # 将utterance_ids序列化为JSON字符串
                session.created_at.isoformat() if session.created_at else '',
                session.updated_at.isoformat() if session.updated_at else ''
            ]
            ws_sessions.append(row)

    # 创建第二个工作表，用于存放DialogUtterance表的数据
    ws_utterances = wb.create_sheet(title="Utterances")
    utterance_headers = [
        'id', 'dataset_id', 'split', 'utterance_code', 'text', 'start_time', 'end_time',
        'speaker', 'emotion', 'session_code', 'created_at', 'updated_at'
    ]
    ws_utterances.append(utterance_headers)

    # 查询所有属于该数据集的DialogUtterance数据
    utterance_items = db.session.query(DialogUtterance).filter(
        DialogUtterance.dataset_id == dataset.id
    ).all()

    # 逐条写入Excel表
    for u in utterance_items:
        row = [
            u.id,
            u.dataset_id,
            u.split,
            u.utterance_code,
            u.text,
            u.start_time,
            u.end_time,
            u.speaker,
            u.emotion,
            u.session_code,
            u.created_at.isoformat() if u.created_at else '',
            u.updated_at.isoformat() if u.updated_at else ''
        ]
        ws_utterances.append(row)

    # 将Excel文件写入内存字节流
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    # 使用Flask send_file返回文件下载响应
    return send_file(
        output,
        as_attachment=True,
        download_name=f"{dataset.name}.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        conditional=True
    )

def clean_text(text: str) -> str:
    """
    删除字符串中所有非法的 XML 控制字符（0x00–0x08, 0x0B–0x0C, 0x0E–0x1F）。
    """
    # 将非字符串也转为字符串再清理
    s = str(text)
    return re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', '', s)

def export_propagation_dataset(items, dataset):
    """
    导出传播数据集，包括传播评论表和闭包表，保存为 Excel。
    仅导出前 1000 条评论。
    """
    # write_only 模式更适合大数据量导出
    wb = Workbook(write_only=True)
    ws_comments = wb.create_sheet(title="Comments")
    ws_closure  = wb.create_sheet(title="CommentClosure")

    # —— 写 Comments 表 —— 
    headers = ['id', 'dataset_id', 'post_id', 'content', 'parent_id']
    ws_comments.append(headers)

    # 只取前 1000 条
    for item in items:
        ws_comments.append([
            item.id,
            item.dataset_id,
            item.post_id,
            clean_text(item.content),
            item.parent_id if item.parent_id is not None else ''
        ])

    # —— 写 CommentClosure 表 —— 
    closure_headers = ['ancestor_id', 'descendant_id', 'depth']
    ws_closure.append(closure_headers)

    # 取闭包关系，也可以加 .limit(…) 限制
    closure_q = (
        db.session
          .query(
              PropagationCommentClosure.ancestor_id,
              PropagationCommentClosure.descendant_id,
              PropagationCommentClosure.depth
          )
          .join(
              PropagationComment,
              PropagationCommentClosure.ancestor_id == PropagationComment.id
          )
          .filter(PropagationComment.dataset_id == dataset.id)
          .order_by(asc(PropagationCommentClosure.ancestor_id))
          .limit(10000)  # 如果闭包关系量也很大，可根据需要限制
    )
    for anc_id, desc_id, depth in closure_q:
        ws_closure.append([anc_id, desc_id, depth])

    # 保存到内存流并返回
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name=f"{dataset.name}.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        conditional=True
    )

def export_multimodal_dataset(items, dataset: Dataset):
    """
    1. 检查缓存目录下是否已有 dataset.id 对应的 zip 文件，
       有则直接返回；无则新建并保存到缓存后返回。
    2. 缓存文件不会被删除，下次直接复用。

    在生成 ZIP 时，仅包含 items 中实际引用的图片文件。
    """
    if not items:
        abort(404, description="No data to export")

    # 缓存文件路径：用 dataset.id 或 dataset.name 均可
    cache_dir = current_app.config["EXPORT_CACHE_DIR"]
    zip_filename = f"{dataset.id}_{dataset.name}.zip"
    cache_path = os.path.join(cache_dir, zip_filename)

    # 如果缓存已存在，直接发送
    if os.path.isfile(cache_path):
        return send_file(
            cache_path,
            as_attachment=True,
            download_name=zip_filename,
            mimetype="application/zip",
            conditional=True
        )

    # 准备 Excel 文件
    wb = Workbook()
    ws = wb.active
    headers = ['id', 'text', 'label_rumor', 'processed_input', 'image_path']
    ws.append(headers)

    # 收集要打包的图片相对路径集合
    dataset_id = items[0].dataset_id
    upload_root = current_app.config["UPLOAD_ROOT"]
    image_dir = os.path.join(upload_root, "images", str(dataset_id))
    # image_paths 列表存储每个 item 的原始路径字符串
    all_image_paths = set()
    for item in items:
        recs = item.to_dict().get('images', [])
        paths = [img['path'] for img in recs]
        # 保存到 Excel
        ws.append([
            item.id,
            item.text,
            item.label_rumor,
            item.processed_input or '',
            '|'.join(paths)
        ])
        # 收集实际文件名或相对路径，用于打包
        for p in paths:
            # 假设 p 是相对于 image_dir 的路径，如 'abc.jpg' 或 'sub/xyz.png'
            all_image_paths.add(p)

    # 创建并写入缓存 ZIP
    with zipfile.ZipFile(cache_path, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        # 写入 Excel
        excel_io = io.BytesIO()
        wb.save(excel_io)
        excel_io.seek(0)
        zf.writestr('dataset.xlsx', excel_io.read())

        # 仅写入 items 引用的图片
        for rel_path in all_image_paths:
            abs_path = os.path.join(image_dir, rel_path)
            if os.path.isfile(abs_path):
                zf.write(abs_path, arcname=os.path.join('images', rel_path))
            else:
                current_app.logger.warning(f"Missing image file: {abs_path}")

    # 发送刚生成的缓存文件
    return send_file(
        cache_path,
        as_attachment=True,
        download_name=zip_filename,
        mimetype="application/zip",
        conditional=True
    )


def export_social_media_data(items, dataset: Dataset):
    '''
    导出社交媒体数据集，写入Excel表，支持动态字段，
    字段由第一个数据项决定，所有字段都写入Excel。
    '''
    wb = Workbook()
    ws = wb.active

    if not items:
        return wb  # 返回空工作簿

    # 动态获取字段名（列头）
    headers = list(items[0].to_dict().keys())
    ws.append(headers)

    # 逐条写入数据
    for item in items:
        row = [item.to_dict().get(col, '') for col in headers]
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name=f"{dataset.name}.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        conditional=True
    )

# 这是一个映射字典，依据数据集类型DatasetType名称，
# 关联对应的数据库模型和导出函数。
DATASET_EXPORT_HANDLERS = {
    DatasetType.SOCIAL.name: {
        'model': SocialMediaDataset,
        'export_fn': export_social_media_data,
        'limit': 5000,
    },
    DatasetType.IMAGE.name: {
        'model': MultiModalImageDataset,
        'export_fn': export_multimodal_dataset,
        'limit': 500,
    },
    DatasetType.PROPAGATION.name: {
        'model': PropagationComment,
        'export_fn': export_propagation_dataset,
        'limit': 1000,
    },
    DatasetType.INTERACTIVE_DIALOGUE.name: {
        'model': DialogSession,
        'export_fn': export_dialog_dataset,
        'limit': 1000,
    },
    DatasetType.ILLEGAL_ACCOUNT_DETECTION.name: {
        'model': IllegalAccountDetection,
        'export_fn': export_social_media_data,
        'limit': 5000,
    },
    DatasetType.ACCOUNT_ROLE_RECOGNITION.name: {
        'model': AccountRoleRecognition,
        'export_fn': export_social_media_data,
        'limit': 5000,
    },
}
