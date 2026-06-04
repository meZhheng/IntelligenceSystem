import torch
from transformers import RobertaTokenizer
from model import BARTVAEClassifier, BARTDecoderClassifier, BARTVADVAEClassifier, RobertaClassifier
# 初始化分词器（与模型checkpoint匹配）
tokenizer = RobertaTokenizer.from_pretrained("roberta-base")

# 原始对话上下文（假设包含过去2句和当前句）
context_utterances = [
    "USER_A: How was your weekend?",
    "USER_B: It was great! I went hiking.",
    "USER_A: That sounds fun!"  # 当前待分类的语句
]

# 拼接上下文（按ErcTextDataset的拼接逻辑）
sep_token = "</s></s>"  # RoBERTa的分隔符
final_utterance = f"{sep_token.join(context_utterances[:-1])}{sep_token}{context_utterances[-1]}"

# 编码主输入（inputs & mask）
inputs = tokenizer(
    final_utterance,
    padding="max_length",
    max_length=64,
    return_tensors="pt"
)

# 解码器输入（BART格式，右移序列）
decoder_inputs = tokenizer(
    context_utterances[-1],  # 当前语句作为解码目标
    padding="max_length",
    max_length=32,
    return_tensors="pt"
).input_ids
decoder_inputs[:, 0] = 2  # BART的decoder_start_token_id=2

# 其他必要输入（示例值）
vad_labels = torch.tensor([[0.7, 0.5, 0.6]], dtype=torch.float32)  # VAD三维监督信号
labels = torch.tensor([3], dtype=torch.long)  # 分类标签（假设共7类）
latent_variables = ['V', 'A', 'D']
# 模型初始化（参数需与训练时一致）
model = BARTVADVAEClassifier(
    check_point="roberta-base",
    bart_check_point="facebook/bart-base",
    num_class=6,               # 分类类别数（如MELD数据集）
    emo_dim=64,                 # VAD维度
    device="cuda",
    batch_size=1,              # 单样本推理
    latent_variables=['V', 'A', 'D'],  # 假设分离V/A/D三个维度
    decoder_type="LSTM"
).to("cuda")
model.load_state_dict(torch.load("./model_save_dir/IEMOCAP/model_state_dict_2.pth"))
model.eval()
kl_weights_dict = {}
weight_val = 0.05
for lv in latent_variables:
    kl_weights_dict[lv] = weight_val
kl_weights_dict['content'] = weight_val
# 输入张量（转移到GPU）
input_ids = inputs["input_ids"].to("cuda")
attention_mask = inputs["attention_mask"].to("cuda")
decoder_inputs = decoder_inputs.to("cuda")
decoder_masks = (decoder_inputs != tokenizer.pad_token_id).long().to("cuda")

# 前向推理
with torch.no_grad():
    outputs, lm_loss, latent_params, vad_loss, vad_predicts = model(
        inputs=input_ids,
        mask=attention_mask,
        decoder_inputs=decoder_inputs,
        decoder_masks=decoder_masks,
        decoder_labels=decoder_inputs,  # 训练时使用右移标签，推理时可复用输入
        mode="eval",                    # 关闭随机噪声
        vad_labels=vad_labels.to("cuda"),
        labels=labels.to("cuda")
    )

# 结果解析
logits = torch.softmax(outputs, dim=-1)
predicted_class = logits.argmax().item()
print(f"Predicted Emotion Class: {predicted_class}")
print(f"VAD Predictions: {vad_predicts.cpu().numpy()}")