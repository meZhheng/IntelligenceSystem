INPUT_LABEL_FILE = "./label_20251102.txt"  # 原始标注文件路径
OUTPUT_FILTERED_FILE = "./label_20251102_10bt150.txt"  # 过滤后的文件路径
MAX_PER_LABEL = 1000  # 每个标签最多保留的数量

def filter_data_and_deduplicate():
    # 初始化统计变量
    line_count = 0  # 总行数
    kept_count = 0  # 最终保留总行数
    unknown_label_count = 0  # 过滤的未知标签行数
    too_short_count = 0  # 过滤的文本过短（<10字）行数
    too_long_count = 0  # 过滤的文本过长（>150字）行数
    format_error_count = 0  # 过滤的格式异常行数
    duplicate_count = 0  # 过滤的重复文本行数
    truncated_count = 0  # 因超过标签上限被截断的行数

    # 统计各标签的「有效数」（过滤后+去重前）、「去重后有效数」、「保留数」
    label_stats = {
        "消极": {"valid_before_dedup": 0, "valid_after_dedup": 0, "kept": 0},
        "中立": {"valid_before_dedup": 0, "valid_after_dedup": 0, "kept": 0},
        "积极": {"valid_before_dedup": 0, "valid_after_dedup": 0, "kept": 0}
    }

    # 用于记录已保留的文本（去重判断依据：去除前后空格后的文本）
    existing_texts = set()

    with open(INPUT_LABEL_FILE, "r", encoding="utf-8") as in_f, \
            open(OUTPUT_FILTERED_FILE, "w", encoding="utf-8") as out_f:

        for line in in_f:
            line_count += 1
            line_stripped = line.strip('\n')
            parts = line_stripped.split('\t')

            # 1. 过滤格式异常行（必须包含文本和标签两部分）
            if len(parts) < 2:
                format_error_count += 1
                continue

            text, label = parts[0], parts[1]
            text_stripped = text.strip()  # 去除前后空格（用于长度判断和去重）

            # 2. 过滤未知标签
            if label not in label_stats:
                unknown_label_count += 1
                continue

            # 3. 过滤文本长度不符合要求的行（10-150字）
            text_length = len(text_stripped)
            if text_length < 10:
                too_short_count += 1
                continue
            if text_length > 150:
                too_long_count += 1
                continue

            # 4. 统计当前标签的「去重前有效数」
            label_stats[label]["valid_before_dedup"] += 1

            # 5. 去除重复文本（同一文本仅保留第一次出现的）
            if text_stripped in existing_texts:
                duplicate_count += 1
                continue
            existing_texts.add(text_stripped)  # 记录已保留的文本

            # 6. 统计当前标签的「去重后有效数」
            label_stats[label]["valid_after_dedup"] += 1

            # 7. 限制每个标签最多保留1000条
            if label_stats[label]["kept"] < MAX_PER_LABEL:
                out_f.write(line)  # 写入原始行
                kept_count += 1
                label_stats[label]["kept"] += 1
            else:
                truncated_count += 1  # 超过上限，截断

        # 输出详细统计结果
        print("=" * 90)
        print("文件过滤+去重+数量限制完成！")
        print("=" * 90)
        print(f"📊 总体统计：")
        print(f"总行数：{line_count}")
        print(f"最终保留行数：{kept_count}")
        print(f"过滤总行数：{line_count - kept_count}")
        print("-" * 70)
        print(f"🚫 过滤原因分布：")
        print(f"未知标签：{unknown_label_count} 行")
        print(f"文本过短（<10字）：{too_short_count} 行")
        print(f"文本过长（>150字）：{too_long_count} 行")
        print(f"格式异常（无制表符分隔）：{format_error_count} 行")
        print(f"重复文本：{duplicate_count} 行")
        print(f"超过标签上限（每个最多1000条）：{truncated_count} 行")
        print("-" * 70)
        print(f"✅ 各标签详细统计：")
        print(f"注：有效数（去重前）= 过滤格式/标签/长度后的数量")
        print(f"    有效数（去重后）= 去重后的实际有效数量")
        print(f"    保留数 = 最终限制1000条后的数量")
        for label, stats in label_stats.items():
            truncated = stats["valid_after_dedup"] - stats["kept"]  # 去重后仍需截断的数量
            print(f"{label}：有效数（去重前）{stats['valid_before_dedup']} 条 → 有效数（去重后）{stats['valid_after_dedup']} 条 → 保留数 {stats['kept']} 条（截断 {truncated} 条）")
        print("=" * 90)
        print(f"过滤后的文件已保存至：{OUTPUT_FILTERED_FILE}")
        print(f"📝 去重说明：基于「去除前后空格后的文本」去重，同一文本仅保留第一次出现的记录")


if __name__ == "__main__":
    filter_data_and_deduplicate()