# assets/ — eVTOL 3D モデル配置フォルダ

このフォルダに eVTOL 機体の `.glb` ファイルを配置してください。
大容量バイナリのため `.glb` / `.gltf` ファイルは `.gitignore` で Git 管理から除外されています。

---

## 配置するファイル

| ファイル名 | 機体 | 入手元 |
|-----------|------|-------|
| `joby.glb` | Joby S4 | Sketchfab / CGTrader など |
| `skydrive.glb` | SkyDrive SD-05 | CGTrader など |

---

## Blender エクスポート設定

AR で正しく表示するには、以下の設定でエクスポートしてください。

### 1. ポリゴン削減（Decimate）
```
モデル選択 → 右クリック → Decimate Geometry
Ratio: 0.3〜0.5（面数を50〜70%削減）
```

### 2. マテリアル
- Base Color のみ設定（テクスチャなしでも可）
- AR 表示向けにシンプルな PBR マテリアルを推奨

### 3. ローターアニメーション
アニメーション名を必ず **`RotorSpin`** にすること。

```
ローターオブジェクト選択 → I キー → Rotation（フレーム 1）
フレーム 30 へ移動 → Z 軸 360° 回転 → I キー
アクション名: RotorSpin
```

### 4. glTF Binary エクスポート
```
File → Export → glTF 2.0
Format: glTF Binary (.glb)
✅ Include: Selected Objects
✅ Animations
出力先: ./assets/joby.glb  または  ./assets/skydrive.glb
```

### 推奨設定

| 項目 | 推奨値 | 理由 |
|------|--------|------|
| ファイルサイズ | 15 MB 以下 | モバイル AR の読み込み速度 |
| 頂点数 | 10,000 以下 | AR レンダリング負荷軽減 |
| テクスチャ解像度 | 最大 1024×1024 px | モバイル VRAM 節約 |
| Draco 圧縮 | 有効（推奨） | ファイルサイズ削減 |

> **Note:** Draco 圧縮を使用する場合、`model-viewer` は自動的にデコードするため追加設定不要です。

---

## 動作確認

`.glb` を配置後、ローカルサーバーで `evtol-ar-viewer.html` を開いてください。

```bash
# Python の簡易 HTTP サーバー例
python3 -m http.server 8080
# → http://localhost:8080/evtol-ar-viewer.html
```

> ファイルを直接ブラウザで開く（`file://` プロトコル）と、`<model-viewer>` が CORS 制約により `.glb` を読み込めない場合があります。

---

## WebXR / AR 動作要件

| 環境 | AR モード | 備考 |
|------|-----------|------|
| Android Chrome 81+ | WebXR Scene Viewer | 推奨 |
| iOS Safari 15+ | Quick Look | `.usdz` への自動変換は非対応のため `.glb` のまま表示 |
| PC Chrome / Firefox | 3D 表示のみ | AR ボタンは非表示になります |

AR 機能には **HTTPS** が必須です。GitHub Pages はデフォルト HTTPS なので追加設定は不要です。
