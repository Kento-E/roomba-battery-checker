# Cloud API 詳細分析

## 調査結果サマリー

**結論**: dorita980のCloud APIは現在利用不可能であり、代替手段もありません。

## 詳細分析

### 1. dorita980のCloud API実装状況

dorita980ライブラリには2つのCloud APIバージョンがあります：

#### Cloud API v1（実装済みだが動作不可）
- **エンドポイント**: `https://irobot.axeda.com/services/v1/rest/Scripto/execute/AspenApiRequest`
- **状態**: このエンドポイントは2021年頃にAxedaサービス終了に伴い廃止されました
- **DNSルックアップ**: 2026年1月時点で完全に失敗します（ENOTFOUND）
- **利用可能性**: ❌ 利用不可

#### Cloud API v2（未実装）
- **実装状態**: `throw new Error('Not implemented.');` のみ
- **利用可能性**: ❌ 利用不可

### 2. iRobotの新しいCloud API

iRobotは新しいクラウドインフラに移行しました：

- **認証方式**: OAuth2ベース
- **エンドポイント**: `https://irobotapi.com/v2/...` など（推測、公式パートナー向け）
- **要件**: 
  - 公式iRobot Partner API Portal での登録が必要
  - OAuthトークンの取得が必要
  - 一般ユーザー向けには公開されていない

**注**: 具体的なエンドポイントURLは公式パートナー向けドキュメントでのみ提供されています。

**dorita980での対応状況**: ❌ 新しいOAuth2ベースのAPIは未対応

### 3. 利用可能な選択肢

#### オプションA: Local API（現在の実装）
- ✅ dorita980で完全サポート
- ✅ 安定動作
- ❌ **セルフホステッドランナーが必須**
- ❌ AndroidではGitHub Actionsランナーをインストール不可

#### オプションB: 新しいCloud API対応の実装
- ❌ dorita980は未対応
- ❌ OAuth2認証の実装が必要
- ❌ iRobot Partner API へのアクセスが必要（一般には非公開）
- ⚠️ 大規模な開発作業が必要

#### オプションC: 中間サービスの構築
- ローカルネットワーク上のデバイス（Raspberry Piなど）でLocal API経由でRoombaにアクセス
- そのデバイスがHTTP APIを公開
- GitHub ActionsからそのHTTP APIを呼び出す
- ⚠️ インフラ構築が必要

## 制約条件の確認

### ユーザーの環境
1. セルフホステッドランナーを実行できる端末はAndroidのみ
2. AndroidではGitHub Actions Runnerがインストール不可
3. そのため、GitHub hosted runnersから実行する必要がある

### 技術的制約
1. GitHub hosted runnersはローカルネットワークにアクセス不可
2. dorita980のCloud APIは動作しない（エンドポイント廃止）
3. 新しいiRobot Cloud APIへの対応は dorita980 に存在しない

## 結論

**現状では、ご要望の「AndroidのみでGitHub Actionsからバッテリーチェック」を実現する方法はありません。**

理由：
1. Cloud API（irobot.axeda.com）は恒久的に廃止されています
2. 新しいCloud APIはdorita980で未対応
3. Local APIはセルフホステッドランナー必須（Androidは非対応）

## 推奨される解決策

### 短期的解決策
Androidではなく、他のデバイスでセルフホステッドランナーを実行：
- Raspberry Pi
- 古いPC/ノートPC
- NAS（Synology、QNAPなど）

### 長期的解決策
iRobotの新しいOAuth2ベースCloud APIに対応した新しいライブラリの開発：
- dorita980の拡張または新規ライブラリ作成
- iRobot Partner APIへのアクセス権取得が必要
- 大規模な開発作業

## 参考情報

- [dorita980 GitHub](https://github.com/koalazak/dorita980)
- [iRobot Data Security](https://about.irobot.com/legal/data-security)
- [iRobot Partner API Sandbox](https://sandbox.irobot.com/)
