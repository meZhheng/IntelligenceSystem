# 引入 setuptools，用于打包和分发 Python 项目
import setuptools

# 读取 README.md 文件内容，用作项目的长描述（可在 PyPI 上展示）
with open('README.md', 'r', encoding='utf-8') as fh:
    long_description = fh.read()

# 调用 setuptools.setup() 配置项目的元数据和依赖项
setuptools.setup(
    name='weibo-spider',  # 项目名称
    version='0.2.8',  # 版本号
    author='Chen Lei',  # 作者名称
    author_email='chillychen1991@gmail.com',  # 作者邮箱
    description='新浪微博爬虫，用python爬取新浪微博数据。',  # 简要描述
    long_description=long_description,  # 从 README.md 中读取的详细描述
    long_description_content_type='text/markdown',  # 长描述内容的格式
    url='https://github.com/dataabc/weiboSpider',  # 项目主页（通常是 GitHub 地址）
    
    # 自动查找所有包含 __init__.py 的包
    packages=setuptools.find_packages(),
    
    # 包含在安装包中的额外文件（如配置文件）
    package_data={'weibo_spider': ['config_sample.json', 'logging.conf']},
    
    # 项目的分类标签，有助于 PyPI 用户搜索和识别
    classifiers=[
        'Programming Language :: Python :: 3',  # 指明使用的 Python 版本
        'Operating System :: OS Independent',   # 表示与操作系统无关
    ],
    
    # 安装所需的依赖包
    install_requires=[
        'absl-py',     # 日志/命令行支持
        'lxml',        # 解析 HTML/XML
        'requests',    # 发送 HTTP 请求
        'tqdm',        # 显示进度条
    ],
    
    # 指定支持的最低 Python 版本
    python_requires='>=3.6',
)