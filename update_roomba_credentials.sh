#!/bin/bash

# Roomba認証情報更新スクリプト
# iRobotアカウントのメールアドレスとパスワードから、最新のBLIDとパスワードを取得して.envファイルを更新します

set -e

echo "=== Roomba認証情報更新ツール ==="
echo ""

# 引数チェック
if [ $# -ne 2 ]; then
  echo "使用方法: $0 <iRobotメールアドレス> <iRobotパスワード>"
  echo ""
  echo "例: $0 your-email@example.com your-password"
  echo ""
  echo "注意: このスクリプトはiRobotクラウドアカウントの認証情報を使用してRoombaのBLIDとパスワードを取得します。"
  exit 1
fi

EMAIL="$1"
PASSWORD="$2"

echo "iRobotアカウント: $EMAIL"
echo ""

# 依存関係のチェックとインストール
if [ ! -d "node_modules" ] || [ ! -d "node_modules/dorita980" ]; then
  echo "📦 依存関係をインストール中..."
  npm install
  echo ""
fi

# get-roomba-password-cloudを実行
echo "🔍 iRobotクラウドからRoomba認証情報を取得中..."
echo ""

# 一時ファイルにスクリプトを作成
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << 'EOF'
const getPassword = require('dorita980').getPassword;

const email = process.argv[2];
const password = process.argv[3];

console.log('認証情報を取得しています...');

getPassword(email, password).then((robotData) => {
  if (!robotData || robotData.length === 0) {
    console.error('エラー: Roombaが見つかりませんでした。');
    console.error('アカウントにRoombaが登録されているか確認してください。');
    process.exit(1);
  }

  // 最初のRoombaの情報を使用
  const robot = robotData[0];
  
  console.log('');
  console.log('✓ Roomba認証情報を取得しました！');
  console.log('');
  console.log('Roomba名: ' + (robot.robotname || '(未設定)'));
  console.log('BLID: ' + robot.blid);
  console.log('パスワード: ' + robot.password);
  console.log('IP: ' + (robot.ip || '(自動検出)'));
  console.log('');
  
  // JSON形式で出力（シェルスクリプトから解析しやすくするため）
  console.log('__JSON_START__');
  console.log(JSON.stringify({
    blid: robot.blid,
    password: robot.password,
    ip: robot.ip || '',
    name: robot.robotname || ''
  }));
  console.log('__JSON_END__');
}).catch((err) => {
  console.error('');
  console.error('エラー: 認証情報の取得に失敗しました。');
  console.error('');
  console.error('詳細: ' + err.message);
  console.error('');
  console.error('考えられる原因:');
  console.error('  - メールアドレスまたはパスワードが正しくない');
  console.error('  - iRobotアカウントにRoombaが登録されていない');
  console.error('  - ネットワーク接続の問題');
  console.error('');
  process.exit(1);
});
EOF

# Node.jsスクリプトを実行して結果を取得
OUTPUT=$(node "$TEMP_SCRIPT" "$EMAIL" "$PASSWORD" 2>&1) || {
  echo "$OUTPUT"
  rm -f "$TEMP_SCRIPT"
  exit 1
}

# 一時ファイルを削除
rm -f "$TEMP_SCRIPT"

# JSON部分を抽出
JSON_DATA=$(echo "$OUTPUT" | sed -n '/__JSON_START__/,/__JSON_END__/p' | grep -v '__JSON_' || echo "")

if [ -z "$JSON_DATA" ]; then
  echo "$OUTPUT"
  echo ""
  echo "エラー: 認証情報の解析に失敗しました。"
  exit 1
fi

# JSON以外の部分（ログ）を表示
echo "$OUTPUT" | grep -v '__JSON_START__' | grep -v '__JSON_END__' | grep -v '^{' | grep -v '^}' || true
echo ""

# JSONから値を抽出（jqがあれば使用、なければシンプルなgrep）
if command -v jq &> /dev/null; then
  BLID=$(echo "$JSON_DATA" | jq -r '.blid')
  ROOMBA_PASSWORD=$(echo "$JSON_DATA" | jq -r '.password')
  ROOMBA_IP=$(echo "$JSON_DATA" | jq -r '.ip')
  ROOMBA_NAME=$(echo "$JSON_DATA" | jq -r '.name')
else
  BLID=$(echo "$JSON_DATA" | grep -o '"blid":"[^"]*"' | cut -d'"' -f4)
  ROOMBA_PASSWORD=$(echo "$JSON_DATA" | grep -o '"password":"[^"]*"' | cut -d'"' -f4)
  ROOMBA_IP=$(echo "$JSON_DATA" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
  ROOMBA_NAME=$(echo "$JSON_DATA" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$BLID" ] || [ -z "$ROOMBA_PASSWORD" ]; then
  echo "エラー: BLIDまたはパスワードの抽出に失敗しました。"
  exit 1
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
  
  # 既存のROOMBA_BLID, ROOMBA_PASSWORD, ROOMBA_IPを削除
  grep -v '^ROOMBA_BLID=' "$ENV_FILE" | grep -v '^ROOMBA_PASSWORD=' | grep -v '^ROOMBA_IP=' > "${ENV_FILE}.tmp" || true
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
echo "  ROOMBA_PASSWORD=$ROOMBA_PASSWORD"
if [ -n "$ROOMBA_IP" ]; then
  echo "  ROOMBA_IP=$ROOMBA_IP"
fi
echo ""
echo "バッテリーチェックを実行する準備ができました。"
echo "run_local.shを実行してバッテリー残量を確認できます。"
echo ""
