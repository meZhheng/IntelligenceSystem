from flask import (
    Blueprint,
    flash,
    g,
    redirect,
    request,
    session,
    url_for,
    jsonify,
    current_app,
)
from app.utils.lock import RedisLock
from typing import List, Dict, Tuple, Any
from collections import defaultdict
from ..auth.auth import token_auth
from app.api.errors import bad_request, error_response
from app.extensions import db
from app.models import (
    Dataset,
    get_dataset_types_columns,
    get_dataset_type,
    MultiModalImageDataset,
    Image,
    DatasetType,
    ModelCheckpoint,
    DataBase,
    SocialMediaDataset,
    SocialDetectionResult,
)
from app.services.remote_opinion_import import (
    DataTypeMapping,
    fetch_remote_data,
    get_access_token,
    save_remote_social_rows,
)
from app.api import bp
from sqlalchemy import or_
import os
import tempfile
import pandas as pd  # 假设用 pandas 解析文件
from werkzeug.utils import secure_filename
import json
import math
import time
from datetime import datetime, timedelta
from sqlalchemy.orm import load_only
from flask import send_file
from app.utils.export_helpers import DATASET_EXPORT_HANDLERS
from datetime import datetime, timezone
from deep_learning.compare_yq.compare_fn import (
    load_model,
    predict_emotion,
    DEFAULT_CONFIG,
    predict_stance,
    model_cache,
    preprocess_text,
    validate_config,
)
import requests


@bp.route("/datasets/types", methods=["GET"])
@token_auth.login_required
def get_dataset_types():
    """
    获取支持的数据集类型
    ---
    swagger: "2.0"
    tags:
      - Dataset - Manager
    summary: 获取支持的数据集类型
    description: 返回系统中所有支持的数据集类型及其别名、描述信息。
    responses:
      200:
        description: 数据集类型列表
        schema:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
                description: 数据集类型标识
              alias:
                type: string
                description: 数据集类型别名
              description:
                type: string
                description: 数据集类型描述
    """
    types = []
    for dt in DatasetType:
        types.append(
            {"name": dt.name, "alias": dt.alias, "description": dt.description}
        )
    return jsonify(types)


@bp.route("/datasets/list", methods=["POST"])
@token_auth.login_required
def get_datasets_list():
    """
    条件查询数据集列表
    ---
    swagger: "2.0"
    tags:
      - Dataset - Manager
    summary: 查询数据集列表
    description: |
      支持条件筛选、搜索、排序和分页的接口。
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            search:
              type: string
              description: 数据集名称模糊查询
            types:
              type: array
              items:
                type: string
              description: 数据集类型列表
            own:
              type: boolean
              description: true 仅查看自己的数据集；false 查看他人或共享；省略/None查看全部
            shared:
              type: boolean
              description: true 仅查看共享数据集
            created_from:
              type: string
              description: 创建起始日期 (YYYY-MM-DD)
            created_to:
              type: string
              description: 创建结束日期 (YYYY-MM-DD)
            sort_by:
              type: string
              enum: [label, created_time, updated_time]
              description: 排序字段
            order:
              type: string
              enum: [asc, desc]
              description: 排序顺序
            page:
              type: integer
              description: 页码
            per_page:
              type: integer
              description: 每页条数
    responses:
      200:
        description: 数据集分页列表
    """
    json = request.get_json() or {}
    search = json.get("search", "").strip()
    types = json.get("types") or []
    own = json.get("own")
    shared = json.get("shared")
    created_from = json.get("created_from")
    created_to = json.get("created_to")
    sort_by = json.get("sort_by", "created_time")
    order = json.get("order", "desc")
    page = json.get("page", 1)
    per_page = json.get("per_page", 20)

    query = Dataset.query.filter_by(is_deleted=False)

    if search:
        query = query.filter(Dataset.name.ilike(f"%{search}%"))

    if types:
        query = query.filter(Dataset.dataset_type.in_(types))

    if own is True:
        query = query.filter(Dataset.user_id == g.current_user.id)
    elif own is False:
        query = query.filter(
            or_(Dataset.shared == True, Dataset.user_id != g.current_user.id)
        )

    if shared:
        query = query.filter(Dataset.shared == True)

    if created_from:
        try:
            dt = datetime.fromisoformat(created_from)
            query = query.filter(Dataset.created_time >= dt)
        except ValueError:
            return bad_request("Invalid created_from date")
    if created_to:
        try:
            dt = datetime.fromisoformat(created_to)
            query = query.filter(Dataset.created_time <= dt)
        except ValueError:
            return bad_request("Invalid created_to date")

    sort_col = {
        "label": Dataset.name,
        "created_time": Dataset.created_time,
        "updated_time": Dataset.updated_time,
    }.get(sort_by, Dataset.created_time)
    if order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    data = Dataset.to_collection_dict(query, page, per_page, "api.get_datasets_list")
    return jsonify(data)


@bp.route("/datasets", methods=["GET"])
@token_auth.login_required
def get_datasets():
    """
    获取数据集
    ---
    swagger: "2.0"
    tags:
      - Dataset - Manager
    summary: 获取数据集
    description: 根据参数获取当前用户或共享的数据集分页列表。
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
        description: 页码
      - name: per_page
        in: query
        type: integer
        default: 10
        description: 每页数量
      - name: personal
        in: query
        type: string
        default: false
        description: 是否仅获取当前用户的数据集 ('true'表示个人)
    responses:
      200:
        description: 数据集分页结果
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    personal = (
        True if request.args.get("personal", "false", type=str) == "true" else False
    )

    if personal:
        query = Dataset.query.filter_by(user_id=g.current_user.id)
    else:
        query = Dataset.query.filter_by(shared=True)

    return jsonify(
        Dataset.to_collection_dict(query, page, per_page, "api.get_datasets")
    )


@bp.route("/datasets/search", methods=["GET"])
@token_auth.login_required
def search_datasets():
    """
    搜索数据集
    ---
    swagger: "2.0"
    tags:
      - Dataset - Manager
    summary: 搜索数据集
    description: 按关键词搜索当前用户的数据集名称或描述，支持分页。
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
        description: 页码
      - name: per_page
        in: query
        type: integer
        default: 10
        description: 每页数量
      - name: q
        in: query
        type: string
        description: 搜索关键词
    responses:
      200:
        description: 搜索结果分页
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    keyword = request.args.get("q", "", type=str).strip()

    query = Dataset.query.filter_by(user_id=g.current_user.id)
    if keyword:
        query = query.filter(
            or_(
                Dataset.name.ilike(f"%{keyword}%"),
                Dataset.description.ilike(f"%{keyword}%"),
            )
        )

    return jsonify(
        Dataset.to_collection_dict(
            query.order_by(Dataset.updated_time.desc()),
            page,
            per_page,
            "api.search_datasets",
        )
    )


