# Day of Week Switcher

A simple React app that allows you to switch between different days of the week with beautiful animations and a modern UI.

## Features

- 🗓️ Switch between all 7 days of the week
- ⬅️➡️ Navigate with Previous/Next buttons
- 🎲 Jump to a random day
- 📱 Click on any day to switch directly
- 📱 Fully responsive design
- 🎨 Beautiful gradient UI

## Live Demo

[View on GitHub Pages](https://hardik-s.github.io/g1)

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Hardik-S/g1.git
cd g1
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

This creates a `dist` folder with the production build.

## Deployment to GitHub Pages

1. **Update the homepage URL** in `package.json`:
   ```json
   "homepage": "https://hardik-s.github.io/g1"
   ```
   Replace `yourusername` with your actual GitHub username.

2. **Deploy to GitHub Pages**:
   ```bash
   npm run deploy
   ```

3. **Enable GitHub Pages** in your repository settings:
   - Go to your repository on GitHub
   - Click on "Settings"
   - Scroll down to "Pages" section
   - Select "Deploy from a branch"
   - Choose "gh-pages" branch
   - Click "Save"

Your app will be available at: `https://hardik-s.github.io/g1`

## Project Structure

```
day-of-week-switcher/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js              # Main React component
│   ├── App.css             # Component styles
│   ├── index.js            # Entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies and scripts
├── webpack.config.js       # Webpack configuration
└── README.md              # This file
```

## Technologies Used

- React 18
- Webpack 5
- Babel
- CSS3 with modern features
- GitHub Pages for hosting

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.