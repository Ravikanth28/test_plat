# LocalMart — Native App Plan (True Closed-App Voice Alerts)

This document explains **why spoken voice alerts do not work while the web/PWA app
is closed**, and the concrete path to achieve them using **Capacitor** to wrap the
existing React app into a native Android (and later iOS) app.

---

## 1. The problem we are solving

| Scenario | Web / PWA today | Goal |
|---|---|---|
| App **open & focused** | ✅ In-app toast + chime + **spoken voice** (Web Speech API) | keep |
| App **backgrounded / closed** | ⚠️ OS notification banner + OS default sound only — **no custom voice** | ✅ spoken voice |

**Why the closed-app case cannot speak on the web:** a Web Push notification is
handled by the **service worker**, which has no audio output and no access to
`speechSynthesis`. It may only call `showNotification()` (a visual banner + the
OS's own notification sound). There is no web API that lets a closed page play
custom audio or speak. This is a platform limitation, not a code bug.

**The only real fix** is a native app with a background-capable component that can
run text‑to‑speech (TTS) when a push arrives. Capacitor lets us do this while
**reusing 100% of the current React UI**.

---

## 2. Recommended architecture (Capacitor)

```
React app (client/) ──build──> dist/ ──Capacitor──> Android WebView shell
                                                      │
                                                      ├─ @capacitor/push-notifications (FCM)
                                                      ├─ native TTS plugin (@capacitor-community/text-to-speech)
                                                      └─ native foreground service (for reliable audio)
Server (server/) ── sends push via Firebase Cloud Messaging (FCM) data messages
```

Key idea: send **FCM "data" messages** (not "notification" messages). Data messages
wake a native handler even in the background, where we call the TTS plugin to speak
the alert text, then post a visual notification.

---

## 3. Android implementation steps

1. **Add Capacitor to the existing client**
   ```bash
   cd client
   npm i @capacitor/core @capacitor/cli
   npx cap init LocalMart com.localmart.app --web-dir=dist
   npm i @capacitor/android
   npm run build
   npx cap add android
   ```

2. **Push + TTS plugins**
   ```bash
   npm i @capacitor/push-notifications @capacitor-community/text-to-speech
   npx cap sync
   ```

3. **Firebase (FCM)**
   - Create a Firebase project, add the Android app (`com.localmart.app`),
     download `google-services.json` into `android/app/`.
   - Server sends via FCM using the Firebase Admin SDK. The existing
     Web-Push/VAPID path can stay for desktop browsers; add an FCM path for the
     native app. Store the device's FCM token alongside the current
     `pushSubscription` on the User model.

4. **Speak on background push (native handler)**
   - Register a background data-message handler (Android
     `FirebaseMessagingService.onMessageReceived`).
   - For **important** types (`order_new`, `order_placed`, `order_status`,
     `order_cancelled`, `payment`) call the TTS plugin to speak `title`
     (mirrors the current `isImportant()` list in `client/public/sw.js`).
   - Then show a visual notification with the same payload.

5. **Reliable audio when app is closed → Foreground Service**
   - Android throttles background work. For consistent audio, start a short-lived
     **foreground service** (with a persistent notification) that performs the TTS,
     then stops. Add `FOREGROUND_SERVICE` + `POST_NOTIFICATIONS` (Android 13+)
     permissions in `AndroidManifest.xml` and request notification permission at runtime.

6. **Respect existing preferences**
   - Reuse the server `notifPrefs` (`muteAll`, `mutedTypes`, quiet hours) so the
     native path honours the same mute rules the web UI sets. Enforce quiet hours
     server-side before sending, so muted/quiet alerts never reach the device.

---

## 4. iOS reality check

- iOS **does not allow arbitrary audio/TTS from a background push**. Apps cannot
  reliably "speak" on a closed app. Options are limited to:
  - a **critical alert** entitlement (requires Apple special approval, for
    safety/health apps only), or
  - a pre-recorded **custom notification sound** bundled in the app (≤ 30s), which
    is a fixed sound, not dynamic spoken text.
- Practical iOS outcome: banner + custom sound. Dynamic spoken text stays a
  foreground-only feature, same as the web today.

---

## 5. What ships in each phase

- **Phase 0 (done, web/PWA):** foreground spoken voice + stickier vibrating
  background banner. Good enough for users who keep the tab/app open.
- **Phase 1 (Android native):** true closed-app spoken voice via FCM data messages
  + native TTS + foreground service.
- **Phase 2 (iOS):** banner + custom sound; spoken text foreground-only.

## 6. Effort & risk notes

- Reuses all current React screens — only the push transport and a small native
  handler are new.
- Main risks: Android OEM battery optimizations killing the foreground service
  (mitigate by asking users to disable battery optimization for the app), and
  Play Store review of foreground-service audio usage (document the delivery
  use-case).
- Keep the web build as-is; Capacitor consumes the same `dist/`, so the two stay
  in sync with no UI fork.
