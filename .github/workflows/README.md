# GitHub Actions ワークフロー

このディレクトリには、GitHub Actionsのワークフローファイルが格納されています。

## ワークフロー

### Roombaバッテリーチェック - check_battery.yml

Roombaのバッテリー残量をiRobot Cloud APIで確認し、100%未満の場合にメール通知を送信します。

#### トリガー条件

- **スケジュール**: `check_battery.yml` の `schedule.cron` に定義されたタイミングで自動実行
- **手動実行**: `workflow_dispatch` による手動トリガー

#### 必要なSecrets

| Secret名 | 説明 |
|---|---|
| `IROBOT_USERNAME` | iRobotアカウントのメールアドレス |
| `IROBOT_PASSWORD` | iRobotアカウントのパスワード |
| `SMTP_SERVER` | SMTPサーバーのホスト名 |
| `SMTP_PORT` | SMTPポート番号 |
| `SMTP_USER` | SMTP認証用ユーザー名 |
| `SMTP_PASSWORD` | SMTP認証用パスワード |
| `SEND_TO` | 通知先メールアドレス |
| `SEND_FROM` | 送信元メールアドレス（オプション） |

#### 動作の流れ

1. リポジトリをチェックアウト（`actions/checkout@v4`）
2. Node.js 20をセットアップ（`actions/setup-node@v4`、npmキャッシュ有効）
3. `npm ci` で依存関係をインストール
4. GitHub SecretsをEnvironment variablesとして設定し `npm run check-battery` を実行

#### 手動実行オプション

- `force_notification`: `true` にするとバッテリー残量にかかわらずメール通知を送信（疎通確認に使用）
- `debug_log`: `true` にするとAPIレスポンスやロボットデータなどの詳細なデバッグログを出力（エラー調査に使用）

### 自動マージ - auto-merge.yml

PRが承認されたときに自動的にマージを実行します。

#### トリガー条件

- **PR承認時**: PRにApproveレビューが送信されたとき（`pull_request_review: submitted`）

#### 必要な権限

- `contents: write` - リポジトリのコンテンツを書き込む権限
- `pull-requests: write` - PRのauto-mergeを有効化する権限
- `issues: write` - PRマージ時にクローズキーワードで関連イシューを自動クローズする権限

#### 動作の流れ

1. PR情報を表示（PR番号、タイトル、ベースブランチ、ヘッドブランチ、レビュアー）
2. PRがDraft状態かチェック（Draft状態の場合は自動マージをスキップ）
3. PR状態をチェック（DIRTY/BEHINDの場合はスキップ）
4. `enablePullRequestAutoMerge` GraphQLミューテーションでauto-mergeを有効化（Squash and Merge方式。BLOCKED状態でも有効化し、ブロック要因が解消された時点で自動マージを実行）
5. 実際のマージはGitHubの自動マージ機能が実行（ブランチ削除は auto-delete-branch.yml が担当）

#### 注意事項

- Draft PRは自動マージされません
- PRにマージコンフリクトがある状態（DIRTY）またはベースブランチよりヘッドブランチが古い状態（BEHIND）の場合は自動マージをスキップします
- ブランチ保護ルールによってブロックされている状態（BLOCKED）でも `enablePullRequestAutoMerge` を呼びauto-mergeを有効化します。ブロック要因が解消された時点でGitHubが自動的にマージを実行します
- `enablePullRequestAutoMerge` でauto-mergeを有効化し、実際のマージはGitHubの自動マージ機能が実行します
- ブランチ保護ルールで要求される承認とステータスチェックが満たされた時点で自動的にマージされます
- マージ方式はSquash and Mergeが使用されます

### 自動ブランチ削除 - auto-delete-branch.yml

PRがマージされた後、ソースブランチを自動的に削除します。

#### トリガー条件

- **PRクローズ時**: PRがマージされてクローズされたとき（`pull_request: closed`）

#### 必要な権限

- `contents: write` - リポジトリのコンテンツを書き込む権限（ブランチ削除）

#### 動作の流れ

1. PRのブランチ情報を取得（ヘッドブランチ、ベースブランチ、PR番号）
2. GitHub APIを使用してヘッドブランチを削除
3. エラーハンドリング
   - ブランチが既に削除されている場合: 情報メッセージを表示
   - ブランチが保護されている場合: 情報メッセージを表示
   - その他のエラー: エラーを表示して失敗

#### 注意事項

- このワークフローは `auto-merge.yml` と連携して動作します
- `auto-merge.yml` は `enablePullRequestAutoMerge` でauto-mergeを有効化するのみで、ブランチ削除は行いません
- このワークフローがPRマージ後のブランチ削除を担当します
