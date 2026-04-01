# GraceVox 知財登録依頼

## 登録日: 2026-03-30

## 知財タイトル
GraceVox - Interim Copy Technology（インテリムコピー技術）

## 知財種別
- **特許候補（Patent）**: インテリム状態での音声テキストクリップボードコピー方式
- **ノウハウ（Know-how）**: 3ソース比較による最適テキスト選択アルゴリズム
- **著作権（Copyright）**: GraceVox アプリケーション全体

## 技術概要
音声認識のinterim（中間結果/未確定）状態でも確実にクリップボードコピーを実現する独自技術。

### 技術的特徴
1. **3ソース比較方式**: スナップショット（停止時点のDOM）/ finalTranscript / DOM現在値の3つから最も長い（完全な）テキストを自動選択
2. **2段階コピー方式**: ユーザージェスチャーコンテキスト内で即座コピー + onend後に最終版で再コピー
3. **iOS Safari クリップボードAPI制限の回避**: execCommand('copy') + Clipboard API の両方を常に実行
4. **interim/final境界でのデータロス防止**: 録音停止時にinterimTranscriptをfinalTranscriptに統合
5. **タイムアウトフォールバック**: onendが発火しない場合の2秒タイムアウト強制実行

### 声紋分析技術
- ピッチ（基本周波数）/ 変動幅 / 音量（RMS）/ スペクトル重心 / 話速
- 基準値との比較による健康状態推定

## 競合にない独自性
- Typeless ($12/月): interim状態でのコピーは未対応、最終文字欠け問題あり
- AquaVoice ($8/月): iOS Safari非対応
- Genspark Speakly: クリップボード自動コピー機能なし

## ファイル
- `public/gracevox.html` — メインアプリケーション
- `public/gracevox-terms.html` — 利用規約
- `public/music/interim_prompt.txt` — 楽曲「Interim」プロンプト

## 権利者
Grace of Touch Co. / 小野﨑 佑一 (Yuuichi Onozaki)

## 商標候補
- GraceVox（グレースボックス）
- Interim Copy（インテリムコピー）
