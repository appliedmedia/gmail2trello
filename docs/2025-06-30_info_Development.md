# Development Guide

This guide provides detailed instructions for developing and contributing to the Gmail-2-Trello extension.

## Quick Start

1. **Clone and setup**:

   ```zsh
   git clone https://github.com/appliedmedia/gmail-2-trello.git
   cd gmail-2-trello
   npm install
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome_manifest_v3/` directory

3. **Test the extension**:
   - Go to Gmail
   - Look for the G2T button in the toolbar
   - Click it to open the popup

## Project Architecture

### Core Files

- **`manifest.json`**: Extension configuration and permissions
- **`app.js`**: Main application logic and UI management
- **`model.js`**: Data models, API calls, and business logic
- **`content-script.js`**: Gmail integration and DOM manipulation
- **`service_worker.js`**: Background tasks and message handling

### Key Components

1. **Gmail Integration** (`content-script.js`)
   - Injects UI elements into Gmail
   - Handles email content extraction
   - Manages button positioning and interactions

2. **Trello API** (`model.js`)
   - OAuth authentication
   - Board, list, and card operations
   - File uploads and attachments

3. **UI Management** (`app.js`)
   - Popup interface
   - Form handling
   - Settings management

## Development Workflow

### Making Changes

1. **Edit files** in `chrome_manifest_v3/`
2. **Reload extension** in Chrome:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension
3. **Test changes** in Gmail

### Debugging

1. **Extension errors**: Check `chrome://extensions/` for error messages
2. **Content script errors**: Open Gmail DevTools (F12) and check Console
3. **Background script errors**: Go to `chrome://extensions/` → "service worker" link
4. **API issues**: Check the Network tab in DevTools

### Common Issues

- **Extension not loading**: Check `manifest.json` syntax
- **Gmail integration broken**: Gmail may have changed selectors
- **Trello API errors**: Check authentication and API limits

## Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] G2T button appears in Gmail toolbar
- [ ] Popup opens and displays correctly
- [ ] Trello authentication works
- [ ] Boards and lists load
- [ ] Card creation works
- [ ] Attachments upload correctly
- [ ] Backlinks are created
- [ ] Settings are saved

### Automated Testing

Tests are in the `tests/` directory. Run with:

```zsh
npm test
```

## Code Style

- Use ESLint for linting: `npm run lint`
- Use Prettier for formatting: `npx prettier --write .`
- Follow existing code patterns
- Add comments for complex logic

## Building for Distribution

1. **Test thoroughly** in development
2. **Update version** in `manifest.json`
3. **Zip the extension**:

   ```zsh
   cd chrome_manifest_v3
   zip -r ../gmail-2-trello-v2.9.0.002.zip .
   ```

4. **Upload to Chrome Web Store**

## API Keys and Security

- **Trello API Key**: Configured in the extension
- **OAuth**: Handled automatically by the extension
- **No sensitive data** should be committed to the repository

## Troubleshooting

### Extension Won't Load

- Check `manifest.json` syntax
- Verify all referenced files exist
- Check Chrome's extension error log

### Gmail Integration Issues

- Gmail may have updated their DOM structure
- Check selectors in `content-script.js`
- Test with different Gmail themes

### Trello API Problems

- Verify the API key is valid
- Check rate limits
- Ensure OAuth tokens are fresh

## Git Best Practices

### File Operations

**Always use `git mv` instead of `mv` for file renames/moves.**

- `git mv` preserves git history and tracks the move as a rename operation
- `mv` followed by `git add`/`git rm` loses history, and shows as delete+add
- Example: `git mv old_name.js new_name.js` not `mv old_name.js new_name.js`

**Multiple moves can be chained:**

```zsh
git mv file1.js new_file1.js && git mv file2.js new_file2.js
```

This ensures clean git history and proper tracking of file movements.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Pull Request Guidelines

- Include a clear description of changes
- Test on multiple Gmail themes
- Verify Trello integration works
- Update documentation if needed

## Resources

- [Chrome Extension Documentation](<https://developer.chrome.com/docs/extensions/>)
- [Trello API Documentation](<https://developer.atlassian.com/cloud/trello/>)
- [Gmail API Documentation](<https://developers.google.com/gmail/api>)
- [Project Support](<https://g2t.support>)
