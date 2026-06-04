import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ===================== 基础配置 =====================
CONFIG = {
    "old_annotation_path": "./content_with_sentiment_20251102.txt",  # 旧标注文件路径（格式：文本|标签）
    "diff_output_path": "./annotation_diff.txt",  # 差异结果输出路径
    "model_dir": "./emotion_finetune_best_model/best_model",  # 训练好的新模型路径
    "label_mapping": {"消极": 0, "中立": 1, "积极": 2},  # 标签映射（与训练时一致）
    "reverse_label_mapping": {0: "消极", 1: "中立", 2: "积极"},  # 反向映射
    "min_length": 10,  # 最小文本长度（含）
    "max_length": 150  # 最大文本长度（含）
}


# ===================== 加载模型和分词器（只加载一次，提升效率） =====================
def load_model_and_tokenizer(model_dir):
    """加载训练好的模型和分词器"""
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval()  # 切换到评估模式
    # 自动分配设备（GPU优先）
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    print(f"模型加载完成，使用设备：{device}")
    return tokenizer, model, device


# ===================== 单文本预测函数 =====================
def predict_single_text(text, tokenizer, model, device):
    """用新模型预测单条文本的情感标签"""
    # 分词
    inputs = tokenizer(
        text,
        truncation=True,
        max_length=CONFIG["max_length"],
        padding="max_length",
        return_tensors="pt"
    ).to(device)

    # 预测（禁用梯度计算，提升速度）
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        pred_id = logits.argmax(dim=1).item()

    # 映射为标签文本
    return CONFIG["reverse_label_mapping"][pred_id]


# ===================== 标注对比与差异检测 =====================
def compare_annotations():
    # 1. 加载模型和分词器
    tokenizer, model, device = load_model_and_tokenizer(CONFIG["model_dir"])

    # 2. 初始化统计变量
    total_lines = 0  # 旧标注文件总行数
    valid_lines = 0  # 符合文本长度条件的行数
    diff_lines = 0  # 新旧标注不一致的行数
    invalid_format_lines = 0  # 格式错误行数（无"|"分割）
    invalid_label_lines = 0  # 旧标签无效行数（非消极/中立/积极）

    # 3. 读取旧标注文件，逐行处理
    with open(CONFIG["old_annotation_path"], "r", encoding="utf-8") as in_f, \
            open(CONFIG["diff_output_path"], "w", encoding="utf-8") as out_f:

        for line in in_f:
            line = line.strip()
            if not line:
                continue  # 跳过空行
            total_lines += 1

            # 4. 解析旧标注（格式：文本|标签）
            if "|" not in line:
                invalid_format_lines += 1
                continue  # 跳过无"|"分割的格式错误行

            # 分割文本和旧标签（按第一个"|"分割，避免文本中含"|"的情况）
            text, old_label = line.split("|", 1)
            text = text.strip()  # 去除文本前后空格
            old_label = old_label.strip()  # 去除标签前后空格

            # 5. 过滤无效旧标签（只保留消极/中立/积极）
            if old_label not in CONFIG["label_mapping"]:
                invalid_label_lines += 1
                continue

            # 6. 过滤文本长度不符合要求的行
            text_length = len(text)
            if text_length < CONFIG["min_length"] or text_length > CONFIG["max_length"]:
                continue
            valid_lines += 1

            # 7. 用新模型预测标签
            new_label = predict_single_text(text, tokenizer, model, device)

            # 8. 对比新旧标签，不一致则写入输出文件
            if old_label != new_label:
                # 输出格式：<文本><之前标注的标签><现在标注的标签>
                out_f.write(f"<{text}><{old_label}><{new_label}>\n")
                diff_lines += 1

    # 9. 输出统计信息
    print("=" * 60)
    print("标注对比完成！")
    print("=" * 60)
    print(f"📊 统计结果：")
    print(f"旧标注文件总行数：{total_lines}")
    print(f"格式错误行数（无'|'分割）：{invalid_format_lines}")
    print(f"旧标签无效行数（非消极/中立/积极）：{invalid_label_lines}")
    print(f"符合文本长度条件（10-150字）的行数：{valid_lines}")
    print(f"新旧标注不一致的行数：{diff_lines}")
    print("=" * 60)
    print(f"差异结果已保存至：{CONFIG['diff_output_path']}")
    print(f"输出格式：<文本><之前标注的标签><现在标注的标签>")


# ===================== 主函数 =====================
if __name__ == "__main__":
    compare_annotations()