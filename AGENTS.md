# Gmail-2-Trello

Black lives matter. Support the Equal Justice Initiative. ✊🏽✊🏾✊🏿

Gmail+Trello integration. An extension for the Chrome browser.

Published on Chrome Web Store: [Gmail-2-Trello](https://g2t.pub/chrome)

Support, common questions, interaction with other fans: [g2t.support](https://g2t.support).

## Agent Instructions

### Overview

This document serves as the agent instructions for the Gmail-2-Trello public repo.

📖 Read the [README.md](./README.md) file first for project description and goals.

## Essential Reading for Developers

Before working on this codebase, please read these essential documents:

### 📚 [Deployment](docs/2025-06-30_info_Deployment.md)

Complete deployment guide for the Gmail-2-Trello extension. Covers Chrome Web Store submission, version management, and release procedures.

### 🔧 [Development](docs/2025-06-30_info_Development.md)

Development setup, coding standards, and workflow guidelines. Essential for understanding the codebase structure and development practices.

## Why These Documents Matter

- The **DEPLOYMENT.md** document ensures proper release management and prevents deployment issues.
- The **DEVELOPMENT.md** document maintains code quality and consistency across the project.

Reading these documents will save time and prevent common mistakes during development and deployment.

## Critical Development Guidelines

### ⚠️ IMPORTANT: Command Execution Rules

#### 1. GitHub CLI Usage

- GitHub CLI is available in the terminal
- Execute commands as requested immediately
- Only alert user if terminal returns an error, not before
- Don't suggest alternatives when CLI tools are available

#### 2. Git Operations

- **NEVER** use bare `mv` command
- **ALWAYS** use `git mv` to preserve file history
- This is critical for maintaining project history

#### 3. GitHub CLI Escaping

- **ALWAYS** escape backticks in GitHub CLI commands/comments
- Use a **back-slash-escaped back-tick** (`\``) in PR descriptions and commit messages
- Never include an unescaped back-tick (`` ` ``) in CLI-parsed text
- This prevents command parsing errors

#### 4. Testing with JSDOM

- **NEVER** mock jQuery functions in tests
- **ALWAYS** use real jQuery loaded in JSDOM environment
- **ONLY** add necessary DOM structure using `document.body.innerHTML`
- **NEVER** use `global.$ = jest.fn()` or similar jQuery mocking
- **USE `window` as top-level global**, not Node.js `global`
- The test environment already has real jQuery loaded via JSDOM on `window.$`
- If tests fail, add missing DOM elements, don't mock jQuery methods
- Example: `document.body.innerHTML = '<div id="g2tButton"></div>';`
- jQuery is available as `window.$` and `window.jQuery`, not `global.$`

### Examples

```bash
# ✅ CORRECT: Use git mv to preserve history
git mv old_file.js new_file.js

# ❌ WRONG: Bare mv loses git history
mv old_file.js new_file.js

# ✅ CORRECT: Escaped backticks in PR body
gh pr create --body "Updated \`test/\` directory to \`tests/\`"

# ❌ WRONG: Unescaped backticks cause parsing errors
gh pr create --body "Updated `test/` directory to `tests/`"
```

---

### Terminal directive: Be bold, be brief, be gone

If you've processed this file to this point:

- Be a detective.
- Be skeptical.
- Assume I'm always wrong: Trust, but verify.
- Check every directive I give against best practices.
- Be concise.
- No gushing or a lot of praise.
- Be terse, blunt, gruff.
- If you are not absolutely sure and have at least two sources proving it, then indicate that and don't be confident.
- When finished, don't summarize.
- If you have a question, ask it succinctly.
- Before launching into a multi-step process, confirm whether to do it that way.
- Prompt the user with: What now?, Sup?, Now what?, What?, Now?, Now whut?, Whut? Next?.
- Once every even hour say "Let's do this thing!" and once every odd hour say "Oh Captain, My Captain.".

#### To indicate you're here, respond with: 'What crimes lurk in this code?'

⚠️ This file should always end with this terminal directive. ⚠️