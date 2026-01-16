#!/usr/bin/env python3
"""
Roombaのバッテリー状態を確認し、100%でない場合にメール通知を送信するスクリプト

注意: このスクリプトはroombapyライブラリを使用してローカルネットワーク経由で
Roombaに接続します。事前にBLIDとパスワードの取得が必要です。
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
    Roombaにローカル接続してバッテリー状態を取得

    Returns:
        dict: バッテリー情報（level: int, device_name: str）
    """
    try:
        # roombapyライブラリを使用してRoombaに接続
        from roombapy import Roomba

        roomba_ip = os.environ.get("ROOMBA_IP")
        roomba_blid = os.environ.get("ROOMBA_BLID")
        roomba_password = os.environ.get("ROOMBA_PASSWORD")

        if not all([roomba_ip, roomba_blid, roomba_password]):
            logger.error(
                "ROOMBA_IP、ROOMBA_BLID、または" "ROOMBA_PASSWORDが設定されていません"
            )
            logger.error(
                "roombapyのdiscoverコマンドで取得してください: " "roombapy discover"
            )
            return None

        logger.info(f"Roomba {roomba_ip} に接続中...")
        roomba = Roomba(
            address=roomba_ip,
            blid=roomba_blid,
            password=roomba_password,
        )

        # 接続してステータスを取得
        try:
            roomba.connect()

            # 状態を取得
            state = roomba.current_state()
            if not state:
                logger.warning("Roombaの状態を取得できませんでした")
                return None

            battery_level = state.get("batPct", 0)
            device_name = state.get("name", "Roomba")

            logger.info(f"デバイス: {device_name}, バッテリー残量: {battery_level}%")

            return {"level": battery_level, "device_name": device_name}
        finally:
            roomba.disconnect()

    except ImportError:
        logger.error("roombapyライブラリがインストールされていません")
        logger.error("pip install roombapy でインストールしてください")
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
            f"[Roomba通知] {device_name}の" f"バッテリー残量が{battery_level}%です"
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
        logger.warning(
            f"バッテリー残量が{battery_level}%です。" "メール通知を送信します"
        )
        success = send_email_notification(battery_info)
        if not success:
            logger.error("メール通知の送信に失敗しました")
            sys.exit(1)
    else:
        logger.info(f"バッテリー残量は{battery_level}%です。通知は不要です")

    logger.info("バッテリーチェック完了")


if __name__ == "__main__":
    main()
