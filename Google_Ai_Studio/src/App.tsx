import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EmailConsistencyAlert } from './components/EmailConsistencyAlert';
import { Step1Monitoring } from './components/Step1Monitoring';
import { Step2Enrollment } from './components/Step2Enrollment';
import { Step3Payment } from './components/Step3Payment';
import { Step4ProcessFlow } from './components/Step4ProcessFlow';
import { Step5FundingReadiness } from './components/Step5FundingReadiness';
import { Step6DisputeProcess } from './components/Step6DisputeProcess';
import { Step7MonthlyUpdates } from './components/Step7MonthlyUpdates';
import { Step8FundingJourney } from './components/Step8FundingJourney';
import { FridayMastermind } from './components/FridayMastermind';
import { FinalChecklist } from './components/FinalChecklist';
import { Footer } from './components/Footer';

export default function App() {
  const [activeSection, setActiveSection] = useState('step-1');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'step-6', 'step-7', 'step-8', 'mastermind', 'checklist'];
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top Banner Notice */}
      <EmailConsistencyAlert variant="banner" />

      {/* Sticky Navigation */}
      <Navbar activeSection={activeSection} />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection onStartStep1={() => scrollToSection('step-1')} />

        {/* Step 1: Credit Monitoring */}
        <Step1Monitoring onContinue={() => scrollToSection('step-2')} />

        {/* Step 2: Enroll with The CapSol */}
        <Step2Enrollment onContinue={() => scrollToSection('step-3')} />

        {/* Step 3: Complete Stripe Payment */}
        <Step3Payment onContinue={() => scrollToSection('step-4')} />

        {/* Step 4: The CapSol Pulls Your Credit Report */}
        <Step4ProcessFlow onContinue={() => scrollToSection('step-5')} />

        {/* Step 5: Know What Is Stopping Your Funding */}
        <Step5FundingReadiness onContinue={() => scrollToSection('step-6')} />

        {/* Step 6: Credit Dispute Process */}
        <Step6DisputeProcess onContinue={() => scrollToSection('step-7')} />

        {/* Step 7: Monthly Progress Updates */}
        <Step7MonthlyUpdates onContinue={() => scrollToSection('step-8')} />

        {/* Step 8: Funding Readiness Ultimate Destination */}
        <Step8FundingJourney />

        {/* Friday Mastermind Section */}
        <FridayMastermind />

        {/* Final Checklist & Welcome */}
        <FinalChecklist />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
