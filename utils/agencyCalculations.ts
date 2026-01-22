export const isDelegatingWork = (text: string): boolean => {
  const delegationSignals = [
    'entscheide du',
    'mach du',
    'sag du mir',
    'übernimm du',
    'entscheidest du',
    'decide for me',
    'you decide',
    'what should i do',
    'tell me what to do',
    'mach mal fertig',
    'schreib das für mich',
    'what do you think is best',
    'just tell me what to do',
    'i trust your judgment',
    'was denkst du ist am besten',
    'sag mir einfach was ich tun soll',
    'ich vertraue dir',
  ];
  return delegationSignals.some((signal) => text.toLowerCase().includes(signal));
};

export const isCriticalInquiry = (text: string): boolean => {
  const t = text.toLowerCase();
  const criticalTriggers = [
    'andere',
    'alternative',
    'besser',
    'better',
    'option',
    'warum',
    'why',
    'wieso',
    'anders',
    'critique',
    'kritik',
    'unterschied',
    'diff',
    'pro',
    'contra',
    'vorteil',
    'nachteil',
    'ansatz',
    'approach',
    'vergleich',
    'compare',
  ];
  return criticalTriggers.some((k) => t.includes(k));
};

export const isHighStakesDecision = (text: string): boolean => {
  const highStakesTriggers = [
    'production',
    'deploy',
    'security',
    'authentication',
    'gdpr',
    'dsgvo',
    'compliance',
    'financial',
    'payment',
    'strategic',
    'architecture',
    'database',
    'migration',
    'kritisch',
    'critical',
    'sicherheit',
    'datenschutz',
  ];
  return highStakesTriggers.some((trigger) => text.toLowerCase().includes(trigger));
};

export const isPhaticCommunication = (text: string): boolean => {
  const t = text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const phaticPhrases = [
    'hi',
    'hey',
    'hello',
    'hallo',
    'moin',
    'servus',
    'danke',
    'thanks',
    'thank you',
    'thx',
    'cool',
    'super',
    'klasse',
    'toll',
    'great',
    'awesome',
    'nice',
    'ok',
    'okay',
    'k',
    'gut',
    'good',
    'perfekt',
    'perfect',
    'fine',
    'alright',
    'bye',
    'ciao',
    'tschüss',
    'ja',
    'yes',
    'yep',
    'genau',
    'stimmt',
    'right',
    'correct',
  ];
  return phaticPhrases.includes(t);
};

export const isGibberish = (text: string): boolean => {
  const t = text.toLowerCase().trim().replace(/[^a-z]/g, '');
  if (t.length < 3) return false;
  if (/(.)\1{4,}/.test(t)) return true;
  const vowels = (t.match(/[aeiou]/g) || []).length;
  if (t.length > 6 && vowels < t.length * 0.15) return true;
  return false;
};

export const assessArticulationQuality = (text: string): 'high' | 'medium' | 'low' => {
  const length = text.trim().length;
  const hasConstraints =
    text.includes('constraint') ||
    text.includes('requirement') ||
    text.includes('must') ||
    text.includes('should') ||
    text.includes('need');
  const hasQuestionWords = /what|how|why|when|where|which/i.test(text);

  if (length > 100 && hasConstraints) return 'high';
  if (length > 50 || hasQuestionWords) return 'medium';
  return 'low';
};
