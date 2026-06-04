import os
# 强制指定计算能力为 8.9（放在所有 torch 导入前）
# os.environ["TORCH_CUDA_ARCH_LIST"] = "8.9"
import re
from datasets import load_dataset
from transformers import (
    BertTokenizerFast,
    BertForMaskedLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
import torch
# 验证是否生效
# print("PyTorch 强制使用的架构:", os.environ.get("TORCH_CUDA_ARCH_LIST"))
print("GPU 计算能力识别:", torch.cuda.get_device_capability(0))  # 若仍显示120，继续下一步
# 检查PyTorch是否支持CUDA（即是否为GPU版本且环境配置正确）
print("CUDA是否可用:", torch.cuda.is_available())

# 查看当前使用的设备
if torch.cuda.is_available():
    print("当前使用的设备:", torch.cuda.get_device_name(torch.cuda.current_device()))
    print("GPU数量:", torch.cuda.device_count())
else:
    print("当前使用CPU")

# 查看PyTorch版本及CUDA版本（若支持）
print("PyTorch版本:", torch.__version__)
if torch.cuda.is_available():
    print("CUDA版本:", torch.version.cuda)

# --------------------------
# 1. 中英混合文本清洗工具函数
# --------------------------
def clean_multilingual_text(text):
    """
    清洗中英混合文本：保留中英文字符、常见标点，去除乱码和特殊符号
    """
    # 去除URL、邮箱等特殊格式
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "", text)

    # 保留中文、英文、数字和常见标点
    # \u4e00-\u9fa5：中文字符
    # a-zA-Z0-9：英文字母和数字
    # 。，！？；：,.!?;:\s：中英文标点和空格
    text = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9。，！？；：,.!?;:\s]", "", text)

    # 去除多余空格和换行
    text = re.sub(r"\s+", " ", text).strip()

    # 过滤过短文本（增加长度阈值，因为英文单词字符数较多）
    if len(text) < 15:
        return None

    return text


# --------------------------
# 2. 加载与预处理中英混合数据集
# --------------------------
def load_and_preprocess_data(file_path, tokenizer, max_length=512):
    """
    加载中英混合文本数据并完成预处理
    """
    # 加载原始文本数据（每行一段文本）
    dataset = load_dataset("text", data_files={"train": file_path})["train"]
    print(f"原始数据量：{len(dataset)}条")

    # 第一步：清洗文本
    dataset = dataset.map(
        lambda x: {"clean_text": clean_multilingual_text(x["text"])},
        batched=False,
        remove_columns=["text"]
    )
    # 过滤清洗后为空的样本
    dataset = dataset.filter(lambda x: x["clean_text"] is not None)
    print(f"清洗后数据量：{len(dataset)}条")

    # 第二步：分词与截断（使用预训练tokenizer原生处理，不额外使用jieba）
    def tokenize_function(examples):
        return tokenizer(
            examples["clean_text"],
            truncation=True,
            max_length=max_length,
            padding="max_length",
            return_overflowing_tokens=False,
        )

    # 多进程加速分词
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        num_proc=os.cpu_count(),  # 使用所有可用CPU核心
        remove_columns=["clean_text"]
    )

    # 转换为PyTorch张量格式
    tokenized_dataset.set_format("torch", columns=["input_ids", "attention_mask"])
    return tokenized_dataset


# --------------------------
# 3. 主函数：二次预训练流程
# --------------------------
def main():
    # 配置参数（使用支持中英双语的基础模型）
    config = {
        "domain_data_path": "./pure_content_20251101.txt",  # 中英混合文本路径
        "output_dir": "./multilingual_domain_bert_v2",  # 模型保存路径
        # 推荐使用支持中英双语的基础模型
        "model_name": "./multilingual_domain_bert/final",  # 多语言BERT
        # 可选: "xlm-roberta-base" (对多语言支持更好但计算量更大)
        "max_length": 512,
        "num_train_epochs": 6,
        "per_device_train_batch_size": 4,
        "gradient_accumulation_steps": 2,
        "learning_rate": 5e-5,  # 多语言模型可适当调低至3e-5~5e-5
        "logging_steps": 200,
        "save_steps": 1000,
    }
    print("开始加载")
    # 加载多语言Tokenizer
    tokenizer = BertTokenizerFast.from_pretrained(config["model_name"])

    # 加载并预处理数据
    tokenized_dataset = load_and_preprocess_data(
        config["domain_data_path"],
        tokenizer,
        config["max_length"]
    )

    # 加载基础模型（多语言版本）
    model = BertForMaskedLM.from_pretrained(config["model_name"])
    print(f"成功加载基础模型：{config['model_name']}")

    # 配置训练参数
    training_args = TrainingArguments(
        output_dir=config["output_dir"],
        overwrite_output_dir=True,
        num_train_epochs=config["num_train_epochs"],
        per_device_train_batch_size=config["per_device_train_batch_size"],
        gradient_accumulation_steps=config["gradient_accumulation_steps"],
        learning_rate=config["learning_rate"],
        weight_decay=0.01,
        warmup_steps=1000,
        logging_dir=f"{config['output_dir']}/logs",
        logging_steps=config["logging_steps"],
        save_steps=config["save_steps"],
        save_total_limit=3,
        fp16=False,  # 需GPU支持
        report_to="none",
    )

    # 构建MLM数据处理器（自动处理多语言mask）
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=True,
        mlm_probability=0.15,
    )

    # 初始化Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )

    # 开始二次预训练
    print("开始多语言领域二次预训练...")
    trainer.train()

    # 保存最终模型和Tokenizer
    final_save_dir = f"{config['output_dir']}/final"
    model.save_pretrained(final_save_dir)
    tokenizer.save_pretrained(final_save_dir)
    print(f"预训练完成，模型保存至：{final_save_dir}")


if __name__ == "__main__":
    main()