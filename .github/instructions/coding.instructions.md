# Copilot・自動生成ツール向け コーディング指示

このプロジェクトでコードを作成・編集する際は、以下のルールを厳守してください。

## エラーハンドリング

### 必須チェック項目

- **リストや配列へのアクセス前に空チェックを実施**
  - `list[0]`のようなアクセスの前に、必ず`if not list:`または`if len(list) > 0:`でチェック
  - 例: `if devices: first_device = devices[0]`

- **外部API呼び出しは必ずtry-exceptで囲む**
  - ネットワークエラー、認証エラー、タイムアウトなどを考慮
  - 例: `try: response = api.call() except Exception as e: logger.error(f"API error: {e}")`

- **`dict.get()`でデフォルト値を指定し、Noneチェックを追加**
  - `dict.get(key, default_value)`を使用してNone回避
  - 取得後も値が空でないことを確認

- **ファイル・ディレクトリ操作前に存在確認**
  - ディレクトリ作成: `os.makedirs(path, exist_ok=True)`
  - ファイル存在確認: `if os.path.exists(file_path):`

## コード品質

### リンター実行（必須）

**コード変更後は必ずリンターを実行してコミットすること**

```bash
# Pythonの場合
black src/
flake8 src/

# 個別ファイルの場合
black src/check_battery.py
flake8 src/check_battery.py
```

### 基本ルール

- **未使用の変数・importは削除すること**
  - コミット前にリンター（flake8/pylint）を実行して確認

- **変数名は明確に**
  - 目的が分かる名前を使用（例: `battery_level`はバッテリー残量と分かる）

- **コメントは必要に応じて追加**
  - 複雑なロジックには説明コメントを追加
  - 自明なコードには不要

- **機密情報（APIキー、パスワードなど）はコードに含めない**
  - 環境変数やGitHub Secretsを使用
  - `.env`ファイルは`.gitignore`に追加

## 推奨ツール

### リンター・フォーマッター

- **flake8**: Pythonコードの静的解析
- **black**: コードの自動フォーマット

### 使用方法

```bash
# インストール
pip install flake8 black

# 実行
flake8 src/
black src/
```

## チェックリスト

コード作成・変更時は以下を確認：

- [ ] リスト・配列アクセス前に空チェックを実施したか
- [ ] 外部API呼び出しをtry-exceptで囲んだか
- [ ] ファイル・ディレクトリ操作前に存在確認したか
- [ ] 未使用の変数・importを削除したか
- [ ] 変数名は明確か
- [ ] 機密情報をコードに含めていないか
- [ ] リンターでエラーがないか確認したか

---

このファイルは Copilot および自動生成ツール向けのコーディング指示です。
