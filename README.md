# roomba-battery-checker

⚠️ **重要なお知らせ（2025年1月）** ⚠️

**iRobot Cloud APIが廃止されたため、このツールは現在動作しません。**

iRobotのCloud API（`irobot.axeda.com`）は2024年に廃止され、GitHub Actionsからクラウド経由でRoombaにアクセスすることができなくなりました。

## 代替案

このツールを引き続き使用するには、以下のいずれかの方法が必要です：

### 1. セルフホステッドランナー + Local API（推奨）

Roombaと同じネットワーク上でGitHub Actionsセルフホステッドランナーを実行し、dorita980のLocal APIを使用します。

- [dorita980 Local API ドキュメント](https://github.com/koalazak/dorita980#local-api)
- [GitHub Actionsセルフホステッドランナー](https://docs.github.com/ja/actions/hosting-your-own-runners)

### 2. rest980ブリッジサーバー

Roombaと同じネットワーク上でrest980サーバーを実行し、GitHub ActionsからHTTP API経由でアクセスします。

- [rest980 GitHub](https://github.com/koalazak/rest980)

---

Roombaの充電状態を定期確認するツール🔋

## 概要

~~このツールは、非公式のiRobot Cloud APIを使用してRoombaのバッテリー状態を確認し、充電が100%でない場合にメール通知を送信します。GitHub Actionsを使用してスケジュール実行されるため、定期清掃の前にバッテリー不足を事前に検知できます。~~

**注意**: iRobot Cloud APIは2024年に廃止されました。現在、このツールをそのまま使用することはできません。代替案については上記をご覧ください。

### 廃止前の機能

- ~~Roombaのバッテリー残量チェック（iRobot Cloud API経由）~~（廃止）
- バッテリーが100%でない場合のメール通知（SMTP経由）
- GitHub Actionsによるスケジュール実行
- ~~GitHub-hostedランナーから直接実行可能~~（廃止により不可）

### 廃止の理由

iRobot Cloud APIのエンドポイント（`irobot.axeda.com`）は2024年に恒久的に廃止されました。これにより、クラウド経由でRoombaを制御する非公式の方法はすべて利用できなくなっています。

代替として、dorita980のLocal APIを使用する必要がありますが、これはRoombaと同じローカルネットワーク上からのアクセスが必要です。

## セットアップ

### 1. Roombaの認証情報を取得

クラウドAPI経由でアクセスするには、RoombaのBLIDとパスワードが必要です。

#### dorita980を使用（推奨）

```bash
# dorita980をインストール
npm install -g dorita980

# BLIDとパスワードを取得
get-roomba-password-cloud <iRobotアカウントのメールアドレス> <パスワード>
```

※ `<iRobotアカウントのメールアドレス>`と`<パスワード>`は、iRobot Homeアプリにログインする際のメールアドレスとパスワードを指定してください。

#### roombapyを使用（代替手段）

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

### スクリプトを使用

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

### Cloud APIが廃止されました（2025年1月現在）

**エラー**: `Error: getaddrinfo ENOTFOUND irobot.axeda.com`

このエラーは、iRobot Cloud APIのエンドポイントが廃止されたために発生します。これは予期された動作であり、修正できません。

**解決策**:
- セルフホステッドランナーとLocal APIを使用する（上記の「代替案」セクション参照）
- rest980ブリッジサーバーを使用する

### その他のトラブルシューティング（Local API使用時）

#### 接続エラー

- Roombaがインターネットに接続されているか確認してください
- iRobotアプリでRoombaが「オンライン」として表示されているか確認してください
- BLIDとパスワードが正しいか確認してください
- Roombaとアクセス元が同じローカルネットワーク上にあるか確認してください

#### 認証情報の取得に失敗する場合

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
- [dorita980 Issue #81: Cloud API廃止に関する議論](https://github.com/koalazak/dorita980/issues/81)

## 変更履歴

### 2025年1月
- iRobot Cloud API廃止に伴い、明示的なエラーメッセージを追加
- ドキュメントに廃止の通知と代替案を追加
- GitHub Actionsでの実行は現在不可（セルフホステッドランナーまたはrest980ブリッジが必要）
