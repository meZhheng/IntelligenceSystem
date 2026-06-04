import json
import datetime
import requests
import time

# -------------------------- 配置参数（用户可根据需求修改） --------------------------
# 测试环境网关地址（文档指定）
GATEWAY_URL = "http://58.247.55.76:8088"
# 认证信息（测试环境固定值，文档提供）
CLIENT_ID = "446d5c8b"
CLIENT_SECRET = "272eb69f6fe96e8d"
GRANT_TYPE = "client_credentials"  # 文档指定定值

# 数据查询参数（核心配置，需根据需求调整）
START_TIME = "2025-11-02 00:00:00"  # 爬取开始时间（格式：YYYY-MM-DD HH:MM:SS）
END_TIME = "2025-11-05 23:59:59"  # 爬取结束时间（格式同上）
INDEX = "sh-yq"  # 数据索引库（舆情数据：sh-yq；账号数据：sh-account，文档指定）
FIELD = "pageType,title,pageUrl,publishTime,poster,siteName,content"  # 需返回的字段（文档可选字段列表内选择）
PAGE_SIZE = 30  # 每页数据条数（建议10-50，避免单次请求过大）
SENTIMENT_TYPE = "中立" # 消极/中立/积极

# 生成含情感+起止时间的保存路径（处理时间格式中的非法字符“:”）
time_start_format = START_TIME.replace(" ", "").replace(":", "")  # 转为“20240601000000”
time_end_format = END_TIME.replace(" ", "").replace(":", "")      # 转为“20240607235959”
SAVE_FILE_PATH = f"./data_crawl_{SENTIMENT_TYPE}_{time_start_format}_{time_end_format}.txt"  # 符合命名要求

# -------------------------- 核心函数定义 --------------------------
def get_access_token():
    """
    调用票据服务接口，获取访问Token（文档：获取认证信息流程）
    返回：token（访问票据）、token_type（票据头）
    """
    # 1. 构造Token请求URL和参数
    token_url = f"{GATEWAY_URL}/auth-gateway/service-oauth/oauth/accessToken"
    token_params = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": GRANT_TYPE
    }
    # 2. 发送POST请求（文档指定请求类型为application/json）
    try:
        response = requests.post(
            url=token_url,
            json=token_params,  # 自动设置Content-Type: application/json
            timeout=10  # 超时时间10秒，防止请求卡死
        )
        response.raise_for_status()  # 若HTTP状态码非200，抛出异常
        result = response.json()  # 解析JSON响应

        # 3. 校验接口返回状态（文档返回码定义：200为成功）
        if result.get("code") != 200:
            raise Exception(f"获取Token失败：{result.get('message')}（返回码：{result.get('code')}）")

        # 4. 提取Token和TokenType（文档响应实例字段）
        token = result["data"]["token"]
        token_type = result["data"]["tokenType"].strip()  # 去除可能的空格（文档中tokenType为"bearer "）
        expires_in = result["data"]["expiresIn"]
        print(f"✅ Token获取成功！有效期：{expires_in}秒")
        return token, token_type

    except requests.exceptions.RequestException as e:
        raise Exception(f"获取Token网络异常：{str(e)}")
    except json.JSONDecodeError:
        raise Exception("获取Token响应非合法JSON格式")
    except KeyError as e:
        raise Exception(f"获取Token响应字段缺失：{str(e)}")


