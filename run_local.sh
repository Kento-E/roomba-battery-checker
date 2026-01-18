#!/bin/bash

# Roombaバッテリーチェッカー - ローカル実行スクリプト
# 
# 使い方:
#   1. .envファイルを作成して必要な環境変数を設定
#   2. このスクリプトを実行: ./run_local.sh

set -e

# .envファイルが存在するかチェック
if [ ! -f .env ]; then
    echo "エラー: .envファイルが見つかりません"
    echo ""
    echo ".envファイルを作成して以下の環境変数を設定してください:"
    echo ""
    echo "ROOMBA_BLID=your_blid"
    echo "ROOMBA_PASSWORD=your_password"
    echo "SMTP_SERVER=smtp.gmail.com"
    echo "SMTP_PORT=587"
    echo "SMTP_USER=smtp_user"
    echo "SMTP_PASSWORD=smtp_password"
    echo "NOTIFICATION_EMAIL=notification@email.com"
    echo ""
    exit 1
fi

# .envファイルから環境変数を読み込む
echo "環境変数を.envから読み込み中..."
set -a
. .env
set +a

# 依存関係をインストール（node_modulesがない場合のみ）
if [ ! -d "node_modules" ]; then
    echo "依存関係をインストール中..."
    npm install
fi

# スクリプトを実行
echo "Roombaバッテリーチェックを実行中..."
npm run check-battery
