import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { ErrorBoundary } from './components/ErrorBoundary';

// Suppress known console warnings that we can't fix immediately
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  // Suppress Google Maps deprecation warning for Marker
  // We'll migrate to AdvancedMarkerElement in a future update
  const message = args[0]?.toString() || '';
  if (message.includes('google.maps.Marker is deprecated') || 
      message.includes('google.maps.marker.AdvancedMarkerElement')) {
    return;
  }
  originalWarn.apply(console, args);
};

// Load test utility in development mode
if (import.meta.env.DEV) {
  import('./utils/testResendEmail').then(module => {
    (window as any).testResendEmail = module.sendTestEmail;
    (window as any).testMagicLinkEmail = module.sendTestMagicLinkEmail;
    console.log('📧 Resend test utility loaded.');
    console.log('💡 Usage: testResendEmail("your-email@example.com") or testMagicLinkEmail("your-email@example.com")');
  });

  // Expose rate limit service for monitoring
  import('./services/RateLimitService').then(module => {
    (window as any).rateLimitService = module.rateLimitService;
    console.log('📊 Rate limit monitoring available!');
    console.log('💡 Check usage: rateLimitService.getUsageStats()');
    console.log('💡 Reset counter: rateLimitService.reset()');
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">Please refresh the page or contact support if the problem persists.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    }>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
