# roomba-battery-checker

Roombaの充電状態を定期確認するツール🔋

## 概要

このツールは、dorita980ライブラリのLocal APIを使用してRoombaのバッテリー状態をローカルネットワーク経由で確認し、充電が100%でない場合にメール通知を送信します。GitHub Actionsでスケジュール実行されるため、定期清掃の前にバッテリー不足を事前に検知できます。

Roombaの自動検出機能により、動的IPアドレス（DHCP）環境でも安定して動作します。

### 必要な環境

- Roombaとワークフロー実行環境が同じローカルネットワーク上に存在すること
- GitHub Actionsのセルフホステッドランナー

## 機能

- Roombaのバッテリー残量チェック（Local API経由）
- バッテリーが100%でない場合のメール通知（SMTP経由）
- GitHub Actionsによるスケジュール実行

## セットアップ

### 1. ランナーのセットアップ

Roombaと同じローカルネットワーク上でGitHub Actionsのランナーを実行する必要があります。

#### 手順

1. GitHubリポジトリの **Settings** → **Actions** → **Runners** に移動
2. **New self-hosted runner** をクリック
3. お使いのOSを選択
4. 表示される手順に従ってランナーをダウンロード・インストール
   ```bash
   # Linux/macOSの例
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
   tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
   ./config.sh --url https://github.com/YOUR_USER/roomba-battery-checker --token YOUR_TOKEN
   ```
5. ランナーを起動
   ```bash
   # フォアグラウンドで実行
   ./run.sh
   
   # または、サービスとしてインストール（推奨）
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

詳細は [GitHub公式ドキュメント](https://docs.github.com/ja/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners) を参照してください。

### 2. Roombaの認証情報を取得

Local API経由でアクセスするには、RoombaのBLIDとパスワードが必要です。

**注意**: IPアドレスは自動検出されるため、通常は設定不要です。IPアドレスが固定されている場合や自動検出が失敗する場合のみ、手動で設定できます。

#### dorita980を使用してBLIDとパスワードを取得

Roombaと同じネットワーク上のマシン（ランナーを実行しているマシンなど）で以下を実行：

```bash
# dorita980をインストール
npm install -g dorita980

# Roombaをホームベースに置き、電源を入れる
# HOMEボタンを長押し（約2秒）してビープ音が鳴るまで待つ
# その後、以下のコマンドを実行
get-roomba-password
# プロンプトに従い、再度HOMEボタンを長押し
```

このコマンドで、BLIDとパスワードの両方が表示されます。

#### （オプション）IPアドレスを手動で確認・設定する場合

通常は不要ですが、以下の場合にIPアドレスを手動設定できます：
- 自動検出が失敗する場合
- IPアドレスを固定している場合
- 起動時間を短縮したい場合

IPアドレスの確認方法：

1. **ルーターの管理画面**で接続デバイスを確認
2. **iRobot Homeアプリ**の設定画面で確認
3. **上記のget-roomba-passwordコマンド**の実行結果に含まれるIPアドレスを確認

### 3. GitHub Secretsの設定

GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** で、以下のSecretsを設定してください：

**必須の設定：**
- `ROOMBA_BLID`: Roombaのユーザー名（BLID）（[取得方法](#2-roombaの認証情報を取得)）
- `ROOMBA_PASSWORD`: Roombaのパスワード（[取得方法](#2-roombaの認証情報を取得)）
- `SMTP_SERVER`: SMTPサーバーのホスト名
- `SMTP_PORT`: SMTPポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `SEND_TO`: 通知先メールアドレス

**オプションの設定：**
- `ROOMBA_IP`: RoombaのIPアドレス（例: 192.168.1.100）（[確認方法](#オプションipアドレスを手動で確認設定する場合)）
  - **省略時は自動検出されます**（推奨）
  - IPアドレスが固定されている場合や自動検出が失敗する場合のみ設定
- `SEND_FROM`: 送信元メールアドレス（省略時はSMTP_USERを使用）

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

### 接続エラー

- Roombaがホームベースに置かれ、電源が入っているか確認してください
- ランナーとRoombaが同じローカルネットワーク上にあるか確認してください
- RoombaのIPアドレスが正しいか確認してください
- BLIDとパスワードが正しいか確認してください
- ファイアウォールでポート8883がブロックされていないか確認してください

### ランナーが起動しない

- ランナーのログを確認してください
- ランナーのサービスが実行中か確認してください
- GitHubリポジトリのSettings → Actions → Runnersで、ランナーがオンラインになっているか確認してください

### 認証情報の取得に失敗する場合

1. Roombaがホームベースに置かれ、電源が入っているか確認
2. HOMEボタンを正しく長押し（約2秒、ビープ音が鳴るまで）
3. プロンプトが表示されたら、すぐにEnterキーを押す
4. 複数回試す（ネットワークが遅い場合は数回必要な場合があります）

### 対応機種

このツールは[dorita980](https://github.com/koalazak/dorita980)ライブラリを使用しています。

対応機種の詳細は[dorita980の公式ドキュメント](https://github.com/koalazak/dorita980#supported-robots)を参照してください。

## 参考資料

- [dorita980 (Node.js SDK)](https://github.com/koalazak/dorita980)
- [rest980 (REST API)](https://github.com/koalazak/rest980)
- [Home Assistant Roomba Integration](https://www.home-assistant.io/integrations/roomba/)
