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

環境変数の詳細は [.env.example](.env.example) を参照してください。

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

このツールは[dorita980](https://github.com/koalazak/dorita980)ライブラリを使用しています。

対応機種の詳細は[dorita980の公式ドキュメント](https://github.com/koalazak/dorita980#supported-robots)を参照してください。



## 参考資料

- [dorita980 (Node.js SDK)](https://github.com/koalazak/dorita980)
- [rest980 (REST API)](https://github.com/koalazak/rest980)
- [Home Assistant Roomba Integration](https://www.home-assistant.io/integrations/roomba/)
