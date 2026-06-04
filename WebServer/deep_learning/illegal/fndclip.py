from random import random, shuffle
import torch
import torch.nn as nn
import random
import torchvision
import torch.nn.functional as F
import torch.backends.cudnn as cudnn
import numpy as np
from torch.utils.data import DataLoader
from torch import optim
from collections import OrderedDict
from typing import Tuple, Union
import torch.utils.data as data
import pandas
from PIL import Image
from tqdm import tqdm
from transformers import AutoModel, AutoTokenizer, CLIPProcessor, CLIPModel
from torchvision.transforms import Compose, Resize, CenterCrop, ToTensor, Normalize
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
import os
try:
    from torchvision.transforms import InterpolationMode
    BICUBIC = InterpolationMode.BICUBIC
except ImportError:
    BICUBIC = Image.BICUBIC


class Bottleneck(nn.Module):
    expansion = 4
    def __init__(self, inplanes, planes, stride=1):
        super().__init__()

        # all conv layers have stride 1. an avgpool is performed after the second convolution when stride > 1
        self.conv1 = nn.Conv2d(inplanes, planes, 1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)

        self.conv2 = nn.Conv2d(planes, planes, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)

        self.avgpool = nn.AvgPool2d(stride) if stride > 1 else nn.Identity()

        self.conv3 = nn.Conv2d(planes, planes * self.expansion, 1, bias=False)
        self.bn3 = nn.BatchNorm2d(planes * self.expansion)

        self.relu = nn.ReLU(inplace=True)
        self.downsample = None
        self.stride = stride

        if stride > 1 or inplanes != planes * Bottleneck.expansion:
            # downsampling layer is prepended with an avgpool, and the subsequent convolution has stride 1
            self.downsample = nn.Sequential(OrderedDict([
                ("-1", nn.AvgPool2d(stride)),
                ("0", nn.Conv2d(inplanes, planes * self.expansion, 1, stride=1, bias=False)),
                ("1", nn.BatchNorm2d(planes * self.expansion))
            ]))

    def forward(self, x: torch.Tensor):
        identity = x

        out = self.relu(self.bn1(self.conv1(x)))
        out = self.relu(self.bn2(self.conv2(out)))
        out = self.avgpool(out)
        out = self.bn3(self.conv3(out))

        if self.downsample is not None:
            identity = self.downsample(x)

        out += identity
        out = self.relu(out)
        return out

class AttentionPool2d(nn.Module):
    def __init__(self, spacial_dim: int, embed_dim: int, num_heads: int, output_dim: int = None):
        super().__init__()
        self.positional_embedding = nn.Parameter(torch.randn(spacial_dim ** 2 + 1, embed_dim) / embed_dim ** 0.5)
        self.k_proj = nn.Linear(embed_dim, embed_dim)
        self.q_proj = nn.Linear(embed_dim, embed_dim)
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.c_proj = nn.Linear(embed_dim, output_dim or embed_dim)
        self.num_heads = num_heads

    def forward(self, x):
        x = x.reshape(x.shape[0], x.shape[1], x.shape[2] * x.shape[3]).permute(2, 0, 1)  # NCHW -> (HW)NC
        x = torch.cat([x.mean(dim=0, keepdim=True), x], dim=0)  # (HW+1)NC
        x = x + self.positional_embedding[:, None, :].to(x.dtype)  # (HW+1)NC
        x, _ = F.multi_head_attention_forward(
            query=x, key=x, value=x,
            embed_dim_to_check=x.shape[-1],
            num_heads=self.num_heads,
            q_proj_weight=self.q_proj.weight,
            k_proj_weight=self.k_proj.weight,
            v_proj_weight=self.v_proj.weight,
            in_proj_weight=None,
            in_proj_bias=torch.cat([self.q_proj.bias, self.k_proj.bias, self.v_proj.bias]),
            bias_k=None,
            bias_v=None,
            add_zero_attn=False,
            dropout_p=0,
            out_proj_weight=self.c_proj.weight,
            out_proj_bias=self.c_proj.bias,
            use_separate_proj_weight=True,
            training=self.training,
            need_weights=False
        )

        return x[0]

