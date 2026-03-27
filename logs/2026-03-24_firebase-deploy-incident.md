# Firebaseデプロイ障害ログ（2026-03-24）

## 事象
- デモ公開用URLで以下エラーが発生:
  - `Page Not Found`
  - `This file does not exist and there was no index.html found in the current directory`
- 併せてFirestoreで `permission-denied` が発生。

## 影響
- 本番相当のURLでアプリを表示できず、デモ準備が一時停止。
- Marketplace関連機能でデータ読取が失敗。

## 原因（一次切り分け）
1. Hostingの公開ディレクトリ配下にルート `index.html` が無い状態でアクセスされた可能性。
2. `public/propanota/index.html` は存在していても、ルート (`/`) へのアクセスでは404になる。
3. Firestoreルールが認証必須のため、未ログイン時の `apps` 監視が拒否された。

## 実施対応
1. Firestoreルール修正:
   - `apps` コレクションは `status == "published"` の読取を未認証でも許可。
   - 書込は認証必須のまま維持。
2. ルール再デプロイ:
   - `npx firebase deploy --only firestore:rules`
   - デプロイ成功を確認。
3. Hosting側は `firebase.json` の `public: "public"` を確認済み。

## 未了タスク（再発防止）
- Hostingルートで表示する `public/index.html` を確実に配置する。
- 必要なら `firebase.json` にリライトルールを追加（`/propanota/**` など）。
- デプロイ後の確認項目をチェックリスト化:
  - `/` と `/propanota/` の両方で表示確認
  - 未ログイン時の Marketplace 読取確認
  - ブラウザハードリロードでキャッシュ影響排除

## 次回運用メモ
- 「単体HTMLをサブディレクトリ配下に置く」運用時は、ルート導線を先に作る。
- Firestoreで公開コンテンツを扱う場合、未認証読取の範囲を先に設計する。
