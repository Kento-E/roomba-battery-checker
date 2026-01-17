# roomba-battery-checker

Roombaの充電状態を定期確認するツール🔋

## 概要

このツールは、非公式のiRobot Cloud APIを使用してRoombaのバッテリー状態を確認し、充電が100%でない場合にメール通知を送信します。GitHub Actionsを使用してスケジュール実行されるため、定期清掃の前にバッテリー不足を事前に検知できます。

## 機能

- Roombaのバッテリー残量チェック（iRobot Cloud API経由）
- バッテリーが100%でない場合のメール通知（SMTP経由）
- GitHub Actionsによるスケジュール実行
- GitHub-hostedランナーから直接実行可能（セルフホステッドランナー不要）

## セットアップ

詳細な手順は [CLOUD_API.md](CLOUD_API.md) を参照してください。

### 簡易手順

1. Roombaの認証情報（BLIDとパスワード）を取得
2. GitHub Secretsに設定（ROOMBA_BLID, ROOMBA_PASSWORD, SMTP設定）
3. ワークフローを有効化

### 必要なSecrets

GitHubリポジトリの Settings → Secrets and variables → Actions で、以下のSecretsを設定してください：

- `ROOMBA_BLID`: Roombaのユーザー名（BLID）
- `ROOMBA_PASSWORD`: Roombaのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

## 使い方

### スケジュール実行

デフォルトのスケジュールは [.github/workflows/check-battery.yml](.github/workflows/check-battery.yml#L4-L8) を参照してください。

実行スケジュールを変更したい場合は、`.github/workflows/check-battery.yml`のcron式を編集してください。

詳細は [ワークフローREADME](.github/workflows/README.md) を参照してください。

### 手動実行

GitHub ActionsのActionsタブから「Roombaバッテリーチェック」ワークフローを選択し、「Run workflow」ボタンで手動実行できます。

## ローカルでの実行

環境変数を設定してローカルでも実行できます：

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
export ROOMBA_BLID="your_blid"
export ROOMBA_PASSWORD="your_password"
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="smtp_user"
export SMTP_PASSWORD="smtp_password"
export NOTIFICATION_EMAIL="notification@email.com"

# スクリプトを実行
npm run check-battery
```

## トラブルシューティング

### Roombaへの接続について

このツールはiRobot Cloud API経由でRoombaと通信します。そのため：

- Roombaがインターネットに接続されている必要があります
- GitHub-hostedランナーから直接実行可能です

詳細は [CLOUD_API.md](CLOUD_API.md) を参照してください。

### 対応機種

このツールは`dorita980`ライブラリを使用してiRobot Cloud APIにアクセスします。対応機種：

- Roomba 900シリーズ
- Roomba i, s, jシリーズ（Wi-Fi対応モデル）

古いモデルやWi-Fi非対応のモデルでは動作しません。

### Gmail SMTPの設定

Gmailを使用する場合は、アプリパスワードの生成が必要です：

1. Googleアカウントの2段階認証を有効化
2. アプリパスワードを生成
3. 生成されたパスワードを`SMTP_PASSWORD`に設定

## 注意事項

- このツールは非公式のiRobot Cloud APIを使用しています
- 将来的にAPIが動作しなくなる可能性があります
- Roombaのファームウェアアップデートによって動作が変わる可能性があります

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueで変更内容を議論してください。
