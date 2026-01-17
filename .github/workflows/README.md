# GitHub Actions ワークフロー

このディレクトリには、GitHub Actionsのワークフローファイルが格納されています。

## ワークフロー一覧

### 1. Roombaバッテリーチェック（クラウドAPI版）- check-battery-cloud.yml ★推奨

非公式のiRobot Cloud APIを使用して、GitHub-hostedランナーから直接Roombaのバッテリー状態をチェックします。

#### メリット

- セルフホステッドランナーやVPNの設定が不要
- GitHub Actionsから直接実行可能
- どこからでもアクセス可能

#### トリガー条件

- **スケジュール実行**: [check-battery-cloud.yml](check-battery-cloud.yml#L4-L8) を参照
- **手動実行**: GitHubのActionsタブから手動で実行可能（`workflow_dispatch`）

#### 必要な環境変数（GitHub Secrets）

- `ROOMBA_BLID`: Roombaのユーザー名（BLID）
- `ROOMBA_PASSWORD`: Roombaのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

注意: `ROOMBA_IP`は不要です（クラウド経由でアクセスするため）

#### 動作の流れ

1. リポジトリをチェックアウト
2. Node.js 20をセットアップ
3. 依存関係（package.json）をインストール
4. `src/check_battery_cloud.js`を実行してRoombaのバッテリー状態を確認（クラウドAPI経由）
5. バッテリーが100%でない場合、設定されたメールアドレスに通知を送信

詳細は [CLOUD_API.md](../../CLOUD_API.md) を参照してください。

---

### 2. Roombaバッテリーチェック（ローカルネットワーク版）- check-battery.yml

ローカルネットワーク経由でRoombaのバッテリー状態をチェックします。

#### 注意

このワークフローはGitHub-hostedランナーからは直接実行できません。以下のいずれかが必要です：
- セルフホステッドランナー
- VPN経由のアクセス
- ローカルでの実行

#### トリガー条件

- **スケジュール実行**: [check-battery.yml](check-battery.yml#L4-L8) を参照
- **手動実行**: GitHubのActionsタブから手動で実行可能（`workflow_dispatch`）

#### 必要な環境変数（GitHub Secrets）

以下のSecretsをリポジトリに設定する必要があります：

- `ROOMBA_IP`: RoombaのローカルIPアドレス
- `ROOMBA_BLID`: Roombaのユーザー名（BLID）
- `ROOMBA_PASSWORD`: Roombaのパスワード
- `SMTP_SERVER`: SMTPサーバーのホスト名（例: smtp.gmail.com）
- `SMTP_PORT`: SMTPサーバーのポート番号（通常は587）
- `SMTP_USER`: SMTP認証用のユーザー名
- `SMTP_PASSWORD`: SMTP認証用のパスワード
- `NOTIFICATION_EMAIL`: 通知メールの送信先アドレス

#### RoombaのBLIDとパスワードの取得方法

RoombaのBLIDとパスワードは、roombapyライブラリのdiscoverコマンドで取得できます：

```bash
pip install roombapy
roombapy discover
```

上記コマンドを実行すると、ローカルネットワーク上のRoombaを検出し、BLIDとパスワードを表示します。
検出中はRoombaのHOMEボタンを長押しして、ビープ音が鳴るまで待ってください。

#### 動作の流れ

1. リポジトリをチェックアウト
2. Python 3.11をセットアップ
3. 依存関係（requirements.txt）をインストール
4. `src/check_battery.py`を実行してRoombaのバッテリー状態を確認
5. バッテリーが100%でない場合、設定されたメールアドレスに通知を送信

#### スケジュールのカスタマイズ

実行時刻を変更したい場合は、各ワークフローファイルの`cron`式を編集してください：

- クラウドAPI版: [check-battery-cloud.yml](check-battery-cloud.yml#L6)
- ローカルネットワーク版: [check-battery.yml](check-battery.yml#L6)
