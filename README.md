# roomba-battery-checker

Roombaの充電状態を定期確認するツール🔋

## 概要

このツールは、非公式のiRobot Cloud APIを使用してRoombaのバッテリー状態を確認し、充電が100%でない場合にメール通知を送信します。GitHub Actionsを使用してスケジュール実行されるため、定期清掃の前にバッテリー不足を事前に検知できます。

**メリット:**
- GitHub-hostedランナーから直接実行可能（セルフホステッドランナーやVPN設定不要）
- クラウド経由でどこからでもアクセス可能
- ローカルネットワークへのアクセス不要

**注意事項:**
- 非公式APIのため、将来的に動作しなくなる可能性があります
- Roombaがインターネットに接続されている必要があります

## 機能

- Roombaのバッテリー残量チェック（iRobot Cloud API経由）
- バッテリーが100%でない場合のメール通知（SMTP経由）
- GitHub Actionsによるスケジュール実行
- GitHub-hostedランナーから直接実行可能

## セットアップ

### 1. Roombaの認証情報を取得

クラウドAPI経由でアクセスするには、RoombaのBLIDとパスワードが必要です。

#### 方法1: dorita980を使用（推奨）

```bash
# dorita980をインストール
npm install -g dorita980

# BLIDとパスワードを取得
get-roomba-password-cloud
```

実行中にiRobotアプリの認証情報（メールアドレスとパスワード）を入力します。

#### 方法2: roombapyを使用

```bash
pip install roombapy
roombapy discover
```

RoombaのHOMEボタンを長押しして、ビープ音が鳴るまで待ちます。

### 2. GitHub Secretsの設定

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

### 方法1: スクリプトを使用（推奨）

```bash
# 1. .env.exampleをコピーして.envを作成
cp .env.example .env

# 2. .envファイルを編集して認証情報を設定
nano .env  # または任意のエディタで編集

# 3. スクリプトを実行
chmod +x run_local.sh
./run_local.sh
```

### 方法2: 環境変数を手動で設定

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

### 接続エラー

- Roombaがインターネットに接続されているか確認してください
- iRobotアプリでRoombaが「オンライン」として表示されているか確認してください
- BLIDとパスワードが正しいか確認してください

### 認証情報の取得に失敗する場合

最新のファームウェアでは認証方法が変更されている可能性があります。以下を試してください：

1. dorita980の最新版を使用
2. roombapyのdiscoverコマンドでローカル認証情報を取得（こちらの方が確実）

### 対応機種

このツールは`dorita980`ライブラリを使用してiRobot Cloud APIにアクセスします。

**対応機種:**
- Roomba 900シリーズ（980, 960など）
- Roomba i, s, jシリーズ（i3, i7, s9, j7, j9など）
- Roomba Comboシリーズ（j7+, j9+など - 吸引＋モップ機能搭載モデル）
- **Wi-Fi対応かつiRobot Homeアプリで管理可能な全モデル**

**非対応機種:**
- Roomba 100シリーズ（Wi-Fi非対応の古いモデル）
- Roomba 500, 600, 700, 800シリーズの一部（Wi-Fi非対応モデル）
- Wi-Fi機能を持たないモデル全般

**確認方法:**
お使いのRoombaがiRobot Homeアプリ（スマートフォンアプリ）で管理できる場合は、このツールが使用できます。

### Gmail SMTPの設定

Gmailを使用する場合は、アプリパスワードの生成が必要です：

1. Googleアカウントの2段階認証を有効化
2. アプリパスワードを生成
3. 生成されたパスワードを`SMTP_PASSWORD`に設定

## 参考資料

- [dorita980 (Node.js SDK)](https://github.com/koalazak/dorita980)
- [rest980 (REST API)](https://github.com/koalazak/rest980)
- [Home Assistant Roomba Integration](https://www.home-assistant.io/integrations/roomba/)

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueで変更内容を議論してください。
