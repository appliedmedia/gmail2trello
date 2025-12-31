#!/bin/zsh

# Gmail-2-Trello Development Setup Script (ZSH version)

autoload -U colors && colors

echo "${fg[green]}🚀 Setting up Gmail-2-Trello development environment...${reset_color}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "${fg[red]}❌ Node.js is not installed. Please install Node.js >= 14.0.0${reset_color}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "${fg[red]}❌ Node.js version must be >= 14.0.0. Current version: $(node -v)${reset_color}"
    exit 1
fi

echo "${fg[green]}✅ Node.js version: $(node -v)${reset_color}"

# Install dependencies
echo "${fg[yellow]}📦 Installing dependencies...${reset_color}"
npm install

# Check if Chrome is installed (macOS specific)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -d "/Applications/Google Chrome.app" ]; then
        echo "${fg[green]}✅ Chrome is installed${reset_color}"
    else
        echo "${fg[yellow]}⚠️  Chrome not found in /Applications. Please install Chrome.${reset_color}"
    fi
else
    echo "${fg[yellow]}⚠️  Please ensure Chrome is installed on your system.${reset_color}"
fi

# Create development directory structure
echo "${fg[blue]}📁 Setting up directory structure...${reset_color}"
mkdir -p logs
mkdir -p dist

# Set up git hooks if .git exists
if [ -d ".git" ]; then
    echo "${fg[blue]}🔧 Setting up git hooks...${reset_color}"
    if [ ! -d ".git/hooks" ]; then
        mkdir -p .git/hooks
    fi
    
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/zsh
echo "🔍 Running pre-commit checks..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix the issues before committing."
    exit 1
fi
echo "✅ Pre-commit checks passed"
EOF
    
    chmod +x .git/hooks/pre-commit
    echo "${fg[green]}✅ Git hooks configured${reset_color}"
fi

# Add useful aliases to .zshrc if they don't exist
if [ -f "$HOME/.zshrc" ]; then
    echo "${fg[blue]}🔧 Adding useful aliases to .zshrc...${reset_color}"
    
    # Check if aliases already exist
    if ! grep -q "g2t-dev" "$HOME/.zshrc"; then
        cat >> "$HOME/.zshrc" << EOF

# Gmail-2-Trello development aliases
alias g2t-dev='cd $PWD'
alias g2t-lint='npm run lint'
alias g2t-test='npm run test'
alias g2t-build='npm run build'
alias g2t-format='npm run format'
EOF
        echo "${fg[green]}✅ Aliases added to .zshrc${reset_color}"
        echo "${fg[yellow]}💡 Run 'source ~/.zshrc' to load the new aliases${reset_color}"
    else
        echo "${fg[green]}✅ Aliases already exist in .zshrc${reset_color}"
    fi
fi

echo ""
echo "${fg[green]}🎉 Setup complete!${reset_color}"
echo ""
echo "${fg[cyan]}📋 Next steps:${reset_color}"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' in the top right"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'chrome_manifest_v3' directory from this project"
echo "5. Go to Gmail to test the extension"
echo ""
echo "${fg[cyan]}🔧 Available commands:${reset_color}"
echo "  npm run dev     - Show development instructions"
echo "  npm run build   - Create extension zip file"
echo "  npm run test    - Run tests"
echo "  npm run lint    - Check code style"
echo "  npm run format  - Format code"
echo ""
echo "${fg[cyan]}🚀 Quick start:${reset_color}"
echo "  ./scripts/setup.sh  - Run this setup script"
echo "  g2t-dev            - Navigate to project (after sourcing .zshrc)"
echo ""
echo "${fg[cyan]}📚 For more information, see DEVELOPMENT.md${reset_color}" 