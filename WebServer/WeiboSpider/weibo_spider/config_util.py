import codecs  # 用于编码解码文件操作
import logging  # 用于日志记录
import os  # 操作系统相关功能，如文件路径处理
import sys  # 访问Python解释器相关功能
import browser_cookie3  # 获取浏览器cookie的第三方库
from datetime import datetime  # 用于处理日期和时间
import json  # JSON格式数据的编码和解码

# 获取名为 'spider.config_util' 的日志记录器实例，用于模块内日志输出
logger = logging.getLogger('spider.config_util')


def _is_date(date_str):
    """判断给定的字符串是否符合日期格式（支持'YYYY-MM-DD'或'YYYY-MM-DD HH:MM'格式）
    
    参数:
        date_str (str): 待校验的日期字符串

    返回:
        bool: 如果字符串能成功转换为日期格式则返回True，否则返回False
    """
    try:
        # 判断字符串是否包含时间部分（冒号），决定解析格式
        if ':' in date_str:
            # 按带时间的格式解析
            datetime.strptime(date_str, '%Y-%m-%d %H:%M')
        else:
            # 按纯日期格式解析
            datetime.strptime(date_str, '%Y-%m-%d')
        return True  # 成功解析即为合法日期格式
    except ValueError:
        # 解析失败，说明格式不符合要求
        return False

def validate_config(config):
    """验证传入的配置字典中的各项参数是否符合预期格式和取值范围。
    
    参数:
        config (dict): 需要验证的配置字典

    如果配置不符合要求，函数将打印警告并退出程序。
    """

    # 验证 filter、pic_download、video_download 这三个配置项是否为0或1
    argument_list = ['filter', 'pic_download', 'video_download']
    for argument in argument_list:
        if config[argument] != 0 and config[argument] != 1:
            logger.warning(u'%s值应为0或1,请重新输入', config[argument])
            sys.exit()

    # 验证 since_date 配置项，要求为合法日期字符串(yyyy-mm-dd格式)或整数类型
    since_date = config['since_date']
    if (not _is_date(str(since_date))) and (not isinstance(since_date, int)):
        logger.warning(u'since_date值应为yyyy-mm-dd形式或整数,请重新输入')
        sys.exit()

    # 验证 end_date 配置项，要求为合法日期字符串(yyyy-mm-dd格式)或字符串"now"
    end_date = str(config['end_date'])
    if (not _is_date(end_date)) and (end_date != 'now'):
        logger.warning(u'end_date值应为yyyy-mm-dd形式或"now",请重新输入')
        sys.exit()

    # 验证 random_wait_pages 配置项，要求为整数列表，且所有值大于0
    random_wait_pages = config['random_wait_pages']
    if not isinstance(random_wait_pages, list):
        logger.warning(u'random_wait_pages参数值应为list类型,请重新输入')
        sys.exit()
    if (not isinstance(min(random_wait_pages), int)) or (not isinstance(
            max(random_wait_pages), int)):
        logger.warning(u'random_wait_pages列表中的值应为整数类型,请重新输入')
        sys.exit()
    if min(random_wait_pages) < 1:
        logger.warning(u'random_wait_pages列表中的值应大于0,请重新输入')
        sys.exit()

    # 验证 random_wait_seconds 配置项，要求为整数列表，且所有值大于0
    random_wait_seconds = config['random_wait_seconds']
    if not isinstance(random_wait_seconds, list):
        logger.warning(u'random_wait_seconds参数值应为list类型,请重新输入')
        sys.exit()
    if (not isinstance(min(random_wait_seconds), int)) or (not isinstance(
            max(random_wait_seconds), int)):
        logger.warning(u'random_wait_seconds列表中的值应为整数类型,请重新输入')
        sys.exit()
    if min(random_wait_seconds) < 1:
        logger.warning(u'random_wait_seconds列表中的值应大于0,请重新输入')
        sys.exit()

    # 验证 global_wait 配置项，要求为嵌套列表，内层列表长度为2，且所有元素为大于0的整数
    global_wait = config['global_wait']
    if not isinstance(global_wait, list):
        logger.warning(u'global_wait参数值应为list类型,请重新输入')
        sys.exit()
    for g in global_wait:
        if not isinstance(g, list):
            logger.warning(u'global_wait参数内的值应为长度为2的list类型,请重新输入')
            sys.exit()
        if len(g) != 2:
            logger.warning(u'global_wait参数内的list长度应为2,请重新输入')
            sys.exit()
        for i in g:
            if (not isinstance(i, int)) or i < 1:
                logger.warning(u'global_wait列表中的值应为大于0的整数,请重新输入')
                sys.exit()

    # 验证 write_mode 配置项，要求为列表，元素必须是指定的写入模式字符串之一
    write_mode = ['txt', 'csv', 'json', 'mongo', 'mysql', 'sqlite', 'kafka', 'post']
    if not isinstance(config['write_mode'], list):
        logger.warning(u'write_mode值应为list类型')
        sys.exit()
    for mode in config['write_mode']:
        if mode not in write_mode:
            logger.warning(
                u'%s为无效模式，请从txt、csv、json、post、mongo、sqlite, kafka和mysql中挑选一个或多个作为write_mode',
                mode)
            sys.exit()

    # 验证 user_id_list 配置项，要求为列表或者是以 .txt 结尾的文件路径字符串
    user_id_list = config['user_id_list']
    if (not isinstance(user_id_list,
                       list)) and (not user_id_list.endswith('.txt')):
        logger.warning(u'user_id_list值应为list类型或txt文件路径')
        sys.exit()
    # 如果是文件路径，检查文件是否存在；相对路径时拼接当前工作目录
    if not isinstance(user_id_list, list):
        if not os.path.isabs(user_id_list):
            user_id_list = os.getcwd() + os.sep + user_id_list
        if not os.path.isfile(user_id_list):
            logger.warning(u'不存在%s文件', user_id_list)
            sys.exit()

