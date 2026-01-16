#!/usr/bin/env python3
"""
Roombaのバッテリー状態を確認し、100%でない場合にメール通知を送信するスクリプト
"""

import os
import sys
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ログ設定
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def get_roomba_battery_status():
    """
    iRobotアカウントにログインしてRoombaのバッテリー状態を取得

    Returns:
        dict: バッテリー情報（level: int, device_name: str）
    """
    try:
        # pyrobotライブラリを使用してiRobot APIにアクセス
        from pyrobot import Robot

        email = os.environ.get("IROBOT_EMAIL")
        password = os.environ.get("IROBOT_PASSWORD")

        if not email or not password:
            logger.error("IROBOT_EMAILまたはIROBOT_PASSWORDが設定されていません")
            return None

        logger.info(f"iRobotアカウント {email} でログイン中...")
        robot = Robot(email, password)

        # デバイス一覧を取得
        devices = robot.get_devices()
        if not devices:
            logger.warning("Roombaデバイスが見つかりませんでした")
            return None

        # 最初のデバイスのバッテリー状態を取得
        device = devices[0]
        battery_level = device.get("batPct", 0)
        device_name = device.get("name", "Unknown Roomba")

        logger.info(f"デバイス: {device_name}, バッテリー残量: {battery_level}%")

        return {"level": battery_level, "device_name": device_name}

    except ImportError:
        logger.error("pyrobotライブラリがインストールされていません")
        logger.error("pip install pyrobot でインストールしてください")
        return None
    except Exception as e:
        logger.error(f"バッテリー状態の取得に失敗しました: {e}")
        return None


def send_email_notification(battery_info):
    """
    SMTP経由でメール通知を送信

    Args:
        battery_info (dict): バッテリー情報
    """
    try:
        smtp_server = os.environ.get("SMTP_SERVER")
        smtp_port = os.environ.get("SMTP_PORT", "587")
        smtp_user = os.environ.get("SMTP_USER")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        notification_email = os.environ.get("NOTIFICATION_EMAIL")

        required_vars = [
            smtp_server,
            smtp_user,
            smtp_password,
            notification_email,
        ]
        if not all(required_vars):
            logger.error("SMTP設定が不完全です")
            logger.error(
                "必要な環境変数: SMTP_SERVER, SMTP_USER, "
                "SMTP_PASSWORD, NOTIFICATION_EMAIL"
            )
            return False

        device_name = battery_info.get("device_name", "Roomba")
        battery_level = battery_info.get("level", 0)

        # メールメッセージを作成
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = notification_email
        msg["Subject"] = (
            f"[Roomba通知] {device_name}のバッテリー残量が{battery_level}%です"
        )

        body = f"""
{device_name}のバッテリー状態をお知らせします。

現在のバッテリー残量: {battery_level}%

バッテリーが100%ではないため、清掃スケジュールの実行に影響する可能性があります。
充電を確認してください。

---
このメールは自動送信されています。
        """

        msg.attach(MIMEText(body, "plain"))

        # SMTPサーバーに接続してメール送信
        logger.info(f"SMTPサーバー {smtp_server}:{smtp_port} に接続中...")
        with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        logger.info(f"通知メールを {notification_email} に送信しました")
        return True

    except Exception as e:
        logger.error(f"メール送信に失敗しました: {e}")
        return False


def main():
    """メイン処理"""
    logger.info("Roombaバッテリーチェックを開始します")

    # バッテリー状態を取得
    battery_info = get_roomba_battery_status()

    if not battery_info:
        logger.error("バッテリー情報の取得に失敗しました")
        sys.exit(1)

    battery_level = battery_info.get("level", 0)

    # バッテリーが100%でない場合はメール通知
    if battery_level < 100:
        logger.warning(f"バッテリー残量が{battery_level}%です。メール通知を送信します")
        success = send_email_notification(battery_info)
        if not success:
            logger.error("メール通知の送信に失敗しました")
            sys.exit(1)
    else:
        logger.info(f"バッテリー残量は{battery_level}%です。通知は不要です")

    logger.info("バッテリーチェック完了")


if __name__ == "__main__":
    main()
