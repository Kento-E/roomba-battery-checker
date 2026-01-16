# クラウドAPI版の使用方法

このドキュメントでは、非公式のiRobot Cloud APIを使用してGitHub Actionsから直接Roombaのバッテリー状態をチェックする方法を説明します。

## 概要

**メリット:**
- GitHub-hostedランナーから直接実行可能（ローカルネットワークアクセス不要）
- セルフホステッドランナーやVPNの設定が不要
- クラウド経由でどこからでもアクセス可能

**デメリット:**
- 非公式APIのため、将来的に動作しなくなる可能性がある
- Roombaがインターネットに接続されている必要がある

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

以下のSecretsをリポジトリに設定してください：

- `ROOMBA_BLID`: Roombaのユーザー名（BLID）
- `ROOMBA_PASSWORD`: Roombaのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

注意: クラウドAPI版では`ROOMBA_IP`は不要です。

### 3. ワークフローの選択

このリポジトリには2つのワークフローがあります：

1. **check-battery.yml** (ローカルネットワーク版)
   - Python + roombapyを使用
   - ローカルネットワーク経由で接続
   - セルフホステッドランナーまたはVPNが必要

2. **check-battery-cloud.yml** (クラウドAPI版) ★推奨
   - Node.js + dorita980を使用
   - クラウドAPI経由で接続
   - GitHub-hostedランナーから実行可能

クラウドAPI版を使用する場合は、`.github/workflows/check-battery-cloud.yml`を有効にしてください。

## 使い方

### スケジュール実行

デフォルトでは、毎週月・水・金曜日の午前6時30分（JST）に自動実行されます。

### 手動実行

GitHub ActionsのActionsタブから「Roombaバッテリーチェック（クラウドAPI版）」ワークフローを選択し、「Run workflow」ボタンで手動実行できます。

## ローカルでの実行

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

## 参考資料

- [dorita980 (Node.js SDK)](https://github.com/koalazak/dorita980)
- [rest980 (REST API)](https://github.com/koalazak/rest980)
- [Home Assistant Roomba Integration](https://www.home-assistant.io/integrations/roomba/)
