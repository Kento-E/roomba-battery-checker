# roomba-battery-checker

GitHub Actionsで動作するRoombaバッテリー定期確認ツール🔋

## 概要

このツールは、GitHub Actionsで定期的にRoombaのバッテリー状態を確認し、充電が100%でない場合にメール通知を送信するアプリケーションです。

iRobot Cloud HTTP APIを使用してRoombaの状態を取得するため、ローカルネットワークへの接続は不要です。iRobotアカウントさえあれば、GitHub Actions経由でクラウドから動作させることができます。

### 特徴

- **GitHub Actionsで定期実行**: スケジュール設定により自動実行（詳細は `.github/workflows/check_battery.yml` 参照）
- **Cloud API使用**: iRobot Cloud HTTP API経由でバッテリー状態を取得（ローカルネットワーク不要）
- **MQTTプロトコルv4対応**: Roomba Combo 10 Maxなどの最新機種にも対応
- **メール通知**: バッテリー不足時に自動でメール送信
- **手動実行**: GitHub ActionsのUIから手動でトリガー可能（疎通確認に便利）

### 必要な環境

- GitHubアカウント（このリポジトリをフォーク・または所有）
- iRobotアカウント
- SMTPサーバー（メール通知用）

## セットアップ

### 1. GitHub Secretsの設定

リポジトリの **Settings → Secrets and variables → Actions** から以下のSecretsを登録します：

| Secret名 | 説明 | 必須 |
|---|---|---|
| `IROBOT_USERNAME` | iRobotアカウントのメールアドレス | ✅ |
| `IROBOT_PASSWORD` | iRobotアカウントのパスワード | ✅ |
| `SMTP_SERVER` | SMTPサーバーのホスト名（例: `smtp.gmail.com`） | ✅ |
| `SMTP_PORT` | SMTPポート番号（例: `587`） | ✅ |
| `SMTP_USER` | SMTP認証用のユーザー名（メールアドレス） | ✅ |
| `SMTP_PASSWORD` | SMTP認証用のパスワード | ✅ |
| `SEND_TO` | 通知先メールアドレス（カンマ区切りで複数指定可） | ✅ |
| `SEND_FROM` | 送信元メールアドレス（省略時はSMTP_USERを使用） | オプション |

### 2. ワークフローの確認

`.github/workflows/check_battery.yml` に定義されたワークフローが自動的に動作します。

スケジュールは `check_battery.yml` の `cron` 設定で管理されています。変更したい場合は `check_battery.yml` の `cron` の値を直接編集してください。

## 使い方

### 定期実行

設定後は何もしなくても定期的に自動実行されます。バッテリーが100%未満の場合、登録したメールアドレスに通知が届きます。

### 手動実行（疎通確認）

GitHub ActionsのUIから手動でトリガーできます：

1. リポジトリの **Actions** タブを開く
2. **Roombaバッテリーチェック** ワークフローを選択
3. **Run workflow** をクリック
4. `force_notification` を `true` にすると、バッテリー残量にかかわらず通知メールが送信されます

### ローカルでのテスト実行

ローカル環境でテストする場合は、`.env`ファイルを設定して`run_local.sh`を使用します：

**推奨**: 実行スクリプトを使用する方法（依存関係のインストールと環境変数チェックを自動で実行）

```bash
cd /path/to/roomba-battery-checker
chmod +x run_local.sh
./run_local.sh
```

このスクリプトは以下を自動で実行します：
- `.env`ファイルの存在チェック
- 必要に応じて依存関係のインストール（`npm install`）
- バッテリーチェックの実行

**疎通確認（バッテリー100%でも通知を送信）**:

```bash
./run_local.sh --force-notification
# または短縮形
./run_local.sh -f
```

このオプションを使用すると、バッテリー残量が100%の場合でもメール通知が送信されます。SMTP設定の疎通確認に便利です。

**直接実行する場合**:

```bash
cp .env.example .env
# .envファイルを編集してIROBOT_USERNAME/IROBOT_PASSWORD等を設定
./run_local.sh
```

注：この方法では、事前に`.env`ファイルの設定と`npm install`の実行が必要です。

## トラブルシューティング

### GitHub Actions関連

#### ワークフローが実行されない

- リポジトリのActionsが有効になっているか確認（**Settings → Actions → General → Allow all actions**）
- Secretsが正しく設定されているか確認

### iRobot Cloud API関連

#### 認証エラーが発生する場合

- `IROBOT_USERNAME`と`IROBOT_PASSWORD`がiRobotアプリのログイン情報と一致しているか確認
- iRobotアカウントのパスワードが特殊文字を含む場合、認証に失敗することがあります。英数字のみのパスワードに変更してください

#### バッテリー情報を取得できない場合

- Roombaの電源が入っており、インターネットに接続されているか確認
- iRobotアプリで正常にロボットが表示されているか確認
