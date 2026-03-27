# Branch Rules — Grace of Touch

## ブランチ構成

| ブランチ | 用途 | デプロイ先 |
|---------|------|----------|
| `main` | 本番 (stable) | grace-of-touch.web.app |
| `develop` | 開発統合 | — |
| `feature/*` | 新機能開発 | — |
| `fix/*` | バグ修正 | — |
| `hotfix/*` | 緊急修正 (mainから分岐→main直マージ) | — |

## ワークフロー

1. 新機能: `main` → `feature/機能名` → 開発 → `main` にマージ
2. バグ修正: `main` → `fix/バグ名` → 修正 → `main` にマージ
3. 緊急: `main` → `hotfix/内容` → 修正 → `main` に直マージ

## コミットメッセージ規約

```
<type>: <summary>

<body (optional)>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `security`

## 自動デプロイ

`main` にpush → GitHub Actions → Firebase Hosting に自動デプロイ
(要: FIREBASE_SERVICE_ACCOUNT シークレット設定)
