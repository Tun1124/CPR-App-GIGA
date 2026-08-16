# CREDITS（使用素材とライセンス）

本アプリは事業計画に基づき、研究終了後に**全国の教育機関・消防機関へ無償提供（オープンアクセス化）**する
ことを前提としている。そのため再配布の自由度が高いライセンスのみを採用する。

## 採用方針

- **CC0 / OFL / MIT / Apache-2.0 のみ**を使用する
- **CC BY-SA・非商用（NC）系は採用しない**（再配布・自治体利用で制約が生じるため）
- 既存ゲーム・アニメ等のキャラクター、UI画像、音源は**一切使用しない**
  （参考にするのは配色や画面構成といった「作風」までに留める）
- 効果音は Web Audio API による合成音を優先し、外部素材への依存を減らす

---

## フォント

| 名称 | 用途 | 入手元 | ライセンス | 取得日 |
|---|---|---|---|---|
| Dela Gothic One | 見出し・掛け声（SCORE / COMBO / 判定） | https://fonts.google.com/specimen/Dela+Gothic+One | SIL Open Font License 1.1 | 2026-08-16 |
| Noto Sans JP | 本文・UI | https://fonts.google.com/noto/specimen/Noto+Sans+JP | SIL Open Font License 1.1 | 2026-08-16 |
| Roboto Mono | 計測値・ラベル（TEMPO / TIME / 内訳） | https://fonts.google.com/specimen/Roboto+Mono | Apache License 2.0 | 2026-08-17 |

いずれも Google Fonts 経由で読み込み（`index.html`）。商用利用可・再配布可。

---

## アイコン

| 名称 | 用途 | 入手元 | ライセンス |
|---|---|---|---|
| Lucide | アプリ全体のアイコン | https://lucide.dev/ | ISC License |

`lucide-react` パッケージとして `package.json` に記載。

---

## 効果音

| 名称 | 用途 | 出典 | ライセンス |
|---|---|---|---|
| （自作・合成音） | 打撃音・サイレン・RUSH音・カウントダウン | `src/utils/sound.js` | 本プロジェクトのコードとして自作 |

Web Audio API の `OscillatorNode` で生成しており、**外部音源ファイルは使用していない**。

---

## ライブラリ

| 名称 | 用途 | ライセンス |
|---|---|---|
| React | UI フレームワーク | MIT |
| Vite | ビルドツール | MIT |
| react-router-dom | 画面遷移 | MIT |
| @mediapipe/tasks-vision | 姿勢推定（Pose Landmarker） | Apache-2.0 |
| framer-motion | アニメーション | MIT |
| canvas-confetti | 紙吹雪演出 | ISC |

---

## 未使用（検討したが採用しなかったもの）

| 名称 | 不採用の理由 |
|---|---|
| Kenney.nl（CC0 ゲームUI素材） | 現時点では CSS と合成音のみで表現できているため未使用。今後 UI 画像やパーティクル画像が必要になった場合は CC0 のため採用可 |
| いらすとや | 商用利用時に点数制限があり、全国無償提供の方針と合わないため不採用 |

---

## 素材を追加するときの手順

1. ライセンスが **CC0 / OFL / MIT / Apache-2.0** のいずれかであることを確認する
2. 本ファイルの該当表に「名称・用途・入手元URL・ライセンス・取得日」を追記する
3. ライセンス全文の同梱が必要な素材（OFL 等）は `public/licenses/` に配置する