@bp.route("/datasets/limit", methods=["GET"])
@token_auth.login_required
def get_datasets_limit():
    """
    获取数据集上传额度
    ---
    swagger: "2.0"
    tags:
      - Dataset - Manager
    summary: 获取数据集上传额度
    description: 返回当前用户的数据集上传剩余额度或配额信息。
    responses:
      200:
        description: 上传额度信息
    """
    return jsonify(g.current_user.get_dataset_upload_balance())


@bp.route("/datasets/type", methods=["GET"])
def get_datasets_type():
    """
    获取数据集字段信息
    ---
    swagger: "2.0"
    tags:
      - Dataset - Manager
    summary: 获取数据集字段信息
    description: 返回各类型数据集的字段结构，用于前端展示或表单生成。
    responses:
      200:
        description: 数据集字段信息
    """
    return jsonify(get_dataset_types_columns())


def clean_nan_values(data_list):
    for item in data_list:
        for key, value in item.items():
            if isinstance(value, float) and math.isnan(value):
                item[key] = None
    return data_list


@bp.route("/datasets/upload", methods=["POST"])
@token_auth.login_required
def upload_dataset():
    """
    上传数据集文件
    ---
    swagger: "2.0"
    tags:
      - Dataset - Upload - Export
    summary: 上传数据集文件
    description: |
      上传一个新的数据集文件（CSV/Excel），并保存至数据库。
      支持常规数据集和多模态图像数据集。用户需提供数据集基本信息和有效字段列表。
    """
    name = request.form.get("name")
    description = request.form.get("description")
    dataset_type = request.form.get("type")
    split = request.form.get("split")

    valid_fields_str = request.form.get("valid_fields")
    if not valid_fields_str:
        return jsonify(message="请提供 valid_fields 参数"), 400
    try:
        valid_fields = json.loads(valid_fields_str)
        if not isinstance(valid_fields, list):
            raise ValueError
    except Exception:
        return jsonify(message="valid_fields 格式错误, 应为 JSON 格式的列表"), 400

    existing = Dataset.query.filter_by(user_id=g.current_user.id, name=name).first()
    if existing:
        return (
            jsonify(
                message="您已存在同名数据集，请更换数据集名称或选择追加到现有数据集"
            ),
            400,
        )

    dataset = Dataset(
        name=name,
        description=description,
        dataset_type=dataset_type,
        user_id=g.current_user.id,
        valid_fields=valid_fields,
    )
    db.session.add(dataset)
    db.session.flush()

    file = request.files.get("file")
    if not file:
        return jsonify(message="未上传文件"), 400

    tmp_dir = tempfile.mkdtemp()
    temp_filepath = os.path.join(tmp_dir, file.filename)
    file.save(temp_filepath)

    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext == ".csv":
            df = pd.read_csv(temp_filepath)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(temp_filepath)
        else:
            return jsonify(message="不支持的文件格式"), 400

        data_list = df.to_dict(orient="records")
        filtered_data = []
        for row in data_list:
            filtered_row = {}
            for field in row:
                if isinstance(row[field], float) and math.isnan(row[field]):
                    row[field] = None
                for valid_field in valid_fields:
                    if field.lower() == valid_field.lower():
                        filtered_row[valid_field] = row[field]
            filtered_row["split"] = split
            filtered_row["dataset_id"] = dataset.id
            filtered_data.append(filtered_row)
    except Exception as e:
        return jsonify(message=f"解析文件失败: {str(e)}"), 500
    finally:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        if os.path.exists(tmp_dir):
            os.rmdir(tmp_dir)

    model_cls = get_dataset_type(dataset_type)
    if model_cls is MultiModalImageDataset:
        for item in filtered_data:
            img_paths = []
            raw = item.pop("image_path", None)
            if raw:
                img_paths = [p.strip() for p in raw.split("|") if p.strip()]
            main_fields = {
                k: v
                for k, v in item.items()
                if k in MultiModalImageDataset.__table__.columns.keys()
            }
            multimodal = MultiModalImageDataset(**main_fields)
            db.session.add(multimodal)
            db.session.flush()
            for p in img_paths:
                img = Image(path=p, data_id=multimodal.id)
                db.session.add(img)
        db.session.commit()
    else:
        db.session.bulk_insert_mappings(model_cls, filtered_data)
        db.session.commit()

    return jsonify(message="上传成功"), 200


@bp.route("/datasets/upload/folder", methods=["POST"])
@token_auth.login_required
def upload_folder():
    """
    批量上传文件夹数据
    ---
    swagger: "2.0"
    tags:
      - Dataset - Upload - Export
    summary: 批量上传文件夹数据
    description: |
      批量上传多个文件到指定数据集。主要用于多模态数据集中的图片上传。
    """
    dataset_id = request.form.get("datasetID")
    if not dataset_id:
        return jsonify({"status": "error", "message": "Missing datasetID"}), 400

    save_base = os.path.join(current_app.config["UPLOAD_ROOT"], "images", dataset_id)
    files = request.files.getlist("files")
    if not files:
        return jsonify({"status": "error", "message": "No files uploaded"}), 400

    for file in files:
        if not file.filename:
            continue

        relative_path = file.filename.replace("\\", "/")
        parts = relative_path.split("/")
        safe_parts = [secure_filename(part) for part in parts]

        full_path = os.path.join(save_base, *safe_parts)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        file.save(full_path)

    return jsonify({"status": "success"}), 200


@bp.route("/datasets/<int:dataset_id>/append", methods=["POST"])
@token_auth.login_required
def append_dataset():
    pass


