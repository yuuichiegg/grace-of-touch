/**
 * TrackForge — Firebase Functions サーバーサイドテンプレート
 * Copyright (c) 2026 GRACE OF TOUCH. All rights reserved.
 *
 * このファイルは本番デプロイ時にFirebase Functionsにデプロイされます。
 * クライアント側からはアクセスできません。
 *
 * ⚠ このファイルは設計テンプレートです。
 *   本番環境では実際のFirebase SDKを使って実装してください。
 */

// import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';
// import * as crypto from 'crypto';
// admin.initializeApp();

// ===== 認証ミドルウェア =====
// async function verifyAuth(req, res, next) {
//   const token = req.headers.authorization?.split('Bearer ')[1];
//   if (!token) return res.status(401).json({ error: 'Unauthorized' });
//   try {
//     const decoded = await admin.auth().verifyIdToken(token);
//     req.user = decoded;
//     next();
//   } catch (e) {
//     return res.status(401).json({ error: 'Invalid token' });
//   }
// }

// ===== 証明書生成（サーバー側署名） =====
// export const generateCertificate = functions.https.onCall(async (data, context) => {
//   if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
//
//   const { sessionId, trackId, instrument } = data;
//
//   // Firestoreからトラック情報を取得
//   const trackDoc = await admin.firestore().doc(`sessions/${sessionId}/tracks/${trackId}`).get();
//   if (!trackDoc.exists) throw new functions.https.HttpsError('not-found', 'トラックが見つかりません');
//
//   const trackData = trackDoc.data();
//
//   // サーバー側で再生回数を正確にカウント（クライアント改ざん防止）
//   const playCount = trackData.playCount || 0;
//
//   // 貢献度計算
//   const sessionTracks = await admin.firestore().collection(`sessions/${sessionId}/tracks`).get();
//   const contribution = Math.round(100 / sessionTracks.size);
//
//   // トークン計算
//   const BASE_TOKENS = 100;
//   const tokens = Math.floor(BASE_TOKENS * playCount * (contribution / 100));
//
//   // SHA-256ハッシュ生成
//   const certData = JSON.stringify({
//     sessionId, trackId, contributor: context.auth.uid,
//     instrument, playCount, contribution, tokens,
//     timestamp: Date.now()
//   });
//   const hash = crypto.createHash('sha256').update(certData).digest('hex');
//
//   // 秘密鍵で署名（サーバーにのみ存在する鍵）
//   // const signature = crypto.sign('sha256', Buffer.from(hash), SERVER_PRIVATE_KEY);
//
//   // Firestoreに保存
//   const cert = {
//     sessionId, trackId,
//     contributor: context.auth.uid,
//     instrument, playCount, contribution, tokens,
//     hash, // signature: signature.toString('base64'),
//     createdAt: admin.firestore.FieldValue.serverTimestamp()
//   };
//   await admin.firestore().collection('certificates').add(cert);
//
//   return cert;
// });

// ===== トークン計算（不正防止） =====
// export const calculateTokens = functions.https.onCall(async (data, context) => {
//   if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '');
//   // サーバーログからの正確な再生回数を使用（クライアント送信値は無視）
//   const { trackId } = data;
//   const playLogs = await admin.firestore()
//     .collection('playLogs')
//     .where('trackId', '==', trackId)
//     .get();
//
//   // ボット再生を除外
//   const validPlays = playLogs.docs.filter(doc => {
//     const d = doc.data();
//     return d.duration > 30 && !d.flaggedAsBot;
//   });
//
//   return { plays: validPlays.length };
// });

// ===== トラックアップロード =====
// export const uploadTrack = functions.https.onCall(async (data, context) => {
//   if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '');
//
//   const { sessionId, trackName, instrument } = data;
//
//   // 署名付きアップロードURL生成（直接Storage操作不可にする）
//   const bucket = admin.storage().bucket();
//   const filePath = `sessions/${sessionId}/tracks/${context.auth.uid}_${Date.now()}.webm`;
//   const [url] = await bucket.file(filePath).getSignedUrl({
//     action: 'write',
//     expires: Date.now() + 15 * 60 * 1000, // 15分有効
//     contentType: 'audio/webm',
//   });
//
//   // Firestoreにトラックメタデータ保存
//   await admin.firestore().collection(`sessions/${sessionId}/tracks`).add({
//     name: trackName,
//     instrument,
//     contributor: context.auth.uid,
//     storagePath: filePath,
//     playCount: 0,
//     createdAt: admin.firestore.FieldValue.serverTimestamp()
//   });
//
//   return { uploadUrl: url };
// });

console.log('TrackForge server template — see comments for Firebase Functions implementation');
