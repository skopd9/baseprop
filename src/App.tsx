import { useState, useEffect } from 'react';
import { SimplifiedLandlordApp } from './components/SimplifiedLandlordApp';
import { AuthModal } from './components/AuthModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AcceptInvite } from './components/AcceptInvite';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { getCountryList } from './lib/countries';
import { supabase, auth } from './lib/supabase';

interface AppProps {
  onUserEmailChange?: (email: string) => void;
}

type AppState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

function App({ onUserEmailChange = () => { } }: AppProps) {
  const [appState, setAppState] = useState<AppState>('loading');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // DEBUG: Test if environment variables are loading
  console.log('=== Environment Variable Test ===');
  console.log('VITE_GOOGLE_MAP_API:', import.meta.env.VITE_GOOGLE_MAP_API);
  console.log('All env vars:', import.meta.env);
  console.log('================================');

  // Check auth state on mount and check for invite token
  useEffect(() => {
    // Check for invite token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setInviteToken(token);
    }

    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleAuthenticatedUser(session.user.id, session.user.email || '');
      } else {
        setAppState('unauthenticated');
        setUserId(null);
        setUserEmail('');
        onUserEmailChange('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      const session = await auth.getSession();
      
      if (session?.user) {
        await handleAuthenticatedUser(session.user.id, session.user.email || '');
      } else {
        setAppState('unauthenticated');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setAppState('unauthenticated');
    }
  };

  const handleAuthenticatedUser = async (uid: string, email: string) => {
    setUserId(uid);
    setUserEmail(email);
    onUserEmailChange(email);

    // Check if user has completed onboarding
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('has_completed_onboarding')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Error other than "no rows returned"
        console.error('Error checking onboarding status:', error);
        setAppState('authenticated');
        return;
      }

      if (!profile || !profile.has_completed_onboarding) {
        // User needs to complete onboarding
        setAppState('onboarding');
      } else {
        // User has completed onboarding
        setAppState('authenticated');
      }
    } catch (error) {
      console.error('Error in handleAuthenticatedUser:', error);
      setAppState('authenticated');
    }
  };

  const handleOnboardingComplete = async () => {
    // Refresh to load organizations
    setAppState('authenticated');
  };

  const handleInviteAccepted = () => {
    // Clear token from URL
    window.history.replaceState({}, '', window.location.pathname);
    setInviteToken(null);
    // Refresh to load new organization
    setAppState('authenticated');
  };

  const handleInviteError = (message: string) => {
    console.error('Invite error:', message);
    window.history.replaceState({}, '', window.location.pathname);
    setInviteToken(null);
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Auth state change listener will handle the rest
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('currentOrganizationId');
      setAppState('unauthenticated');
      setUserId(null);
      setUserEmail('');
      onUserEmailChange('');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Loading state
  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Onboarding state - now handled within SimplifiedLandlordApp
  // User goes directly to the app with an Onboarding tab
  if (appState === 'onboarding' && userId) {
    return (
      <OrganizationProvider userId={userId}>
        <SimplifiedLandlordApp 
          onLogout={handleLogout}
          showOnboarding={true}
          userId={userId}
          userEmail={userEmail}
          onOnboardingComplete={handleOnboardingComplete}
        />
      </OrganizationProvider>
    );
  }

  // Authenticated state with invite token
  if (appState === 'authenticated' && userId && inviteToken) {
    return (
      <OrganizationProvider userId={userId}>
        <AcceptInvite
          token={inviteToken}
          onSuccess={handleInviteAccepted}
          onError={handleInviteError}
        />
      </OrganizationProvider>
    );
  }

  // Authenticated state
  if (appState === 'authenticated' && userId) {
    return (
      <OrganizationProvider userId={userId}>
        <SimplifiedLandlordApp 
          onLogout={handleLogout}
          showOnboarding={false}
          userId={userId}
          userEmail={userEmail}
        />
      </OrganizationProvider>
    );
  }

  // Unauthenticated state - Landing Page
  return (
    <div className="bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 min-h-screen flex flex-col">
      {/* Alpha Launch Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 text-center text-sm font-medium shadow-md z-50">
        <span className="inline-flex items-center">
          <span className="mr-2">🚀</span>
          Alpha Launch - Welcome to our early release! We're actively improving based on your feedback.
        </span>
      </div>

      {/* Top Navigation */}
      <nav className="flex justify-between items-center p-6 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="text-2xl font-bold text-gray-900">
          Base Prop
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
          <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
          <button
            onClick={handleLogin}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-300"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="text-center max-w-5xl mx-auto relative z-10">
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Manage your rental
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              properties with ease
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            The simple property management system for landlords. Track tenants, collect rent, schedule inspections, and stay compliant - all in one place.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={handleLogin}
              className="px-12 py-4 bg-green-600 text-white text-xl font-semibold rounded-2xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Start Managing Properties
            </button>
          </div>

          {/* Key Features */}
          <div className="text-gray-600 mb-4">Perfect for managing:</div>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all">
              🏠 Residential Properties
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all">
              👥 Tenant Management
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all">
              💰 Rent Collection
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all">
              🔧 Maintenance Tracking
            </span>
            <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all">
              📋 Compliance & Inspections
            </span>
          </div>

          {/* Active Countries */}
          <div className="mb-8">
            <div className="text-gray-600 mb-3 text-sm font-medium">Available in:</div>
            <div className="flex flex-wrap justify-center gap-4">
              {getCountryList().map((country) => {
                const flagEmojis: Record<string, string> = {
                  'UK': '🇬🇧',
                  'GR': '🇬🇷',
                  'US': '🇺🇸'
                };
                return (
                  <div
                    key={country.code}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <span className="text-2xl">{flagEmojis[country.code] || '🌍'}</span>
                    <span className="text-gray-700 font-medium">{country.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trust Indicator */}
          <div className="text-gray-500 text-sm">
            Trusted by landlords managing 1000+ properties
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-green-300 rounded-full opacity-30 animate-bounce"></div>
      </div>

      {/* Features Section - Keeping it minimal for now */}
      <div className="bg-white py-20 px-4" id="features">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Everything you need to manage properties
          </h2>
          <p className="text-xl text-gray-600">
            Streamline your property management workflow in one place
          </p>
        </div>
      </div>

      {/* Simple Pricing Section */}
      <div className="bg-white py-20 px-4" id="pricing">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Start free, upgrade when you're ready
          </p>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Free Forever</h3>
            <div className="text-5xl font-bold text-green-600 mb-4">£0</div>
            <button
              onClick={handleLogin}
              className="w-full px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-300"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-600 max-w-7xl mx-auto">
          <div className="mb-2 md:mb-0">
            <p className="font-medium text-gray-900">Base Prop</p>
            <p className="text-xs text-gray-500 mt-1">© {new Date().getFullYear()} All rights reserved</p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span>Version 1.0 Alpha</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
