
export type Locale = 'de' | 'en';

const translations = {
  de: {
    welcome: "Hi, wie kann ich dir helfen?",
    subWelcome: "Formuliere deine Absicht. Ich bin hier, um dich bei der Synthese zu unterstützen, nicht nur um Output zu liefern.",
    placeholder: "Formuliere deine Synthese...",
    placeholderLocked: "Löse den Synthese-Check zum Freischalten...",
    agency: "Agency",
    sparks: "Sparks",
    intentCheck: "Absichts-Check",
    reflection: "Reflexion",
    synthesisRequired: "Synthese erforderlich",
    focusDecision: "Fokus-Entscheidung",
    confirmFocus: "Fokus-Bereiche bestätigen",
    you: "Du",
    spark: "Spark",
    epistemicLog: "Erkenntnis-Log",
    agencyArtifact: "Agency-Artefakt",
    userContribution: "Nutzer-Beitrag",
    aiPassiveWeight: "KI-Passivgewicht",
    activeEngagement: "Aktives neurales Engagement",
    cognitiveLoad: "Externe kognitive Last",
    intents: "Absichten",
    timeline: "Zeitstrahl",
    acknowledge: "Verstanden",
    insight: "Erkenntnis",
    sparkEarned: "Spark verdient",
    neuralCheckpoint: "Neuraler Checkpoint",
    decision: "Entscheidung",
    sessionCheck: "Sitzungs-Check",
    documentArtifact: "Dokument-Artefakt",
    imageArtifact: "Bild-Artefakt",
    visualizeOption: "Logik visualisieren",
    visualSynthesis: "Visuelle Synthese"
  },
  en: {
    welcome: "Hi, how can I help you?",
    subWelcome: "Articulate your intent. I am here to help you synthesize, not just output.",
    placeholder: "Articulate your synthesis...",
    placeholderLocked: "Solve synthesis check to unlock...",
    agency: "Agency",
    sparks: "Sparks",
    intentCheck: "Intent Check",
    reflection: "Reflection",
    synthesisRequired: "Synthesis Required",
    focusDecision: "Focus Decision",
    confirmFocus: "Confirm Focus Areas",
    you: "You",
    spark: "Spark",
    epistemicLog: "Epistemic Log",
    agencyArtifact: "Agency Artifact",
    userContribution: "User Contribution",
    aiPassiveWeight: "AI Passive Weight",
    activeEngagement: "Active Neural Engagement",
    cognitiveLoad: "External Cognitive Load",
    intents: "Intents",
    timeline: "Timeline",
    acknowledge: "Acknowledge",
    insight: "Insight",
    sparkEarned: "Spark Earned",
    neuralCheckpoint: "Neural Checkpoint",
    decision: "Decision",
    sessionCheck: "Session Check",
    documentArtifact: "Document Artifact",
    imageArtifact: "Image Artifact",
    visualizeOption: "Visualize logic",
    visualSynthesis: "Visual Synthesis"
  }
};

const getSystemLocale = (): Locale => {
  const lang = navigator.language.split('-')[0];
  return (lang === 'de') ? 'de' : 'en';
};

export const currentLocale = getSystemLocale();
export const t = translations[currentLocale];
