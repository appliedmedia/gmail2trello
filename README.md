# gmail2trello

Gmail+Trello integration. Extension for Chrome browser and other developments.

Published on Chrome Web Store: [https://g2t.info]

Support, commonly asked questions, interaction with other fans: [https://g2t.support]

## About

gmail2trello is a Chrome extension that allows you to easily create Trello cards from Gmail messages. It integrates seamlessly with Gmail's interface and provides a powerful way to manage your email workflow through Trello boards.

## Features

- Create Trello cards directly from Gmail messages
- Include email content, attachments, and images
- Add backlinks to original emails
- Support for labels, due dates, and assignments
- Keyboard shortcuts (Alt+Shift+G)
- Remember previous card settings per email thread

## Project Structure

```
├── chrome_manifest_v3/     # Main Chrome extension (Manifest V3)
├── firefox/               # Firefox extension
├── docs/                  # Documentation and assets
├── tests/                 # Test files
└── graveyard/            # Deprecated code
```

## Development Setup

### Prerequisites

- Node.js (>= 14.0.0)
- Chrome browser
- Gmail account
- Trello account

### Installation

1. Clone the repository:

   ```zsh
   git clone https://github.com/appliedmedia/gmail-2-trello.git
   cd gmail-2-trello
   ```

2. Install dependencies:
   ```zsh
   npm install
   ```

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome_manifest_v3` directory from this project
5. The extension should now appear in your extensions list

### Development Workflow

- **Main extension files**: `chrome_manifest_v3/`
- **Key files**:
  - `manifest.json` - Extension configuration
  - `app.js` - Main application logic
  - `model.js` - Data models and API interactions
  - `content-script.js` - Gmail integration
  - `service_worker.js` - Background service worker

### Available Scripts

- `npm run dev` - Development setup instructions
- `npm run build` - Build extension zip file
- `npm run test` - Run test suite
- `npm run lint` - Lint code for issues
- `npm run lint:fix` - Lint code and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run clean` - Remove node_modules and package-lock.json
- `npm run install-deps` - Install dependencies
- `npm run deploy` - Deploy to Chrome Web Store (automated)
- `npm run deploy:setup` - Setup Chrome Web Store API credentials
- `npm run deploy:manual` - Build for manual upload

## Configuration

### Trello API Setup

1. Go to https://trello.com/app-key
2. Copy your API key
3. The extension will handle OAuth authentication

### Gmail Integration

The extension automatically integrates with Gmail's interface. No additional configuration is required.

## Testing

Tests are located in the `tests/` directory. Run them with:

```zsh
npm test
```

## Building for Distribution

### Automated Deployment

For automated deployment to Chrome Web Store:

1. Setup API credentials:

   ```zsh
   npm run deploy:setup
   ```

2. Deploy automatically:
   ```zsh
   npm run deploy
   ```

See [DEPLOYMENT.md](<DEPLOYMENT.md>) for detailed setup instructions.

### Manual Deployment

To create a distributable extension manually:

1. Build the extension:

   ```zsh
   npm run build
   ```

2. Upload the zip file from `dist/` to Chrome Web Store

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

- **Extension not loading**: Check Chrome's developer console for errors
- **Gmail integration issues**: Ensure you're on the correct Gmail domain
- **Trello authentication**: Clear extension data and re-authenticate

## Support

- **Documentation**: Check the `docs/` folder
- **Issues**: Report on GitHub
- **Community**: Visit https://g2t.support

## License

MIT License - see [LICENSE.txt](<LICENSE.txt>) for details.

## Changelog

See [docs/CHANGES.md](<docs/CHANGES.md>) for detailed version history.
