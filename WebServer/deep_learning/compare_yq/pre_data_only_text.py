def extract_pure_content(input_file_path, output_file_path):
    """
    从“正文内容|情感标签”格式的文件中提取纯正文（去除情感标签）
    :param input_file_path: 输入文件路径（格式：每行=正文内容|情感标签）
    :param output_file_path: 输出文件路径（格式：每行=纯正文内容）
    """
    processed_count = 0  # 统计处理的正文总数
    skipped_lines = 0  # 统计跳过的无效行（如注释行、空行）

    try:
        # 打开输入文件（读）和输出文件（写）
        with open(input_file_path, "r", encoding="utf-8") as input_f, \
                open(output_file_path, "w", encoding="utf-8") as output_f:

            # 写入输出文件头部说明
            import datetime
            process_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            output_header = f"# 纯正文数据（已去除情感标签）\n" \
                            f"# 来源文件：{input_file_path}\n" \
                            f"# 处理时间：{process_time}\n" \
                            f"# 格式：一行一正文\n\n"
            output_f.write(output_header)

            # 逐行处理输入文件
            for line_num, line in enumerate(input_f, 1):
                line_stripped = line.strip()  # 去除行首尾空格/换行符

                # 跳过空行和注释行（如原文件中的说明行）
                if not line_stripped or line_stripped.startswith("#"):
                    skipped_lines += 1
                    continue

                # 按“|”分割，提取正文部分（左侧为正文，右侧为情感标签）
                parts = line_stripped.split("|", 1)  # 仅分割一次，避免正文含“|”的情况
                if len(parts) < 2:
                    # 若行中无“|”，视为异常行，跳过并提示
                    print(f"⚠️  跳过异常行（无情感标签分隔符）：第{line_num}行 -> {line_stripped[:50]}...")
                    skipped_lines += 1
                    continue

                pure_content = parts[0].strip()  # 提取纯正文并去除首尾空格
                if pure_content:  # 仅写入非空正文
                    output_f.write(f"{pure_content}\n")
                    processed_count += 1

        # 输出处理结果统计
        print("=" * 60)
        print("✅ 纯正文提取完成！")
        print(f"📊 统计信息：")
        print(f"   - 来源文件：{input_file_path}")
        print(f"   - 输出文件：{output_file_path}")
        print(f"   - 有效正文数：{processed_count}条")
        print(f"   - 跳过行数（空行/注释行/异常行）：{skipped_lines}行")
        print("=" * 60)

    except FileNotFoundError:
        print(f"❌ 错误：来源文件不存在！请检查路径：\n{input_file_path}")
    except PermissionError:
        print(f"❌ 错误：无文件读写权限！请检查文件是否被占用或路径是否有权限")
    except Exception as e:
        print(f"❌ 处理异常：{str(e)}（出错位置：可能在第{line_num}行）")


# -------------------------- 配置参数（需用户修改） --------------------------
if __name__ == "__main__":
    # 1. 输入文件：“正文内容|情感标签”格式的文件路径（如之前提取的content_with_sentiment_消极_202406.txt）
    INPUT_FILE = "./content_with_sentiment_20251102.txt"

    # 2. 输出文件：纯正文内容的保存路径（自定义命名，建议含“纯正文”标识）
    OUTPUT_FILE = "./pure_content_20251102.txt"

    # 执行提取
    extract_pure_content(INPUT_FILE, OUTPUT_FILE)