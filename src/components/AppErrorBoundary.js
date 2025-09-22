import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
    };

    this.handleRetry = this.handleRetry.bind(this);
    this.handleBack = this.handleBack.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info);
    }
  }

  handleRetry() {
    this.setState({ error: null }, () => {
      if (typeof this.props.onRetry === 'function') {
        this.props.onRetry();
      }
    });
  }

  handleBack() {
    if (typeof this.props.onBack === 'function') {
      this.props.onBack();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-boundary" role="alert">
          <div className="error-content">
            <div className="error-icon" aria-hidden="true">
              ⚠️
            </div>
            <h2>We couldn't load this app</h2>
            <p>
              Something went wrong while loading the experience. You can try again or
              return to the launcher.
            </p>
            <div className="error-actions">
              <button type="button" className="retry-btn" onClick={this.handleRetry}>
                Retry
              </button>
              <button type="button" className="back-btn" onClick={this.handleBack}>
                ← Back to Apps
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
