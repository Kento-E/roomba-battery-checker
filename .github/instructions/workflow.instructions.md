# Copilot・自動生成ツール向け GitHub Actions ワークフロー指示

GitHub Actionsワークフローを作成・編集する際は、以下のルールを厳守してください。

## 環境変数の一貫性

### 必須チェック項目

- **ワークフロー内の全ステップで必要な環境変数を設定すること**
  - あるステップで使用している環境変数は、それを必要とする他のすべてのステップでも設定する
  - 特にSecretsを参照する環境変数は漏れがないか注意深く確認する

- **ドキュメント（.github/workflows/README.md）と実際のワークフローファイルの整合性を保つ**
  - ワークフローの「必要な環境変数」セクションに記載されている変数は、すべて実際のワークフローファイルで設定されていることを確認
  - ワークフローファイルで使用している環境変数は、すべてドキュメントに記載されていることを確認

### 環境変数設定のベストプラクティス

- **環境変数は必要なステップすべてに明示的に設定する**
  - 各ステップで明示的に設定することで、どのステップがどの環境変数を使用しているかが明確になる

- ✅ **良い例**: 必要な環境変数がすべてのステップで設定されている

```yaml
- name: Roombaバッテリーをチェック
  env:
    ROOMBA_BLID: ${{ secrets.ROOMBA_BLID }}
    ROOMBA_PASSWORD: ${{ secrets.ROOMBA_PASSWORD }}
    SMTP_SERVER: ${{ secrets.SMTP_SERVER }}
    SMTP_PORT: ${{ secrets.SMTP_PORT }}
    SMTP_USER: ${{ secrets.SMTP_USER }}
    SMTP_PASSWORD: ${{ secrets.SMTP_PASSWORD }}
    NOTIFICATION_EMAIL: ${{ secrets.NOTIFICATION_EMAIL }}
  run: node src/check_battery.js
```

## ワークフロー作成時のチェックリスト

新しいワークフローを作成する際は、以下を確認してください：

- [ ] 各ステップで必要な環境変数がすべて`env:`セクションに設定されているか
- [ ] Secretsを参照する環境変数に設定漏れがないか
- [ ] `.github/workflows/README.md`の「必要な環境変数」セクションが更新されているか

## ワークフロー更新時のチェックリスト

既存のワークフローを更新する際は、以下を確認してください：

- [ ] 新しいステップを追加した場合、必要な環境変数がすべて設定されているか
- [ ] 環境変数を追加・削除した場合、`.github/workflows/README.md`が更新されているか

---

このファイルは Copilot および自動生成ツール向けの GitHub Actions ワークフロー指示です。