@bp.route("/datasets/dataList", methods=["POST"])
@token_auth.login_required
def get_dataset_dataList():
    payload = request.get_json() or {}
    dataset_id = payload.get("dataset_id")
    checkpoint_id = payload.get("checkpoint_id")
    page = int(payload.get("page", 1))
    per_page = int(payload.get("page_size", 10))

    if dataset_id is None or checkpoint_id is None:
        return jsonify({"message": "dataset_id 和 checkpoint_id 均为必填"}), 400

    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.current_user.id).first()
    if not dataset:
        return jsonify({"message": "未找到对应的数据集或没有访问权限"}), 404

    checkpoint = ModelCheckpoint.query.get_or_404(checkpoint_id)
    ModelClass = checkpoint.model.get_instance()
    required_fields = ModelClass.get_required_fields()
    if "label" not in required_fields:
        required_fields.append("标签")
    else:
        required_fields.remove("label")
        required_fields.append("标签")

    class_names = ModelClass.get_class_names()
    dataset_cls = get_dataset_type(dataset.dataset_type)
    query = dataset_cls.query.filter_by(dataset_id=dataset_id)

    result_pagination = DataBase.to_collection_dict(
        query,
        page,
        per_page,
        "api.get_dataset_dataList",
        required_fields=required_fields,
        class_names=class_names,
    )

    return jsonify({"headers": required_fields, "items": result_pagination})


@bp.route("/datasets/detail", methods=["POST"])
@token_auth.login_required
def get_dataset_detail():
    dataset_id = request.json.get("dataset_id")
    dataset = Dataset.query.get_or_404(dataset_id)

    model_cls = get_dataset_type(dataset.dataset_type)
    query = model_cls.query.filter_by(dataset_id=dataset_id).order_by(model_cls.id.desc())

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    data = model_cls.to_collection_dict(
        query,
        page,
        per_page,
        "api.get_dataset_detail",
        dataset_type=dataset.dataset_type,
    )

    data["dataset_type"] = dataset.dataset_type
    return jsonify(data)


@bp.route("/datasets/SingleData", methods=["POST"])
@token_auth.login_required
def get_single_dataset_data():
    dataset_id = request.json.get("dataset_id")
    data_id = request.json.get("data_id")

    dataset = Dataset.query.get_or_404(dataset_id)
    model_cls = get_dataset_type(dataset.dataset_type)
    data = model_cls.query.get_or_404(data_id)
    return jsonify(data.to_dict())


@bp.route("/datasets/<int:dataset_id>/export", methods=["GET"])
@token_auth.login_required
def export_dataset(dataset_id):
    """
    导出数据集
    ---
    swagger: "2.0"
    tags:
      - Dataset - Upload - Export
    summary: 导出数据集
    description: |
      根据数据集 ID 导出数据集内容，返回文件或下载响应。
      不同类型数据集使用不同导出处理器。
    """
    dataset = Dataset.query.get_or_404(dataset_id)
    dataset_type = dataset.dataset_type

    handler = DATASET_EXPORT_HANDLERS.get(dataset_type)
    if handler is None:
        return {"error": f"Unsupported dataset type: {dataset_type}"}, 400

    ModelCls = handler["model"]
    export_fn = handler["export_fn"]
    limit = handler.get("limit", 200)

    items = ModelCls.query.filter_by(dataset_id=dataset.id).limit(limit)
    return export_fn(items, dataset)


@bp.route("/datasets/<int:dataset_id>", methods=["DELETE"])
@token_auth.login_required
def delete_dataset(dataset_id):
    if not g.current_user.is_administrator():
        return error_response(403)

    dataset = Dataset.query.get(dataset_id)
    if dataset is None or dataset.is_deleted:
        return error_response(404, f"数据集不存在")

    dataset.is_deleted = True
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response(500, "删除数据集失败")

    return jsonify({"message": f"数据集 {dataset.name} 已被删除"}), 200


@bp.route("/datasets/batch_delete", methods=["POST"])
@token_auth.login_required
def batch_delete_datasets():
    if not g.current_user.is_administrator():
        return error_response(403)

    data = request.get_json() or {}
    ids = data.get("ids")
    if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
        return error_response(400, "请求中需要包含整数列表 ids")

    if len(ids) == 0:
        return error_response(400, "ids 列表不能为空")

    existing = Dataset.query.filter(
        Dataset.id.in_(ids), Dataset.is_deleted == False
    ).all()
    existing_ids = {d.id for d in existing}

    missing = [i for i in ids if i not in existing_ids]
    if missing:
        return error_response(404, f"以下数据集不存在或已已删除：{missing}")

    try:
        for ds in existing:
            ds.is_deleted = True
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response(500, "批量删除数据集失败")

    return jsonify({"message": f"成功删除 {len(existing)} 个数据集"}), 200


@bp.route("/datasets/batch_toggle_shared", methods=["POST"])
@token_auth.login_required
def batch_toggle_shared_datasets():
    if not g.current_user.is_administrator():
        return error_response(403)

    data = request.get_json() or {}
    ids = data.get("ids")
    if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
        return error_response(400, "请求中需要包含整数列表 ids")

    if len(ids) == 0:
        return error_response(400, "ids 列表不能为空")

    existing = Dataset.query.filter(
        Dataset.id.in_(ids), Dataset.is_deleted == False
    ).all()
    existing_ids = {d.id for d in existing}

    missing = [i for i in ids if i not in existing_ids]
    if missing:
        return error_response(404, f"以下数据集不存在或已删除：{missing}")

    try:
        for ds in existing:
            ds.shared = not ds.shared
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response(500, "批量切换数据集共享状态失败")

    return jsonify({"message": f"成功切换 {len(existing)} 个数据集"}), 200


