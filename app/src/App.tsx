import { useState, useEffect } from 'react';
import { ExitSafely } from './components/ExitSafely';
import { BottomNav } from './components/BottomNav';
import { PinLock } from './components/PinLock';
import { useDisguise, APP_NAME } from './components/AppDisguise';
import { HomeScreen } from './components/HomeScreen';
import { ArchiveScreen } from './components/ArchiveScreen';
import { RecurlineScreen } from './components/RecurlineScreen';
import { CaseBuilderScreen } from './components/CaseBuilderScreen';
import { ResourcesScreen } from './components/ResourcesScreen';
import { SafeReveal } from './components/SafeReveal';

/**
 * PatternProof — App Root
 * 
 * Structure: PIN Gate → Exit Safely → App Shell (Nav + Routes)
 * Safety infrastructure (Exit Safely, App Disguise) lives at root level,
 * outside any route, so it persists across navigation.
 */

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const { disguised, toggle } = useDisguise();

  // Check for biometric/fast-unlock on mount
  useEffect(() => {
    // Replace with Supabase session check
    const hasSession = false; // sessionStorage.getItem('pp_session');
    if (hasSession) setUnlocked(true);
  }, []);

  if (!unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} disguised={disguised} />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            userName="Gracie"
            onNavigate={setActiveTab}
          />
        );
      case 'archive':
        // SafeReveal wraps potentially triggering content (Archive, Timeline, Evidence)
        return (
          <SafeReveal buttonText="Show everything">
            <ArchiveScreen onAddEntry={() => console.log('add entry')} />
          </SafeReveal>
        );
      case 'recurline':
        return <RecurlineScreen />;
      case 'case':
        return <CaseBuilderScreen courtDate="Sep 15, 2026" />;
      case 'resources':
        return <ResourcesScreen />;
      default:
        return <HomeScreen userName="Gracie" onNavigate={setActiveTab} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Exit Safely — always visible, above all content */}
      <ExitSafely />
      
      {/* Screen content */}
      {renderScreen()}

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
