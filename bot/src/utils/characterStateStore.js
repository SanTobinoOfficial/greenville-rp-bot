// Współdzielony in-memory store stanów IC postaci
// Używany przez /stan-postaci (zapis) i /lista-stanow (odczyt)
// discordId → { stanKey, stanData, szczegoly, icName, updatedAt }

const statusMap = new Map();
module.exports = { statusMap };
