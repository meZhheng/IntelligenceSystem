from datetime import datetime

def str_to_time(text):
    """
    将字符串格式的时间转换为 datetime 对象。
    
    支持两种格式：
    - 包含小时分钟的完整时间格式：'YYYY-MM-DD HH:MM'
    - 仅包含日期的格式：'YYYY-MM-DD'
    
    参数：
    text (str): 输入的时间字符串
    
    返回：
    datetime: 转换后的 datetime 对象
    """

    # 判断字符串中是否包含时间部分（冒号':'）
    if ':' in text:
        # 按带时间格式解析
        result = datetime.strptime(text, '%Y-%m-%d %H:%M')
    else:
        # 仅按日期格式解析
        result = datetime.strptime(text, '%Y-%m-%d')
    
    return result