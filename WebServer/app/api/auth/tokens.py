from flask import jsonify, g, Blueprint, request, current_app
from app import db
from .auth import basic_auth, token_auth  # 导入认证装饰器
from app.api import bp  # 引用主API蓝图
from app.utils.decorator import admin_required
from datetime import datetime, timedelta, timezone
import secrets
import string

# POST /auth/tokens
@bp.route('/auth/tokens', methods=['POST'])
@basic_auth.login_required  # 需要基本认证（用户名+密码）通过后访问
def get_token():
    """
    用户登录后获取访问令牌（token）
    - 调用当前登录用户的 get_token() 方法生成或返回已有token
    - 提交数据库事务（可能更新了token的过期时间等）
    - 返回token、用户ID、用户名和权限角色slug的JSON响应
    """
    token = g.current_user.get_token()
    db.session.commit()
    return jsonify({
        'token': token, 
        'user_id': g.current_user.id, 
        'user_name': g.current_user.username, 
        'permissions': g.current_user.role.slug
    })

# DELETE /auth/tokens
@bp.route('/auth/tokens', methods=['DELETE'])
@token_auth.login_required  # 需要token认证通过后访问
def revoke_token():
    """
    撤销当前用户的访问令牌
    - 调用用户对象的 revoke_token() 方法，使token失效
    - 提交数据库事务
    - 返回空响应，状态码204表示成功且无内容
    """
    g.current_user.revoke_token()
    db.session.commit()
    return '', 204

@bp.route('/auth/inviteCode', methods=['POST'])
@token_auth.login_required
@admin_required
def fetch_invite_code():
    """
    POST /auth/inviteCode
    body (json) 可选: { "force": 1 } 强制生成新邀请码
    返回:
    {
      "code": "ABCD-EFGH-IJKL-MNOP",
      "ttl_seconds": 600,
      "expires_at": "2025-09-12T11:45:00+08:00"
    }
    """
    # config
    INVITE_TTL_SECONDS = 600  # 10 minutes
    SHORT_TTL_THRESHOLD = 30  # 如果剩余 ttl <= 30s 则认为快过期，强制新生成

    # 可选地调整字符集：排除容易混淆的字符 0 1 O I
    _INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 32 chars

    def _generate_invite_code(groups=4, group_len=4):
        n = groups * group_len
        s = ''.join(secrets.choice(_INVITE_ALPHABET) for _ in range(n))
        return '-'.join(s[i:i+group_len] for i in range(0, n, group_len))

    data = request.get_json(silent=True) or {}
    force = bool(int(data.get('force', 0))) if isinstance(data.get('force', None), (str, int)) else bool(data.get('force', False))

    # 获取 user id（admin_required 装饰器保证是管理员）
    user_id = g.current_user.id
    if not user_id:
        return jsonify({"error": "无法识别当前用户"}), 400

    r = current_app.redis  # 你在 app 上配置的 Redis 实例
    user_key = f"invite:user:{user_id}"

    try:
        # 尝试读取已有邀请码
        if not force:
            existing = r.get(user_key)
            if existing:
                try:
                    # redis-py 返回 bytes，转 str
                    code = existing.decode() if isinstance(existing, (bytes, bytearray)) else str(existing)
                except Exception:
                    code = str(existing)

                ttl = r.ttl(user_key)  # 返回秒，-2/-1 表示不存在或无过期
                if ttl is None:
                    ttl = -2
                # 如果还有足够时间就返回
                if ttl > SHORT_TTL_THRESHOLD:
                    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
                    # 转为本地带偏移的 ISO 字符串（服务器时区）
                    expires_at_iso = expires_at.astimezone().isoformat()
                    return jsonify({
                        "code": code,
                        "ttl_seconds": int(ttl),
                        "expires_at": expires_at_iso
                    })

        # 生成新邀请码并覆盖旧的（非原子，但对大多数场景够用）
        old = r.get(user_key)
        if old:
            try:
                old_code = old.decode() if isinstance(old, (bytes, bytearray)) else str(old)
            except Exception:
                old_code = str(old)
            old_code_key = f"invite:code:{old_code}"
        else:
            old_code_key = None

        new_code = _generate_invite_code(groups=4, group_len=4)
        new_code_key = f"invite:code:{new_code}"

        pipe = r.pipeline()
        if old_code_key:
            pipe.delete(old_code_key)          # 删除旧码对应的反向索引

        pipe.set(user_key, new_code, ex=INVITE_TTL_SECONDS)
        pipe.set(new_code_key, user_id, ex=INVITE_TTL_SECONDS)
        pipe.execute()

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=INVITE_TTL_SECONDS)
        expires_at_iso = expires_at.astimezone().isoformat()
        
        return jsonify({
            "code": new_code,
            "ttl_seconds": INVITE_TTL_SECONDS,
            "expires_at": expires_at_iso
        })
    
    except Exception as e:
        current_app.logger.exception("获取/生成邀请码失败")
        return jsonify({"error": "服务器错误: 无法获取或生成邀请码", "detail": str(e)}), 500
    