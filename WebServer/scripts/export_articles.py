# scripts/export_articles.py
import gzip
import re
import click
from datetime import datetime
from email import message_from_bytes
from email.policy import default as email_policy_default
from bs4 import BeautifulSoup
import time
import pandas as pd

from flask import current_app
from app.extensions import db  # 按你项目结构调整导入（确保 db 是 SQLAlchemy 实例）
from app.models_spider import PA_Article, PA_Account, PA_Article_Content  # 调整为你的 models 导入路径


def extract_title_and_body_no_newlines(gzipped_bytes: bytes) -> dict:
    if not gzipped_bytes:
        return ""

    try:
        raw = gzip.decompress(gzipped_bytes)
        msg = message_from_bytes(raw, policy=email_policy_default)
    except Exception:
        return ""

    html = ""
    if not msg.is_multipart():
        try:
            html = msg.get_payload(decode=True).decode(
                msg.get_content_charset('utf-8'), 'ignore'
            )
        except Exception:
            return ""
    else:
        html_part = next(
            (p for p in msg.walk() if p.get_content_type().lower() == "text/html"),
            None
        )
        if not html_part:
            return ""
        try:
            charset = html_part.get_content_charset('utf-8')
            html = html_part.get_payload(decode=True).decode(charset, 'ignore')
        except Exception:
            return ""

    if not html:
        return ""

    soup = BeautifulSoup(html, "lxml")   # ⚡ 比 html.parser 快很多
    js_content = soup.find(id="js_content")
    if not js_content:
        return ""

    text = js_content.get_text(separator=" ", strip=True)
    return re.sub(r'\s+', ' ', text).strip()


def export_articles_to_excel(
    account_name: str,
    year: int = 2025,
    output_path: str = "export_articles.xlsx",
    include_deleted: bool = False,
    session=None
):
    """
    导出指定公众号（通过 name 找到对应的 fakeid(s)）在指定年份的文章到 Excel。
    - account_name: 公众号名称（例如 "国防大学"）
    - year: 年份（例如 2025）
    - output_path: 输出文件路径（xlsx）
    - include_deleted: 是否包含 is_deleted=True 的文章（默认 False）
    - session: SQLAlchemy session，默认使用 db.session
    返回导出的行数（int）
    """
    if session is None:
        session = db.session

    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31, 23, 59, 59, 999999)

    # 1) 查询 PA_Account 获取对应 id（fakeid）
    accounts = session.query(PA_Account).filter(PA_Account.name == account_name).all()
    if not accounts:
        msg = f"No PA_Account rows found with name={account_name!r}."
        current_app.logger.warning(msg) if current_app else print(msg)
        return 0

    fakeids = [a.id for a in accounts]

    # 2) 查询文章 + 左连接内容表
    q = (
        session.query(PA_Article, PA_Article_Content.content)
        .outerjoin(PA_Article_Content, PA_Article.article_id == PA_Article_Content.article_id)
        .filter(PA_Article.fakeid.in_(fakeids))
        .filter(PA_Article.create_time.between(start, end))
        .execution_options(stream_results=True)
        .yield_per(5)
    )

    if not include_deleted:
        q = q.filter(PA_Article.is_deleted == False)  # noqa: E712

    q = q.order_by(PA_Article.create_time.asc())

    total = q.count()
    if total == 0:
        print("No data to export.")
        return 0

    print(f"[EXPORT] Total articles to process: {total}")

    rows = []
    start_ts = time.time()
    last_log_ts = 0

    for idx, (article, gzipped_content) in enumerate(q, start=1):
        # -------- 解析正文 --------
        body = extract_title_and_body_no_newlines(gzipped_content)
        row = {
            "article_id": article.article_id,
            "title": article.title,
            "link": article.link,
            "update_time": article.update_time.isoformat() if article.update_time else "",
            "create_time": article.create_time.isoformat() if article.create_time else "",
            "author_name": article.author_name,
            "is_deleted": bool(article.is_deleted),
            "affiliation": article.account.name if article.account else None,
            "is_detected": bool(article.is_detected),
            "mistake_num": article.mistake_num,
            "content_body": body,
        }
        rows.append(row)

        # -------- 进度日志（每 N 条 或 每 M 秒打印一次）--------
        now = time.time()
        if idx == 1 or idx == total or idx % 50 == 0 or (now - last_log_ts) > 5:
            elapsed = now - start_ts
            speed = idx / elapsed if elapsed > 0 else 0
            remain = (total - idx) / speed if speed > 0 else 0
            percent = idx * 100 / total

            print(
                f"[EXPORT] {idx}/{total} "
                f"({percent:.1f}%), "
                f"elapsed={elapsed:.1f}s, "
                f"eta={remain:.1f}s, "
                f"article_id={article.article_id}"
            )
            last_log_ts = now

    if not rows:
        msg = f"No articles found for account {account_name!r} in year {year}."
        current_app.logger.info(msg) if current_app else print(msg)
        return 0

    # 3) DataFrame -> Excel
    df = pd.DataFrame(rows)
    try:
        df.to_excel(output_path, index=False, engine="openpyxl")
    except Exception as exc:
        if current_app:
            current_app.logger.exception("Failed to write Excel: %s", exc)
        else:
            print("Failed to write Excel:", exc)
        raise

    msg = f"Exported {len(rows)} rows to {output_path}"
    if current_app:
        current_app.logger.info(msg)
    else:
        print(msg)
    return len(rows)


# --- Flask CLI 命令（在 app 创建后确保 import 这个模块） ---
from flask import Flask  # noqa: E402

def register_cli(app: Flask):
    @app.cli.command("export-articles")
    @click.option("--account-name", "-a", default="国防大学", help="公众号名称（匹配 pa_account.name）")
    @click.option("--year", "-y", default=2025, type=int, help="按 create_time 的年份过滤，例如 2025")
    @click.option("--output", "-o", default="export_articles.xlsx", help="输出 xlsx 路径")
    @click.option("--include-deleted", is_flag=True, default=False, help="是否包含被标记为已删除的文章")
    def _export_articles_cli(account_name, year, output, include_deleted):
        """
        CLI wrapper: flask export-articles --account-name "国防大学" --year 2025 --output out.xlsx
        """
        # 需要在 app context 中运行
        with app.app_context():
            exported = export_articles_to_excel(
                account_name=account_name,
                year=year,
                output_path=output,
                include_deleted=include_deleted,
                session=db.session
            )
            print(f"Done. Exported {exported} rows.")

# 当模块被 import 时不自动注册（需要在你的 app factory 或启动脚本里显式调用 register_cli(app)）