@bp.route("/datasets/import/online", methods=["POST"])
@token_auth.login_required
def import_online_datasets():
    data = request.get_json() or {}
    ssh_host = data.get("sshHost")
    ssh_port = data.get("sshPort")
    ssh_user = data.get("sshUser")
    ssh_pass = data.get("sshPass")
    db_host = data.get("dbHost")
    db_port = data.get("dbPort")
    db_user = data.get("dbUser")
    db_pass = data.get("dbPass")

    expected = current_app.config.get("ONLINE_IMPORT_EXPECTED", {})
    if not isinstance(expected, dict) or not expected:
        return error_response(500, "未配置在线导入参数校验")

    if (
        ssh_host != expected.get("sshHost")
        or ssh_port != expected.get("sshPort")
        or ssh_user != expected.get("sshUser")
        or ssh_pass != expected.get("sshPass")
    ):
        return error_response(400, "连接SSH服务出错，请检查连接参数")

    if (
        db_host != expected.get("dbHost")
        or db_port != expected.get("dbPort")
        or db_user != expected.get("dbUser")
        or db_pass != expected.get("dbPass")
    ):
        return error_response(400, "连接数据库服务出错，请检查连接参数")

    if not g.current_user.is_administrator():
        return error_response(403)

    orig = Dataset.query.filter_by(name="中美贸易战", is_deleted=False).first()
    if orig is None:
        return error_response(404, "原始数据集 “中美贸易战” 不存在")

    timestamp = int(datetime.now(timezone.utc).timestamp())
    new_name = f"{orig.name}_在线导入数据集_{timestamp}"
    new_ds = Dataset(
        name=new_name,
        description=orig.description,
        dataset_type=orig.dataset_type,
        user_id=g.current_user.id,
        shared=orig.shared,
        valid_fields=orig.valid_fields,
    )
    db.session.add(new_ds)
    db.session.flush()

    items = SocialMediaDataset.query.filter_by(dataset_id=orig.id).all()
    count = 0
    for item in items:
        new_item = SocialMediaDataset(dataset_id=new_ds.id)
        for col in SocialMediaDataset.__table__.columns:
            name = col.name
            if name in getattr(SocialMediaDataset, "except_fields", []):
                continue
            setattr(new_item, name, getattr(item, name))
        db.session.add(new_item)
        count += 1

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response(500, "在线导入数据集失败")

    return (
        jsonify({"message": f"成功导入数据集 “{new_name}”，共导入 {count} 条记录"}),
        200,
    )


@bp.route("datasets/import/remoteBase", methods=["POST"])
@token_auth.login_required
def import_dataset_from_remote():
    ip_addr = current_app.config["REMOTE_DB_HOST"]
    payload = request.json or {}
    try:
        token = get_access_token(ip_addr)
    except Exception as e:
        return jsonify({"远程身份验证失败": str(e)}), 500

    try:
        data_list = fetch_remote_data(
            ip_addr,
            token,
            payload,
            max_records=payload.get("pageSize", 10000),
        )
    except Exception as e:
        return jsonify({"远程获取数据失败": str(e)}), 500

    timestamp = int(datetime.now(timezone.utc).timestamp())
    startTime = payload.get("startTime")
    endTime = payload.get("endTime")
    expression = payload.get("expression", "")
    fields_list = payload.get("field", "").split(",") + ["key_word"]
    db_fields_list = [DataTypeMapping.get(field, field) for field in fields_list]

    new_name = f"从舆情系统远程导入数据集_{startTime}-{endTime}_{timestamp}"
    new_ds = Dataset(
        name=new_name,
        description=new_name,
        dataset_type="SOCIAL",
        user_id=g.current_user.id,
        valid_fields=db_fields_list,
    )
    db.session.add(new_ds)
    db.session.flush()

    try:
        count = save_remote_social_rows(
            new_ds.id,
            data_list,
            valid_fields=db_fields_list,
            expression=expression,
        )
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "在线导入数据集失败", "error": str(e)}), 500

    return (
        jsonify({"message": f"成功导入数据集 “{new_name}”，共导入 {count} 条记录"}),
        200,
    )


@bp.route("/datasets/import/remoteBase_V2", methods=["POST"])
@token_auth.login_required
def import_dataset_from_remote_V2():
    ip_addr = current_app.config["REMOTE_DB_HOST"]

    required_params = ["startTime", "endTime", "field"]
    for param in required_params:
        if not request.json.get(param):
            return jsonify({"message": f"缺少必要参数: {param}"}), 400

    operation_type = request.json.get("operationType")
    dataset_id = None
    dataset_name = None

    if operation_type == "existing":
        dataset_id = request.json.get("existingDatasetId")
        if not dataset_id:
            return jsonify({"message": "缺少已有数据集ID"}), 400

        dataset = Dataset.query.get(dataset_id)
        if not dataset:
            return jsonify({"message": "数据集不存在"}), 404
        if dataset.user_id != g.current_user.id:
            return jsonify({"message": "无权访问该数据集"}), 403
        if dataset.dataset_type != "SOCIAL":
            return jsonify({"message": "仅支持追加到社交媒体类型数据集"}), 400

        valid_fields = set(dataset.valid_fields)
        if "key_word" not in valid_fields:
            valid_fields.add("key_word")

    elif operation_type == "new":
        dataset_name = request.json.get("newDatasetName", "").strip()
        if not dataset_name:
            return jsonify({"message": "数据集名称不能为空"}), 400

        fields_list = request.json.get("field", "").split(",")
        db_fields_list = [DataTypeMapping.get(field, field) for field in fields_list]
        if "key_word" not in db_fields_list:
            db_fields_list.append("key_word")

        new_ds = Dataset(
            name=dataset_name,
            description=f"从舆情系统远程导入: {request.json.get('startTime')} 至 {request.json.get('endTime')}",
            dataset_type="SOCIAL",
            user_id=g.current_user.id,
            valid_fields=db_fields_list,
        )
        db.session.add(new_ds)
        db.session.flush()
        dataset_id = new_ds.id
        valid_fields = set(db_fields_list)

    else:
        return jsonify({"message": "无效的操作类型"}), 400

    try:
        token = get_access_token(ip_addr)
    except Exception as e:
        current_app.logger.error(f"远程身份验证失败: {str(e)}")
        return jsonify({"message": f"远程身份验证失败: {str(e)}"}), 500

    params = {
        "startTime": request.json.get("startTime"),
        "endTime": request.json.get("endTime"),
        "expression": request.json.get("expression", ""),
        "field": request.json.get("field"),
        "pageNum": 1,
        "pageSize": (
            request.json.get("dataSize", 100)
            if not request.json.get("isFullData")
            else 2000
        ),
    }

    try:
        max_records = params["pageSize"]
        data_list = fetch_remote_data(ip_addr, token, params, max_records=max_records)
    except Exception as e:
        current_app.logger.error(f"远程获取数据失败: {str(e)}")
        return jsonify({"message": f"远程获取数据失败: {str(e)}"}), 500

    expression = params["expression"] or ""
    try:
        count = save_remote_social_rows(
            dataset_id,
            data_list,
            valid_fields=valid_fields,
            expression=expression,
        )
        dataset = Dataset.query.get(dataset_id)
        if dataset:
            dataset.updated_time = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"数据导入失败: {str(e)}")
        return jsonify({"message": "数据导入失败", "error": str(e)}), 500

    result_msg = {
        "new": f"成功创建数据集 '{dataset_name}' 并导入 {count} 条记录",
        "existing": f"成功追加 {count} 条记录到数据集 (ID: {dataset_id})",
    }[operation_type]

    return (
        jsonify(
            {
                "message": result_msg,
                "count": count,
                "dataset_id": dataset_id,
                "dataset_name": dataset_name if operation_type == "new" else None,
            }
        ),
        200,
    )


