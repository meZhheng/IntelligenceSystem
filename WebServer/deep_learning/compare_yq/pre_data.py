def extract_content_and_sentiment(crawl_file_path, output_file_path, sentiment_label):
    """
    提取基于“数据查询接口(1).pdf”的爬取文件中的正文，拼接情感标签后追加写入输出文件
    :param crawl_file_path: 基于“数据查询接口(1).pdf”生成的爬取文件路径（如data_crawl_消极_20240601000000_20240607235959.txt）
    :param output_file_path: 正文+情感标签的输出文件路径
    :param sentiment_label: 情感标签（需与爬取时SENTIMENT_TYPE一致，如“消极”“中立”“积极”，参考文档1-34）
    """
    is_collecting_content = False  # 标记是否进入正文收集状态
    current_content = ""  # 临时存储当前正文内容
    extracted_count = 0  # 统计本次提取的正文总数
    skip_header = True  # 标记是否需要跳过爬取文件的头部信息

    try:
        # 打开爬取文件（读）和输出文件（追加写），边读边提取边写入
        with open(crawl_file_path, "r", encoding="utf-8") as crawl_f, \
                open(output_file_path, "a", encoding="utf-8") as output_f:

            # 步骤1：处理输出文件头部（仅首次写入时添加，标注数据来源为“数据查询接口(1).pdf”）
            try:
                with open(output_file_path, "r", encoding="utf-8") as check_f:
                    output_first_line = check_f.readline()
                    is_output_empty = not output_first_line
            except FileNotFoundError:
                is_output_empty = True  # 输出文件不存在，视为首次写入

            # 步骤2：逐行读取爬取文件，提取正文
            for line_num, line in enumerate(crawl_f, 1):
                line_stripped = line.strip()  # 去除行首尾空格/换行符
                line_original = line.rstrip("\n")  # 保留行内空格，仅去除末尾换行符

                # 子步骤1：跳过爬取文件的头部信息（直到遇到第一条数据分隔符）
                if skip_header:
                    # 爬取文件头部结束标识：第一条数据的分隔符（===== 第X页-第X条 =====）
                    if line_stripped.startswith(
                            "=====") and "第" in line_stripped and "页-第" in line_stripped and "条" in line_stripped:
                        skip_header = False  # 后续内容为数据，停止跳过
                    continue

                # 子步骤2：识别数据分隔符，结束当前正文收集（若处于收集状态）
                if line_stripped.startswith(
                        "=====") and "第" in line_stripped and "页-第" in line_stripped and "条" in line_stripped:
                    if is_collecting_content and current_content.strip():
                        # 清洗正文：替换内部换行符为空格、多余空格为单个空格
                        cleaned_content = current_content.strip().replace("\n", " ").replace("  ", " ")
                        # 拼接情感标签，写入输出文件（一行一条）
                        output_f.write(f"{cleaned_content}|{sentiment_label}\n")
                        extracted_count += 1
                        # 重置状态，准备收集下一条正文
                        is_collecting_content = False
                        current_content = ""
                    continue

                # 子步骤3：识别“正文：”标识，开始收集正文（匹配爬取文件的正文字段格式）
                if line_stripped.startswith("正文："):
                    is_collecting_content = True
                    # 提取“正文：”后的首段内容（避免遗漏该行正文）
                    content_start = line_original.replace("正文：", "", 1).strip()
                    if content_start:
                        current_content += content_start
                    continue

                # 子步骤4：处于正文收集状态时，持续拼接多行正文
                if is_collecting_content:
                    if line_stripped:  # 仅拼接非空行，避免多余空格
                        current_content += " " + line_stripped

            # 步骤3：处理爬取文件末尾的最后一条正文（无后续分隔符的情况）
            if is_collecting_content and current_content.strip():
                cleaned_content = current_content.strip().replace("\n", " ").replace("  ", " ")
                output_f.write(f"{cleaned_content}|{sentiment_label}\n")
                extracted_count += 1

        # 输出提取结果统计
        print("=" * 60)
        print("✅ 正文与情感标签提取完成！")
        print(f"📊 统计信息：")
        print(f"   - 爬取文件（基于“数据查询接口(1).pdf”）：{crawl_file_path}")
        print(f"   - 输出文件：{output_file_path}")
        print(f"   - 提取正文总数：{extracted_count}条")
        print(f"   - 情感标签：{sentiment_label}")
        print("=" * 60)

    except FileNotFoundError:
        print(f"❌ 错误：爬取文件不存在！请检查路径是否正确：\n{crawl_file_path}")
    except PermissionError:
        print(f"❌ 错误：无文件读写权限！请检查：\n1. 爬取文件是否被占用（如已打开）\n2. 输出路径是否有权限写入")
    except Exception as e:
        print(f"❌ 提取异常：{str(e)}（出错位置：可能在爬取文件第{line_num}行）")


# -------------------------- 配置参数（需用户根据实际情况修改） --------------------------
if __name__ == "__main__":
    # 1. 输入：基于“数据查询接口(1).pdf”的爬取文件路径（即“读一页写一页”脚本的输出文件）
    # 示例："./data_crawl_消极_20240601000000_20240607235959.txt"
    CRAWL_FILE_PATH = "./data_crawl_中立_2025-11-02000000_2025-11-05235959.txt"

    # 2. 输出：正文+情感标签的文件路径（可自定义，支持追加）
    # 示例："./content_with_sentiment_消极_202406.txt"
    OUTPUT_FILE_PATH = "./content_with_sentiment_20251102.txt"

    # 3. 情感标签：必须与爬取时的SENTIMENT_TYPE一致（参考“数据查询接口(1).pdf”1-34节sentiment参数）
    # 可选值：“消极”“中立”“积极”
    SENTIMENT_LABEL = "中立"

    # 执行提取
    extract_content_and_sentiment(CRAWL_FILE_PATH, OUTPUT_FILE_PATH, SENTIMENT_LABEL)