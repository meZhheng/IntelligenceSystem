import torch
import pandas as pd
import os
from transformers import AutoTokenizer, AutoModelForCausalLM
from huggingface_hub import login

CONFIG = {
    "input_file_path": "./stance.txt",
    "output_file_path": "./stance_analysis_results.csv",
    "model_save_root_dir": "./qwen_saved_models",
    "filter_keywords": ["中国"],  #降低数据量
    "target_mode": "multi_targets_all",
    "targets": ["中国"],
    "stance_categories": ["支持", "反对", "中立"],
    "model_choice": "qwen3-0.6b",
    "model_paths": {
        "qwen3-0.6b": "Qwen/Qwen3-0.6B"
    },
    "generation_params": {
        "max_new_tokens": 32768,
        "temperature": 0.3,
        "top_p": 0.7,
        "top_k": 20,
        "do_sample": False,
        "eos_token_id": None,
        "pad_token_id": None
    },
    "max_length": 256,
    "min_text_length": 10,
    "max_text_length": 250,
    "device": torch.device("cuda" if torch.cuda.is_available() else "cpu"),
    "huggingface_token": ""
}


def create_dir_if_not_exist(dir_path):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"创建文件夹：{dir_path}")

def read_texts_from_file(file_path):
    texts = []
    total_lines = 0
    too_short_lines = 0
    too_long_lines = 0
    empty_lines = 0

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            total_lines += 1

            if not line:
                empty_lines += 1
                continue

            text_length = len(line)
            if text_length < CONFIG["min_text_length"]:
                too_short_lines += 1
                continue
            if text_length > CONFIG["max_text_length"]:
                too_long_lines += 1
                continue

            texts.append(line)

    print("=" * 60)
    print("纯文本文件读取完成！")
    print("=" * 60)
    print(f"总行数：{total_lines} | 长度有效文本数：{len(texts)}")
    print(
        f"空行：{empty_lines} | 过短（<{CONFIG['min_text_length']}字）：{too_short_lines} | 过长（>{CONFIG['max_text_length']}字）：{too_long_lines}")
    print("=" * 60)

    return texts

def filter_texts_by_keywords(texts):
    filtered_texts = []
    keywords = CONFIG["filter_keywords"]

    for text in texts:
        if any(keyword in text for keyword in keywords):
            filtered_texts.append(text)

    print("=" * 60)
    print("文本初筛完成！")
    print("=" * 60)
    print(f"筛选关键词：{keywords}")
    print(f"筛选前文本数：{len(texts)}")
    print(f"筛选后文本数：{len(filtered_texts)}")
    print(f"筛选掉文本数：{len(texts) - len(filtered_texts)}")
    print(f"筛选保留率：{len(filtered_texts) / len(texts) * 100:.1f}%" if len(texts) > 0 else "无有效文本")
    print("=" * 60)

    return filtered_texts

def load_model(model_choice):
    model_hf_path = CONFIG["model_paths"][model_choice]
    model_local_dir = os.path.join(CONFIG["model_save_root_dir"], model_choice)
    tokenizer_local_dir = model_local_dir
    tokenizer = None
    model = None

    create_dir_if_not_exist(CONFIG["model_save_root_dir"])

    try:
        if os.path.exists(model_local_dir) and os.listdir(model_local_dir):
            print(f"发现本地Qwen模型：{model_local_dir}，正在加载...")
            tokenizer = AutoTokenizer.from_pretrained(
                tokenizer_local_dir,
                trust_remote_code=True,
                padding_side="right"
            )
            model = AutoModelForCausalLM.from_pretrained(
                tokenizer_local_dir,
                trust_remote_code=True,
                torch_dtype="auto",
                device_map="auto"
            )
            print(f"本地Qwen模型加载成功：{model_local_dir}")

        else:
            print(f"本地无Qwen模型，正在从Hugging Face下载：{model_hf_path}...")
            if CONFIG["huggingface_token"]:
                login(token=CONFIG["huggingface_token"])
                print("Hugging Face登录成功")

            tokenizer = AutoTokenizer.from_pretrained(
                model_hf_path,
                trust_remote_code=True,
                padding_side="right"
            )
            model = AutoModelForCausalLM.from_pretrained(
                model_hf_path,
                trust_remote_code=True,
                torch_dtype="auto",
                device_map="auto"
            )

            create_dir_if_not_exist(model_local_dir)
            tokenizer.save_pretrained(tokenizer_local_dir)
            model.save_pretrained(model_local_dir)
            print(f"Qwen模型下载并保存成功：{model_local_dir}")

        if model is not None:
            model.eval()
            print(f"Qwen模型已切换至推理模式（设备：{model.device}）")

        print(f"Qwen模型加载完成！")
        print(f"目标模式：{CONFIG['target_mode']} | 目标：{CONFIG['targets']}")

    except Exception as e:
        print(f"Qwen模型加载/保存失败：{e}")
        print("建议：1. 安装依赖：pip install transformers>=4.37.0 accelerate sentencepiece；2. 确保网络通畅")
        raise e

    return tokenizer, model


