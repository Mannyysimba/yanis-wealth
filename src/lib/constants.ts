export const WELCOME_MESSAGES = [
  "Bonjour Patron Yanis 👑 Je vous laisse consulter vos actifs.",
  "On laisse la place au patron Yanis. Votre empire vous attend.",
  "Wesh Yanis t'as trop de sous là, envoie un peu 💸",
  "Bienvenue Patron. Votre patrimoine a été mis à jour.",
  "C'est parti Chef. Les chiffres sont là pour vous.",
];

export const FALLBACK_RATES: Record<string, number> = {
  MAD: 10.85,
  AED: 3.97,
  USD: 1.08,
  EUR: 1,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  MAD: 'د.م.',
  AED: 'د.إ',
  USD: '$',
};

export const CHART_COLORS = ['#6366F1', '#818CF8', '#A78BFA', '#F59E0B', '#10B981', '#3B82F6'];

export const TIME_RANGES = [
  { label: '7J', days: 7 },
  { label: '30J', days: 30 },
  { label: 'Ce mois', days: -1 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1A', days: 365 },
  { label: 'Tout', days: 0 },
] as const;