@bp.route("/datasets/import/defaultName", methods=["GET"])
@token_auth.login_required
def get_default_dataset_name():
    """生成默认数据集名称，格式：舆情系统导入数据集_年月日时分秒"""
    now = datetime.now(timezone.utc)
    default_name = f"舆情系统导入数据集_{now.strftime('%Y-%m-%d %H:%M:%S')}"
    return jsonify(default_name), 200


@bp.route("/datasets/list", methods=["GET"])
@token_auth.login_required
def get_user_datasets():
    """获取当前用户的所有SOCIAL类型数据集，用于追加数据时选择"""
    datasets = Dataset.query.filter_by(
        user_id=g.current_user.id, dataset_type="SOCIAL", is_deleted=False
    ).all()

    result = [
        {"id": ds.id, "name": ds.name, "valid_fields": ds.valid_fields}
        for ds in datasets
    ]

    return jsonify(result), 200


@bp.route("/datasets/pin", methods=["PATCH"])
@token_auth.login_required
def pin_datasets_item():
    """
    修改某个数据项的置顶状态
    请求体: { dataset_id, data_id, is_pinned }
    """
    payload = request.get_json() or {}
    dataset_id = payload.get("dataset_id")
    data_id = payload.get("data_id")
    is_pinned = payload.get("is_pinned")

    if dataset_id is None or data_id is None or is_pinned is None:
        return jsonify({"error": "缺少必要参数"}), 400

    dataset = Dataset.query.filter_by(id=dataset_id).first()
    if not dataset:
        return jsonify({"error": "数据集不存在"}), 404

    dataset_model = get_dataset_type(dataset.dataset_type)
    if not dataset_model:
        return jsonify({"error": "未知的数据集类型"}), 400

    item = dataset_model.query.filter_by(id=data_id, dataset_id=dataset_id).first()
    if not item:
        return jsonify({"error": "数据项不存在"}), 404

    item.is_pinned = bool(is_pinned)
    db.session.commit()

    return (
        jsonify(
            {
                "message": "操作成功",
                "dataset_id": dataset_id,
                "data_id": data_id,
                "is_pinned": item.is_pinned,
            }
        ),
        200,
    )


@bp.route("/datasets/compare_yq/entry/dataset", methods=["POST"])
@token_auth.login_required
def compare_yq_entry_dataset():
    data = request.json
    if data is None:
        return jsonify({"error": "请求体不能为空"}), 400

    dataset_id = data.get("dataset_id")
    if dataset_id is None:
        return jsonify({"error": "请求体必须包含'dataset_id'"}), 400

    dataset_exists = SocialMediaDataset.query.filter_by(dataset_id=dataset_id).first()
    if dataset_exists is None:
        return jsonify({"error": f"dataset_id {dataset_id} 不存在"}), 404

    ttl = current_app.config.get("DATASET_LOCK_TTL", 36000)
    lock_key = f"dataset_lock:{dataset_id}"
    lock = RedisLock(current_app.redis, lock_key, ttl=ttl)

    got, token = lock.acquire(blocking=False)
    if not got:
        remaining = lock.ttl_remaining()
        return (
            jsonify(
                {
                    "error": "dataset 当前正在被处理",
                    "dataset_id": dataset_id,
                    "lock_ttl_remaining_sec": remaining,
                }
            ),
            423,
        )

    merged_config = DEFAULT_CONFIG.copy()
    merged_config["targets"] = data.get("targets", ['中国', '美国', '日本'])
    merged_config["model_choice"] = data.get("model_choice", merged_config.get("model_choice"))

    batch_size = data.get("batch_size", 32)

    try:
        job = current_app.task_queue.enqueue(
            process_dataset_background_task,
            dataset_id,
            merged_config,
            lock_key,
            token,
            batch_size,
            job_timeout=current_app.config.get("DATASET_LOCK_TTL", 36000),
            meta={"dataset_id": dataset_id, "requested_by": getattr(request, "user", None)},
        )
    except Exception as e:
        try:
            lock.release(token)
        except Exception:
            current_app.logger.exception("入队失败且释放锁也失败: %s", e)
        current_app.logger.exception("Failed to enqueue background job: %s", e)
        return jsonify({"error": "无法入队处理任务，请稍后重试"}), 500

    remaining = lock.ttl_remaining()
    return jsonify(
        {
            "message": "任务已入队，后台处理开始",
            "job_id": job.id,
            "dataset_id": dataset_id,
            "lock_ttl_remaining_sec": remaining,
        }
    ), 202


