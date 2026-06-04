import click  # 命令行工具，用于定义自定义命令
import csv
from flask import current_app, g  # Flask上下文
from app import db
import time
from sqlalchemy import create_engine, MetaData, Table, Column, String, Integer
from sqlalchemy.orm import sessionmaker
import pandas as pd  # 用于读取Excel文件

def import_excel_to_db(file_path, table_name):
    '''
    读取指定路径的Excel文件，将数据追加写入指定数据库表
    参数：
        file_path: Excel文件路径
        table_name: 数据库表名
    '''
    # 使用pandas读取Excel文件，得到DataFrame对象
    df = pd.read_excel(file_path)
    
    # 根据Flask配置中的数据库URI，创建SQLAlchemy引擎
    engine = create_engine(current_app.config['SQLALCHEMY_DATABASE_URI'])
    
    # 将DataFrame内容写入数据库表
    # if_exists='append'表示追加数据，如果表不存在则创建，index=False表示不写入行索引
    df.to_sql(table_name, engine, if_exists='append', index=False)

# 使用click定义flask自定义命令
@click.command('import-excel')
@click.argument('file_path')   # 命令行参数：Excel文件路径
@click.argument('table_name')  # 命令行参数：数据库表名
def import_excel_command(file_path, table_name):
    """从Excel文件导入数据到数据库表的命令"""
    import_excel_to_db(file_path, table_name)

def init_app(app):
    '''
    Flask应用工厂调用该函数以注册命令
    '''
    app.cli.add_command(import_excel_command)  # 注册import-excel命令到flask cli
