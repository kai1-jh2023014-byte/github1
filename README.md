# Tetris AI

ブラウザだけで動作するテトリスと、外部ゲーム接続を前提にした **Tetris AI Core** です。人間操作と、盤面評価ベースの AI 自動プレイの両方に対応しています。

## 起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

```bash
npm test      # ユニット / vision PoC / AI シミュレーション
npm run bench # 1-ply vs 2-ply benchmark
npm run build # 本番ビルド
```

## 操作

| キー | 動作 |
| --- | --- |
| ← → | 移動 |
| ↑ / X | 右回転 |
| Z | 左回転 |
| ↓ | ソフトドロップ |
| Space | ハードドロップ |
| P | 一時停止 / 再開 |
| R | リスタート |

AI を ON にすると、探索結果に従って通常の操作（移動・回転・ハードドロップ）で自動プレイします。

## 構成

```
src/
  core/       GameState / Action / Search / Strategy / ControlLoop
  game/       Board, Piece, Collision, LineClear, GameEngine
  ai/         Evaluator, MoveGenerator, Ply search, AIPlayer
  adapters/   BrowserGameAdapter, recording virtual pad
  vision/     Screenshot → board detector (own-game PoC)
  bench/      Seeded multi-game metrics
  ui/         Canvas, HUD, DebugPanel
```

AI Core は `TetrisGameState` を受け取り `TetrisAction` を返します。ブラウザ版は `BrowserGameAdapter` がそれを `GameEngine.input()` に変換します。探索は 1-ply / 2-ply を切り替えできます。

外部ゲーム用の実コントローラ出力は **ローカル / オフライン / 自作ゲーム向けの記録 PoC** です。オンライン対戦・メモリ改変・アンチチート回避は対象外です。

詳細: [docs/architecture.md](docs/architecture.md), [docs/external-connection.md](docs/external-connection.md), [docs/pdca.md](docs/pdca.md)