@bp.route("/datasets/compare_yq/entry", methods=["POST"])
@token_auth.login_required
def compare_yq_entry():
    start_time = time.time()
    data = request.json

    if data is None:
        return jsonify({"error": "请求体不能为空"}), 400

    dataset_id = data.get("dataset_id")
    if dataset_id is None:
        return jsonify({"error": "请求体必须包含'dataset_id'"}), 400

    data_ids = data.get("data_ids")
    if data_ids is None or not isinstance(data_ids, list) or len(data_ids) == 0:
        return jsonify({"error": "请求体必须包含'data_ids', 且必须为非空数组"}), 400

    task_name = data.get("task_name")
    if task_name is None or task_name not in TASK_NAMES:
        return jsonify({"error": "请求体必须包含'task_name' 且为支持的任务名"}), 400

    dataset_exists = SocialMediaDataset.query.filter_by(dataset_id=dataset_id).first()
    if dataset_exists is None:
        return jsonify({"error": f"dataset_id {dataset_id} 不存在"}), 404

    ttl = current_app.config.get("DATASET_LOCK_TTL", 36000)
    lock_key = f"dataset_lock:{dataset_id}"
    lock = RedisLock(current_app.redis, lock_key, ttl=ttl)

    got, token = lock.acquire(blocking=False)
    if not got:
        remaining = lock.ttl_remaining()
        return (
            jsonify(
                {
                    "error": "dataset 当前正在被处理",
                    "dataset_id": dataset_id,
                    "lock_ttl_remaining_sec": remaining,
                }
            ),
            423,
        )

    try:
        user_config = data.get("config", {})
        safe_config = validate_config(user_config)

        merged_config = DEFAULT_CONFIG.copy()
        merged_config.update(safe_config)
        merged_config["model_choice"] = data.get(
            "model_choice",
            user_config.get("model_choice", merged_config.get("model_choice")),
        )
        force_api_inference = merged_config["model_choice"] == "qwen3.5-flash"
        if task_name == "stance":
            targets = data.get("targets")
            if targets is None or len(targets) == 0 or len(targets) > 5:
                return jsonify({"error": "单次请求需要指定1-5个分析目标"}), 400
            merged_config["targets"] = targets

        batch_size = data.get("batch_size", 32)
        api_model_used = None

        def extract_api_json(content):
            start = content.find("{")
            end = content.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return None
            try:
                return json.loads(content[start : end + 1])
            except Exception:
                try:
                    normalized = content[start : end + 1].replace("'", '"').replace("，", ",").replace("：", ":")
                    return json.loads(normalized)
                except Exception:
                    return None

        def call_model_api(messages):
            nonlocal api_model_used
            api_key = (
                data.get("api_key")
                or current_app.config.get("YQ_MODEL_API_KEY")
                or current_app.config.get("DASHSCOPE_API_KEY")
                or os.environ.get("YQ_MODEL_API_KEY")
                or os.environ.get("DASHSCOPE_API_KEY")
            )
            if not api_key:
                raise RuntimeError("本地模型不可用，且未配置 YQ_MODEL_API_KEY 或 DASHSCOPE_API_KEY")

            base_url = (
                data.get("api_base_url")
                or current_app.config.get("YQ_MODEL_API_BASE_URL")
                or os.environ.get("YQ_MODEL_API_BASE_URL")
                or "https://dashscope.aliyuncs.com/compatible-mode/v1"
            ).rstrip("/")
            url = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"
            api_model = (
                data.get("api_model")
                or (merged_config["model_choice"] if force_api_inference else None)
                or current_app.config.get("YQ_MODEL_API_MODEL")
                or os.environ.get("YQ_MODEL_API_MODEL")
                or "qwen3.5-flash"
            )
            api_model_used = api_model

            auth_value = api_key if api_key.startswith("Bearer ") else f"Bearer {api_key}"
            response = requests.post(
                url,
                json={
                    "model": api_model,
                    "messages": messages,
                    "temperature": merged_config.get("generation_params", {}).get("temperature", 0.3),
                    "top_p": merged_config.get("generation_params", {}).get("top_p", 0.7),
                },
                headers={"Content-Type": "application/json", "Authorization": auth_value},
                timeout=current_app.config.get("YQ_MODEL_API_TIMEOUT", 600),
            )
            if not response.ok:
                raise RuntimeError(f"API请求失败: {response.status_code} {response.text}")
            return response.json()["choices"][0]["message"]["content"].strip()

        def predict_emotion_by_api(text, config):
            system_prompt = (
                "你是情感分类器（用于机器调用）。仅允许三类：积极、消极、中立。\n"
                "无论用户文本是什么语言，你的所有回复必须使用中文。\n"
                "严格输出一个可解析的 JSON 对象，格式必须完全遵守：\n"
                '{"label":"<积极|消极|中立>","reason":"<1-2句中文简短判定依据，不超过80字>"}\n'
                "不要输出任何除这个 JSON 之外的文字。"
            )
            content = call_model_api(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"文本：{text}\n请按要求输出。"},
                ]
            )
            parsed = extract_api_json(content) or {}
            label = parsed.get("label")
            if label not in config.get("emotion_categories", DEFAULT_CONFIG["emotion_categories"]):
                label = "中立"
            return {"label": label, "raw": parsed.get("reason", content), "score": None}

        def predict_stance_by_api(text, target, config):
            system_prompt = (
                "你是立场分类器，用于判定文本对给定目标（target）的态度，仅允许三类：支持、反对、中立。\n"
                "无论用户文本是什么语言，你的所有回复必须使用中文。\n"
                "严格输出一个可解析的 JSON 对象，格式必须完全遵守：\n"
                '{"label":"<支持|反对|中立>","reason":"<1-2句中文简短判定依据，不超过80字>"}\n'
                "不要输出任何除这个 JSON 之外的文字。"
            )
            content = call_model_api(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"文本：{text}\n目标：{target}\n请按要求输出。"},
                ]
            )
            parsed = extract_api_json(content) or {}
            label = parsed.get("label")
            if label not in config.get("stance_categories", DEFAULT_CONFIG["stance_categories"]):
                label = "中立"
            return {"label": label, "raw": parsed.get("reason", content), "score": None}

        def run_api_inference(texts, config, task_name):
            results = []
            targets = config.get("targets", [])
            for text in texts:
                processed = preprocess_text(
                    text,
                    config["min_text_length"],
                    config["max_text_length"],
                )
                if processed is None:
                    if task_name == "stance":
                        for target in targets:
                            results.append(
                                {
                                    "text": text,
                                    "target": target,
                                    "processed_text": None,
                                    "pred": None,
                                    "primary_score": None,
                                    "raw_result": None,
                                    "error": "文本无效（过短/过长/空内容）",
                                }
                            )
                    else:
                        results.append(
                            {
                                "text": text,
                                "processed_text": None,
                                "pred": None,
                                "primary_score": None,
                                "raw_result": None,
                                "error": "文本无效（过短/过长/空内容）",
                            }
                        )
                    continue

                if task_name == "stance":
                    for target in targets:
                        try:
                            pred = predict_stance_by_api(processed, target, config)
                            results.append(
                                {
                                    "text": text,
                                    "target": target,
                                    "processed_text": processed,
                                    "pred": pred.get("label"),
                                    "primary_score": pred.get("score"),
                                    "raw_result": pred.get("raw"),
                                    "error": None,
                                }
                            )
                        except Exception as e:
                            results.append(
                                {
                                    "text": text,
                                    "target": target,
                                    "processed_text": processed,
                                    "pred": None,
                                    "primary_score": None,
                                    "raw_result": {"error": str(e)},
                                    "error": f"API预测过程出错: {str(e)}",
                                }
                            )
                else:
                    try:
                        pred = predict_emotion_by_api(processed, config)
                        results.append(
                            {
                                "text": text,
                                "processed_text": processed,
                                "pred": pred.get("label"),
                                "primary_score": pred.get("score"),
                                "raw_result": pred.get("raw"),
                                "error": None,
                            }
                        )
                    except Exception as e:
                        results.append(
                            {
                                "text": text,
                                "processed_text": processed,
                                "pred": None,
                                "primary_score": None,
                                "raw_result": {"error": str(e)},
                                "error": f"API预测过程出错: {str(e)}",
                            }
                        )
            return results

        rows = SocialMediaDataset.query.filter(SocialMediaDataset.id.in_(data_ids)).all()
        if len(rows) != len(data_ids):
            return (
                jsonify(
                    {
                        "error": "部分 data_ids 不存在",
                        "provided": data_ids,
                        "found": [r.id for r in rows],
                    }
                ),
                404,
            )

        all_texts = {"ids": [r.id for r in rows], "texts": [r.text for r in rows]}

        def text_batches_gen():
            for i in range(0, len(rows), batch_size):
                yield {
                    "ids": all_texts["ids"][i : i + batch_size],
                    "texts": all_texts["texts"][i : i + batch_size],
                }

        model_name = merged_config["model_choice"] + "_" + task_name
        all_results = []
        model_loaded = False
        use_api_fallback = force_api_inference
        local_model_error = None
        tokenizer = model = None

        for batch in text_batches_gen():
            batch_ids = batch["ids"]
            batch_texts = batch["texts"]

            existing_rows = _fetch_existing_results(batch_ids, model_name, task_name)
            by_data_id, by_data_target = _build_existing_map(existing_rows)

            to_infer_by_target = defaultdict(list)
            to_infer_single = []

            if task_name == "stance":
                for idx, (data_id, text) in enumerate(zip(batch_ids, batch_texts)):
                    for target in merged_config.get("targets", []):
                        if (data_id, target) in by_data_target:
                            existing_record = by_data_target[(data_id, target)]
                            existing_record["target"] = existing_record["task_params"].get("target")
                            existing_record["pred"] = existing_record.get("label")
                            existing_record["text"] = text
                            existing_record["processed_text"] = existing_record["task_params"].get("processed_text")
                            all_results.append(existing_record)
                        else:
                            to_infer_by_target[target].append((idx, data_id, text))
            else:
                for idx, (data_id, text) in enumerate(zip(batch_ids, batch_texts)):
                    existing_list = by_data_id.get(data_id, [])
                    if existing_list:
                        existing_sorted = sorted(
                            existing_list,
                            key=lambda x: x.get("created_at") or "",
                            reverse=True,
                        )[0]
                        existing_sorted["pred"] = existing_sorted.get("label")
                        existing_sorted["text"] = text
                        existing_sorted["processed_text"] = existing_sorted["task_params"].get("processed_text")
                        all_results.append(existing_sorted)
                    else:
                        to_infer_single.append((idx, data_id, text))

            if not to_infer_single and all(len(v) == 0 for v in to_infer_by_target.values()):
                continue

            if not model_loaded and not use_api_fallback:
                try:
                    tokenizer, model = load_model(merged_config["model_choice"])
                    model_loaded = True
                except Exception as e:
                    use_api_fallback = True
                    local_model_error = str(e)
                    current_app.logger.warning("本地模型不可用，改用API调用: %s", e)

            if to_infer_single:
                _, data_ids_for_infer, texts_for_infer = zip(*to_infer_single)
                if use_api_fallback:
                    batch_results = run_api_inference(list(texts_for_infer), merged_config, task_name)
                else:
                    batch_results = TASK_NAMES[task_name](
                        texts=list(texts_for_infer),
                        config=merged_config,
                        tokenizer=tokenizer,
                        model=model,
                    )
                results_with_meta = []
                for data_id, result in zip(data_ids_for_infer, batch_results):
                    results_with_meta.append({"data_id": data_id, "result": result})
                    all_results.append(result)
                ok, info = persist_results_generic(
                    results_with_meta,
                    dataset_id,
                    model_name,
                    merged_config,
                    task_name=task_name,
                )
                if not ok:
                    current_app.logger.error("保存 DB 失败: %s", info)

            for target, items in to_infer_by_target.items():
                if not items:
                    continue
                _, data_ids_for_infer, texts_for_infer = zip(*items)
                cfg = dict(merged_config)
                cfg["targets"] = [target]
                if use_api_fallback:
                    batch_results = run_api_inference(list(texts_for_infer), cfg, task_name)
                else:
                    batch_results = TASK_NAMES[task_name](
                        texts=list(texts_for_infer),
                        config=cfg,
                        tokenizer=tokenizer,
                        model=model,
                    )
                results_with_meta = []
                for data_id, result in zip(data_ids_for_infer, batch_results):
                    if result.get("target") is None:
                        result["target"] = target
                    results_with_meta.append({"data_id": data_id, "result": result})
                    all_results.append(result)
                ok, info = persist_results_generic(
                    results_with_meta,
                    dataset_id,
                    model_name,
                    merged_config,
                    task_name=task_name,
                )
                if not ok:
                    current_app.logger.error("保存 DB 失败: %s", info)

        processing_time = time.time() - start_time
        return (
            jsonify(
                {
                    "results": all_results,
                    "summary": {
                        "total": len(data_ids),
                        "valid": len(all_results),
                        "invalid": len(data_ids) - len(all_results),
                        "processing_time_sec": round(processing_time, 2),
                        "model_used": model_name,
                        "api_model_used": api_model_used,
                        "inference_source": "api" if use_api_fallback else "local",
                        "local_model_error": local_model_error,
                    },
                }
            ),
            200,
        )

    finally:
        released = lock.release(token)
        if not released:
            current_app.logger.warning(
                "释放 dataset 锁失败 dataset_id=%s (可能已过期或 token 不匹配)",
                dataset_id,
            )


