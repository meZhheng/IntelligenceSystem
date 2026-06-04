#!/usr/bin/env python3
import os
import sys
import csv
from datetime import datetime

# 将项目根目录加入 sys.path，方便导入项目中的模块
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask
from app import create_app, db
from app.models_spider import WeiboUser  # 导入微博用户模型

def export_visible_users(output_path: str):
    """
    导出所有微博用户表中 is_visible 字段为 True 的用户数据到 CSV 文件

    :param output_path: 导出文件的路径
    """
    # 创建 Flask 应用实例并进入应用上下文，确保数据库操作正常
    app = create_app()
    with app.app_context():
        # 1. 查询所有 WeiboUser 表中的用户（注意这里没做过滤，实际要过滤 is_visible=True 可根据需求调整）
        users = WeiboUser.query.all()

        # 2. 指定导出 CSV 文件时包含的字段，排除了某些不必要或较大字段
        # 字段包括：id, 用户名, 性别, 地点, 生日, 个人描述, 认证原因, 才艺, 教育, 工作, 微博数, 关注数, 粉丝数, 是否可见
        fieldnames = [
            'id',
            'username',
            'gender',
            'location',
            'birthday',
            'description',
            'verified_reason',
            'talent',
            'education',
            'work',
            'weibo_num',
            'following',
            'followers',
            'is_visible'
        ]

        # 3. 以写模式打开指定路径的 CSV 文件，编码为 utf-8，避免中文乱码
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            # 创建 DictWriter，用于写入字典格式的数据
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            # 写入 CSV 表头
            writer.writeheader()

            # 遍历所有查询到的用户实例
            for u in users:
                # 调用模型的 to_dict 方法获取用户信息的字典表示
                d = u.to_dict()
                # 从字典中筛选出需要导出的字段
                row = { key: d.get(key) for key in fieldnames }
                # 写入一行数据
                writer.writerow(row)

        # 导出完成，打印导出时间和导出记录数
        print(f"[{datetime.now().isoformat()}] 导出完成：{len(users)} 条记录 -> {output_path}")


if __name__ == '__main__':
    # 脚本直接运行时，输出文件路径为脚本当前目录下的 weibo_users_visible.csv
    out_file = os.path.join(os.path.dirname(__file__), 'weibo_users_visible.csv')
    export_visible_users(out_file)
