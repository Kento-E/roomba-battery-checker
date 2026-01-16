# roomba-battery-checker

Roombaの充電状態を定期確認するツール🔋

## 概要

このツールは、Roombaに接続してバッテリー状態を確認し、充電が100%でない場合にメール通知を送信します。GitHub Actionsを使用してスケジュール実行されるため、定期清掃の前にバッテリー不足を事前に検知できます。

## 2つの実装方式

### 1. クラウドAPI版（推奨）★

非公式のiRobot Cloud APIを使用して、**GitHub-hostedランナーから直接実行**できます。

**メリット:**
- セルフホステッドランナーやVPNの設定が不要
- どこからでもアクセス可能

**デメリット:**
- 非公式APIのため将来動作しなくなる可能性あり

詳細は [CLOUD_API.md](CLOUD_API.md) を参照してください。

### 2. ローカルネットワーク版

roombapyを使用してローカルネットワーク経由で接続します。

**メリット:**
- より確実な接続

**デメリット:**
- セルフホステッドランナー、VPN、またはローカル実行が必要

## 機能

- Roombaのバッテリー残量チェック
- バッテリーが100%でない場合のメール通知（SMTP経由）
- GitHub Actionsによるスケジュール実行（毎週月・水・金曜日 6:30 JST）

## セットアップ（クラウドAPI版 - 推奨）

詳細な手順は [CLOUD_API.md](CLOUD_API.md) を参照してください。

### 簡易手順

1. Roombaの認証情報（BLIDとパスワード）を取得
2. GitHub Secretsに設定（ROOMBA_BLID, ROOMBA_PASSWORD, SMTP設定）
3. `.github/workflows/check-battery-cloud.yml`を有効化

## セットアップ（ローカルネットワーク版）

### 1. リポジトリのフォーク/クローン

このリポジトリをフォークまたはクローンします。

### 2. Roombaの認証情報を取得

ローカルネットワーク上でRoombaのBLIDとパスワードを取得します：

```bash
pip install roombapy
roombapy discover
```

上記コマンドを実行し、Roombaの**HOMEボタンを長押し**してください（ビープ音が鳴るまで）。

### 3. 必要な環境変数の設定

GitHubリポジトリの Settings → Secrets and variables → Actions で、以下のSecretsを設定してください：

- `ROOMBA_IP`: RoombaのローカルIPアドレス（discoverコマンドで表示されます）
- `ROOMBA_BLID`: Roombaのユーザー名（discoverコマンドで表示されます）
- `ROOMBA_PASSWORD`: Roombaのパスワード（discoverコマンドで表示されます）
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

### 4. GitHub Actionsの有効化

リポジトリのActionsタブから、ワークフローを有効化してください。

**重要**: GitHub ActionsのランナーはRoombaと同じローカルネットワークにアクセスできないため、このワークフローはそのままでは動作しません。以下のいずれかの方法が必要です：

1. **セルフホステッドランナーを使用**: 自宅のネットワークにGitHub Actions self-hosted runnerをセットアップ
2. **VPN経由でアクセス**: GitHub-hostedランナーからVPN経由で自宅ネットワークに接続
3. **ローカルで実行**: GitHub Actionsを使用せず、cronやタスクスケジューラでローカル実行

## 使い方

### スケジュール実行

デフォルトでは、毎週月・水・金曜日の午前6時30分（JST）に自動実行されます。

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
export ROOMBA_IP="192.168.1.100"
export ROOMBA_BLID="your_blid"
export ROOMBA_PASSWORD="your_password"
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="smtp_user"
export SMTP_PASSWORD="smtp_password"
export NOTIFICATION_EMAIL="notification@email.com"

# スクリプトを実行
python src/check_battery.py
```

## トラブルシューティング

### Roombaへの接続について

このツールはRoombaとローカルネットワーク経由で通信します。そのため：

- Roombaが自宅のWi-Fiに接続されている必要があります
- スクリプトを実行するマシンがRoombaと同じネットワークにある必要があります
- GitHub Actions（クラウド）から直接実行する場合は、セルフホステッドランナーまたはVPNの設定が必要です

### roombapyライブラリについて

このツールは`roombapy`ライブラリを使用してRoomba APIにアクセスします。対応機種：

- Roomba 900シリーズ
- Roomba i, s, jシリーズ（Wi-Fi対応モデル）

古いモデルやWi-Fi非対応のモデルでは動作しません。

### Gmail SMTPの設定

Gmailを使用する場合は、アプリパスワードの生成が必要です：

1. Googleアカウントの2段階認証を有効化
2. アプリパスワードを生成
3. 生成されたパスワードを`SMTP_PASSWORD`に設定

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueで変更内容を議論してください。
