# Technical notes

## Why native UI instead of Vue/React?

Native Jetpack Compose reduces startup layers and avoids bundling a second HTML/JS application shell. GeckoView is only used to show official third-party web pages. The UI code is Kotlin. No React/Vue dependencies are required.

## Why not microG?

microG provides partial Android Google Play Services compatibility, not a general way to make Google's OAuth server accept embedded browser sign-in. The app avoids credential/token handling and provides an explicit external browser option.

## Why not iframe?

Iframe embeds of external services are controlled by the websites' CSP/frame-ancestors policies. Even when an iframe loads, the same-origin policy prevents the parent webapp from manipulating its DOM. A GeckoView-built-in extension is better suited to scoped cosmetic CSS, but it does not bypass Google's auth or mobile support rules.

## CSS files

The bundled WebExtension is installed using Mozilla's documented `ensureBuiltIn()` and limited to known user-facing service URLs. Google authentication origins are excluded. CSS must not rewrite private app logic or attempt to enable hidden/unsupported features. It is a deliberately small ergonomic foundation; a future version can add carefully tested site-specific selectors.

## Known MVP gaps

- This is source project only; a compiled APK has not been produced or tested.
- No automated workflow for inserting a Flow media item into a Vids timeline.
- No browser-to-Chrome cookie transfer.
- Not all HTML prompt types, new-window popups, and media permission requests are implemented.
- A mobile browser is not a supported Vids editor in Google's documentation.
- Account-specific eligibility, flow credits, and rate limits are decided by Google; they cannot be transferred through an APK.