def get_page_data(token, token_type, page_num, sentiment_type):
    """
    调用数据查询接口，获取单页数据（文档：数据查询(数量+数据)）
    参数：token（访问票据）、token_type（票据头）、page_num（当前页码）
    返回：page_data（单页数据列表）、total_count（总数据条数）
    """
    # 1. 构造数据请求URL和请求头（文档要求Authorization头携带Token）
    data_url = f"{GATEWAY_URL}/auth-gateway/shanghai-yuqing-es/api/v1/common/query/dataAndNum"
    headers = {
        "Authorization": f"{token_type} {token}",  # 格式：票据头 + 空格 + Token（文档要求）
        "Content-Type": "application/json"
    }
    # 2. 构造数据查询参数（文档请求示例格式，必选参数已标注）
    data_params = {
        "startTime": START_TIME,  # 必选：检索开始时间
        "endTime": END_TIME,  # 必选：检索结束时间
        "expression": "",  # 可选：关键词表达式（如"(南海&菲律宾)"）
        "field": FIELD,  # 必选：需返回的字段
        "index": INDEX,  # 必选：数据索引库（定值）
        "pageNum": page_num,  # 必选：当前页码
        "pageSize": PAGE_SIZE,  # 必选：每页条数
        "sort": "publishTime desc",  # 可选：排序规则（按发布时间降序）
        "sentiment": sentiment_type
        # 其他可选参数（如country、sentiment等）可按需添加
    }

    # 3. 发送数据请求
    try:
        response = requests.post(
            url=data_url,
            headers=headers,
            json=data_params,
            timeout=15
        )
        response.raise_for_status()
        result = response.json()

        # 4. 校验响应状态
        if result.get("code") != 200:
            raise Exception(f"获取第{page_num}页数据失败：{result.get('message')}（返回码：{result.get('code')}）")

        # 5. 提取单页数据和总条数
        page_data = result["data"]["data"]  # 数据列表（内层data字段）
        total_count = result["data"]["count"]  # 总数据条数
        print(f"✅ 成功获取第{page_num}页数据，当前页{len(page_data)}条，总计{total_count}条")
        return page_data, total_count

    except requests.exceptions.RequestException as e:
        raise Exception(f"获取第{page_num}页数据网络异常：{str(e)}")
    except json.JSONDecodeError:
        raise Exception(f"获取第{page_num}页数据响应非合法JSON格式")
    except KeyError as e:
        raise Exception(f"获取第{page_num}页数据响应字段缺失：{str(e)}")


def save_data_to_txt(all_data, file_path):
    """
    将所有爬取到的数据保存到文本文件（按字段格式化，便于阅读）
    参数：all_data（所有页面数据列表）、file_path（保存路径）
    """
    try:
        with open(file_path, "w", encoding="utf-8") as f:  # utf-8编码防止中文乱码
            for idx, data in enumerate(all_data, 1):  # 枚举数据，添加序号
                # 写入数据分隔线
                f.write(f"{'=' * 50} 数据 {idx} {'=' * 50}\n")
                # 按字段写入（FIELD参数中指定的字段，顺序对应）
                field_list = FIELD.split(",")
                for field in field_list:
                    field = field.strip()
                    # 处理字段值（若字段不存在，显示"无"）
                    value = data.get(field, "无")
                    # 特殊处理长文本（如content），换行显示
                    if field == "content":
                        f.write(f"{get_field_chinese_name(field)}：\n{value}\n\n")
                    else:
                        f.write(f"{get_field_chinese_name(field)}：{value}\n")
                f.write("\n")  # 数据间空行分隔
        print(f"\n🎉 所有数据已保存到：{file_path}")
        print(f"📊 爬取统计：共{len(all_data)}条数据，时间范围：{START_TIME} 至 {END_TIME}")

    except IOError as e:
        raise Exception(f"保存数据到文件失败：{str(e)}")


def get_field_chinese_name(field):
    """
    将字段英文名转换为中文（对应文档中字段解释，提升可读性）
    """
    field_map = {
        "pageType": "站点类型",
        "title": "标题",
        "pageUrl": "文章链接",
        "publishTime": "发布时间",
        "poster": "发布者",
        "siteName": "站点名称",
        "content": "正文",
        "guid": "唯一标识",
        "publishDate": "发布日期",
        "sentiment": "情感倾向",
        "commentNum": "评论数",
        "likeNum": "点赞数",
        "visitNum": "阅读数"
        # 可根据FIELD参数扩展其他字段的中文映射（参考文档"field参数可用值范围"）
    }
    return field_map.get(field, field)  # 若未定义，返回原英文名


