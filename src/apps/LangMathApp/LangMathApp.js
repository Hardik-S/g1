import React from 'react';
import './LangMathApp.css';

const LangMathApp = ({ onBack }) => {
  const base = process.env.PUBLIC_URL || '';
  const appUrl = `${base}/apps/lang-math/`;

  return (
    <div className="lang-math-wrapper">
      <section className="lang-math-intro">
        <div>
          <h1>LangMath</h1>
          <p>
            Translate natural language arithmetic into precise calculations. Enter number words up to ninety-nine,
            combine operators like “plus”, “minus”, “times”, or “divided by”, and let the embedded Pyodide
            runtime evaluate the expression entirely in your browser.
          </p>
        </div>
        <ul className="lang-math-points">
          <li>Understands zero through ninety-nine, including hyphenated values like “seventy-four”.</li>
          <li>Guards against unsafe tokens by sanitising expressions before evaluation.</li>
          <li>Runs Python’s evaluator client-side via WebAssembly for consistent precedence.</li>
        </ul>
      </section>

      <iframe
        src={appUrl}
        title="LangMath Natural Language Calculator"
        className="lang-math-frame"
        loading="lazy"
      />

      <div className="lang-math-actions">
        <a className="lang-math-link" href={appUrl} target="_blank" rel="noreferrer">
          Open full window ↗
        </a>
        <button type="button" className="lang-math-back" onClick={onBack}>
          ← Back to Apps
        </button>
      </div>
    </div>
  );
};

export default LangMathApp;
