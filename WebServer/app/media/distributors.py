from flask import (
    Blueprint, flash, g, redirect, send_from_directory, request, session, url_for, jsonify, Response, stream_with_context, current_app
)
import os
from app.api.auth.auth import token_auth
from app.media import bp
from app.api.errors import bad_request, error_response

@bp.route('/images/<path:filename>', methods=['GET'])
def serve_image(filename):
    """
    URL 形如 /images/rumor_images/xxx.jpg
    会去读取磁盘上的 <UPLOAD_ROOT>/images/rumor_images/xxx.jpg
    """
    # 先拿到配置的根路径
    upload_root = current_app.config['UPLOAD_ROOT']  # e.g. "/uploads"
    images_root = os.path.join(upload_root, 'images')
    
    # 构造文件绝对路径并检查
    full_path = os.path.join(images_root, filename)
    if not os.path.isfile(full_path):
        # 文件不存在，返回 404
        return error_response(404)

    # send_from_directory 会做好 Content-Type, Range, etc.
    # 它的第一个参数是目录，第二个参数是相对于该目录的文件名
    return send_from_directory(images_root, filename)