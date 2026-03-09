#!/bin/bash

# Roomba認証情報更新スクリプト
# iRobotアカウントのメールアドレスとパスワードから、最新のBLIDとパスワードを取得して.envファイルを更新します

set -e

echo "=== Roomba認証情報更新ツール ==="
echo ""

# 引数チェック
if [ $# -eq 0 ]; then
  echo "使用方法: $0 <iRobotメールアドレス> [iRobotパスワード]"
  echo ""
  echo "例: $0 your-email@example.com"
  echo "    （パスワードは対話式で入力を求められます）"
  echo ""
  echo "または: $0 your-email@example.com your-password"
  echo "    （パスワードをコマンドラインで指定。シェル履歴に残る可能性があります）"
  echo ""
  echo "注意: このスクリプトはiRobotクラウドアカウントの認証情報を使用してRoombaのBLIDとパスワードを取得します。"
  exit 1
fi

EMAIL="$1"

# パスワードが引数で指定されているかチェック
if [ $# -ge 2 ]; then
  PASSWORD="$2"
  echo "⚠ 警告: パスワードがコマンドライン引数で指定されました。"
  echo "   シェル履歴に残る可能性があります。使用後は 'history -c' でクリアすることを推奨します。"
  echo ""
else
  # 対話式でパスワードを入力
  echo "iRobotアカウントのパスワードを入力してください（入力は表示されません）:"
  read -s PASSWORD
  echo ""
fi

echo "iRobotアカウント: $EMAIL"
echo ""

# Note: npxを使用するため、依存関係のチェックは不要
# npx --yesオプションにより、dorita980パッケージが自動的にダウンロード・実行されます

# get-roomba-password-cloudを実行
echo "🔍 iRobotクラウドからRoomba認証情報を取得中..."
echo ""

# dorita980パッケージのCLIツールを直接使用
echo "認証情報を取得しています..."
echo ""

# npxを使ってget-roomba-password-cloudを実行
# 出力を一時ファイルに保存
TEMP_OUTPUT=$(mktemp)
# スクリプト終了時に一時ファイルを確実にクリーンアップ
trap 'rm -f "$TEMP_OUTPUT"' EXIT
npx --yes --package=dorita980 get-roomba-password-cloud "$EMAIL" "$PASSWORD" > "$TEMP_OUTPUT" 2>&1 || {
  cat "$TEMP_OUTPUT"
  rm -f "$TEMP_OUTPUT"
  echo ""
  echo "エラー: 認証情報の取得に失敗しました。"
  echo ""
  echo "考えられる原因:"
  echo "  - メールアドレスまたはパスワードが正しくない"
  echo "  - iRobotアカウントにRoombaが登録されていない"
  echo "  - ネットワーク接続の問題"
  echo "  - npxの実行に問題がある（Node.jsが正しくインストールされているか確認）"
  echo ""
  exit 1
}

# 出力を表示
cat "$TEMP_OUTPUT"
echo ""

# BLID/パスワード/IPを抽出
# 出力例:
# BLID=> XXXXX
# Password=> :1:1234567:XXXXX <= Yes, all this string.
# IP=> 192.168.1.100
# 注意: Password=>の後ろにコメント（<= Yes, all this string.）が含まれることがあるため、
#       スペースまたは「<=」の前までを抽出する
BLID=$(grep "BLID=>" "$TEMP_OUTPUT" | sed 's/.*BLID=> *//' | sed 's/ *<.*//' | tr -d '\r' | head -1)
ROOMBA_PASSWORD=$(grep "Password=>" "$TEMP_OUTPUT" | sed 's/.*Password=> *//' | sed 's/ *<.*//' | tr -d '\r' | head -1)
ROOMBA_IP=$(grep "IP=>" "$TEMP_OUTPUT" | sed 's/.*IP=> *//' | sed 's/ *<.*//' | tr -d '\r' | head -1)
ROOMBA_NAME=$(grep "Robot Name" "$TEMP_OUTPUT" | sed 's/.*Robot Name: *//' | tr -d '\r' | head -1)

# 一時ファイルを削除
rm -f "$TEMP_OUTPUT"

if [ -z "$BLID" ] || [ -z "$ROOMBA_PASSWORD" ]; then
  echo "エラー: BLIDまたはパスワードの抽出に失敗しました。"
  echo "get-roomba-password-cloudコマンドの出力形式が想定と異なる可能性があります。"
  echo "上記の出力を確認してください。"
  exit 1
fi

# パスワード形式のバリデーション
# Roombaのパスワードは通常 :1:数字:英数字 の形式
if ! echo "$ROOMBA_PASSWORD" | grep -qE '^:1:[0-9]+:[A-Za-z0-9+/=]+$'; then
  echo "⚠ 警告: パスワードの形式が通常と異なります。"
  echo "  抽出されたパスワード: $ROOMBA_PASSWORD"
  echo "  通常のパスワード形式: :1:数字:英数字"
  echo ""
  echo "このまま続行しますが、接続に失敗する可能性があります。"
  echo "もし接続できない場合は、手動で.envファイルを確認してください。"
  echo ""
fi

# .envファイルの更新
ENV_FILE=".env"

echo "📝 .envファイルを更新中..."
echo ""

if [ -f "$ENV_FILE" ]; then
  # 既存の.envファイルをバックアップ
  BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$ENV_FILE" "$BACKUP_FILE"
  echo "既存の.envファイルを $BACKUP_FILE にバックアップしました"
  
  # 既存のROOMBA_BLID, ROOMBA_PASSWORD, ROOMBA_IP、およびRoomba認証情報のコメントを削除
  # .env.exampleとの整合性を保つため、このスクリプトが追加したコメントも削除
  grep -v '^ROOMBA_BLID=' "$ENV_FILE" | \
    grep -v '^ROOMBA_PASSWORD=' | \
    grep -v '^ROOMBA_IP=' | \
    grep -v '^# Roomba認証情報' | \
    grep -v '^# Roomba名: ' > "${ENV_FILE}.tmp" || true
  mv "${ENV_FILE}.tmp" "$ENV_FILE"
else
  echo ".envファイルを新規作成します"
  touch "$ENV_FILE"
fi

# 新しい認証情報を追加
{
  echo ""
  echo "# Roomba認証情報（$(date '+%Y-%m-%d %H:%M:%S')に自動更新）"
  if [ -n "$ROOMBA_NAME" ]; then
    echo "# Roomba名: $ROOMBA_NAME"
  fi
  echo "ROOMBA_BLID=$BLID"
  echo "ROOMBA_PASSWORD=$ROOMBA_PASSWORD"
  if [ -n "$ROOMBA_IP" ]; then
    echo "ROOMBA_IP=$ROOMBA_IP"
  fi
} >> "$ENV_FILE"

echo ""
echo "✓ .envファイルを更新しました！"
echo ""
echo "更新内容:"
echo "  ROOMBA_BLID=$BLID"
if [ -n "$ROOMBA_IP" ]; then
  echo "  ROOMBA_IP=$ROOMBA_IP"
fi
echo ""
echo "注意: パスワードは.envファイルに保存されました（セキュリティのため表示されません）"
echo ""
echo "バッテリーチェックを実行する準備ができました。"
echo "run_local.shを実行してバッテリー残量を確認できます。"
echo ""
