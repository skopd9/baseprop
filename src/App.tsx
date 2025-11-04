import { useState, useEffect } from 'react';
import { SimplifiedLandlordApp } from './components/SimplifiedLandlordApp';
import { AuthModal } from './components/AuthModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AcceptInvite } from './components/AcceptInvite';
import { WelcomeToOrganizationModal } from './components/WelcomeToOrganizationModal';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { getCountryList } from './lib/countries';
import { supabase, auth } from './lib/supabase';

interface AppProps {
  onUserEmailChange?: (email: string) => void;
}

type AppState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated' | 'welcome-to-org';

function App({ onUserEmailChange = () => { } }: AppProps) {
  const [appState, setAppState] = useState<AppState>('loading');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [welcomeOrgData, setWelcomeOrgData] = useState<{ name: string; role: 'owner' | 'member' } | null>(null);

  // Check auth state on mount and check for invite token
  useEffect(() => {
    // Check for invite token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invite'); // Fixed: email uses ?invite= parameter
    if (token) {
      setInviteToken(token);
      // Store in localStorage to survive magic link redirect
      localStorage.setItem('pendingInviteToken', token);
    } else {
      // Check if we have a stored invite token from before auth
      const storedToken = localStorage.getItem('pendingInviteToken');
      if (storedToken) {
        setInviteToken(storedToken);
      }
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

    // PRIORITY: If user has a pending invitation, skip onboarding check and go straight to invitation acceptance
    const storedToken = localStorage.getItem('pendingInviteToken');
    if (storedToken || inviteToken) {
      console.log('User has pending invitation, skipping onboarding check');
      setAppState('authenticated');
      return;
    }

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

  const handleInviteAccepted = (organizationName: string, role: 'owner' | 'member') => {
    // Clear token from URL and localStorage
    window.history.replaceState({}, '', window.location.pathname);
    localStorage.removeItem('pendingInviteToken');
    setInviteToken(null);
    // Show welcome modal with tour
    setWelcomeOrgData({ name: organizationName, role });
    setAppState('welcome-to-org');
  };

  const handleWelcomeTourComplete = () => {
    // Clear welcome data and go to app
    setWelcomeOrgData(null);
    setAppState('authenticated');
  };

  const handleInviteError = (message: string) => {
    console.error('Invite error:', message);
    window.history.replaceState({}, '', window.location.pathname);
    localStorage.removeItem('pendingInviteToken');
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

  // Welcome to organization state - show tour after accepting invite
  if (appState === 'welcome-to-org' && userId && welcomeOrgData) {
    return (
      <OrganizationProvider userId={userId}>
        <SimplifiedLandlordApp 
          onLogout={handleLogout}
          showOnboarding={false}
          userId={userId}
          userEmail={userEmail}
        />
        <WelcomeToOrganizationModal
          isOpen={true}
          organizationName={welcomeOrgData.name}
          role={welcomeOrgData.role}
          onComplete={handleWelcomeTourComplete}
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
      {/* Invitation Banner - Shows when user has invite token */}
      {inviteToken && (
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 text-center text-sm font-medium shadow-md z-50">
          <span className="inline-flex items-center">
            <span className="mr-2">📧</span>
            You have an organization invitation! Please sign in or create an account to accept it.
          </span>
        </div>
      )}
      
      {/* Alpha Launch Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 text-center text-sm font-medium shadow-md z-50">
        <span className="inline-flex items-center">
          <span className="mr-2">🚀</span>
          Alpha Launch - Welcome to our early release! We're actively improving based on your feedback.
        </span>
      </div>

      {/* Top Navigation */}
      <nav className="flex justify-between items-center p-4 sm:p-6 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="text-xl sm:text-2xl font-bold text-gray-900">
          Base Prop
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <a href="#features" className="hidden sm:block text-gray-600 hover:text-gray-900 font-medium">Features</a>
          <a href="#pricing" className="hidden sm:block text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
          <button
            onClick={handleLogin}
            className="px-4 sm:px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-300 text-sm sm:text-base"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="text-center max-w-5xl mx-auto relative z-10 w-full">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Manage your rental
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              properties with ease
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed px-4">
            The simple property management system for landlords. Track tenants, collect rent, schedule inspections, and stay compliant - all in one place.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 px-4">
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 bg-green-600 text-white text-lg sm:text-xl font-semibold rounded-2xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Start Managing Properties
            </button>
          </div>

          {/* Key Features */}
          <div className="text-gray-600 mb-4 text-sm sm:text-base">Perfect for managing:</div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 px-4">
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all text-xs sm:text-sm">
              🏠 Residential Properties
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all text-xs sm:text-sm">
              👥 Tenant Management
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all text-xs sm:text-sm">
              💰 Rent Collection
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all text-xs sm:text-sm">
              🔧 Maintenance Tracking
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer transition-all text-xs sm:text-sm">
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

      {/* Features Section */}
      <div className="bg-white py-12 sm:py-20 px-4 sm:px-6 lg:px-8" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 px-4">
              Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">manage properties</span>
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              From tenant onboarding to maintenance tracking, we've got you covered.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 mb-12 sm:mb-20">
            {/* Property Management */}
            <div className="text-center">
              <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 mb-8 overflow-hidden">
                <div className="w-full h-64 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏠</div>
                    <div className="space-y-2">
                      <div className="bg-green-100 rounded-lg p-2 text-sm">123 Oak Street - Occupied</div>
                      <div className="bg-blue-100 rounded-lg p-2 text-sm">456 Pine Ave - Vacant</div>
                      <div className="bg-gray-100 rounded-lg p-2 text-sm">789 Elm Road - Maintenance</div>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Property Portfolio</h3>
              <p className="text-gray-600 mb-6">
                Keep track of all your properties, their status, occupancy rates, and key details in one organized dashboard.
              </p>
            </div>

            {/* Tenant Management */}
            <div className="text-center">
              <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl p-8 mb-8 overflow-hidden">
                <div className="w-full h-64 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                  <div className="text-center space-y-3">
                    <div className="text-6xl mb-4">👥</div>
                    <div className="flex items-center space-x-2 text-sm bg-green-50 p-2 rounded">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>John Smith - Rent Paid</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm bg-yellow-50 p-2 rounded">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Sarah Johnson - Due Soon</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm bg-red-50 p-2 rounded">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Mike Davis - Overdue</span>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Tenant Management</h3>
              <p className="text-gray-600 mb-6">
                Manage tenant information, track lease agreements, monitor rent payments, and handle tenant communications.
              </p>
            </div>

            {/* Maintenance & Compliance */}
            <div className="text-center">
              <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 mb-8 overflow-hidden">
                <div className="w-full h-64 bg-white rounded-2xl shadow-lg p-6">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔧</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Gas Safety Check</span>
                        <span className="text-green-600">✓ Valid</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>EPC Certificate</span>
                        <span className="text-yellow-600">⚠ Expires Soon</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Boiler Service</span>
                        <span className="text-red-600">⚠ Overdue</span>
                      </div>
                      <button className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg text-sm">
                        Schedule Inspection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Maintenance & Compliance</h3>
              <p className="text-gray-600 mb-6">
                Stay on top of property maintenance, safety certificates, and compliance requirements with automated reminders.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4">
              "This has transformed how I <span className="text-green-600">manage my properties</span>"
            </h2>
            <p className="text-base sm:text-xl text-gray-600 px-4">
              What landlords are saying about Base Prop
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <p className="text-gray-700 mb-4">"Finally, a property management system that's actually simple to use. I can track everything from rent to repairs in one place."</p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 font-bold">JM</span>
                </div>
                <div>
                  <div className="font-semibold">James Mitchell</div>
                  <div className="text-gray-500 text-sm">Portfolio: 8 Properties</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <p className="text-gray-700 mb-4">"The tenant management features are excellent. I love how I can track rent payments and send automated reminders."</p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold">LT</span>
                </div>
                <div>
                  <div className="font-semibold">Lisa Thompson</div>
                  <div className="text-gray-500 text-sm">Portfolio: 15 Properties</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <p className="text-gray-700 mb-4">"The compliance tracking is a game-changer. Never miss another gas safety check or EPC renewal again!"</p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 font-bold">RW</span>
                </div>
                <div>
                  <div className="font-semibold">Robert Wilson</div>
                  <div className="text-gray-500 text-sm">Portfolio: 25 Properties</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleLogin}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-300"
            >
              Start Managing Your Properties →
            </button>
          </div>
        </div>
      </div>

      {/* Simple Pricing Section */}
      <div className="bg-white py-12 sm:py-20 px-4 sm:px-6 lg:px-8" id="pricing">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4">
            Simple, transparent pricing
          </h2>
          <p className="text-base sm:text-xl text-gray-600 mb-8 sm:mb-12 px-4">
            Start free, upgrade when you're ready
          </p>

          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-6 sm:p-8 max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Free Forever</h3>
            <div className="text-5xl font-bold text-green-600 mb-4">£0</div>
            <p className="text-gray-600 mb-6">Perfect for getting started</p>
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                Up to 5 properties
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                Unlimited tenants
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                Rent tracking
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                Basic maintenance tracking
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                Email support
              </li>
            </ul>
            <button
              onClick={handleLogin}
              className="w-full px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-300"
            >
              Get Started Free
            </button>
          </div>

          <p className="text-gray-500 text-sm mt-8">
            Need more properties? Contact us for custom pricing.
          </p>
        </div>
      </div>

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
