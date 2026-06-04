import multiprocessing  # 用于获取CPU核心数
from flask import Flask, jsonify  # Flask框架及JSON响应工具
# 获取GPU信息需要先安装pynvml库：pip install nvidia-ml-py3
import pynvml  # NVIDIA管理库，用于查询GPU信息

# 获取CPU核心数，方法1：调用multiprocessing库的cpu_count函数
def get_cpu_count():
    return multiprocessing.cpu_count()

def get_gpu_info():
    '''
    获取系统中所有GPU的详细信息
    返回格式：
        {
            "status": "success",
            "content": [
                {
                    "id": 0,
                    "name": "NVIDIA GeForce RTX 3090",
                    "total_memory": 24564578176,  # 总显存，单位字节
                    "free_memory": 1234567890,    # 空闲显存，单位字节
                    "used_memory": 13212345678    # 已用显存，单位字节
                },
                ...
            ]
        }
    如果出错或无GPU，则返回错误信息：
        {
            "status": "error",
            "content": "错误描述"
        }
    '''
    try:
        pynvml.nvmlInit()  # 初始化pynvml，必须调用
        device_count = pynvml.nvmlDeviceGetCount()  # 查询系统中GPU数量
        gpus = []
        for i in range(device_count):
            handle = pynvml.nvmlDeviceGetHandleByIndex(i)  # 获取GPU句柄
            name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')  # GPU名称，字节转字符串
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)  # 获取显存信息，包含total, free, used
            gpu_info = {
                "id": i,                   # GPU编号
                "name": name,              # GPU名称
                "total_memory": mem_info.total,  # 总显存，单位字节
                "free_memory": mem_info.free,    # 空闲显存，单位字节
                "used_memory": mem_info.used     # 已用显存，单位字节
            }
            gpus.append(gpu_info)  # 添加到列表
        pynvml.nvmlShutdown()  # 关闭pynvml，释放资源
        return {"status": "success", "content": gpus}  # 返回成功结果
    except Exception as e:
        # 捕获所有异常，如无GPU、驱动问题等，返回错误状态和异常信息字符串
        return {"status": "error", "content": str(e)}
