# PR #11 に関する訂正

## 概要

PR #11 の説明文に記載された以下の情報について訂正があります：

**元の記載:**
> iRobot Cloud APIエンドポイント（`irobot.axeda.com`）が2024年に恒久廃止されたため、GitHub Actionsで `ENOTFOUND` エラーが発生していた問題に対し...

## 訂正内容

### 不正確だった点

「2024年に恒久廃止された」という表現は **事実に基づかない推測** でした。

### 正確な事実

1. **エラーの実態**: GitHub Actions実行時に `ENOTFOUND irobot.axeda.com` エラーが発生したのは事実
2. **公式アナウンスの不在**: iRobot社から `irobot.axeda.com` エンドポイントの2024年廃止に関する公式アナウンスは確認できませんでした
3. **DNSエラーの原因**: DNSルックアップの失敗は、恒久的な廃止以外にも以下の原因が考えられます：
   - 一時的なネットワーク問題
   - エンドポイントの移行
   - DNS設定の問題
   - サービスの一時停止

### より正確な表現

**推奨される表現:**
> iRobot Cloud APIエンドポイント（`irobot.axeda.com`）への接続時に `ENOTFOUND` エラーが発生し、GitHub Actionsでの実行が不可能な状態となったため、Local APIへの移行を実施しました。なお、iRobot社の財務状況（2025年12月に連邦破産法第11章を申請）を考慮すると、将来的にクラウドサービスの継続性に不確実性があります。

## PR #11 で実施された変更の価値

この訂正は、PR #11 で実施された変更の価値を損なうものではありません：

### 変更の正当性

1. **問題解決**: Cloud APIへの接続エラーを解決し、ツールを動作可能な状態にした ✓
2. **将来のリスク軽減**: iRobot社の不安定な財務状況を考慮し、クラウドサービスへの依存を減らした ✓
3. **技術的優位性**: Local APIによる高速・安定・プライバシー保護を実現した ✓

### 改善が必要だった点

- **情報の正確性**: 技術的な判断の根拠を公式情報に基づいて記載すべきでした
- **推測の明示**: 確認できていない情報を事実として記載すべきではありませんでした

## 今後の対応

この訂正を受けて、以下のドキュメントが更新されました：

1. ✓ `docs/irobot-cloud-api-investigation.md` - 詳細な調査結果
2. ✓ `README.md` - Local API使用理由の正確な説明
3. ✓ `docs/PR-11-CORRECTION.md` - このドキュメント（PR #11への訂正）

## 参考資料

- [iRobot Cloud API 調査結果](irobot-cloud-api-investigation.md)
- [PR #11](https://github.com/Kento-E/roomba-battery-checker/pull/11)
- [Workflow Run #21136755408](https://github.com/Kento-E/roomba-battery-checker/actions/runs/21136755408)

---

**作成日**: 2026年1月20日
**作成理由**: Issue でPR #11の記載内容の正確性について指摘があったため
