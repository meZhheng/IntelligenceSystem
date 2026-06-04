class EvaluationSet:
    def __init__(self):
        # metrics 字典保存了多个评估指标，每个指标对应一个模型的评价标准和相关信息
        self.metrics = {
            # 1. 涉X舆情数据抽取任务
            '涉X舆情数据抽取': {
                'description': '从舆情数据中抽取出所需要的涉X舆情数据',  # 任务描述
                'requirements': {  # 任务性能要求
                    '准确率': '>= 95%',  # 精确率要求95%以上
                    '召回率': '>= 90%',  # 召回率要求90%以上
                },
                'model_id': 115,  # 该任务对应模型的ID
                'checksum': "cbb568a0fda6277ada483e28d2b0210ddd01166e19f26e8b04d7189d2c4cbbad"  # 模型文件的校验码，用于验证完整性
            },

            # 2. 涉X舆情细化标签分类任务
            '涉X舆情细化标签分类': {
                'description': '将涉X舆情内容进行进一步的细化标签（违法违规 / 敏感内容分类）',
                'requirements': {
                    '准确率': '>= 90%',
                    '召回率': '>= 90%',
                },
                'model_id': 112,
                'checksum' : "cbb568a0fda6277ada483e28d2b0210ddd01166e19f26e8b04d7189d2c4cbbad"
            },

            # 3. 用户立场检测（有监督）
            '用户立场检测（有监督）': {
                'description': '基于有监督数据的用户立场检测',
                'requirements': {
                    '准确率': '>= 90%',
                },
                'model_id': 10,
                'checksum': "c68fea19fd72032ad5c913a5f5d9071ee0b69bc6fb56da91532d4d99707b8d1c",
            },

            # 4. 用户立场检测（跨域小样本）
            '用户立场检测（跨域小样本）': {
                'description': '跨域场景下仅有少量标注样本（<20）的用户立场检测',
                'requirements': {
                    '准确率': '>= 85%',
                    'few_shot_samples': '< 20',  # 标注样本数量小于20
                },
                'model_id': 11,
                # 旧校验码被注释掉，可能为历史版本
                # 'checksum': "04bf9e44184ef319af8de6d5d6fa5e97521723c504038c6f4bff04ad0fe86b50",
                'checksum': "a17c7601778daaa9e6233f73db5b6f658e6c832422b2bcbda03bc278c5a69509",
            },

            # 5. 用户立场检测（跨域零样本）
            '用户立场检测（跨域零样本）': {
                'description': '跨域场景下零标注样本的用户立场检测',
                'requirements': {
                    '准确率': '>= 80%',
                },
                'model_id': 12,
                'checksum': "04bf9e44184ef319af8de6d5d6fa5e97521723c504038c6f4bff04ad0fe86b50",
            },

            # 6. 用户情感识别（多模态显示情感）
            '用户情感识别（多模态）': {
                'description': '图像+文本等多模态场景下对显示情感的识别',
                'requirements': {
                    '准确率': '>= 90%',
                },
                'model_id': 21,
                'checksum': "86de4bfd82bc6e28444aacdee99b7feeac3ef342b6424955b25906d087d35393",
            },

            # 7. 用户情感识别（隐式情感）
            '用户情感识别（隐式情感）': {
                'description': '多模态及文本场景下对隐式情感的识别',
                'requirements': {
                    '准确率': '>= 80%',
                },
                'model_id': 20,
                'checksum': "fafd2009ec7167b2790e9697d2b4bc47d095ba123d23df8de3e9b71349cf888f",
            },

            # 8. 用户情感识别（交互式对话）
            '用户情感识别（交互式对话）': {
                'description': '交互式对话场景下的情感识别',
                'requirements': {
                    '准确率': '>= 80%',
                },
                'model_id': 36,
                'checksum': "eb660e2f4fbbbcba68b414cd65bdf4ed299251bf14691d6ed877ed85ff284a50",
            },

            # 9. 违法违规账号发现
            '违法违规账号发现': {
                'description': '关键违法违规账号的发现与追踪',
                'requirements': {
                    '准确率': '>= 80%',
                },
                'model_id': 114,
                #'checksum': "20b42df265697a4842362ffdd5f7a1593e01f3068ce86bb2a0dc0beabad1efe4" # for 2500
                'checksum':  "530c97969cbad906af205f54804e6c61d22611a98e466e0c59bb4d358cffe423" # fot 20000
            },

            # 10. 账号角色识别
            '账号角色识别': {
                'description': '对违法违规账号的角色进行识别',
                'requirements': {
                    '准确率': '>= 70%',
                },
                'model_id': 113,
                'checksum': "33332884a004218b7c66957729b9805b9659dabe0581090648cc144fd6236b3c"
            },
            # 11. 违法违规／敏感信息检测（基础模型）
            '违法违规和敏感信息检测（基础模型）': {
                'description': '基于社交传播信息的违法违规与敏感信息检测',
                'requirements': {
                    '准确率': '>= 50%',
                },
                'model_id': 109,
                'checksum': "ecfedb854c147881259ea71170b0af5aae8720f8ccddd399282450eaa83337d5"
            },

            # 11. 违法违规／敏感信息检测（社交传播）
            '违法违规和敏感信息检测（社交传播）': {
                'description': '基于社交传播信息的违法违规与敏感信息检测',
                'requirements': {
                    'model_count': '>= 1',  # 至少一个模型
                    '准确率': '>= 90%',
                },
                'model_id': 101,
                'checksum': "ecfedb854c147881259ea71170b0af5aae8720f8ccddd399282450eaa83337d5"
            },

            # 12. 违法违规和敏感信息检测（大语言模型）
            '违法违规和敏感信息检测（大语言模型）': {
                'description': '基于大语言模型的违法违规与敏感信息检测',
                'requirements': {
                    '准确率': '>= 80%',
                },
                'model_id': 118,
                'checksum' : "4cba3770f4fa06816f99415ff3f305cc46a163695e078379d090b8999e42ee90"
            },

            # 13. 违法违规和敏感信息检测（知识库）
            '违法违规和敏感信息检测（知识库）': {
                'description': '基于知识库的违法违规与敏感信息检测',
                'requirements': {
                    '准确率': '>= 85%',
                },
                'model_id': 117,
                'checksum': "403bb44bcbf824708780e28da9f339d00cd2e4ac6111618a23fd6ea5099174d4"
            },

            # 14. 违法违规和敏感信息检测（多模态）
            '违法违规和敏感信息检测（多模态）': {
                'description': '基于多模态信息的违法违规与敏感信息检测',
                'requirements': {
                    '准确率': '>= 85%',
                },
                'model_id': 9,
                'checksum': "005839e4c4722cd58d923906ef4d59b67ece2a698e694d1571617389424a6131"
            },

            # 15. 违法违规和敏感信息检测（跨域小样本）
            '违法违规和敏感信息检测（跨域小样本）': {
                'description': '跨域少于20标注样本的违法违规与敏感信息检测',
                'requirements': {
                    '准确率': '>= 80%',
                },
                'model_id': 100,
                'checksum': "64eb8f7cf28a435b8b83a20ee77577b0a724b4748a30cc3364000e4409055622",
            },

            # 16. 违法违规和敏感信息检测（跨域零样本）
            '违法违规和敏感信息检测（跨域零样本）': {
                'description': '跨域零样本场景下的违法违规与敏感信息检测',
                'requirements': {
                    '准确率': '>= 70%',
                },
                'model_id': 37,
                'checksum': "afbd60a25438d21732abd5382830e2cf080d9655ceaeb28bec55954ceff50de0",
            },
        }