def predict_stance(text, target, tokenizer, model):
    stance_categories = CONFIG["stance_categories"]


    system_prompt = "你是立场分类工具，仅输出针对目标对象的立场三选一支持/反对/中立"
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"文本：{text}，目标：{target}，输出立场"}
    ]


    chat_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=True  #推理慢的话，可以false关掉
    )


    model_inputs = tokenizer([chat_text], return_tensors="pt").to(model.device)

    gen_params = CONFIG["generation_params"]

    generated_ids = model.generate(
        **model_inputs,
        max_new_tokens=32768,
        temperature=gen_params["temperature"],
        top_p=gen_params["top_p"],
        top_k=gen_params["top_k"],
        do_sample=gen_params["do_sample"],
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.pad_token_id
    )
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()


    try:
        index = len(output_ids) - output_ids[::-1].index(151668)
    except ValueError:
        index = 0

    thinking_content = tokenizer.decode(output_ids[:index], skip_special_tokens=True).strip("\n")
    content = tokenizer.decode(output_ids[index:], skip_special_tokens=True).strip("\n")


    raw_output = f"模型原始生成：{thinking_content+content}"

    cleaned_content = content.replace(" ", "").replace("\n", "").strip()
    try:

        stance = next(s for s in stance_categories if s in cleaned_content)
    except:
        # 匹配失败时，基于文本关键词硬判
        if any(word in text for word in ["支持", "促进", "赞同", "肯定", "利好", "维护"]):
            stance = "支持"
        elif any(word in text for word in ["反对", "遏制", "批评", "抵制", "破坏"]):
            stance = "反对"
        else:
            stance = "中立"

    return {
        "text": text,
        "target": target,
        "stance": stance,
        "raw_output": raw_output,
        "model": CONFIG["model_choice"]
    }



def batch_stance_analysis():
    texts = read_texts_from_file(CONFIG["input_file_path"])
    if not texts:
        print("无长度有效文本，退出程序！")
        return

    filtered_texts = filter_texts_by_keywords(texts)
    if not filtered_texts:
        print("筛选后无有效文本，退出程序！")
        return

    tokenizer, model = load_model(CONFIG["model_choice"])

    text_target_pairs = []
    if CONFIG["target_mode"] == "single_target":
        target = CONFIG["targets"][0]
        text_target_pairs = [(text, target) for text in filtered_texts]
    elif CONFIG["target_mode"] == "multi_targets_all":
        for text in filtered_texts:
            for target in CONFIG["targets"]:
                text_target_pairs.append((text, target))
    elif CONFIG["target_mode"] == "multi_targets_one2one":
        if len(filtered_texts) != len(CONFIG["targets"]):
            print(f"筛选后文本数（{len(filtered_texts)}）≠ 目标数（{len(CONFIG['targets'])}）！")
            return
        text_target_pairs = list(zip(filtered_texts, CONFIG["targets"]))

    results = []
    total_pairs = len(text_target_pairs)
    print(f"\n 开始处理 {total_pairs} 个（文本-目标）配对...")

    for i, (text, target) in enumerate(text_target_pairs, 1):
        result = predict_stance(text, target, tokenizer, model)
        results.append(result)

        if i % 10 == 0 or i == total_pairs:
            print(f"进度：{i}/{total_pairs} → 文本：{text[:20]}... | 目标：{target} | 立场：{result['stance']}")

    df = pd.DataFrame(results)
    df = df[["text", "target", "stance", "raw_output", "model"]]
    df.to_csv(CONFIG["output_file_path"], index=False, encoding="utf-8-sig")

    print("\n" + "=" * 60)
    print("Qwen立场分析完成！")
    print("=" * 60)
    print(f"结果保存路径：{CONFIG['output_file_path']}")
    print(f"最终有效结果数：{len(df)}")
    for target in CONFIG["targets"]:
        target_df = df[df["target"] == target]
        if len(target_df) == 0:
            continue
        print(f"\n【目标：{target}】（{len(target_df)}条）")
        stance_counts = target_df["stance"].value_counts()
        for stance, count in stance_counts.items():
            print(f"  {stance}：{count}条（{count / len(target_df) * 100:.1f}%）")
    print("=" * 60)


if __name__ == "__main__":
    batch_stance_analysis()