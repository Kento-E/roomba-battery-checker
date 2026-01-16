# roomba-battery-checker

Roombaの充電状態を定期確認するツール🔋

## 概要

このツールは、iRobotアカウントに自動ログインしてRoombaのバッテリー状態を確認し、充電が100%でない場合にメール通知を送信します。GitHub Actionsを使用してスケジュール実行されるため、定期清掃の前にバッテリー不足を事前に検知できます。

## 機能

- iRobotアカウントへの自動ログイン
- Roombaのバッテリー残量チェック
- バッテリーが100%でない場合のメール通知（SMTP経由）
- GitHub Actionsによるスケジュール実行

## セットアップ

### 1. リポジトリのフォーク/クローン

このリポジトリをフォークまたはクローンします。

### 2. 必要な環境変数の設定

GitHubリポジトリの Settings → Secrets and variables → Actions で、以下のSecretsを設定してください：

- `IROBOT_EMAIL`: iRobotアカウントのメールアドレス
- `IROBOT_PASSWORD`: iRobotアカウントのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

### 3. GitHub Actionsの有効化

リポジトリのActionsタブから、ワークフローを有効化してください。

## 使い方

### スケジュール実行

デフォルトでは、毎日午前9時（JST）に自動実行されます。

実行スケジュールを変更したい場合は、`.github/workflows/check-battery.yml`のcron式を編集してください。

詳細は [ワークフローREADME](.github/workflows/README.md) を参照してください。

### 手動実行

GitHub ActionsのActionsタブから「Roombaバッテリーチェック」ワークフローを選択し、「Run workflow」ボタンで手動実行できます。

## ローカルでの実行

環境変数を設定してローカルでも実行できます：

```bash
# 依存関係をインストール
pip install -r requirements.txt

# 環境変数を設定
export IROBOT_EMAIL="your@email.com"
export IROBOT_PASSWORD="your_password"
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="smtp_user"
export SMTP_PASSWORD="smtp_password"
export NOTIFICATION_EMAIL="notification@email.com"

# スクリプトを実行
python src/check_battery.py
```

## トラブルシューティング

### pyrobotライブラリについて

このツールは`pyrobot`ライブラリを使用してiRobot APIにアクセスします。ライブラリのインストールに問題がある場合は、別の互換ライブラリの使用を検討してください。

### Gmail SMTPの設定

Gmailを使用する場合は、アプリパスワードの生成が必要です：

1. Googleアカウントの2段階認証を有効化
2. アプリパスワードを生成
3. 生成されたパスワードを`SMTP_PASSWORD`に設定

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueで変更内容を議論してください。
