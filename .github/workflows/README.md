# GitHub Actions ワークフロー

このディレクトリには、GitHub Actionsのワークフローファイルが格納されています。

## ワークフロー

### Roombaバッテリーチェック - check-battery.yml

非公式のiRobot Cloud APIを使用して、GitHub-hostedランナーから直接Roombaのバッテリー状態をチェックします。

#### メリット

- セルフホステッドランナーやVPNの設定が不要
- GitHub Actionsから直接実行可能
- どこからでもアクセス可能

#### トリガー条件

- **スケジュール実行**: [check-battery.yml](check-battery.yml#L4-L8) を参照
- **手動実行**: GitHubのActionsタブから手動で実行可能（`workflow_dispatch`）

#### 必要な環境変数（GitHub Secrets）

- `ROOMBA_BLID`: Roombaのユーザー名（BLID）
- `ROOMBA_PASSWORD`: Roombaのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

#### 動作の流れ

1. リポジトリをチェックアウト
2. Node.js 20をセットアップ
3. 依存関係（package.json）をインストール
4. `src/check_battery.js`を実行してRoombaのバッテリー状態を確認（クラウドAPI経由）
5. バッテリーが100%でない場合、設定されたメールアドレスに通知を送信

#### スケジュールのカスタマイズ

実行時刻を変更したい場合は、ワークフローファイルの`cron`式を編集してください：

- [check-battery.yml](check-battery.yml#L6)
