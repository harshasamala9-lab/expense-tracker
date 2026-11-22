import { Component } from 'react';
import { IconAlertCircle } from './Icons.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unexpected UI error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-error">
          <div className="fatal-error-card">
            <span className="state-icon">
              <IconAlertCircle />
            </span>
            <h1>Something went wrong</h1>
            <p>
              The interface hit an unexpected error. Reload the page to try
              again. Your saved expenses are safe in the database.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReload}
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