class ModifiedResNet(nn.Module):
    """
    A ResNet class that is similar to torchvision's but contains the following changes:
    - There are now 3 "stem" convolutions as opposed to 1, with an average pool instead of a max pool.
    - Performs anti-aliasing strided convolutions, where an avgpool is prepended to convolutions with stride > 1
    - The final pooling layer is a QKV attention instead of an average pool
    """

    def __init__(self, layers, output_dim, heads, input_resolution=224, width=64):
        super().__init__()
        self.output_dim = output_dim
        self.input_resolution = input_resolution

        # the 3-layer stem
        self.conv1 = nn.Conv2d(3, width // 2, kernel_size=3, stride=2, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(width // 2)
        self.conv2 = nn.Conv2d(width // 2, width // 2, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(width // 2)
        self.conv3 = nn.Conv2d(width // 2, width, kernel_size=3, padding=1, bias=False)
        self.bn3 = nn.BatchNorm2d(width)
        self.avgpool = nn.AvgPool2d(2)
        self.relu = nn.ReLU(inplace=True)

        # residual layers
        self._inplanes = width  # this is a *mutable* variable used during construction
        self.layer1 = self._make_layer(width, layers[0])
        self.layer2 = self._make_layer(width * 2, layers[1], stride=2)
        self.layer3 = self._make_layer(width * 4, layers[2], stride=2)
        self.layer4 = self._make_layer(width * 8, layers[3], stride=2)

        embed_dim = width * 32  # the ResNet feature dimension
        self.attnpool = AttentionPool2d(input_resolution // 32, embed_dim, heads, output_dim)

    def _make_layer(self, planes, blocks, stride=1):
        layers = [Bottleneck(self._inplanes, planes, stride)]

        self._inplanes = planes * Bottleneck.expansion
        for _ in range(1, blocks):
            layers.append(Bottleneck(self._inplanes, planes))

        return nn.Sequential(*layers)

    def forward(self, x):
        def stem(x):
            for conv, bn in [(self.conv1, self.bn1), (self.conv2, self.bn2), (self.conv3, self.bn3)]:
                x = self.relu(bn(conv(x)))
            x = self.avgpool(x)
            return x

        x = x.type(self.conv1.weight.dtype)
        x = stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.attnpool(x)

        return x

class LayerNorm(nn.LayerNorm):
    """Subclass torch's LayerNorm to handle fp16."""

    def forward(self, x: torch.Tensor):
        orig_type = x.dtype
        ret = super().forward(x.type(torch.float32))
        return ret.type(orig_type)

class QuickGELU(nn.Module):
    def forward(self, x: torch.Tensor):
        return x * torch.sigmoid(1.702 * x)

class ResidualAttentionBlock(nn.Module):
    def __init__(self, d_model: int, n_head: int, attn_mask: torch.Tensor = None):
        super().__init__()

        self.attn = nn.MultiheadAttention(d_model, n_head)
        self.ln_1 = LayerNorm(d_model)
        self.mlp = nn.Sequential(OrderedDict([
            ("c_fc", nn.Linear(d_model, d_model * 4)),
            ("gelu", QuickGELU()),
            ("c_proj", nn.Linear(d_model * 4, d_model))
        ]))
        self.ln_2 = LayerNorm(d_model)
        self.attn_mask = attn_mask

    def attention(self, x: torch.Tensor):
        self.attn_mask = self.attn_mask.to(dtype=x.dtype, device=x.device) if self.attn_mask is not None else None
        return self.attn(x, x, x, need_weights=False, attn_mask=self.attn_mask)[0]

    def forward(self, x: torch.Tensor):
        x = x + self.attention(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x

class Transformer(nn.Module):
    def __init__(self, width: int, layers: int, heads: int, attn_mask: torch.Tensor = None):
        super().__init__()
        self.width = width
        self.layers = layers
        self.resblocks = nn.Sequential(*[ResidualAttentionBlock(width, heads, attn_mask) for _ in range(layers)])

    def forward(self, x: torch.Tensor):
        return self.resblocks(x)

class VisionTransformer(nn.Module):
    def __init__(self, input_resolution: int, patch_size: int, width: int, layers: int, heads: int, output_dim: int):
        super().__init__()
        self.input_resolution = input_resolution
        self.output_dim = output_dim
        self.conv1 = nn.Conv2d(in_channels=3, out_channels=width, kernel_size=patch_size, stride=patch_size, bias=False)

        scale = width ** -0.5
        self.class_embedding = nn.Parameter(scale * torch.randn(width))
        self.positional_embedding = nn.Parameter(scale * torch.randn((input_resolution // patch_size) ** 2 + 1, width))
        self.ln_pre = LayerNorm(width)

        self.transformer = Transformer(width, layers, heads)

        self.ln_post = LayerNorm(width)
        self.proj = nn.Parameter(scale * torch.randn(width, output_dim))

    def forward(self, x: torch.Tensor):
        x = self.conv1(x)  # shape = [*, width, grid, grid]
        x = x.reshape(x.shape[0], x.shape[1], -1)  # shape = [*, width, grid ** 2]
        x = x.permute(0, 2, 1)  # shape = [*, grid ** 2, width]
        x = torch.cat([self.class_embedding.to(x.dtype) + torch.zeros(x.shape[0], 1, x.shape[-1], dtype=x.dtype, device=x.device), x], dim=1)  # shape = [*, grid ** 2 + 1, width]
        x = x + self.positional_embedding.to(x.dtype)
        x = self.ln_pre(x)

        x = x.permute(1, 0, 2)  # NLD -> LND
        x = self.transformer(x)
        x = x.permute(1, 0, 2)  # LND -> NLD

        x = self.ln_post(x[:, 0, :])

        if self.proj is not None:
            x = x @ self.proj

        return x


class CLIP(nn.Module):
    def __init__(self,
                 embed_dim: int,
                 # vision
                 image_resolution: int,
                 vision_layers: Union[Tuple[int, int, int, int], int],
                 vision_width: int,
                 vision_patch_size: int,
                 # text
                 context_length: int,
                 vocab_size: int,
                 transformer_width: int,
                 transformer_heads: int,
                 transformer_layers: int
                 ):
        super().__init__()

        self.context_length = context_length

        if isinstance(vision_layers, (tuple, list)):
            vision_heads = vision_width * 32 // 64
            self.visual = ModifiedResNet(
                layers=vision_layers,
                output_dim=embed_dim,
                heads=vision_heads,
                input_resolution=image_resolution,
                width=vision_width
            )
        else:
            vision_heads = vision_width // 64
            self.visual = VisionTransformer(
                input_resolution=image_resolution,
                patch_size=vision_patch_size,
                width=vision_width,
                layers=vision_layers,
                heads=vision_heads,
                output_dim=embed_dim
            )

        self.transformer = Transformer(
            width=transformer_width,
            layers=transformer_layers,
            heads=transformer_heads,
            attn_mask=self.build_attention_mask()
        )

        self.vocab_size = vocab_size
        self.token_embedding = nn.Embedding(vocab_size, transformer_width)
        self.positional_embedding = nn.Parameter(torch.empty(self.context_length, transformer_width))
        self.ln_final = LayerNorm(transformer_width)

        self.text_projection = nn.Parameter(torch.empty(transformer_width, embed_dim))
        self.logit_scale = nn.Parameter(torch.ones([]) * np.log(1 / 0.07))

        self.initialize_parameters()

    def initialize_parameters(self):
        nn.init.normal_(self.token_embedding.weight, std=0.02)
        nn.init.normal_(self.positional_embedding, std=0.01)

        if isinstance(self.visual, ModifiedResNet):
            if self.visual.attnpool is not None:
                std = self.visual.attnpool.c_proj.in_features ** -0.5
                nn.init.normal_(self.visual.attnpool.q_proj.weight, std=std)
                nn.init.normal_(self.visual.attnpool.k_proj.weight, std=std)
                nn.init.normal_(self.visual.attnpool.v_proj.weight, std=std)
                nn.init.normal_(self.visual.attnpool.c_proj.weight, std=std)

            for resnet_block in [self.visual.layer1, self.visual.layer2, self.visual.layer3, self.visual.layer4]:
                for name, param in resnet_block.named_parameters():
                    if name.endswith("bn3.weight"):
                        nn.init.zeros_(param)

        proj_std = (self.transformer.width ** -0.5) * ((2 * self.transformer.layers) ** -0.5)
        attn_std = self.transformer.width ** -0.5
        fc_std = (2 * self.transformer.width) ** -0.5
        for block in self.transformer.resblocks:
            nn.init.normal_(block.attn.in_proj_weight, std=attn_std)
            nn.init.normal_(block.attn.out_proj.weight, std=proj_std)
            nn.init.normal_(block.mlp.c_fc.weight, std=fc_std)
            nn.init.normal_(block.mlp.c_proj.weight, std=proj_std)

        if self.text_projection is not None:
            nn.init.normal_(self.text_projection, std=self.transformer.width ** -0.5)

    def build_attention_mask(self):
        # lazily create causal attention mask, with full attention between the vision tokens
        # pytorch uses additive attention mask; fill with -inf
        mask = torch.empty(self.context_length, self.context_length)
        mask.fill_(float("-inf"))
        mask.triu_(1)  # zero out the lower diagonal
        return mask

    @property
    def dtype(self):
        return self.visual.conv1.weight.dtype

    def encode_image(self, image):
        return self.visual(image.type(self.dtype))

    def encode_text(self, text):
        x = self.token_embedding(text).type(self.dtype)  # [batch_size, n_ctx, d_model]

        x = x + self.positional_embedding.type(self.dtype)
        x = x.permute(1, 0, 2)  # NLD -> LND
        x = self.transformer(x)
        x = x.permute(1, 0, 2)  # LND -> NLD
        x = self.ln_final(x).type(self.dtype)

        # x.shape = [batch_size, n_ctx, transformer.width]
        # take features from the eot embedding (eot_token is the highest number in each sequence)
        x = x[torch.arange(x.shape[0]), text.argmax(dim=-1)] @ self.text_projection

        return x

    def forward(self, image, text):
        image_features = self.encode_image(image)
        text_features = self.encode_text(text)

        # normalized features
        image_features = image_features / image_features.norm(dim=1, keepdim=True)
        text_features = text_features / text_features.norm(dim=1, keepdim=True)

        # cosine similarity as logits
        logit_scale = self.logit_scale.exp()
        logits_per_image = logit_scale * image_features @ text_features.t()
        logits_per_text = logits_per_image.t()

        # shape = [global_batch_size, global_batch_size]
        return logits_per_image, logits_per_text


def convert_weights(model: nn.Module):
    """Convert applicable model parameters to fp16"""

    def _convert_weights_to_fp16(l):
        if isinstance(l, (nn.Conv1d, nn.Conv2d, nn.Linear)):
            l.weight.data = l.weight.data.half()
            if l.bias is not None:
                l.bias.data = l.bias.data.half()

        if isinstance(l, nn.MultiheadAttention):
            for attr in [*[f"{s}_proj_weight" for s in ["in", "q", "k", "v"]], "in_proj_bias", "bias_k", "bias_v"]:
                tensor = getattr(l, attr)
                if tensor is not None:
                    tensor.data = tensor.data.half()

        for name in ["text_projection", "proj"]:
            if hasattr(l, name):
                attr = getattr(l, name)
                if attr is not None:
                    attr.data = attr.data.half()

    model.apply(_convert_weights_to_fp16)


def build_model(state_dict: dict):
    vit = "visual.proj" in state_dict

    if vit:
        vision_width = state_dict["visual.conv1.weight"].shape[0]
        vision_layers = len([k for k in state_dict.keys() if k.startswith("visual.") and k.endswith(".attn.in_proj_weight")])
        vision_patch_size = state_dict["visual.conv1.weight"].shape[-1]
        grid_size = round((state_dict["visual.positional_embedding"].shape[0] - 1) ** 0.5)
        image_resolution = vision_patch_size * grid_size
    else:
        counts: list = [len(set(k.split(".")[2] for k in state_dict if k.startswith(f"visual.layer{b}"))) for b in [1, 2, 3, 4]]
        vision_layers = tuple(counts)
        vision_width = state_dict["visual.layer1.0.conv1.weight"].shape[0]
        output_width = round((state_dict["visual.attnpool.positional_embedding"].shape[0] - 1) ** 0.5)
        vision_patch_size = None
        assert output_width ** 2 + 1 == state_dict["visual.attnpool.positional_embedding"].shape[0]
        image_resolution = output_width * 32

    embed_dim = state_dict["text_projection"].shape[1]
    context_length = state_dict["positional_embedding"].shape[0]
    vocab_size = state_dict["token_embedding.weight"].shape[0]
    transformer_width = state_dict["ln_final.weight"].shape[0]
    transformer_heads = transformer_width // 64
    transformer_layers = len(set(k.split(".")[2] for k in state_dict if k.startswith(f"transformer.resblocks")))

    model = CLIP(
        embed_dim,
        image_resolution, vision_layers, vision_width, vision_patch_size,
        context_length, vocab_size, transformer_width, transformer_heads, transformer_layers
    )

    for key in ["input_resolution", "context_length", "vocab_size"]:
        if key in state_dict:
            del state_dict[key]

    convert_weights(model)
    model.load_state_dict(state_dict)
    return model.eval()


manualseed = 64
random.seed(manualseed)
np.random.seed(manualseed)
torch.manual_seed(manualseed)
torch.cuda.manual_seed(manualseed)
cudnn.deterministic = True

class UnimodalDetection(nn.Module):
        def __init__(self, shared_dim=256, prime_dim = 64):
            super(UnimodalDetection, self).__init__()
            
            self.text_uni = nn.Sequential(
                nn.Linear(1280, shared_dim),
                nn.BatchNorm1d(shared_dim),
                nn.ReLU(),
                nn.Dropout(),
                nn.Linear(shared_dim, prime_dim),
                nn.BatchNorm1d(prime_dim),
                nn.ReLU())

            self.image_uni = nn.Sequential(
                nn.Linear(1512, shared_dim),
                nn.BatchNorm1d(shared_dim),
                nn.ReLU(),
                nn.Dropout(),
                nn.Linear(shared_dim, prime_dim),
                nn.BatchNorm1d(prime_dim),
                nn.ReLU())

        def forward(self, text_encoding, image_encoding):
            text_prime = self.text_uni(text_encoding)
            image_prime = self.image_uni(image_encoding)
            return text_prime, image_prime

class CrossModule(nn.Module):
    def __init__(
            self,
            corre_out_dim=64):
        super(CrossModule, self).__init__()
        self.corre_dim = 1024
        self.c_specific = nn.Sequential(
            nn.Linear(self.corre_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(),
            nn.Linear(256, corre_out_dim),
            nn.BatchNorm1d(corre_out_dim),
            nn.ReLU()
        )

    def forward(self, text, image):
        correlation = torch.cat((text, image),1)
        
        correlation_out = self.c_specific(correlation.float())
        return correlation_out


def convert_image_to_rgb(image):
    return image.convert("RGB")

def preprocess(n_px):
    return Compose([
        Resize(n_px, interpolation=BICUBIC),
        CenterCrop(n_px),
        convert_image_to_rgb,
        ToTensor(),
        Normalize((0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711)),
    ])

def word2input(texts, tokenizer, max_len=300):
    #tokenizer = AutoTokenizer.from_pretrained('../../models/bert-base-chinese')
    inputs = tokenizer(texts, padding="max_length", truncation=True, return_tensors="pt", max_length=max_len)
    return inputs['input_ids'], inputs['attention_mask'], inputs['token_type_ids']

def find_file_case_insensitive(folder, filename):
    filename = filename.lower()
    for f in os.listdir(folder):
        if f.lower() == filename:
            return os.path.join(folder, f)
    return None

class weibo_dataset(data.Dataset):
    def __init__(self, root_path='/webfile/test_data/weibo_img', image_size=224, is_train=False, tokenzier_path = "", ratio=0.1):
        super(weibo_dataset, self).__init__()
        self.is_train = is_train
        self.root_path = root_path
        self.index = 0
        self.label_dict = []
        self.preprocess = preprocess(image_size)
        self.image_size = image_size
        self.local_path = root_path
        self.bert_tokenizer = AutoTokenizer.from_pretrained(tokenzier_path)

        
        # Read data from CSV file
        wb = pandas.read_csv(self.local_path+'/{}_weibo.csv'.format('train' if is_train else 'test'))

        # Store relevant information in label_dict
        for i in tqdm(range(len(wb))):
            images_name = str(wb.iloc[i, 2]).lower()
            label = int(wb.iloc[i, 3])
            content = str(wb.iloc[i, 1])
            sum_content = str(wb.iloc[i, 4])
            record = {}
            record['images'] = images_name
            record['label'] = label
            record['content'] = content
            record['sum_content'] = sum_content
            self.label_dict.append(record)

        assert len(self.label_dict) != 0, 'Error: GT path is empty.'

        # 限制数据规模
        shuffle(self.label_dict)
        length = len(self.label_dict)
        self.label_dict = self.label_dict[:int(ratio*length)]

    def read_img(self, imgs, root_path, LABLEF):
        GT_path = imgs[np.random.randint(0, len(imgs))]
        if '/' in GT_path:
            GT_path = GT_path[GT_path.rfind('/')+1:]
        folder = f"{root_path}/{LABLEF}"
        filename = GT_path
        real_path = find_file_case_insensitive(folder, filename)
        #GT_path = "{}/{}/{}".format(root_path, LABLEF, GT_path)
        img_GT = Image.open(real_path).convert('RGB')
        return img_GT

    def __getitem__(self, index):
            record = self.label_dict[index]
            images, label, content, sum_content = record['images'], record['label'], record['content'], record['sum_content']

            # Determine the label folder
            if label == 0:
                LABLEF = 'rumor_images'
            else:
                LABLEF = 'nonrumor_images'
            
            imgs = images.split('|')
            try:
                img_GT = self.read_img(imgs, self.root_path, LABLEF)
            except Exception:
                raise IOError("Load {} Error {}".format(imgs, record['images']))

            return (content, self.preprocess(img_GT), img_GT, sum_content), label

    def __len__(self):
        return len(self.label_dict)
    
    def collate_fn(self, data):
        sents = [i[0][0] for i in data]
        images_resnet = [i[0][1] for i in data]
        images_clip = [i[0][2] for i in data]
        textclip = [i[0][3] for i in data]
        labels = [i[1] for i in data]

        # Tokenize text data using BERT tokenizer
        data = word2input(sents, tokenizer=self.bert_tokenizer)

        # Tokenize text data using CLIP tokenizer
        # textclip = clip.tokenize(textclip, truncate=True)
        
        # Prepare input data for the model
        input_ids = data[0]
        attention_mask = data[1]
        token_type_ids = data[2]
        imageresnet = torch.stack(images_resnet)
        imageclip = images_clip
        labels = torch.LongTensor(labels)

        return input_ids, attention_mask, token_type_ids, imageresnet, imageclip, textclip, labels

class FNDCLIP(nn.Module):
    def __init__(
            self,
            feature_dim = 64,
            h_dim = 64,
            bert_path = '/webfile/checkpoints/bert-base-chinese',
            clip_path = '/webfile/checkpoints/clip-vit-base-patch32'
        ):
        super(FNDCLIP, self).__init__()

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.clip_model = CLIPModel.from_pretrained(clip_path)
        self.clip_processor = CLIPProcessor.from_pretrained(clip_path)
        #self.bert_tokenizer = AutoTokenizer.from_pretrained(bert_path)
        self.bert_tokenizer_path = bert_path
        self.bert_model = AutoModel.from_pretrained(bert_path)

        for param in self.clip_model.parameters():
            param.requires_grad = False
        
        for param in self.bert_model.parameters():
            param.requires_grad = False

        self.weights = nn.Parameter(torch.rand(13, 1))
        #SENET
        self.senet = nn.Sequential(
                nn.Linear(3, 3),
                nn.GELU(),
                nn.Linear(3, 3),
        )
        self.sigmoid = nn.Sigmoid()

        self.w = nn.Parameter(torch.rand(1))
        self.b = nn.Parameter(torch.rand(1))

        self.avepooling =  nn.AvgPool1d(64, stride=1)
        self.maxpooling =  nn.MaxPool1d(64, stride=1)

        self.resnet101 = torchvision.models.resnet101(pretrained=True)

        self.uni_repre = UnimodalDetection()
        self.cross_module = CrossModule()
        self.classifier_corre = nn.Sequential(
            nn.Linear(feature_dim, h_dim),
            nn.BatchNorm1d(h_dim),
            nn.ReLU(),
            nn.Linear(h_dim, h_dim),
            nn.BatchNorm1d(h_dim),
            nn.ReLU(),
            nn.Linear(h_dim, 2)
        )

        self.to(self.device)

    def get_loader(self, batch_size, istrain = False, path = '/webfile/test_data/weibo_img', ratio=1.0):
        dataset = weibo_dataset(root_path=path, is_train=istrain, tokenzier_path=self.bert_tokenizer_path, ratio=ratio)
        loader = DataLoader(
            dataset=dataset,
            batch_size=batch_size,
            collate_fn=dataset.collate_fn,
            shuffle=True,
            drop_last=True
        )
        return loader

    @staticmethod
    def get_required_fields():
        return ['text', 'image_path']
    
    def predict(self, data):
        '''
        text: str    image:PIL.Image
        '''
        text = data['text']
        image_path = os.path.join('/uploads', 'images', str(data['dataset_id']), data['images'][0]['path'])
        image = Image.open(image_path).convert("RGB")
        self.eval()
        tokenizer = AutoTokenizer.from_pretrained(self.bert_tokenizer_path)
        input_ids, attention_mask, token_type_ids = word2input(text, tokenizer)
        image_resnet = preprocess(224)(image).unsqueeze(0)
        imageclip = image
        textclip = text

        input_ids, attention_mask, token_type_ids, image_resnet, imageclip, textclip= (
            input_ids.to(self.device), attention_mask.to(self.device), token_type_ids.to(self.device), 
            image_resnet.to(self.device), imageclip, textclip
        )

        BERT_feature = self.bert_model(input_ids=input_ids,
                        attention_mask=attention_mask,
                        token_type_ids=token_type_ids,
                        output_hidden_states=True) 
        last_hidden_states = BERT_feature['last_hidden_state']
        all_hidden_states =  BERT_feature['hidden_states']

        text_inputs = self.clip_processor(text=textclip, return_tensors="pt", max_length=77, padding=True, truncation=True).to(self.device)
        with torch.no_grad():
            text_clip = self.clip_model.get_text_features(**text_inputs)
        
        image_inputs = self.clip_processor(images=imageclip, return_tensors="pt").to(self.device)
        with torch.no_grad():
            image_clip = self.clip_model.get_image_features(**image_inputs)

        pre_rumor = self(last_hidden_states, all_hidden_states, image_resnet, text_clip, image_clip)

        pre_label_rumor = [pre_rumor.argmax(1).item()]

        # 计算 softmax 置信度
        confidences = F.softmax(pre_rumor, dim=1)
        conf_list = confidences.cpu().tolist()         # e.g. [[0.23, 0.77]]

        return {
            'data': pre_label_rumor,
            'confidences': conf_list,
            'status': 'success'
        }

    def forward(self, input_ids, all_hidden_states, image_raw, text, image):
        # Process image
        image_raw = self.resnet101(image_raw)

        # Process text
        ht_cls = torch.cat(all_hidden_states)[:, :1, :].view(13, input_ids.shape[0], 1, 768)
        atten = torch.sum(ht_cls * self.weights.view(13, 1, 1, 1), dim=[1, 3])
        atten = F.softmax(atten.view(-1), dim=0)
        text_raw = torch.sum(ht_cls * atten.view(13, 1, 1, 1), dim=[0, 2])

        # Unimodal processing
        text_prime, image_prime = self.uni_repre(torch.cat([text_raw, text], 1), torch.cat([image_raw, image], 1))
        
        # Cross-modal processing
        correlation = self.cross_module(text, image)

        # Calculate similarity weights
        sim = torch.div(torch.sum(text * image, 1), torch.sqrt(torch.sum(torch.pow(text, 2), 1)) * torch.sqrt(torch.sum(torch.pow(image, 2), 1)))
        sim = sim * self.w + self.b
        mweight = sim.unsqueeze(1)

        # Apply correlation weights
        correlation = correlation * mweight

        # Combine features
        final_feature = torch.cat([text_prime.unsqueeze(1), image_prime.unsqueeze(1), correlation.unsqueeze(1)], 1)

        # Pooling and transformation
        s1 = self.avepooling(final_feature)
        s2 = self.maxpooling(final_feature)
        s1 = s1.view(s1.size(0), -1)
        s2 = s2.view(s2.size(0), -1)
        s1 = self.senet(s1)
        s2 = self.senet(s2)
        s = self.sigmoid(s1 + s2)
        s = s.view(s.size(0), s.size(1), 1)

        # Apply pooling weights
        final_feature = s * final_feature

        # Classification
        pre_label = self.classifier_corre(final_feature[:, 0, :] + final_feature[:, 1, :] + final_feature[:, 2, :])

        return pre_label

    def train_model(self, train_loader, criterion, optimizer, epochs):
        self.train()

        for epoch in range(epochs):
            epoch_loss = 0
            for i, (input_ids, attention_mask, token_type_ids, image_resnet, imageclip, textclip, label) in tqdm(enumerate(train_loader)):

                input_ids, attention_mask, token_type_ids, image_resnet, imageclip, textclip, label = (
                input_ids.to(self.device), attention_mask.to(self.device), token_type_ids.to(self.device), 
                image_resnet.to(self.device), imageclip, textclip, label.to(self.device)
                )

                BERT_feature = self.bert_model(input_ids=input_ids,
                            attention_mask=attention_mask,
                            token_type_ids=token_type_ids,
                            output_hidden_states=True) 
                last_hidden_states = BERT_feature['last_hidden_state']
                all_hidden_states =  BERT_feature['hidden_states']

                text_inputs = self.clip_processor(text=textclip, return_tensors="pt", max_length=77, padding=True, truncation=True).to(self.device)
                #print(text_inputs["input_ids"].shape)
                with torch.no_grad():
                    text_clip = self.clip_model.get_text_features(**text_inputs)
                
                image_inputs = self.clip_processor(images=imageclip, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    image_clip = self.clip_model.get_image_features(**image_inputs)

                pre_rumor = self(last_hidden_states, all_hidden_states, image_resnet, text_clip, image_clip)
                loss = criterion(pre_rumor, label)

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                epoch_loss += loss.item()

            print(f'Epoch {epoch + 1}/{epochs}, Loss: {epoch_loss / len(train_loader)}')

    def val_model(self, test_loader):
        self.eval()

        rumor_count = 0
        rumor_label_all = []
        rumor_pre_label_all = []
        pre_scores_all = []
      
        for i, (input_ids, attention_mask, token_type_ids, image_resnet, imageclip, textclip, label) in tqdm(enumerate(test_loader)):

            input_ids, attention_mask, token_type_ids, image_resnet, imageclip, textclip, label = (
            input_ids.to(self.device), attention_mask.to(self.device), token_type_ids.to(self.device), 
            image_resnet.to(self.device), imageclip, textclip, label.to(self.device)
            )


            BERT_feature = self.bert_model(input_ids=input_ids,
                        attention_mask=attention_mask,
                        token_type_ids=token_type_ids,
                        output_hidden_states=True) 
            last_hidden_states = BERT_feature['last_hidden_state']
            all_hidden_states =  BERT_feature['hidden_states']

            text_inputs = self.clip_processor(text=textclip, return_tensors="pt", max_length=77, padding=True, truncation=True).to(self.device)
            #print(text_inputs["input_ids"].shape)
            with torch.no_grad():
                text_clip = self.clip_model.get_text_features(**text_inputs)
            
            image_inputs = self.clip_processor(images=imageclip, return_tensors="pt").to(self.device)
            with torch.no_grad():
                image_clip = self.clip_model.get_image_features(**image_inputs)

            pre_rumor = self(last_hidden_states, all_hidden_states, image_resnet, text_clip, image_clip)

            pre_scores = pre_rumor[:, 1]
            pre_label_rumor = pre_rumor.argmax(1)
            rumor_count += last_hidden_states.shape[0]

            # Store predicted and true labels for evaluation
            rumor_pre_label_all.append(pre_label_rumor.detach().cpu().numpy())
            rumor_label_all.append(label.detach().cpu().numpy())
            pre_scores_all.append(pre_scores.detach().cpu().numpy())

        # Calculate accuracy and confusion matrix
        rumor_pre_label_all = np.concatenate(rumor_pre_label_all, 0)
        rumor_label_all = np.concatenate(rumor_label_all, 0)
        pre_scores_all = np.concatenate(pre_scores_all, 0)

        # acc_rumor_test = accuracy_score(rumor_pre_label_all, rumor_label_all)
        # conf_rumor = confusion_matrix(rumor_pre_label_all, rumor_label_all)
        # f1_rumor_test = f1_score(rumor_label_all , rumor_pre_label_all)

        return list(rumor_label_all), list(rumor_pre_label_all), list(pre_scores_all)

    
    def get_total_steps(self, test_path = '/webfile/test_data/weibo_img'): 
        test_loader = self.get_loader(istrain=False, batch_size=4, path=test_path, ratio=1.0)

        return len(test_loader)



    def test_model(self, test_path = '/webfile/test_data/weibo_img'):

        self.load_state_dict(torch.load('/webfile/checkpoints/illegal/fndclip.pth', map_location=self.device))
        test_loader = self.get_loader(istrain=False, batch_size=4, path=test_path, ratio=1.0)

        self.eval()

        rumor_count = 0
        rumor_label_all = []
        rumor_pre_label_all = []
        pre_scores_all = []

        step = 0
      
        for i, (input_ids, attention_mask, token_type_ids, image_resnet, imageclip, textclip, label) in tqdm(enumerate(test_loader)):

            input_ids, attention_mask, token_type_ids, image_resnet, imageclip, textclip, label = (
            input_ids.to(self.device), attention_mask.to(self.device), token_type_ids.to(self.device), 
            image_resnet.to(self.device), imageclip, textclip, label.to(self.device)
            )


            BERT_feature = self.bert_model(input_ids=input_ids,
                        attention_mask=attention_mask,
                        token_type_ids=token_type_ids,
                        output_hidden_states=True) 
            last_hidden_states = BERT_feature['last_hidden_state']
            all_hidden_states =  BERT_feature['hidden_states']

            text_inputs = self.clip_processor(text=textclip, return_tensors="pt", max_length=77, padding=True, truncation=True).to(self.device)
            #print(text_inputs["input_ids"].shape)
            with torch.no_grad():
                text_clip = self.clip_model.get_text_features(**text_inputs)
            
            image_inputs = self.clip_processor(images=imageclip, return_tensors="pt").to(self.device)
            with torch.no_grad():
                image_clip = self.clip_model.get_image_features(**image_inputs)

            pre_rumor = self(last_hidden_states, all_hidden_states, image_resnet, text_clip, image_clip)

            pre_scores = pre_rumor[:, 1]
            pre_label_rumor = pre_rumor.argmax(1)
            rumor_count += last_hidden_states.shape[0]

            # Store predicted and true labels for evaluation
            rumor_pre_label_all.append(pre_label_rumor.detach().cpu().numpy())
            rumor_label_all.append(label.detach().cpu().numpy())
            pre_scores_all.append(pre_scores.detach().cpu().numpy())

            step += 1

            yield step

        # Calculate accuracy and confusion matrix
        rumor_pre_label_all = np.concatenate(rumor_pre_label_all, 0)
        rumor_label_all = np.concatenate(rumor_label_all, 0)
        pre_scores_all = np.concatenate(pre_scores_all, 0)

        yield (list(rumor_pre_label_all), list(rumor_label_all))
        #return list(rumor_label_all), list(rumor_pre_label_all)


if __name__ == "__main__":
    #使用 10% 的数据训练和测试，在weibo_dataset()类中修改
    fnd_model = FNDCLIP()
    train_loader = fnd_model.get_loader(istrain=True, batch_size=4)

    # 训练
    epochs = 5
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(fnd_model.parameters(), lr=1e-3)
    fnd_model.train_model(train_loader, criterion, optimizer, epochs)

    # 测试
    test_loader = fnd_model.get_loader(istrain=False, batch_size=4)
    acc, f1 = fnd_model.test_model(test_loader)
    print(acc)
    print(f1)

    # 预测示例样本
    image_path = "../../datas/test.jpg" 
    image = Image.open(image_path).convert("RGB")
    text = "This is a person."

    print(fnd_model.predict(text, image))
