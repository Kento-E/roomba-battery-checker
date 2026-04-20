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

リポジトリの **Settings → Secrets and variables → Actions** から必要なSecretsを登録します。

必要なSecret一覧は [`.github/workflows/README.md`](.github/workflows/README.md#必要なsecrets) を参照してください。

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

### 直接実行する場合

ローカルで動作確認する場合は、`.env` を作成してから `npm run check-battery` を実行します。

1. `.env.example` をコピーして `.env` を作成
2. `.env` の値を自分の環境に合わせて設定
3. 実行

```bash
cd /path/to/roomba-battery-checker
npm install
cp .env.example .env
npm run check-battery
```

メール通知なしでバッテリー取得だけを試す場合は、ローカル検証モードを使います。

```bash
npm run check-battery -l
```

### Raspberry Pi で常時実行する場合

Raspberry Pi で常駐実行する場合は、デーモンモードを使います。

```bash
RUN_CONTINUOUS=true CHECK_INTERVAL_MINUTES=30 NOTIFICATION_COOLDOWN_MINUTES=180 npm run check-battery
```

- `RUN_CONTINUOUS=true`: 常時実行モードを有効化
- `CHECK_INTERVAL_MINUTES`: チェック間隔（分）
- `NOTIFICATION_COOLDOWN_MINUTES`: 通知の最短間隔（分、同一条件での連続通知を抑制）

コマンド引数でもデーモンモードを有効化できます。

```bash
npm run check-battery -- --daemon
```

systemd で自動起動させる場合は、次の手順で設定できます。

1. `.env.example` を `.env` にコピーして値を設定
2. `RUN_CONTINUOUS=true` を設定
3. 次のコマンドを実行

```bash
chmod +x scripts/install_systemd_service.sh
./scripts/install_systemd_service.sh
```

ログ確認コマンド:

```bash
sudo journalctl -u roomba-battery-checker.service -f
```

sudo なしで運用する場合は、先に Node.js ランタイムをユーザー領域へ導入してから常駐実行します。

```bash
chmod +x scripts/setup_pi_runtime.sh scripts/run_on_pi.sh
./scripts/setup_pi_runtime.sh
nohup ./scripts/run_on_pi.sh > ./roomba-battery-checker.log 2>&1 &
```

再起動時にも自動起動させる場合は、ユーザー crontab に登録します。

```bash
(crontab -l 2>/dev/null; echo '@reboot /home/pi/work/roomba-battery-checker/scripts/run_on_pi.sh >> /home/pi/work/roomba-battery-checker/roomba-battery-checker.log 2>&1') | crontab -
```

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
