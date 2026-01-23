#!/bin/bash

# Roombaバッテリーチェッカー - ローカル実行スクリプト
# 
# 使い方:
#   1. .envファイルを作成して必要な環境変数を設定
#   2. このスクリプトを実行: ./run_local.sh
#   3. 強制通知オプション（疎通確認用）: ./run_local.sh --force-notification
#
# 注: dotenvパッケージにより、npm run check-batteryは自動的に.envファイルを読み込みます。
#     このスクリプトは.envファイルの存在確認と依存関係のインストールを行います。

set -e

# オプション解析
FORCE_NOTIFICATION=false
if [[ "$1" == "--force-notification" ]] || [[ "$1" == "-f" ]]; then
    FORCE_NOTIFICATION=true
    echo "強制通知モードで実行します（バッテリー残量100%でも通知を送信）"
fi

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
    echo "SEND_TO=notification@email.com"
    echo ""
    exit 1
fi

# 依存関係をインストール（node_modulesがない場合のみ）
if [ ! -d "node_modules" ]; then
    echo "依存関係をインストール中..."
    npm install
fi

# 強制通知フラグを環境変数として設定
export FORCE_NOTIFICATION=$FORCE_NOTIFICATION

# スクリプトを実行（dotenvが自動的に.envファイルを読み込みます）
echo "Roombaバッテリーチェックを実行中..."
if ! npm run check-battery; then
    echo ""
    echo "エラー: バッテリーチェックスクリプトの実行に失敗しました"
    echo "上記のエラーメッセージを確認してください"
    exit 1
fi
