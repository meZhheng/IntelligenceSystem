class User:
    def __init__(self):
        # 用户唯一标识符
        self.id = ''
        # 用户昵称
        self.nickname = ''

        # 性别（如 '男' / '女'）
        self.gender = ''
        # 所在地
        self.location = ''
        # 生日（格式字符串）
        self.birthday = ''
        # 个人简介
        self.description = ''
        # 认证信息（如“大V认证”原因）
        self.verified_reason = ''
        # 用户标签或特长（如“摄影师”、“作家”等）
        self.talent = ''

        # 教育背景信息
        self.education = ''
        # 工作信息
        self.work = ''

        # 用户头像图片链接
        self.avatar_url = ''

        # 发微博的总数
        self.weibo_num = 0
        # 关注人数
        self.following = 0
        # 粉丝人数
        self.followers = 0

        # 用户关注的人的列表，每个元素为一个包含 uid/nickname/followers_count 的字典
        self.follow_list = []
        # 用户粉丝的列表，每个元素为一个包含 uid/nickname/followers_count 的字典
        self.fans_list = []

    def __str__(self):
        """返回该用户的字符串表示形式，包含基本信息和关注/粉丝列表"""
        lines = []
        lines.append(f"用户昵称: {self.nickname}")
        lines.append(f"用户id: {self.id}")
        lines.append(f"微博数: {self.weibo_num}")
        lines.append(f"关注数: {self.following}")
        lines.append(f"粉丝数: {self.followers}")
        lines.append(f"性别: {self.gender}")
        lines.append(f"位置: {self.location}")
        lines.append(f"生日: {self.birthday}")
        lines.append(f"简介: {self.description}")
        lines.append(f"认证: {self.verified_reason}")
        lines.append(f"用户标签: {self.talent}")
        lines.append(f"教育经历: {self.education}")
        lines.append(f"工作单位: {self.work}")
        
        # 打印关注列表
        if self.follow_list:
            lines.append("\n关注列表:")
            for item in self.follow_list:
                uid = item.get('uid', '')
                name = item.get('nickname', '')
                count = item.get('followers_count', '')
                lines.append(f"  - {name} (UID: {uid}) | 粉丝: {count}")
        else:
            lines.append("\n关注列表: 无")
        
        # 打印粉丝列表
        if self.fans_list:
            lines.append("\n粉丝列表:")
            for item in self.fans_list:
                uid = item.get('uid', '')
                name = item.get('nickname', '')
                count = item.get('followers_count', '')
                lines.append(f"  - {name} (UID: {uid}) | 粉丝: {count}")
        else:
            lines.append("\n粉丝列表: 无")

        return "\n".join(lines)