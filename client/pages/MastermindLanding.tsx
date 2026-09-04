import React, { useEffect, useState } from "react";
import { EmailConsistencyAlert } from "@/components/mastermind/EmailConsistencyAlert";
import { FinalChecklist } from "@/components/mastermind/FinalChecklist";
import { Footer } from "@/components/mastermind/Footer";
import { FridayMastermind } from "@/components/mastermind/FridayMastermind";
import { HeroSection } from "@/components/mastermind/HeroSection";
import { Navbar } from "@/components/mastermind/Navbar";
import { Step1Monitoring } from "@/components/mastermind/Step1Monitoring";
import { Step2Enrollment } from "@/components/mastermind/Step2Enrollment";
import { Step3Payment } from "@/components/mastermind/Step3Payment";
import { Step4ProcessFlow } from "@/components/mastermind/Step4ProcessFlow";
import { Step5FundingReadiness } from "@/components/mastermind/Step5FundingReadiness";
import { Step6DisputeProcess } from "@/components/mastermind/Step6DisputeProcess";
import { Step7MonthlyUpdates } from "@/components/mastermind/Step7MonthlyUpdates";
import { Step8FundingJourney } from "@/components/mastermind/Step8FundingJourney";

const sections = [
  "step-1",
  "step-2",
  "step-3",
  "step-4",
  "step-5",
  "step-6",
  "step-7",
  "step-8",
  "mastermind",
  "checklist",
];

export default function MastermindLanding() {
  const [activeSection, setActiveSection] = useState("step-1");

  useEffect(() => {
    document.title = "The CapSol Friday Mastermind";
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      <EmailConsistencyAlert variant="banner" />
      <Navbar activeSection={activeSection} />

      <main className="flex-1">
        <HeroSection onStartStep1={() => scrollToSection("step-1")} />
        <Step1Monitoring onContinue={() => scrollToSection("step-2")} />
        <Step2Enrollment onContinue={() => scrollToSection("step-3")} />
        <Step3Payment onContinue={() => scrollToSection("step-4")} />
        <Step4ProcessFlow onContinue={() => scrollToSection("step-5")} />
        <Step5FundingReadiness onContinue={() => scrollToSection("step-6")} />
        <Step6DisputeProcess onContinue={() => scrollToSection("step-7")} />
        <Step7MonthlyUpdates onContinue={() => scrollToSection("step-8")} />
        <Step8FundingJourney />
        <FridayMastermind />
        <FinalChecklist />
      </main>

      <Footer />
    </div>
  );
}
