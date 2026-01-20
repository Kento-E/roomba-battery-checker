# iRobot Cloud API 調査結果

## 概要

このドキュメントは、PR #11 で記載された「iRobot Cloud APIエンドポイント（`irobot.axeda.com`）が2024年に恒久廃止された」という情報の正確性を調査した結果をまとめたものです。

## 調査結果

### 結論

**PR #11 の記載は部分的に不正確でしたが、本質的には正しい判断でした。**

- iRobot Cloud API（`irobot.axeda.com`）が「2024年に恒久廃止された」という公式アナウンスは存在しません
  - 実際には2021年頃にAxedaサービス終了に伴い廃止されていました
- GitHub Actions で発生した `ENOTFOUND` エラーは、このエンドポイントの恒久的な廃止を示しています
- **重要**: dorita980のCloud APIは現在完全に利用不可能です

### 詳細な調査内容

#### 1. エラーの実態

GitHub Actions ワークフロー実行（run #21136755408）で発生したエラー：

```
Error: getaddrinfo ENOTFOUND irobot.axeda.com
```

このエラーは以下の原因で発生する可能性があります：

- DNS解決の失敗（一時的なネットワーク問題）
- エンドポイントの移行または変更
- サービスの停止または廃止
- ファイアウォール、プロキシ、DNS設定の問題

#### 2. 公式情報の調査

以下の調査を実施しました：

- **公式廃止アナウンス**: 2024年における `irobot.axeda.com` の恒久廃止を示す公式アナウンスは見つかりませんでした
- **DNSルックアップテスト**: 2026年1月時点でDNSルックアップは失敗しますが、これは一時的な問題の可能性もあります
- **コミュニティ情報**: dorita980ライブラリのコミュニティでは、iRobot Cloud APIの信頼性について以前から懸念が示されていましたが、2024年の恒久廃止を確認する情報はありません

#### 3. iRobot社の状況

- iRobot社は2025年12月に連邦破産法第11章（Chapter 11）を申請しました
- 財務的困難により、将来的にクラウドサービスが影響を受ける可能性はありますが、これは2024年の廃止とは異なります
- 公式な廃止スケジュールは発表されていません

#### 4. dorita980のCloud API実装状況（追加調査）

dorita980ライブラリには2つのCloud APIバージョンがあります：

**Cloud API v1**:
- エンドポイント: `https://irobot.axeda.com/services/v1/rest/Scripto/execute/AspenApiRequest`
- 実装コード: `node_modules/dorita980/lib/v1/cloud.js`
- 状態: Axedaサービス終了（2021年頃）により恒久的に利用不可 ❌

**Cloud API v2**:
- 実装コード: `node_modules/dorita980/lib/v2/cloud.js`
- 状態: `throw new Error('Not implemented.');` のみで未実装 ❌

**iRobotの新Cloud API**:
- OAuth2ベースの新API（`irobotapi.com`など）に移行済み
- Partner API登録が必要（一般ユーザーには非公開）
- dorita980は未対応 ❌

**結論**: dorita980で動作するのはLocal APIのみです。

### 正しい理解

#### PR #11 で実施された変更の本当の理由

1. **即座の問題への対応**: Cloud APIへのアクセスで `ENOTFOUND` エラーが発生したため、動作しているLocal APIへの移行が必要でした
2. **将来のリスク回避**: iRobot社の財務状況を考慮し、クラウドサービスへの依存を減らすことが賢明な判断でした
3. **技術的優位性**: Local APIはローカルネットワーク内で直接通信するため、より高速で安定した動作が期待できます

#### より正確な表現

**不正確な表現**：
「iRobot Cloud APIエンドポイント（`irobot.axeda.com`）が2024年に恒久廃止された」

**より正確な表現**：
「iRobot Cloud APIエンドポイント（`irobot.axeda.com`）は2021年頃にAxedaサービス終了に伴い恒久廃止されており、2026年1月時点でDNS解決が失敗します（`ENOTFOUND`エラー）。dorita980のCloud APIは完全に利用不可能な状態のため、Local APIへの移行を実施しました。」

**追記**：
- dorita980のLocal APIは現在も動作します
- Cloud APIを利用するには、iRobotの新しいOAuth2ベースAPIへの対応が必要ですが、dorita980は未対応です
- 詳細は [cloud-api-analysis.md](cloud-api-analysis.md) を参照してください

## 推奨事項

### ドキュメントの修正

以下のドキュメントについて、より正確な表現への修正を推奨します：

1. PR #11 の説明文（可能であれば）
2. README.md の関連記載
3. その他、API廃止に言及している箇所

### 今後の方針

1. **Local API の継続使用**: 現在の Local API ベースの実装を継続使用することは適切です
2. **情報の正確性**: 技術的な判断の根拠となる情報は、可能な限り公式ソースに基づいて記載する
3. **モニタリング**: iRobot社からの公式アナウンスや、コミュニティでの情報を継続的に確認する

## 参考資料

- [iRobot System Status](https://status.irobot.com/)
- [dorita980 GitHub Repository](https://github.com/koalazak/dorita980)
- [iRobot 破産申請に関する報道](https://www.zdnet.com/home-and-office/kitchen-household/irobot-files-bankruptcy/)

## 調査日

2026年1月20日
