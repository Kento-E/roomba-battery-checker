# GitHub Actions ワークフロー

このディレクトリには、GitHub Actionsのワークフローファイルが格納されています。

## ワークフロー一覧

### Roombaバッテリーチェック（check-battery.yml）

Roombaのバッテリー状態を定期的にチェックし、100%でない場合にメール通知を送信します。

#### トリガー条件

- **スケジュール実行**: 毎日午前9時（JST）/ UTC 0時
- **手動実行**: GitHubのActionsタブから手動で実行可能（`workflow_dispatch`）

#### 必要な環境変数（GitHub Secrets）

以下のSecretsをリポジトリに設定する必要があります：

- `IROBOT_EMAIL`: iRobotアカウントのメールアドレス
- `IROBOT_PASSWORD`: iRobotアカウントのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

#### 動作の流れ

1. リポジトリをチェックアウト
2. Python 3.11をセットアップ
3. 依存関係（requirements.txt）をインストール
4. `src/check_battery.py`を実行してRoombaのバッテリー状態を確認
5. バッテリーが100%でない場合、設定されたメールアドレスに通知を送信

#### Secretsの設定方法

1. GitHubリポジトリのSettingsタブを開く
2. 左メニューから「Secrets and variables」→「Actions」を選択
3. 「New repository secret」をクリック
4. 上記の環境変数を一つずつ追加

#### スケジュールのカスタマイズ

実行時刻を変更したい場合は、`check-battery.yml`の`cron`式を編集してください：

```yaml
schedule:
  - cron: '0 0 * * *'  # 毎日UTC 0時（JST 9時）
```

cron式の形式: `分 時 日 月 曜日`（すべてUTC時刻）

例：
- `0 0 * * *`: 毎日UTC 0時（JST 9時）
- `0 9 * * *`: 毎日UTC 9時（JST 18時）
- `0 0 * * 1`: 毎週月曜日UTC 0時（JST 9時）
