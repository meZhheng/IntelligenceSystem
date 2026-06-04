from openai import OpenAI
import time

# 配置信息（请替换为你的实际参数）
API_KEY = "sk-SHeg9gkCvtknBQsW146592C5B27a4eCb98F090EbA5483871"
API_BASE = "http://maas-api.cn-huabei-1.xf-yun.com/v1"
MODEL_ID = "xdeepseekv3"
INPUT_FILE = "./pure_content_20251102.txt"  # 输入文件（每行纯文本）
OUTPUT_FILE = "./label_20251102.txt"  # 输出文件（每行格式：原文本\t情感标签）
BATCH_SIZE = 5  # 最大单次标注数量，可根据token限制调整（建议5-20条）
RETRY_TIMES = 1  # 接口请求失败重试次数

# 初始化客户端
client = OpenAI(api_key=API_KEY, base_url=API_BASE)


def batch_sentiment_analysis(texts_with_idx):
    """
    批量情感倾向标注：调用大模型返回每条文本的情感标签（消极/积极/中立）
    texts_with_idx: 列表，元素为元组(文本索引, 文本内容)
    返回：字典，key=文本索引，value=情感标签
    """
    # 构建精简提示词，要求模型按固定格式输出
    prompt = """
    对以下文本进行情感倾向标注，仅返回“消极”“积极”或“中立”，格式为：索引:标签，每条一行，不添加任何额外内容。
    文本列表：
    """
    for idx, text in texts_with_idx:
        prompt += f"\n{idx}: {text}"

    messages = [{"role": "user", "content": prompt.strip()}]
    retry_count = 0

    while retry_count < RETRY_TIMES:
        try:
            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=messages,
                temperature=0.1,  # 降低随机性，保证标注一致性
                max_tokens=500,  # 按批量大小调整，10条文本约需100-300 tokens
                extra_headers={"lora_id": "0"},
                extra_body={"search_disable": True}  # 关闭搜索，节省token和时间
            )
            # 解析响应结果
            result = {}
            output_lines = response.choices[0].message.content.strip().split("\n")
            for line in output_lines:
                if ":" in line:
                    idx_str, label = line.split(":", 1)
                    idx = int(idx_str.strip())
                    label = label.strip()
                    # 校验标签有效性，无效时设为“未知”
                    if label not in ["积极", "消极", "中立"]:
                        label = "未知"
                    result[idx] = label
            return result
        except Exception as e:
            retry_count += 1
            print(f"请求失败（重试{retry_count}/{RETRY_TIMES}）：{e}")
            time.sleep(1)  # 重试间隔
    # 多次重试失败后，返回空结果
    return {}


def process_file():
    """
    按行读取输入文件，批量标注情感倾向，边读边写输出文件
    """
    with open(INPUT_FILE, "r", encoding="utf-8") as in_f, open(OUTPUT_FILE, "w", encoding="utf-8") as out_f:
        batch = []  # 存储当前批次的(索引, 文本)
        line_idx = 0  # 记录文本行索引（确保与输出行对应）

        for line in in_f:
            text = line.strip()
            if not text:  # 跳过空行，输出行保留空行+“中立”标签
                out_f.write(f"\t中立\n")
                line_idx += 1
                continue
            batch.append((line_idx, text))
            line_idx += 1

            # 当批次达到设定大小，执行批量标注
            if len(batch) >= BATCH_SIZE:
                sentiment_result = batch_sentiment_analysis(batch)
                # 写入当前批次结果，确保顺序一致
                for idx, text in batch:
                    label = sentiment_result.get(idx, "未知")
                    out_f.write(f"{text}\t{label}\n")
                out_f.flush()  # 立即写入磁盘，避免缓存丢失
                print(f"已处理 {line_idx} 条文本")
                batch = []  # 重置批次

        # 处理剩余不足一批的文本
        if batch:
            sentiment_result = batch_sentiment_analysis(batch)
            for idx, text in batch:
                label = sentiment_result.get(idx, "未知")
                out_f.write(f"{text}\t{label}\n")
            out_f.flush()
            print(f"已处理全部 {line_idx} 条文本")


if __name__ == "__main__":
    print("开始情感倾向标注任务...")
    process_file()
    print("标注完成，结果已保存至", OUTPUT_FILE)