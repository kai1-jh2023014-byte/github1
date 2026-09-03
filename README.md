# Tetris AI

ブラウザだけで動作するテトリスです。人間操作と、盤面評価ベースの AI 自動プレイの両方に対応しています。

## 起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

```bash
npm test      # ユニット / AI シミュレーション
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
  game/   Board, Piece, Collision, LineClear, GameEngine
  ai/     MoveGenerator, BoardEvaluator, Search, AIPlayer
  ui/     Canvas 描画とデバッグパネル
```

AI はゲーム状態をワープさせず、`GameEngine.input()` 経由で操作します。探索は 1 手先（1-ply）と、次ピースまで見る 2 手先（2-ply）を切り替えできます。
