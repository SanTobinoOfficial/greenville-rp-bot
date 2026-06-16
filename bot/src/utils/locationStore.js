// Współdzielony in-memory store lokalizacji IC postaci
// Używany przez /lokalizacja (zapis) i /lista-lokalizacji (odczyt)
// discordId → { lokalizacja, icName, updatedAt }

const locationMap = new Map();
module.exports = { locationMap };
