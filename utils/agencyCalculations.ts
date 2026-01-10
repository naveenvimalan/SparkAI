export const isDelegatingWork = (text: string): boolean => {
  const delegationSignals = [
    'entscheide du', 'mach du', 'sag du mir', 'übernimm du', 'entscheidest du', 
    'decide for me', 'you decide', 'what should i do', 'tell me what to do',
    'mach mal fertig', 'schreib das für mich',
    'what do you think is best', 'just tell me what to do', 'i trust your judgment',
    'was denkst du ist am besten', 'sag mir einfach was ich tun soll', 'ich vertraue dir'
  ];
  return delegationSignals.some(signal => text.toLowerCase().includes(signal));
};

export const isCriticalInquiry = (text: string): boolean => {
  const t = text.toLowerCase();
  const criticalTriggers = [
    'andere', 'alternative', 'besser', 'better', 'option', 
    'warum', 'why', 'wieso', 'anders', 'critique', 'kritik', 
    'unterschied', 'diff', 'pro', 'contra', 'vorteil', 'nachteil',
    'ansatz', 'approach', 'vergleich', 'compare'
  ];
  return criticalTriggers.some(k => t.includes(k));
};

export const isSteeringCommand = (text: string): boolean => {
  const t = text.toLowerCase().trim();
  // Regex for imperative starts, handling both EN and DE
  return /^(analysiere|prüfe|erkläre|fasse|zeig|vergleiche|bewerte|analyze|check|explain|summarize|show|compare|evaluate)/i.test(t);
};

export const isPhaticCommunication = (text: string): boolean => {
  const t = text.toLowerCase().trim().replace(/[!.]/g, '');
  const phaticPhrases = [
    'danke', 'thanks', 'thank you', 'merci', 'thx', 
    'cool', 'super', 'klasse', 'toll', 'great', 'awesome', 
    'ok', 'okay', 'k', 'gut', 'good', 'perfekt', 'perfect',
    'bye', 'ciao', 'tschüss', 'bis dann', 'later',
    'genau', 'exakt', 'stimmt', 'right', 'correct',
    'verstanden', 'understood', 'alles klar', 'jep', 'yep', 'ja', 'yes', 'gerne'
  ];
  return phaticPhrases.includes(t);
};

export const isGibberish = (text: string): boolean => {
  const t = text.toLowerCase().trim().replace(/[^a-zäöüß]/g, '');
  if (t.length < 3) return false; 
  
  // Check 1: Strict Repetition
  if (/(.)\1{4,}/.test(t)) return true;
  
  // Check 2: Vowel Count (Simple heuristic for keyboard mashing)
  const vowels = (t.match(/[aeiouäöü]/g) || []).length;
  if (t.length > 6 && vowels < t.length * 0.15) return true;
  
  return false;
};