def _fetch_existing_results(batch_ids, model_name, task_name):
    """
    从 DB 获取指定 data_id 列表中、指定 model_name/task_name 且 status='completed' 的 rows
    返回一个 list[SocialDetectionResult]
    """
    if not batch_ids:
        return []
    try:
        rows = SocialDetectionResult.query.filter(
            SocialDetectionResult.data_id.in_(batch_ids),
            SocialDetectionResult.model_name == model_name,
            SocialDetectionResult.task_name == task_name,
            SocialDetectionResult.status == "completed",
        ).all()
        return rows
    except Exception as e:
        current_app.logger.exception("查询已有结果失败: %s", e)
        return []


def _build_existing_map(rows):
    """
    将 rows 转为 map 结构，方便按 (data_id)->list(results) 或 (data_id,target)->result 查找
    返回:
      by_data_id: dict[data_id] -> list(result_dicts)
      by_data_target: dict[(data_id, target)] -> result_dict
    注意：row.task_params 可能为 None，需保护
    """
    by_data_id = defaultdict(list)
    by_data_target = {}
    for r in rows:
        rd = r.to_dict()
        by_data_id[r.data_id].append(rd)
        try:
            tp = r.task_params or {}
            target = tp.get("target")
            if target is not None:
                by_data_target[(r.data_id, target)] = rd
        except Exception:
            continue
    return by_data_id, by_data_target


