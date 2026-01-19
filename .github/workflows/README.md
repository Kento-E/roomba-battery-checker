# GitHub Actions ワークフロー

このディレクトリには、GitHub Actionsのワークフローファイルが格納されています。

## ワークフロー

### 自動マージ - auto-merge.yml

PRが承認されたときに自動的にマージを実行します。

#### トリガー条件

- **PR承認時**: PRにApproveレビューが送信されたとき（`pull_request_review: submitted`）

#### 必要な権限

- `contents: write` - リポジトリのコンテンツを書き込む権限
- `pull-requests: write` - PRをマージする権限

#### 動作の流れ

1. PR情報を表示（PR番号、タイトル、ベースブランチ、ヘッドブランチ、レビュアー）
2. PRがDraft状態かチェック（Draft状態の場合は自動マージをスキップ）
3. PRのマージ可能状態を確認
4. 自動マージを有効化（Squash and Merge方式、マージ後にブランチを削除）

#### 注意事項

- Draft PRは自動マージされません
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
- `auto-merge.yml` で `--delete-branch` オプションが使用されているため、通常は自動的にブランチが削除されます
- このワークフローは、何らかの理由でブランチが削除されなかった場合のバックアップとして機能します

### Roombaバッテリーチェック - check-battery.yml

非公式のiRobot Cloud APIを使用して、GitHub-hostedランナーから直接Roombaのバッテリー状態をチェックします。セルフホステッドランナーやVPNの設定が不要で、どこからでもアクセス可能です。

#### トリガー条件

- **スケジュール実行**: [check-battery.yml](check-battery.yml#L4-L8) を参照
- **手動実行**: GitHubのActionsタブから手動で実行可能（`workflow_dispatch`）

#### 必要な環境変数（GitHub Secrets）

環境変数の詳細は [.env.example](../../.env.example) を参照してください。

#### 動作の流れ

1. リポジトリをチェックアウト
2. Node.js 20をセットアップ
3. 依存関係（package.json）をインストール
4. `src/check_battery.js`を実行してRoombaのバッテリー状態を確認（クラウドAPI経由）
5. バッテリーが100%でない場合、設定されたメールアドレスに通知を送信

#### スケジュールのカスタマイズ

実行時刻を変更したい場合は、ワークフローファイルの`cron`式を編集してください：

- [check-battery.yml](check-battery.yml#L6)
