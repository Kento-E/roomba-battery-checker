# roomba-battery-checker

Androidで動作するRoombaバッテリー定期確認ツール🔋📱

## 概要

このツールは、Android端末上で定期的にRoombaのバッテリー状態を確認し、充電が100%でない場合にメール通知を送信するアプリケーションです。

iRobot Cloud HTTP APIを使用してRoombaの状態を取得するため、ローカルネットワークへの接続は不要です。iRobotアカウントさえあれば、どこからでも動作させることができます。Termuxのcronを使用した定期実行により、バックグラウンドでの安定した動作を実現します。

### 特徴

- **Android端末で定期実行**: cronie（Termuxのcron実装）による確実なバックグラウンド実行（最小1分間隔）
- **Cloud API使用**: iRobot Cloud HTTP API経由でバッテリー状態を取得（ローカルネットワーク不要）
- **MQTTプロトコルv4対応**: Roomba Combo 10 Maxなどの最新機種にも対応
- **メール通知**: バッテリー不足時に自動でメール送信

### 必要な環境

- Android端末（Android 5.0以上推奨）
- インターネット接続
- iRobotアカウント
- Node.jsランタイム（Termux等で実行）

## アーキテクチャ

このツールは以下の構成で動作します：

1. **Android端末**: Termuxアプリ内でNode.jsを実行
2. **定期実行**: cron（Termux）で定期タスクを設定
3. **バッテリーチェック**: iRobot Cloud HTTP API経由でロボット状態を取得
4. **通知**: メール送信（SMTP経由）

## セットアップ

### 1. Termuxのインストールと設定

Android端末にTermuxをインストールします：

1. [Google Play Store](https://play.google.com/store/apps/details?id=com.termux) または [F-Droid](https://f-droid.org/packages/com.termux/) からTermuxをインストール
2. Termuxを起動し、以下のコマンドでパッケージを更新：

```bash
pkg update && pkg upgrade
```

3. Node.jsをインストール：

```bash
pkg install nodejs-lts git
```

### 2. プロジェクトのセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/roomba-battery-checker.git
cd roomba-battery-checker

# 依存関係をインストール
npm install
```

### 3. 環境変数の設定

```bash
# .env.exampleをコピーして.envを作成
cp .env.example .env

# .envファイルを編集して認証情報を設定
nano .env  # またはvim .env
```

`.env`ファイルに以下の情報を設定：

**必須の設定：**

- `IROBOT_USERNAME`: iRobotアカウントのメールアドレス
- `IROBOT_PASSWORD`: iRobotアカウントのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名
- `SMTP_PORT`: SMTPポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `SEND_TO`: 通知先メールアドレス

**オプションの設定：**

- `SEND_FROM`: 送信元メールアドレス（省略時はSMTP_USERを使用）

### 4. 定期実行の設定

Termuxのcronを使用して定期実行を設定します：

```bash
# cronie（cron実装）をインストール
pkg install cronie termux-services

# サービスを再起動
sv-enable crond

# crontabを編集
crontab -e
```

crontabに以下を追加（例：毎日午前8時に実行）：

```cron
0 8 * * * cd $HOME/roomba-battery-checker && npm run check-battery
```

**パスの確認**:
プロジェクトをクローンしたディレクトリに合わせてパスを変更してください。現在のパスは`pwd`コマンドで確認できます。

**注意事項：**

- Termuxのcronは、Termuxアプリが強制終了されていない状態でのみ動作します
- Android端末の省電力設定でTermuxをバックグラウンド動作許可に設定してください
- より確実な実行には、Termux:Bootアプリと組み合わせる方法もあります

### 5. Termux:Boot（オプション - 推奨）

端末再起動時にも自動実行するには、Termux:Bootを使用します：

1. [Termux:Boot](https://f-droid.org/packages/com.termux.boot/) をインストール
2. 起動スクリプトを作成：

```bash
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-cron
```

以下の内容を記述：

```bash
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
sv-enable crond
```

実行権限を付与：

```bash
chmod +x ~/.termux/boot/start-cron
```

## 使い方

### 手動実行

```bash
cd /path/to/roomba-battery-checker
npm run check-battery
```

または：

```bash
chmod +x run_local.sh
./run_local.sh
```

## トラブルシューティング

### Android/Termux関連

#### cronが動作しない

1. **crondサービスが起動しているか確認**：

   ```bash
   sv status crond
   ```

2. **Termuxがバックグラウンドで動作許可されているか確認**：
   - Android設定 → アプリ → Termux → バッテリー → バックグラウンド制限なし

3. **Termux:Bootを使用**（推奨）：
   端末再起動時にcrondが自動起動されるように設定

### iRobot Cloud API関連

#### 認証エラーが発生する場合

- `IROBOT_USERNAME`と`IROBOT_PASSWORD`がiRobotアプリのログイン情報と一致しているか確認
- iRobotアカウントのパスワードが特殊文字を含む場合、認証に失敗することがあります。英数字のみのパスワードに変更してください

#### バッテリー情報を取得できない場合

- Roombaの電源が入っており、インターネットに接続されているか確認
- iRobotアプリで正常にロボットが表示されているか確認

## 参考資料

- [Termux公式ドキュメント](https://termux.dev/)
- [Termux:Boot](https://wiki.termux.com/wiki/Termux:Boot)
