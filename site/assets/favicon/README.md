# Favicon Assets

These favicon files were generated using [realfavicongenerator.net](https://realfavicongenerator.net/).

## How to regenerate

1. Go to [realfavicongenerator.net](https://realfavicongenerator.net/)
2. Upload your source SVG or high-resolution PNG (512x512 minimum)
3. Configure options for each platform (iOS, Android, Windows, etc.)
4. Download the generated package
5. Extract and replace files in this directory.

## Files included

| File                           | Purpose                      |
| ------------------------------ | ---------------------------- |
| `favicon.svg`                  | Modern browsers (scalable)   |
| `favicon.ico`                  | Legacy browsers, crawlers    |
| `favicon-96x96.png`            | High-DPI browser tabs        |
| `apple-touch-icon.png`         | iOS home screen (180x180)    |
| `web-app-manifest-192x192.png` | Android/PWA icon             |
| `web-app-manifest-512x512.png` | Android/PWA splash           |
| `site.webmanifest`             | PWA manifest file            |

## HTML reference

```html
<link rel="icon" type="image/png" href="/assets/favicon/favicon-96x96.png" sizes="96x96" />
<link rel="icon" type="image/svg+xml" href="/assets/favicon/favicon.svg" />
<link rel="shortcut icon" href="/assets/favicon/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png" />
<link rel="manifest" href="/assets/favicon/site.webmanifest" />
```
