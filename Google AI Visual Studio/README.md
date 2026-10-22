# AI Studio Android (Kotlin) — MVP source

An independent Android shell for Google Flow, Google Flow Music, and Google Vids, plus a local media Library. **Not affiliated with Google.** It uses the services' official user-facing web pages — **no paid AI generation API**, login interception, private endpoints, or service-side automation.

## Features actually implemented

- Native Kotlin + Jetpack Compose UI, four bottom tabs.
- GeckoView sessions for each official website, with page progress and reload.
- External default-browser launch if a service does not support the embedded engine.
- In Vids tab, an optional desktop User-Agent/viewport view (display preference, **not a workaround** for unsupported editing).
- Bundled WebExtension with conservative CSS on known service origins, **not on Google login origins**.
- Local media Library: Android document picker import, share-target import, list/delete/share via FileProvider.
- GeckoView HTML file upload prompt -> Android document picker.
- GeckoView non-renderable download response -> Library (when the response includes a readable stream).

## Not implemented or NOT guaranteed

- Successful Google OAuth login inside GeckoView: Google may block embedded browsers.
- Shared login cookie/session with Chrome. External browser sign-in cannot be copied into GeckoView.
- Existing Vids AI editing on Android: **not officially supported**; PC view/CSS changes do not unlock it.
- Automatic transfer of files to a Vids project or private Flow-to-Vids integration.
- Cloud syncing, account/credit details, payment, Google service internal source code.

## Build

Requirements: Android Studio with Android SDK 35, JDK 17, Internet for Gradle/Mozilla artifacts.

1. Extract this archive and open `AIStudioAndroid` as an existing project in Android Studio.
2. Allow Gradle sync. The included Gradle build scripts specify Gradle **8.11.1** and Android Gradle Plugin **8.9.2**.
3. This source archive does **not** contain `gradle-wrapper.jar` or a prebuilt APK (build tools/network are not available in the creation environment). In Android Studio / terminal with local Gradle 8.11.1 installed, generate the wrapper from the project root:

   `gradle wrapper --gradle-version 8.11.1`

   Then run `./gradlew :app:assembleDebug` (Windows `gradlew.bat :app:assembleDebug`) or use Android Studio **Build APK(s)**.
4. Install `app/build/outputs/apk/debug/app-debug.apk` on Android 12+ for tests.
5. Follow `docs/TEST_CHECKLIST.md` on a physical phone, especially login and Vids restrictions.

If an artifact version ceases to be available, consult the official repository rather than silently changing browser libraries. GeckoView is a large native dependency and the first sync can download substantial files.

## Official website targets
- Flow: https://flow.google.com/
- Flow Music: https://www.flowmusic.app/
- Vids: https://vids.new/

## Extension and limitations

Mozilla documents installing built-in extensions from `resource://android/assets/...` using `ensureBuiltIn()`. See `app/src/main/assets/mobile-ui/` for manifest and CSS. This extension only improves generic touch/scroll ergonomics; it does not rewrite Google Vids' private DOM or bypass device limitations. If the site changes, edit and test the CSS locally.

## Security

The app does not log credentials, alter Google sign-in pages, or store OAuth tokens. Media are copied into app-private storage. Share targets receive `content://` URIs with temporary read permission. No network backend or paid AI API is present.

## Source reference docs
- Mozilla GeckoView getting started: https://mozilla.github.io/geckoview/consumer/docs/geckoview-quick-start
- GeckoView WebExtensions: https://mozilla.github.io/geckoview/consumer/docs/web-extensions
- Google Vids support: https://support.google.com/docs/answer/15082958
- Google Flow Music: https://support.google.com/flow/answer/17083868

## Optional build in GitHub Actions (no local Gradle install)

1. Create a private GitHub repository and upload the **contents** of this project (the `.github` directory too).
2. From the repository's **Actions** tab run **Android Debug APK** (`workflow_dispatch`).
3. If the build succeeds, download `AIStudio-debug-apk` from the run's Artifacts section.
4. This is a debug APK; it is not a Play Store release and is not evidence that the Google sites' login/editing features work.

The GitHub workflow has not been run in this environment, and dependency/API compatibility must be verified on its first run.
