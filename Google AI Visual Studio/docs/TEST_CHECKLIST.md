# Device verification checklist

No Google service integration is assumed working solely because the APK compiles or renders a page.

## 1. First launch
- [ ] App boots on Android 12+ with working Internet connection.
- [ ] Tabs Flow / Flow Music / Vids / Library switch without a GeckoView session exception.
- [ ] GeckoView extension loads (check Logcat `AIStudio`).
- [ ] Reload and external browser actions work.

## 2. Google login and feature availability
- [ ] Flow load successful, with visible sign-in screen.
- [ ] Flow Google account login actually succeeds (may be blocked in GeckoView).
- [ ] Flow video generation actually succeeds if the account is eligible.
- [ ] Flow Music load and Google login succeeds; song generation is functional.
- [ ] Vids load and a project can be opened.
- [ ] Vids PC view toggles (does NOT imply editing works).
- [ ] Vids AI editor actually works with touch input (official mobile editing unsupported).

## 3. Files and privacy
- [ ] Android document picker imports a video and audio file.
- [ ] Shared `ACTION_SEND` media imported from another app appears in Library.
- [ ] File upload from HTML input uses the Android picker.
- [ ] Non-rendered download response with a readable body is saved in Library.
- [ ] Sharing a Library item provides a valid temporary content URI.
- [ ] No login cookies, passwords or OAuth tokens are collected by this application.

## 4. Warnings/known gaps
- GeckoView does not use Chrome's cookie jar; opening the page externally does not carry an authenticated session back into GeckoView.
- Google OAuth login from an embedded engine may be rejected. The correct fallback is a standard browser, not token extraction.
- Google Vids mobile editing is not officially supported. Desktop UA + CSS will not necessarily enable it.
- Third-party webpage DOM/CSS can change without notice. The included CSS is intentionally minimal.
- Some in-page dialogs, downloads and redirects may still require native prompt integration beyond this MVP.
