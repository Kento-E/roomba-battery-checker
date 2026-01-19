# GitHub Actions ワークフロー

このディレクトリには、GitHub Actionsのワークフローファイルが格納されています。

## ワークフロー

### Roombaバッテリーチェック - check-battery.yml

dorita980ライブラリのLocal APIを使用して、セルフホステッドランナーからローカルネットワーク経由でRoombaのバッテリー状態をチェックします。Roombaの自動検出機能により、動的IPアドレスにも対応しています。

#### トリガー条件

- **スケジュール実行**: [check-battery.yml](check-battery.yml#L4-L8) を参照
- **手動実行**: GitHubのActionsタブから手動で実行可能（`workflow_dispatch`）

#### 必要な環境変数（GitHub Secrets）

**必須:**
- `ROOMBA_BLID`: Roombaのユーザー名（BLID）
- `ROOMBA_PASSWORD`: Roombaのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名
- `SMTP_PORT`: SMTPポート番号
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `SEND_TO`: 通知先メールアドレス

**オプション:**
- `ROOMBA_IP`: RoombaのIPアドレス（省略時は自動検出）
- `SEND_FROM`: 送信元メールアドレス

環境変数の詳細は [.env.example](../../.env.example) を参照してください。

#### 動作の流れ

1. リポジトリをチェックアウト
2. Node.js 20をセットアップ
3. 依存関係（package.json）をインストール
4. `src/check_battery.js`を実行してRoombaのバッテリー状態を確認（Local API経由）
   - Roombaを自動検出（ROOMBA_IP未設定の場合）
   - 指定されたIPアドレスに接続（ROOMBA_IP設定済みの場合）
5. バッテリーが100%でない場合、設定されたメールアドレスに通知を送信

#### スケジュールのカスタマイズ

実行時刻を変更したい場合は、ワークフローファイルの`cron`式を編集してください：

- [check-battery.yml](check-battery.yml#L6)
