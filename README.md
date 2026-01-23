# roomba-battery-checker

Androidで動作するRoombaバッテリー定期確認ツール🔋📱

## 概要

このツールは、Android端末上で定期的にRoombaのバッテリー状態を確認し、充電が100%でない場合にメール通知を送信するアプリケーションです。

dorita980ライブラリのLocal APIを使用してRoombaと直接通信するため、Roombaと同じローカルネットワーク上にあるAndroid端末で動作させます。Termuxのcronを使用した定期実行により、バックグラウンドでの安定した動作を実現します。

### 特徴

- **Android端末で定期実行**: cronie（Termuxのcron実装）による確実なバックグラウンド実行（最小1分間隔）
- **Local API使用**: Roombaと直接通信（高速・安定・プライバシー保護）
- **自動検出対応**: 動的IPアドレス（DHCP）環境でも安定動作
- **メール通知**: バッテリー不足時に自動でメール送信

### 必要な環境

- Android端末（Android 5.0以上推奨）
- Roombaと同じWi-Fiネットワークに接続していること
- Node.jsランタイム（Termux等で実行）

## アーキテクチャ

このツールは以下の構成で動作します：

1. **Android端末**: Termuxアプリ内でNode.jsを実行
2. **定期実行**: cron（Termux）で定期タスクを設定
3. **バッテリーチェック**: dorita980のLocal API経由でRoombaに接続
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

### 3. Roombaの認証情報を取得

Local API経由でアクセスするには、RoombaのBLIDとパスワードが必要です。

#### dorita980を使用してBLIDとパスワードを取得

```bash
# dorita980をグローバルにインストール
npm install -g dorita980

# Roombaをホームベースに置き、電源を入れる
# HOMEボタンを長押し（約2秒）してビープ音が鳴るまで待つ
# その後、以下のコマンドを実行
get-roomba-password
# プロンプトに従い、再度HOMEボタンを長押し
```

このコマンドで、BLIDとパスワードの両方が表示されます。

### 4. 環境変数の設定

```bash
# .env.exampleをコピーして.envを作成
cp .env.example .env

# .envファイルを編集して認証情報を設定
nano .env  # またはvim .env
```

`.env`ファイルに以下の情報を設定：

**必須の設定：**
- `ROOMBA_BLID`: Roombaのユーザー名（BLID）
- `ROOMBA_PASSWORD`: Roombaのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名
- `SMTP_PORT`: SMTPポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `SEND_TO`: 通知先メールアドレス

**オプションの設定：**
- `ROOMBA_IP`: RoombaのIPアドレス（省略時は自動検出）
- `SEND_FROM`: 送信元メールアドレス（省略時はSMTP_USERを使用）

### 5. 定期実行の設定

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

### 6. Termux:Boot（オプション - 推奨）

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

**直接実行する場合**:

```bash
cd /path/to/roomba-battery-checker
npm run check-battery
```

注：この方法では、事前に`.env`ファイルの設定と`npm install`の実行が必要です。

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

#### 接続エラー

- Roombaがホームベースに置かれ、電源が入っているか確認
- Android端末とRoombaが同じWi-Fiネットワーク上にあるか確認
- BLIDとパスワードが正しいか確認
- ファイアウォールでポート8883がブロックされていないか確認

### Roomba関連

#### 認証情報の取得に失敗する場合

1. Roombaがホームベースに置かれ、電源が入っているか確認
2. HOMEボタンを正しく長押し（約2秒、ビープ音が鳴るまで）
3. プロンプトが表示されたら、すぐにEnterキーを押す
4. 複数回試す（ネットワークが遅い場合は数回必要な場合があります）

### 対応機種

このツールは[dorita980](https://github.com/koalazak/dorita980)ライブラリを使用しています。

対応機種の詳細は[dorita980の公式ドキュメント](https://github.com/koalazak/dorita980#supported-robots)を参照してください。

## 参考資料

- [Termux公式ドキュメント](https://termux.dev/)
- [dorita980 (Node.js SDK)](https://github.com/koalazak/dorita980)
- [Termux:Boot](https://wiki.termux.com/wiki/Termux:Boot)
