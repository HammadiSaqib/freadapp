/* ============================================================
   AFFILIATE CONFIGURATION
   Update this single file to re-skin the page for a new affiliate.
   ============================================================ */
window.SCORE_MACHINE_CONFIG = {
  brand: {
    name: "The Score Machine",
    logo: "images/score-machine-logo.png",
    websiteUrl: "https://thescoremachine.com"
  },

  affiliate: {
    name: "Ray Anderson",
    title: "Official Affiliate",
    organization: "Smart Hustlers University",
    avatar: "",
    referralUrl: "PASTE_AFFILIATE_REFERRAL_URL_HERE",
    qrCodeDestination: "PASTE_AFFILIATE_REFERRAL_URL_HERE",
    disclosure:
      "This page contains an affiliate link. The referring affiliate may receive compensation when a qualifying purchase is made."
  },

  links: {
    demoUrl: "PASTE_DEMO_LINK_HERE",
    loginUrl: "PASTE_LOGIN_LINK_HERE",
    privacyUrl: "PASTE_PRIVACY_POLICY_LINK_HERE",
    termsUrl: "PASTE_TERMS_LINK_HERE",
    refundPolicyUrl: "PASTE_REFUND_POLICY_LINK_HERE",
    cancellationPolicyUrl: "PASTE_CANCELLATION_POLICY_LINK_HERE"
  },

  /* Checkout links per plan / billing cadence */
  checkout: {
    foundationMonthly: "PASTE_FOUNDATION_MONTHLY_LINK_HERE",
    foundationYearly: "PASTE_FOUNDATION_YEARLY_LINK_HERE",

    momentumMonthly: "PASTE_MOMENTUM_MONTHLY_LINK_HERE",
    momentumYearly: "PASTE_MOMENTUM_YEARLY_LINK_HERE",

    acceleratorMonthly: "PASTE_ACCELERATOR_MONTHLY_LINK_HERE",
    acceleratorYearly: "PASTE_ACCELERATOR_YEARLY_LINK_HERE",

    eliteMonthly: "PASTE_ELITE_MONTHLY_LINK_HERE",
    eliteYearly: "PASTE_ELITE_YEARLY_LINK_HERE"
  }
};

/* Pricing data — approved source of truth. */
window.SCORE_MACHINE_PLANS = [
  {
    id: "foundation",
    name: "Foundation",
    badge: null,
    description: "Perfect for one person managing their own profile.",
    monthly: 28.88,
    yearly: 288.80,
    limits: ["1 User", "1 Client"],
    features: [
      "Full credit profile analysis",
      "Underwriting-style evaluation",
      "Identification of negative and limiting factors",
      "Multi-bureau profile overview",
      "Self-service credit tools included at no additional software cost",
      "Standard customer support"
    ],
    cta: "Choose Foundation",
    accent: "emerald"
  },
  {
    id: "momentum",
    name: "Momentum",
    badge: "Most Popular",
    description: "Built for growing professionals who are beginning to manage clients.",
    monthly: 148.88,
    yearly: 1488.80,
    limits: ["Up to 5 Users", "Up to 30 Clients"],
    features: [
      "Full credit profile analysis",
      "Underwriting-style evaluation",
      "Identification of negative and limiting factors",
      "Multi-bureau profile overview",
      "Self-service credit tools included at no additional software cost",
      "Priority customer support"
    ],
    cta: "Choose Momentum",
    accent: "cyan"
  },
  {
    id: "accelerator",
    name: "Accelerator",
    badge: null,
    description: "Designed for established teams managing a larger client base.",
    monthly: 228.88,
    yearly: 2288.80,
    limits: ["Up to 20 Users", "Up to 100 Clients"],
    features: [
      "Full credit profile analysis",
      "Underwriting-style evaluation",
      "Identification of negative and limiting factors",
      "Multi-bureau profile overview",
      "Self-service credit tools included at no additional software cost",
      "Priority customer support"
    ],
    cta: "Choose Accelerator",
    accent: "emerald"
  },
  {
    id: "elite",
    name: "Elite Unlimited",
    badge: null,
    description: "Complete access for high-volume businesses and growing teams.",
    monthly: 297.88,
    yearly: 2978.80,
    limits: ["Unlimited Users", "Unlimited Clients"],
    features: [
      "Full credit profile analysis",
      "Underwriting-style evaluation",
      "Identification of negative and limiting factors",
      "Multi-bureau profile overview",
      "Self-service credit tools included at no additional software cost",
      "Priority customer support"
    ],
    cta: "Choose Elite Unlimited",
    accent: "violet"
  }
];
