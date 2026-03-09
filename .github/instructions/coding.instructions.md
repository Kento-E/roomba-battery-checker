# Copilot・自動生成ツール向け コーディング指示

このプロジェクトでコードを作成・編集する際は、以下のルールを厳守してください。

## エラーハンドリング

### 必須チェック項目

- **配列へのアクセス前に空チェックを実施**
  - `array[0]`のようなアクセスの前に、必ず`if (!array || array.length === 0)`でチェック
  - 例: `if (devices && devices.length > 0) { const firstDevice = devices[0]; }`

- **外部API呼び出しは必ずtry-catchで囲む**
  - ネットワークエラー、認証エラー、タイムアウトなどを考慮
  - 例: `try { const response = await api.call(); } catch (error) { console.error('API error:', error); }`

- **オブジェクトプロパティアクセスでデフォルト値を指定**
  - オプショナルチェーン（`?.`）とnullish coalescing（`??`）を使用
  - 例: `const value = obj?.property ?? defaultValue;`

- **非同期処理は必ずawaitまたはPromiseチェーンで適切に処理**
  - Promiseベースの処理は必ず完了を待つ
  - 例: `await robot.end();` （`robot.end();`だけでは不完全）

- **ファイル・ディレクトリ操作前に存在確認**
  - ファイル存在確認: `if (fs.existsSync(filePath))`
  - ディレクトリ作成: `fs.mkdirSync(path, { recursive: true })`

## コード品質

### リンター実行（必須）

**コード変更後は必ずリンターを実行してコミットすること**

```bash
# リンター実行（推奨）
npm run lint

# 自動修正（推奨）
npm run lint:fix

# 個別ファイルの場合はnpxで直接実行
npx eslint src/check_battery.js
npx prettier --write src/check_battery.js
```

### 基本ルール

- **未使用の変数・importは削除すること**
  - コミット前にリンター（ESLint）を実行して確認

- **変数名は明確に**
  - 目的が分かる名前を使用（例: `batteryLevel`はバッテリー残量と分かる）
  - camelCaseを使用（JavaScriptの慣習）

- **コメントは必要に応じて追加**
  - 複雑なロジックには説明コメントを追加
  - 自明なコードには不要

- **機密情報（APIキー、パスワードなど）はコードに含めない**
  - 環境変数やGitHub Secretsを使用
  - `.env`ファイルは`.gitignore`に追加

## 推奨ツール

### リンター・フォーマッター

- **ESLint**: JavaScriptコードの静的解析
- **Prettier**: コードの自動フォーマット

### 使用方法

```bash
# インストール
npm install --save-dev eslint prettier

# 実行
npx eslint src/
npx prettier --write src/
```

## チェックリスト

コード作成・変更時は以下を確認：

- [ ] 配列アクセス前に空チェックを実施したか
- [ ] 外部API呼び出しをtry-catchで囲んだか
- [ ] 非同期処理をawaitで適切に待機しているか
- [ ] ファイル・ディレクトリ操作前に存在確認したか
- [ ] 未使用の変数・importを削除したか
- [ ] 変数名は明確か（camelCase使用）
- [ ] 機密情報をコードに含めていないか
- [ ] リンターでエラーがないか確認したか

---

このファイルは Copilot および自動生成ツール向けのコーディング指示です。
