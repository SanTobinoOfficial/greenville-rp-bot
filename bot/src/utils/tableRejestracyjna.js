// Generator tablic rejestracyjnych AURORA Greenville RP
// Format: GV [3 cyfry] [2 litery]

/**
 * Generuje losową tablicę rejestracyjną w formacie GV XXX YY
 */
function generatePlate() {
  const digits = Math.floor(Math.random() * 900 + 100).toString(); // 100–999
  const letters = randomLetters(2);
  return `GV ${digits} ${letters}`;
}

/**
 * Generuje unikatową tablicę rejestracyjną (sprawdza w bazie)
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function generateUniquePlate(prisma) {
  let plate;
  let attempts = 0;

  do {
    plate = generatePlate();
    attempts++;
    if (attempts > 1000) throw new Error('Nie można wygenerować unikalnej tablicy');

    const existing = await prisma.vehicle.findUnique({ where: { tablica: plate } });
    if (!existing) return plate;
  } while (true);
}

/**
 * Generuje losowy numer ID dokumentu: GV-XXXXXX
 */
function generateDocumentId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let id = 'GV-';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Generuje fikcyjny PESEL RP zgodny z datą urodzenia
 * @param {Date} birthDate
 * @param {string} gender - 'M' lub 'K'
 */
function generatePeselRp(birthDate, gender) {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();

  const yy = String(year).slice(2).padStart(2, '0');
  // Miesiąc zakodowany wg standardu PESEL (dla lat 2000+ +20)
  const mm = year >= 2000
    ? String(month + 20).padStart(2, '0')
    : String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  // 4 cyfry seryjne
  const serial = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  // Płeć: K=parzyste (0,2,4,6,8), M=nieparzyste (1,3,5,7,9)
  const genderDigit = gender === 'M'
    ? [1, 3, 5, 7, 9][Math.floor(Math.random() * 5)]
    : [0, 2, 4, 6, 8][Math.floor(Math.random() * 5)];

  const base = `${yy}${mm}${dd}${serial}${genderDigit}`;

  // Suma kontrolna
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(base[i]) * weights[i];
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return `${base}${checkDigit}`;
}

/**
 * Generuje numer telefonu RP: 5XX XXX XXX
 */
function generatePhoneNumber() {
  const prefix = Math.floor(Math.random() * 100 + 500).toString(); // 500–599
  const mid = Math.floor(Math.random() * 900 + 100).toString();
  const end = Math.floor(Math.random() * 900 + 100).toString();
  return `${prefix} ${mid} ${end}`;
}

/**
 * Sprawdza czy numer telefonu jest unikalny i generuje nowy
 */
async function generateUniquePhone(prisma) {
  let phone;
  let attempts = 0;
  do {
    phone = generatePhoneNumber();
    attempts++;
    if (attempts > 10000) throw new Error('Nie można wygenerować unikalnego numeru');

    const existing = await prisma.user.findUnique({ where: { phoneNumber: phone } });
    if (!existing) return phone;
  } while (true);
}

function randomLetters(n) {
  const consonants = 'BCDFGHJKLMNPRSTW';
  let result = '';
  for (let i = 0; i < n; i++) {
    result += consonants[Math.floor(Math.random() * consonants.length)];
  }
  return result;
}

module.exports = {
  generateUniquePlate,
  generateDocumentId,
  generatePeselRp,
  generateUniquePhone,
  generatePhoneNumber,
};
