// System uprawnień bota AURORA Greenville RP
// Hierarchia ról i walidacja dostępu do komend

// Hierarchia ról — wyższy indeks = wyższe uprawnienia
const ROLE_HIERARCHY = [
  'Niezweryfikowany',
  'Mieszkaniec',
  'Wspierający',
  'Booster',
  'Helper',
  'HR',
  'Host',
  'Moderator',
  'Administrator',
  'Co-Owner',
  'Owner',
];

// Nazwy ról po polsku (muszą zgadzać się z rolami tworzonymi przez /setup)
const ROLES = {
  OWNER: 'Owner',
  CO_OWNER: 'Co-Owner',
  ADMIN: 'Administrator',
  MOD: 'Moderator',
  HELPER: 'Helper',
  HOST: 'Host',
  HR: 'HR',
  MIESZKANIEC: 'Mieszkaniec',
  BOOSTER: 'Booster',
  WSPIERAJACY: 'Wspierający',
  NIEZWERYFIKOWANY: 'Niezweryfikowany',
  POLICJA: 'Policja',
  STRAZ: 'Straż Pożarna',
  EMS: 'EMS',
  DOT: 'DOT',
  STRAZ_MIEJSKA: 'Straż Miejska',
  TAKSOWKARZ: 'Taksówkarz',
};

/**
 * Zwraca poziom uprawnień użytkownika (0 = brak, wyżej = więcej)
 */
function getUserLevel(member) {
  let level = 0;
  for (let i = 0; i < ROLE_HIERARCHY.length; i++) {
    if (member.roles.cache.some(r => r.name === ROLE_HIERARCHY[i])) {
      level = i;
    }
  }
  return level;
}

/**
 * Sprawdza czy użytkownik ma daną rolę lub wyższą
 */
function hasRole(member, roleName) {
  const requiredLevel = ROLE_HIERARCHY.indexOf(roleName);
  if (requiredLevel === -1) return false;
  return getUserLevel(member) >= requiredLevel;
}

/**
 * Sprawdza czy użytkownik jest staffem (Helper+)
 */
function isStaff(member) {
  return hasRole(member, ROLES.HELPER);
}

/**
 * Sprawdza czy użytkownik jest moderatorem (Moderator+)
 */
function isMod(member) {
  return hasRole(member, ROLES.MOD);
}

/**
 * Sprawdza czy użytkownik jest adminem (Administrator+)
 */
function isAdmin(member) {
  return hasRole(member, ROLES.ADMIN);
}

/**
 * Sprawdza czy użytkownik jest właścicielem serwera
 */
function isOwner(member) {
  return member.guild.ownerId === member.id || hasRole(member, ROLES.OWNER);
}

/**
 * Sprawdza czy użytkownik jest zweryfikowany (Mieszkaniec+)
 */
function isVerified(member) {
  return hasRole(member, ROLES.MIESZKANIEC);
}

/**
 * Sprawdza czy użytkownik jest w służbach (Policja, Straż, EMS, DOT, Straż Miejska)
 */
function isService(member) {
  const services = [ROLES.POLICJA, ROLES.STRAZ, ROLES.EMS, ROLES.DOT, ROLES.STRAZ_MIEJSKA];
  return services.some(role => member.roles.cache.some(r => r.name === role));
}

/**
 * Tworzy odpowiedź o braku uprawnień
 */
function noPermissionReply(required = 'Staff') {
  return {
    content: `❌ Nie masz uprawnień do użycia tej komendy. Wymagane: **${required}**`,
    ephemeral: true,
  };
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  getUserLevel,
  hasRole,
  isStaff,
  isMod,
  isAdmin,
  isOwner,
  isVerified,
  isService,
  noPermissionReply,
};
