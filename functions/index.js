const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const stripe = require("stripe")(
  functions.config().stripe?.secret || process.env.STRIPE_SECRET_KEY
);

const PRICE_ID = functions.config().stripe?.price_id || process.env.STRIPE_PRICE_ID;
const WEBHOOK_SECRET = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = "https://grace-of-touch.web.app";

// ============================================================
// AI Proofreading Engine (Patent Pending — Server-side only)
// © 2024-2026 Grace of Touch Co. All rights reserved.
// ============================================================

// Proper name corrections (voice recognition misrecognitions)
const PROPER_NAMES = [
  [/グレイスボックス|グレースボックス|グレイスボイス/g, 'GraceVox'],
  [/グレースオブタッチ|グレイスオブタッチ|プレイスボックス|ブレースボックス|ブレスオブタッチ|グライスオブタッチ/g, 'Grace of Touch'],
  [/トラックフォン[ジズ]?|トラックホン[ジズ]?|トラックフォルジュ/g, 'TrackForge'],
  [/トンネルスキャン/g, 'TunnelScan'],
  [/ウォールガード/g, 'WallGuard'],
  [/メガロケット/g, 'Mega Rocket'],
  [/ドリームオン/g, 'Dream On'],
  [/ファイアーベース|ファイヤーベース/g, 'Firebase'],
  [/クロードコード|クロウドコード/g, 'Claude Code'],
  [/クロード(?=で|に|が|は|の|を)/g, 'Claude'],
  [/ジェミニ/g, 'Gemini'],
  [/スペースエックス/g, 'SpaceX'],
  [/ギットハブ|ギッドハブ/g, 'GitHub'],
  [/リアクト/g, 'React'],
  [/スリージェーエス|スリーJS/g, 'Three.js'],
  [/テイルウィンド/g, 'Tailwind'],
  [/レコーズ(?=で|に|が|は|の|を|ページ)/g, 'Records'],
  [/グレースオブタッチレコーズ|グレイスオブタッチレコーズ/g, 'Grace of Touch Records'],
  [/ドローンガード/g, 'DroneGuard'],
  [/トンネルドローン/g, 'TunnelDrone'],
  [/パンダワールド/g, 'Panda World'],
  [/ロケットキャド|ロケットカド/g, 'RocketCAD'],
  [/エッグビレッジ/g, 'Egg Village'],
  [/アンチグラビティ|アンチグウラビティ/g, 'Antigravity'],
  [/プレイライト/g, 'Playwright'],
  [/タイプスクリプト/g, 'TypeScript'],
  [/ジャバスクリプト/g, 'JavaScript'],
  [/ファイアストア/g, 'Firestore'],
  [/ブレンダー(?=で|に|が|は|の|を|MCP)/g, 'Blender'],
  [/オブシディアン/g, 'Obsidian'],
  [/ノーション/g, 'Notion'],
];

// Homophone corrections (context-aware)
const HOMOPHONES = [
  [/正門/g, '声紋'],
  [/専門(?=の|が|は|を|で|ビジュアライザー|表示|分析)/g, '声紋'],
  [/感じの変換/g, '漢字の変換'],
  [/変換した感じ/g, '変換した漢字'],
  [/番組があります/g, '場合があります'],
];

// Server-side proofread function
function serverProofread(text) {
  let r = text;
  const corrections = [];

  PROPER_NAMES.forEach(([pattern, replacement]) => {
    r = r.replace(pattern, (match) => {
      if (match !== replacement) corrections.push({ orig: match, corrected: replacement });
      return replacement;
    });
  });

  HOMOPHONES.forEach(([pattern, replacement]) => {
    r = r.replace(pattern, (match) => {
      if (match !== replacement) corrections.push({ orig: match, corrected: replacement });
      return replacement;
    });
  });

  // Duplicate particles removal
  r = r.replace(/([をにがはで])([をにがはで])\1/g, '$1$2');

  return { text: r, corrections };
}

// ============================================================
// Interim Copy Technology (Patent Pending — Server-side only)
// © 2024-2026 Grace of Touch Co. All rights reserved.
// ============================================================

// Japanese filler words for removal
const FILLERS_JA = ['えーと','えっと','あのー','あの','えー','ええと','まあ','そのー','その','なんか','こう','ほら','ね','さ','うーん','うん','ああ','あー'];

