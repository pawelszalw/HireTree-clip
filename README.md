# HireTree Clip

Browser extension (Manifest V3) for Chrome / Edge.

Clips the current job offer page and sends it to the HireTree backend.

## Load in browser

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder

## Usage

Navigate to any job offer page, click the **HireTree Clip** icon, then **Clip this page**.

## Config

Edit `config.js` to point at your backend:

```js
const CONFIG = {
  API_URL: 'http://localhost:8000', // local dev
}
```
