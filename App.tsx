import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WhyItMatters from './components/WhyItMatters';
import BilliardSimulation from './components/BilliardSimulation';
import ThesisSection from './components/ThesisSection';
import InteractivePaths from './components/InteractivePaths';
import QuizSection from './components/QuizSection';
import Footer from './components/Footer';

const App: React.FC = () => {
  // Simple theme state management - defaulting to dark for this aesthetic
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className={`min-h-screen font-body transition-colors duration-300 ${isDark ? 'text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar isDark={isDark} toggleTheme={toggleTheme} />
      
      <main className="flex flex-col gap-0">
        <Hero />
        
        {/* Why It Matters moved to top as requested */}
        <WhyItMatters />
        
        <BilliardSimulation />
        
        <ThesisSection />
        
        <InteractivePaths />
        
        <QuizSection />
      </main>

      <Footer />
    </div>
  );
};

export default App;