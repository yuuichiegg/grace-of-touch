# TrackForge Server Architecture
# Copyright (c) 2026 GRACE OF TOUCH. All rights reserved.

## セキュリティ設計方針

### クライアント側（公開）
- UIシェル（HTML/CSS）
- 基本的なオーディオ再生（Web Audio API）
- ユーザーインタラクション

### サーバー側（Firebase Functions = 非公開）
以下のロジックはすべてサーバー側で処理し、クライアントには結果のみ返す：

1. **認証・認可** (`/api/v1/auth`)
   - Firebase Authentication
   - JWTトークン検証
   - ユーザー権限管理

2. **トラックアップロード** (`/api/v1/tracks/upload`)
   - 署名付きアップロードURL生成（Firebase Storage）
   - 音声ファイルの整合性チェック（SHA-256）
   - メタデータ保存（Firestore）
   - 重複検出

3. **証明書生成** (`/api/v1/certs/generate`)
   - サーバー側秘密鍵による電子署名
   - 証明書のFirestore保存
   - ブロックチェーン風のハッシュチェーン
   - 改ざん検知

4. **証明書検証** (`/api/v1/certs/verify`)
   - 署名検証
   - ハッシュチェーン整合性チェック
   - 公開検証API（第三者が検証可能）

5. **トークン計算** (`/api/v1/tokens/calculate`)
   - 再生回数の正確なカウント（サーバーログベース）
   - 貢献度の計算ロジック
   - 不正再生の検出・排除
   - 収益分配の計算

6. **セッション管理** (`/api/v1/sessions/sync`)
   - リアルタイム同期（Firestore Realtime）
   - コラボレーション権限管理
   - バージョン管理

## Firebase構成

```
firebase/
  functions/          ← 非公開（デプロイ後もコード非公開）
    src/
      auth.ts         ← 認証ロジック
      tracks.ts       ← トラック管理
      certs.ts        ← 証明書生成・署名
      tokens.ts       ← トークン計算・分配
      sessions.ts     ← セッション管理
      middleware/
        rateLimit.ts  ← レート制限
        verify.ts     ← リクエスト検証
    package.json
  firestore.rules     ← セキュリティルール
  storage.rules       ← ストレージルール
  hosting/            ← 公開（UIのみ）
    index.html        ← TrackForge UI
```

## 本番デプロイ時の保護対策

1. **JavaScript難読化**: webpack + terser + obfuscator で圧縮・難読化
2. **ソースマップ非公開**: .map ファイルをデプロイしない
3. **CSP設定**: Content-Security-Policy でXSS防止
4. **CORSポリシー**: 許可ドメインのみAPIアクセス可
5. **Rate Limiting**: Firebase Functions側でレート制限
6. **監査ログ**: 全API呼び出しをCloud Loggingに記録
