# Chrome Web Store Deployment Guide

This guide covers automated deployment to the Chrome Web Store using our deployment scripts.

## Quick Start

1. **Setup API credentials**:

   ```zsh
   npm run deploy:setup
   ```

2. **Deploy automatically**:

   ```zsh
   npm run deploy
   ```

3. **Or deploy manually**:
   ```zsh
   npm run deploy:manual
   ```

## Prerequisites

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](<https://console.cloud.google.com/>)
2. Create a new project or select existing one
3. Enable the Chrome Web Store API:
   - Go to "APIs & Services" > "Library"
   - Search for "Chrome Web Store API"
   - Click "Enable"

### 2. OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Desktop application"
4. Download the JSON file with your credentials

### 3. Get Refresh Token

1. Use the OAuth 2.0 Playground:

   - Go to [OAuth 2.0 Playground](<https://developers.google.com/oauthplayground/>)
   - Click the settings icon (⚙️)
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - Close settings

2. Authorize the API:
   - Scroll to "Chrome Web Store API v1"
   - Select "Chrome Web Store API"
   - Click "Authorize APIs"
   - Sign in with your Google account
   - Click "Exchange authorization code for tokens"
   - Copy the "Refresh token"

### 4. Get Extension ID

1. Go to [Chrome Web Store Developer Dashboard](<https://chrome.google.com/webstore/devconsole/>)
2. Select your extension
3. Copy the Extension ID from the URL or dashboard

## Automated Deployment

### Option 1: Interactive Setup

Run the interactive setup script:

```zsh
npm run deploy:setup
```

This will:

- Create `.env.example` file
- Prompt for your credentials
- Save them to `.env` file
- Validate the configuration

### Option 2: Manual Configuration

1. Create `.env` file:

   ```zsh
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```env
   CHROME_CLIENT_ID=your_client_id_here
   CHROME_CLIENT_SECRET=your_client_secret_here
   CHROME_REFRESH_TOKEN=your_refresh_token_here
   CHROME_EXTENSION_ID=your_extension_id_here
   CHROME_RELEASE_NOTES=Updated version with bug fixes
   ```

### Deploy

Once configured, deploy with:

```zsh
npm run deploy
```

This will:

1. Validate your environment
2. Build the extension (create zip file)
3. Upload to Chrome Web Store
4. Publish the update

## Manual Deployment

If you prefer manual upload:

```zsh
npm run deploy:manual
```

Then:

1. Go to [Chrome Web Store Developer Dashboard](<https://chrome.google.com/webstore/devconsole/>)
2. Select your extension
3. Click "Upload Updated Package"
4. Select the zip file from `dist/` directory
5. Add release notes
6. Submit for review

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Chrome Web Store

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Chrome Web Store
        env:
          CHROME_CLIENT_ID: ${{ secrets.CHROME_CLIENT_ID }}
          CHROME_CLIENT_SECRET: ${{ secrets.CHROME_CLIENT_SECRET }}
          CHROME_REFRESH_TOKEN: ${{ secrets.CHROME_REFRESH_TOKEN }}
          CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
          CHROME_RELEASE_NOTES: ${{ github.event.head_commit.message }}
        run: npm run deploy
```

### Environment Variables

Add these secrets to your GitHub repository:

- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_EXTENSION_ID`

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**

   - Ensure `.env` file exists and contains all required variables
   - Check that variable names match exactly

2. **"Invalid credentials"**

   - Verify your OAuth 2.0 credentials are correct
   - Ensure the Chrome Web Store API is enabled
   - Check that your refresh token is valid

3. **"Extension not found"**

   - Verify your extension ID is correct
   - Ensure you have access to the extension in the developer dashboard

4. **"Upload failed"**
   - Check that the zip file is valid
   - Ensure the manifest.json is properly formatted
   - Verify all required files are included

### Debug Mode

Enable debug logging:

```zsh
DEBUG=* npm run deploy
```

### Manual Testing

Test the API connection:

```zsh
node -e "
const ChromeStoreAPI = require('./scripts/chrome-store-api');
const api = new ChromeStoreAPI({
  clientId: process.env.CHROME_CLIENT_ID,
  clientSecret: process.env.CHROME_CLIENT_SECRET,
  refreshToken: process.env.CHROME_REFRESH_TOKEN,
  extensionId: process.env.CHROME_EXTENSION_ID
});
api.getExtensionInfo().then(console.log).catch(console.error);
"
```

## Security Best Practices

1. **Never commit credentials**

   - Keep `.env` in `.gitignore`
   - Use environment variables in CI/CD

2. **Rotate credentials regularly**

   - Update OAuth tokens periodically
   - Monitor API usage

3. **Limit API access**
   - Use minimal required scopes
   - Monitor for unusual activity

## API Limits

- **Upload frequency**: Limited by Chrome Web Store review process
- **File size**: Maximum 10MB for extension package
- **Rate limits**: Respect Google's API quotas

## Support

- [Chrome Web Store API Documentation](<https://developer.chrome.com/docs/webstore/api/>)
- [Google Cloud Console](<https://console.cloud.google.com/>)
- [OAuth 2.0 Playground](<https://developers.google.com/oauthplayground/>)