def persist_results_generic(
    results_with_meta, dataset_id, model_name, merged_config, task_name="stance"
):
    """
    通用化持久化函数。
    results_with_meta: list of dict, 每项至少包含:
        {
          "data_id": int,
          "result": dict
        }
    dataset_id: int | None
    model_name, merged_config, task_name: 如名
    返回 (ok: bool, info)  info 为写入条数或错误信息
    """
    if not results_with_meta:
        return True, 0

    now = datetime.now(timezone.utc)
    db_objs = []
    try:
        for item in results_with_meta:
            data_id = item.get("data_id")
            r = item.get("result") or {}
            status = "completed" if not r.get("error") else "failed"
            started_at = r.get("started_at") or now
            finished_at = r.get("finished_at") or now

            task_params = {
                "config": merged_config,
                "text": r.get("text"),
                "processed_text": r.get("processed_text"),
            }
            if r.get("target") is not None:
                task_params["target"] = r.get("target")

            metrics = None
            if r.get("primary_score") is not None:
                metrics = {"confidence": r.get("primary_score")}

            label = r.get("pred")

            obj = SocialDetectionResult(
                dataset_id=dataset_id,
                data_id=data_id,
                model_name=model_name,
                task_name=task_name,
                task_params=task_params,
                raw_result=r.get("raw_result"),
                metrics=metrics,
                primary_score=r.get("primary_score"),
                label=label,
                status=status,
                error_message=r.get("error"),
                started_at=started_at,
                finished_at=finished_at,
            )
            db_objs.append(obj)

        if db_objs:
            db.session.add_all(db_objs)
            db.session.commit()
        return True, len(db_objs)
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("persist_results_generic 写入失败: %s", e)
        return False, str(e)


@bp.route("/datasets/model_yq/status", methods=["GET"])
@token_auth.login_required
def model_status():
    """检查模型加载状态"""
    status = {}

    for model_name, path in DEFAULT_CONFIG["model_paths"].items():
        status[model_name] = {
            "path": path,
            "exists": os.path.exists(path) and os.listdir(path),
            "loaded": model_name in model_cache,
        }

    return (
        jsonify(
            {
                "device": DEFAULT_CONFIG["device"],
                "models": status,
                "cache_size": len(model_cache),
            }
        ),
        200,
    )


@bp.route("/datasets/config/schema", methods=["GET"])
def get_config_schema():
    """获取可配置参数的Schema（用于前端表单生成）"""
    return (
        jsonify(
            {
                "generation_params": {
                    "temperature": {
                        "type": "float",
                        "default": 0.3,
                        "min": 0.1,
                        "max": 1.0,
                        "step": 0.1,
                        "description": "控制生成随机性，值越大越随机",
                    },
                    "top_p": {
                        "type": "float",
                        "default": 0.7,
                        "min": 0.1,
                        "max": 1.0,
                        "step": 0.1,
                        "description": "核采样概率阈值",
                    },
                    "top_k": {
                        "type": "int",
                        "default": 20,
                        "min": 1,
                        "max": 100,
                        "step": 1,
                        "description": "限制采样范围的前K个token",
                    },
                    "do_sample": {
                        "type": "boolean",
                        "default": False,
                        "description": "是否启用采样策略",
                    },
                },
                "text_limits": {
                    "min_text_length": {
                        "type": "int",
                        "default": 10,
                        "min": 1,
                        "max": 50,
                        "step": 1,
                        "description": "最小文本长度（字符数）",
                    },
                    "max_text_length": {
                        "type": "int",
                        "default": 250,
                        "min": 50,
                        "max": 500,
                        "step": 10,
                        "description": "最大文本长度（字符数），超过将被截断",
                    },
                },
            }
        ),
        200,
    )

@bp.route("/datasets/social/results", methods=["POST"])
def get_social_detection_results():
    data = request.get_json(force=True, silent=True) or {}

    dataset_id = data.get("dataset_id")
    raw_data_ids = data.get("data_ids", [])

    if not dataset_id:
        return jsonify({"error": "dataset_id 不能为空"}), 400

    data_ids = [int(d) for d in raw_data_ids if d is not None]

    if not data_ids:
        return jsonify({"results": []})

    records = (
        SocialDetectionResult.query
        .filter(
            SocialDetectionResult.dataset_id == dataset_id,
            SocialDetectionResult.data_id.in_(data_ids),
            SocialDetectionResult.status == "completed"
        )
        .order_by(
            SocialDetectionResult.data_id,
            SocialDetectionResult.task_name,
        )
        .all()
    )

    from collections import defaultdict
    grouped = defaultdict(list)

    for r in records:
        grouped[r.data_id].append(
            r.to_dict(fields=[
                "id",
                "task_name",
                "model_name",
                "label",
                "primary_score",
                "metrics",
                "raw_result",
                "status",
                "error_message",
                "created_at",
                "task_params"
            ])
        )

    results = [
        {
            "data_id": data_id,
            "results": grouped.get(data_id, [])
        }
        for data_id in data_ids
    ]

    return jsonify({"results": results})