def get_user_config_list(file_name, default_since_date):
    """获取文件中的微博id信息，并构造用户配置列表
    
    参数:
        file_name (str): 用户配置文件路径，每行格式为 "user_uri 昵称 since_date"
        default_since_date (str): 如果用户配置中没有指定 since_date，使用默认值

    返回:
        list[dict]: 每个用户配置为一个字典，包含 user_uri 和 since_date
    """
    with open(file_name, 'rb') as f:
        try:
            # 读取文件所有行，并按 UTF-8-SIG 解码，防止 BOM 头干扰
            lines = f.read().splitlines()
            lines = [line.decode('utf-8-sig') for line in lines]
        except UnicodeDecodeError:
            logger.error(u'%s文件应为utf-8编码，请先将文件编码转为utf-8再运行程序', file_name)
            sys.exit()

        user_config_list = []
        for line in lines:
            info = line.split(' ')  # 按空格分隔行内容
            if len(info) > 0 and info[0].isdigit():  # user_uri 应为数字
                user_config = {}
                user_config['user_uri'] = info[0]
                # 尝试读取 since_date，如果格式合法就使用，否则使用默认值
                if len(info) > 2 and _is_date(info[2]):
                    if len(info) > 3 and _is_date(info[2] + ' ' + info[3]):
                        user_config['since_date'] = info[2] + ' ' + info[3]
                    else:
                        user_config['since_date'] = info[2]
                else:
                    user_config['since_date'] = default_since_date
                # 避免重复添加相同配置
                if user_config not in user_config_list:
                    user_config_list.append(user_config)
    return user_config_list