// Similarity detection for retake/correction (言い直し検出)
function isSimilar(a, b) {
  if (!a || !b) return false;
  const na = a.replace(/[。、！？\s]/g, ''), nb = b.replace(/[。、！？\s]/g, '');
  if (na.length < 2 || nb.length < 2) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  let prefixMatch = 0;
  for (let i = 0; i < Math.min(na.length, nb.length); i++) {
    if (na[i] === nb[i]) prefixMatch++; else break;
  }
  if (prefixMatch >= 3 && prefixMatch / Math.max(na.length, nb.length) > 0.4) return true;
  let common = 0;
  const shorter = na.length <= nb.length ? na : nb, longer = na.length > nb.length ? na : nb;
  const used = new Set();
  for (let i = 0; i < shorter.length; i++) {
    const idx = longer.indexOf(shorter[i], 0);
    if (idx !== -1 && !used.has(idx)) { common++; used.add(idx); }
  }
  return common / Math.max(na.length, nb.length) > 0.5;
}

// Server-side text cleaning (filler removal + proofreading)
function serverClean(text, options = {}) {
  let r = text;
  // Filler removal
  if (options.removeFiller !== false) {
    FILLERS_JA.forEach(f => {
      r = r.replace(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    });
  }
  // Apply proofreading
  const proofResult = serverProofread(r);
  r = proofResult.text;
  // Clean up whitespace
  r = r.replace(/\s{2,}/g, ' ').trim();
  return { text: r, corrections: proofResult.corrections };
}

// Cloud Function: Interim Copy Processing API
exports.interimProcess = functions.https.onCall(async (data, context) => {
  const { text, sentences, lang, options } = data;
  if (!text || typeof text !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "text is required");
  }
  if (text.length > 10000) {
    throw new functions.https.HttpsError("invalid-argument", "text too long (max 10000)");
  }
  if (lang && !lang.startsWith("ja")) {
    return { text, sentences: sentences || [], corrections: [] };
  }

  // Clean and proofread the new text
  const cleaned = serverClean(text, options || {});

  // Retake detection: compare against existing sentences
  const resultSentences = Array.isArray(sentences) ? [...sentences] : [];
  if (options && options.smartCorrection !== false && resultSentences.length > 0) {
    const lastIdx = resultSentences.length - 1;
    if (isSimilar(resultSentences[lastIdx], cleaned.text)) {
      resultSentences[lastIdx] = cleaned.text; // Replace with retake
    } else if (resultSentences.length > 1 && isSimilar(resultSentences[lastIdx - 1], cleaned.text)) {
      resultSentences[lastIdx - 1] = cleaned.text;
      resultSentences.splice(lastIdx, 1);
    } else {
      resultSentences.push(cleaned.text);
    }
  } else {
    resultSentences.push(cleaned.text);
  }

  return {
    text: cleaned.text,
    sentences: resultSentences,
    finalTranscript: resultSentences.join(''),
    corrections: cleaned.corrections,
  };
});

// Cloud Function: AI Proofreading API
exports.proofread = functions.https.onCall(async (data, context) => {
  const { text, lang } = data;
  if (!text || typeof text !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "text is required");
  }
  if (text.length > 10000) {
    throw new functions.https.HttpsError("invalid-argument", "text too long (max 10000)");
  }
  // Only Japanese proofreading for now
  if (lang && !lang.startsWith("ja")) {
    return { text, corrections: [] };
  }
  return serverProofread(text);
});

// Create Stripe Checkout Session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "ログインが必要です");
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email || "";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    metadata: { firebaseUID: uid },
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/gracevox.html?payment=success`,
    cancel_url: `${APP_URL}/gracevox.html?payment=cancel`,
    locale: "ja",
  });

  return { url: session.url };
});

// Stripe Webhook — subscription lifecycle
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const db = admin.firestore();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const uid = session.metadata?.firebaseUID;
      if (!uid) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const periodEnd = new Date(subscription.current_period_end * 1000);

      await db.collection("subscriptions").doc(uid).set({
        plan: "pro",
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        expiresAt: admin.firestore.Timestamp.fromDate(periodEnd),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`Pro activated for ${uid} until ${periodEnd.toISOString()}`);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const uid = sub.metadata?.firebaseUID;
      if (!uid) break;

      const periodEnd = new Date(sub.current_period_end * 1000);
      await db.collection("subscriptions").doc(uid).set({
        plan: "pro",
        expiresAt: admin.firestore.Timestamp.fromDate(periodEnd),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const uid = sub.metadata?.firebaseUID;
      if (!uid) break;

      await db.collection("subscriptions").doc(uid).set({
        plan: "free",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`Pro deactivated for ${uid}`);
      break;
    }
  }

  res.json({ received: true });
});
