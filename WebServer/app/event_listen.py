from sqlalchemy import event
from app.extensions import db
from app.models_spider import WeiboDetectResult, WeiboPost, WeiboUser
from datetime import datetime

# 监听 SQLAlchemy 的 session 对象，在执行 flush 之前触发该函数
@event.listens_for(db.session, "before_flush")
def update_threat_index(session, flush_context, instances):
    # 遍历所有新增（new）和修改（dirty）的对象
    for obj in list(session.new) + list(session.dirty):
        # 只处理 WeiboDetectResult 类型的对象，其他类型跳过
        if not isinstance(obj, WeiboDetectResult):
            continue
        
        # 只处理检测任务类型为违规（VIOLATION）的对象
        if obj.task_type != WeiboDetectResult.DetectType.VIOLATION:
            continue

        # 1) 统计当前检测结果中的违规数量
        new_count = 0
        # obj.result['data'] 是一个嵌套列表，遍历内部列表，累加违规项数量
        for grp in obj.result.get('data', []):
            if isinstance(grp, list):
                new_count += len(grp)
        # 如果没有违规，跳过后续处理
        if new_count <= 0:
            continue

        # 2) 查找数据库中是否已有对应微博和任务类型的老记录
        old = session.query(WeiboDetectResult).get((obj.weibo_id, obj.task_type))
        old_count = 0
        # 如果找到了旧记录，且不是当前待提交对象，统计旧违规数
        if old and old is not obj:
            for grp in old.result.get('data', []):
                if isinstance(grp, list):
                    old_count += len(grp)

        # 计算违规数量变化量（新-旧）
        delta = new_count - old_count

        # 3) 根据微博id查询对应微博作者的用户id
        user_id = session.query(WeiboPost.user_id) \
                         .filter(WeiboPost.id == obj.weibo_id) \
                         .scalar()
        # 如果未找到用户id则跳过
        if not user_id:
            continue

        # 根据用户id加载用户对象
        user = session.get(WeiboUser, user_id)
        # 如果用户存在，更新其威胁指数（threat_index），累加违规变化值 delta
        if user:
            user.threat_index = (user.threat_index or 0) + delta