def update_user_config_file(user_config_file_path, user_uri, nickname, start_time):
    """更新用户配置文件中指定用户的起始抓取时间
    
    参数:
        user_config_file_path (str): 配置文件路径（如 user_id_list.txt）
        user_uri (str): 微博用户的唯一标识
        nickname (str): 用户昵称
        start_time (str): 要更新的 since_date 时间（格式为 'YYYY-MM-DD' 或含时分）
    """
    if not user_config_file_path:
        user_config_file_path = os.getcwd() + os.sep + 'user_id_list.txt'
    
    with open(user_config_file_path, 'rb') as f:
        lines = f.read().splitlines()
        lines = [line.decode('utf-8-sig') for line in lines]
        for i, line in enumerate(lines):
            info = line.split(' ')
            if len(info) > 0:
                if user_uri == info[0]:
                    # 如果只有 user_uri，补全 nickname 和 start_time
                    if len(info) == 1:
                        info.append(nickname)
                        info.append(start_time)
                    # 如果只有 user_uri 和 nickname，添加 start_time
                    if len(info) == 2:
                        info.append(start_time)
                    # 如果 already 有带时间的字段，删除多余部分
                    if len(info) > 3 and _is_date(info[2] + ' ' + info[3]):
                        del info[3]
                    if len(info) > 2:
                        info[2] = start_time  # 更新 start_time
                    lines[i] = ' '.join(info)
                    break

    with codecs.open(user_config_file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def add_user_uri_list(user_config_file_path, user_uri_list):
    """向 user_id_list.txt 配置文件添加多个 user_uri
    
    参数:
        user_config_file_path (str): 配置文件路径
        user_uri_list (list[str]): 要添加的用户 URI 列表（每个为字符串）
    """
    if not user_config_file_path:
        user_config_file_path = os.getcwd() + os.sep + 'user_id_list.txt'
    
    # 如果文件已存在，在首行加换行符避免连行
    if os.path.isfile(user_config_file_path):
        user_uri_list[0] = '\n' + user_uri_list[0]
    
    with codecs.open(user_config_file_path, 'a', encoding='utf-8') as f:
        f.write('\n'.join(user_uri_list))


def get_cookie():
    """从 Chrome 浏览器中获取 weibo.cn 的 cookie
    
    返回:
        dict: 包含 cookie 键值对的字典
    """
    try:
        chrome_cookies = browser_cookie3.chrome(domain_name='weibo.cn')
        cookies_dict = {cookie.name: cookie.value for cookie in chrome_cookies}
        return cookies_dict
    except Exception as e:
        logger.error(u'Failed to obtain weibo.cn cookie from Chrome browser: %s', str(e))
        raise 


def update_cookie_config(cookie, user_config_file_path):
    """将获取到的 cookie 写入 config.json 配置文件
    
    参数:
        cookie (dict): 从浏览器获取到的 cookie 字典
        user_config_file_path (str): 配置文件路径（通常为 config.json）
    """
    if not user_config_file_path:
        user_config_file_path = os.getcwd() + os.sep + 'config.json'
    
    try:
        # 加载原始配置文件
        with codecs.open(user_config_file_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 将 cookie 字典拼接成字符串（格式：k1=v1; k2=v2）
        cookie_string = '; '.join(f'{name}={value}' for name, value in cookie.items())
        
        # 如果 cookie 有变更则更新写入
        if config['cookie'] != cookie_string:
            config['cookie'] = cookie_string
            with codecs.open(user_config_file_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=4, ensure_ascii=False)
    except Exception as e:
        logger.error(u'Failed to update cookie in config file: %s', str(e))
        raise 


def check_cookie(user_config_file_path): 
    """检查是否已登录微博（根据 cookie 中的 MLOGIN 字段）
    
    参数:
        user_config_file_path (str): 用于更新 cookie 的配置文件路径

    如果未登录，将提示用户通过 Chrome 手动登录并终止程序。
    """
    try:
        cookie = get_cookie()
        # MLOGIN 为 '1' 表示已登录，为 '0' 表示未登录
        if cookie.get("MLOGIN", '0') == '0':
            logger.warning("使用 Chrome 在此登录 %s", 
                "https://passport.weibo.com/sso/signin?entry=wapsso&source=wapssowb&url=https://m.weibo.cn/")
            sys.exit()
        else:
            update_cookie_config(cookie, user_config_file_path)
    except Exception as e:
        logger.error(u'Check for cookie failed: %s', str(e))
        raise