def save_page_to_txt(page_data, save_path, is_first_page=False):
    """
    单页数据追加写入文件（核心：读一页写一页，追加模式）
    参数：page_data（单页数据列表）、save_path（保存路径）、is_first_page（是否为第一页，控制头部写入）
    """
    try:
        with open(save_path, "a", encoding="utf-8") as f:  # "a"模式：追加写入，不覆盖
            # 第一页写入文件头部（标注爬取信息，仅写一次）
            if is_first_page:
                crawl_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                header = f"===== 舆情数据爬取结果（基于“数据查询接口(1).pdf”）=====\n" \
                         f"情感类型：{SENTIMENT_TYPE}\n" \
                         f"爬取时间范围：{START_TIME} 至 {END_TIME}\n" \
                         f"数据索引库：{INDEX}\n" \
                         f"爬取时间：{crawl_time}\n" \
                         f"返回字段：{FIELD}\n" \
                         f"==================================================\n\n"
                f.write(header)

            # 写入当前页每条数据（格式匹配文档字段解释）
            for idx, data in enumerate(page_data, 1):
                # 每条数据添加页内序号（如“第1页-第1条”）
                page_num = data.get("pageNum", "")  # 从数据中获取当前页码（需确保get_page_data返回时携带）
                data_seq = f"第{page_num}页-第{idx}条"
                f.write(f"{'=' * 50} {data_seq} {'=' * 50}\n")

                # 按FIELD参数中的字段顺序写入，字段中文对应文档1-37至1-39的解释
                field_map = {
                    "pageType": "站点类型",
                    "title": "标题",
                    "pageUrl": "文章链接",
                    "publishTime": "发布时间",
                    "poster": "发布者",
                    "siteName": "站点名称",
                    "content": "正文"
                }
                for field in FIELD.split(","):
                    field = field.strip()
                    value = data.get(field, "无")  # 字段不存在时显示“无”
                    # 正文单独换行，提升可读性
                    if field == "content":
                        f.write(f"{field_map.get(field, field)}：\n{value}\n\n")
                    else:
                        f.write(f"{field_map.get(field, field)}：{value}\n")
                f.write("\n")  # 数据间空行分隔

    except Exception as e:
        raise Exception(f"第{page_num}页数据写入异常：{str(e)}")


# -------------------------- 主程序（读一页写一页核心逻辑） --------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("📡 数据爬取程序启动（基于“数据查询接口(1).pdf”）")
    print(f"⏰ 爬取时间范围：{START_TIME} 至 {END_TIME}")
    print(f"💬 筛选情感类型：{SENTIMENT_TYPE}")
    print("=" * 60)

    try:
        # 1. 第一步：获取访问Token（文档1-4流程）
        token, token_type = get_access_token()

        # 2. 第二步：爬取第一页数据 → 立即写入文件（is_first_page=True，添加头部）
        first_page_data, total_count = get_page_data(
            token=token,
            token_type=token_type,
            page_num=1,
            sentiment_type=SENTIMENT_TYPE
        )
        # 为第一页数据添加页码标识（供save_page_to_txt使用）
        for data in first_page_data:
            data["pageNum"] = 1
        # 第一页写入（含头部）
        save_page_to_txt(
            page_data=first_page_data,
            save_path=SAVE_FILE_PATH,
            is_first_page=True
        )

        # 3. 计算总页数（向上取整，限制最大320页，避免过度请求）
        total_pages = (total_count + PAGE_SIZE - 1) // PAGE_SIZE
        max_pages = total_pages + 1  # 原逻辑保留：限制最大320页
        print(f"📄 总页数：{total_pages}页（每页{PAGE_SIZE}条），实际爬取至第{max_pages - 1}页")

        # 4. 第三步：循环爬取剩余页 → 每爬一页立即写入（读一页写一页）
        if max_pages > 2:  # 若总页数>1，爬取第2页至第max_pages-1页
            for page_num in range(2, max_pages):
                time.sleep(0.5)  # 延迟避免请求频繁（文档未限制，建议保留）
                # 爬取当前页数据
                page_data, _ = get_page_data(
                    token=token,
                    token_type=token_type,
                    page_num=page_num,
                    sentiment_type=SENTIMENT_TYPE
                )
                # 为当前页数据添加页码标识
                for data in page_data:
                    data["pageNum"] = page_num
                # 追加写入当前页数据（无头部，仅写数据）
                save_page_to_txt(
                    page_data=page_data,
                    save_path=SAVE_FILE_PATH,
                    is_first_page=False
                )

        print(f"\n🎉 爬取完成！所有数据已按“读一页写一页”追加至：{SAVE_FILE_PATH}")
        print(f"📊 爬取统计：情感类型={SENTIMENT_TYPE}，时间范围={START_TIME}至{END_TIME}，总页数={max_pages - 1}页")

    except Exception as e:
        print(f"\n❌ 程序异常终止：{str(e)}")
        print(f"⚠️  已爬取的部分数据已保存至：{SAVE_FILE_PATH}（未完成部分需重新运行）")