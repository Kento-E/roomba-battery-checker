# PR #11 に関する訂正

## 概要

PR #11 の説明文に記載された以下の情報について訂正があります：

**元の記載:**
> iRobot Cloud APIエンドポイント（`irobot.axeda.com`）が2024年に恒久廃止されたため、GitHub Actionsで `ENOTFOUND` エラーが発生していた問題に対し...

## 訂正内容

### 不正確だった点

「2024年に恒久廃止された」という表現は時期が不正確でした。実際には2021年頃にAxedaサービス終了に伴い廃止されていました。

### 正確な事実

1. **エラーの実態**: GitHub Actions実行時に `ENOTFOUND irobot.axeda.com` エラーが発生したのは事実
2. **廃止時期**: `irobot.axeda.com` は2021年頃にAxedaサービス終了に伴い恒久廃止されました（2024年ではない）
3. **dorita980の状況**: Cloud APIは完全に利用不可。Local APIのみ動作
4. **新Cloud API**: iRobotは新しいOAuth2ベースのAPIに移行済みですが、dorita980は未対応

### より正確な表現

**推奨される表現:**
> iRobot Cloud APIエンドポイント（`irobot.axeda.com`）は2021年頃にAxedaサービス終了に伴い恒久廃止されており、GitHub Actionsでの実行時に `ENOTFOUND` エラーが発生します。dorita980のCloud APIは完全に利用不可能な状態のため、Local APIへの移行を実施しました。なお、新しいOAuth2ベースのCloud APIが存在しますが、dorita980は未対応です。

## PR #11 で実施された変更の価値

この訂正は、PR #11 で実施された変更の価値を損なうものではありません：

### 変更の正当性

1. **問題解決**: Cloud APIへの接続エラーを解決し、ツールを動作可能な状態にした ✓
2. **将来のリスク軽減**: iRobot社の不安定な財務状況を考慮し、クラウドサービスへの依存を減らした ✓
3. **技術的優位性**: Local APIによる高速・安定・プライバシー保護を実現した ✓

### 改善が必要だった点

- **情報の正確性**: 廃止時期を「2024年」と記載したが、実際は「2021年頃」でした
- **調査の深さ**: dorita980のCloud API実装状況を詳細に調査すべきでした

## 追加調査結果

### dorita980のCloud API詳細

詳細な調査により、以下が判明しました：

1. **Cloud API v1**: `irobot.axeda.com` を使用（2021年頃に廃止）
2. **Cloud API v2**: 未実装（`throw new Error('Not implemented.')`）
3. **新Cloud API**: OAuth2ベース（dorita980は未対応）

詳細は [cloud-api-analysis.md](cloud-api-analysis.md) を参照してください。

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
