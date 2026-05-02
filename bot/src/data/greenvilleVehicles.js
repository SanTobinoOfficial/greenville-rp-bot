// Baza pojazdów dostępnych w Greenville RP
// wartosc w $ RP — pojazdy > 100 000 wymagają roli "Koneser Aut"

const VEHICLES = [
  // ─── Ekonomiczne ────────────────────────────────────────────────────────────
  { id: 'civic_2020',       marka: 'Honda',      model: 'Civic',             rok: 2020, wartosc: 12000,   kategoria: 'Ekonomiczne' },
  { id: 'corolla_2021',     marka: 'Toyota',     model: 'Corolla',           rok: 2021, wartosc: 13500,   kategoria: 'Ekonomiczne' },
  { id: 'golf_2019',        marka: 'Volkswagen', model: 'Golf',              rok: 2019, wartosc: 14000,   kategoria: 'Ekonomiczne' },
  { id: 'fiesta_2020',      marka: 'Ford',       model: 'Fiesta',            rok: 2020, wartosc: 11000,   kategoria: 'Ekonomiczne' },
  { id: 'spark_2021',       marka: 'Chevrolet',  model: 'Spark',             rok: 2021, wartosc: 10000,   kategoria: 'Ekonomiczne' },
  { id: 'polo_2020',        marka: 'Volkswagen', model: 'Polo',              rok: 2020, wartosc: 12500,   kategoria: 'Ekonomiczne' },
  { id: 'yaris_2022',       marka: 'Toyota',     model: 'Yaris',             rok: 2022, wartosc: 13000,   kategoria: 'Ekonomiczne' },
  { id: 'fit_2020',         marka: 'Honda',      model: 'Fit',               rok: 2020, wartosc: 11500,   kategoria: 'Ekonomiczne' },
  { id: 'jetta_2021',       marka: 'Volkswagen', model: 'Jetta',             rok: 2021, wartosc: 15000,   kategoria: 'Ekonomiczne' },
  { id: 'cruze_2020',       marka: 'Chevrolet',  model: 'Cruze',             rok: 2020, wartosc: 13800,   kategoria: 'Ekonomiczne' },

  // ─── Sedany / Hatchbacki ────────────────────────────────────────────────────
  { id: 'accord_2022',      marka: 'Honda',      model: 'Accord',            rok: 2022, wartosc: 26000,   kategoria: 'Sedany' },
  { id: 'camry_2022',       marka: 'Toyota',     model: 'Camry',             rok: 2022, wartosc: 28000,   kategoria: 'Sedany' },
  { id: 'passat_2021',      marka: 'Volkswagen', model: 'Passat',            rok: 2021, wartosc: 24000,   kategoria: 'Sedany' },
  { id: 'fusion_2021',      marka: 'Ford',       model: 'Fusion',            rok: 2021, wartosc: 23000,   kategoria: 'Sedany' },
  { id: 'malibu_2022',      marka: 'Chevrolet',  model: 'Malibu',            rok: 2022, wartosc: 22000,   kategoria: 'Sedany' },
  { id: 'altima_2022',      marka: 'Nissan',     model: 'Altima',            rok: 2022, wartosc: 25000,   kategoria: 'Sedany' },
  { id: 'elantra_2022',     marka: 'Hyundai',    model: 'Elantra',           rok: 2022, wartosc: 21000,   kategoria: 'Sedany' },
  { id: 'sonata_2022',      marka: 'Hyundai',    model: 'Sonata',            rok: 2022, wartosc: 27000,   kategoria: 'Sedany' },
  { id: 'optima_2021',      marka: 'Kia',        model: 'Optima',            rok: 2021, wartosc: 24500,   kategoria: 'Sedany' },
  { id: 'bmw_3_2022',       marka: 'BMW',        model: '3 Series',          rok: 2022, wartosc: 42000,   kategoria: 'Sedany' },
  { id: 'mercc_c_2022',     marka: 'Mercedes',   model: 'C-Class',           rok: 2022, wartosc: 43000,   kategoria: 'Sedany' },
  { id: 'audi_a4_2022',     marka: 'Audi',       model: 'A4',                rok: 2022, wartosc: 41000,   kategoria: 'Sedany' },

  // ─── SUV-y / Crossovery ─────────────────────────────────────────────────────
  { id: 'rav4_2022',        marka: 'Toyota',     model: 'RAV4',              rok: 2022, wartosc: 29000,   kategoria: 'SUV' },
  { id: 'crv_2022',         marka: 'Honda',      model: 'CR-V',              rok: 2022, wartosc: 30000,   kategoria: 'SUV' },
  { id: 'escape_2022',      marka: 'Ford',       model: 'Escape',            rok: 2022, wartosc: 28000,   kategoria: 'SUV' },
  { id: 'equinox_2022',     marka: 'Chevrolet',  model: 'Equinox',           rok: 2022, wartosc: 27000,   kategoria: 'SUV' },
  { id: 'wrangler_2022',    marka: 'Jeep',       model: 'Wrangler',          rok: 2022, wartosc: 32000,   kategoria: 'SUV' },
  { id: 'cherokee_2022',    marka: 'Jeep',       model: 'Grand Cherokee',    rok: 2022, wartosc: 38000,   kategoria: 'SUV' },
  { id: 'explorer_2022',    marka: 'Ford',       model: 'Explorer',          rok: 2022, wartosc: 38000,   kategoria: 'SUV' },
  { id: 'tahoe_2022',       marka: 'Chevrolet',  model: 'Tahoe',             rok: 2022, wartosc: 56000,   kategoria: 'SUV' },
  { id: 'yukon_2022',       marka: 'GMC',        model: 'Yukon',             rok: 2022, wartosc: 57000,   kategoria: 'SUV' },
  { id: 'highlander_2022',  marka: 'Toyota',     model: 'Highlander',        rok: 2022, wartosc: 37000,   kategoria: 'SUV' },
  { id: 'bmw_x5_2022',      marka: 'BMW',        model: 'X5',                rok: 2022, wartosc: 63000,   kategoria: 'SUV' },
  { id: 'mercc_gle_2022',   marka: 'Mercedes',   model: 'GLE',               rok: 2022, wartosc: 67000,   kategoria: 'SUV' },
  { id: 'audi_q7_2022',     marka: 'Audi',       model: 'Q7',                rok: 2022, wartosc: 69000,   kategoria: 'SUV' },
  { id: 'porsche_cay_2022', marka: 'Porsche',    model: 'Cayenne',           rok: 2022, wartosc: 82000,   kategoria: 'SUV' },
  { id: 'range_rover_2022', marka: 'Land Rover', model: 'Range Rover',       rok: 2022, wartosc: 92000,   kategoria: 'SUV' },

  // ─── Pickup-y ───────────────────────────────────────────────────────────────
  { id: 'f150_2022',        marka: 'Ford',       model: 'F-150',             rok: 2022, wartosc: 35000,   kategoria: 'Pickupy' },
  { id: 'silverado_2022',   marka: 'Chevrolet',  model: 'Silverado 1500',    rok: 2022, wartosc: 36000,   kategoria: 'Pickupy' },
  { id: 'ram1500_2022',     marka: 'RAM',        model: '1500',              rok: 2022, wartosc: 37000,   kategoria: 'Pickupy' },
  { id: 'tacoma_2022',      marka: 'Toyota',     model: 'Tacoma',            rok: 2022, wartosc: 30000,   kategoria: 'Pickupy' },
  { id: 'tundra_2022',      marka: 'Toyota',     model: 'Tundra',            rok: 2022, wartosc: 40000,   kategoria: 'Pickupy' },
  { id: 'frontier_2022',    marka: 'Nissan',     model: 'Frontier',          rok: 2022, wartosc: 29000,   kategoria: 'Pickupy' },
  { id: 'raptor_2022',      marka: 'Ford',       model: 'F-150 Raptor',      rok: 2022, wartosc: 70000,   kategoria: 'Pickupy' },
  { id: 'trx_2022',         marka: 'RAM',        model: '1500 TRX',          rok: 2022, wartosc: 73000,   kategoria: 'Pickupy' },
  { id: 'at4_2022',         marka: 'GMC',        model: 'Sierra AT4',        rok: 2022, wartosc: 55000,   kategoria: 'Pickupy' },
  { id: 'cybertruck_2023',  marka: 'Tesla',      model: 'Cybertruck',        rok: 2023, wartosc: 68000,   kategoria: 'Pickupy' },

  // ─── Muscle / Sportowe ──────────────────────────────────────────────────────
  { id: 'mustang_2022',     marka: 'Ford',       model: 'Mustang GT',        rok: 2022, wartosc: 55000,   kategoria: 'Sportowe' },
  { id: 'mustang_s550',     marka: 'Ford',       model: 'Mustang Shelby GT500', rok: 2022, wartosc: 79000, kategoria: 'Sportowe' },
  { id: 'camaro_2022',      marka: 'Chevrolet',  model: 'Camaro SS',         rok: 2022, wartosc: 57000,   kategoria: 'Sportowe' },
  { id: 'camaro_zl1',       marka: 'Chevrolet',  model: 'Camaro ZL1',        rok: 2022, wartosc: 69000,   kategoria: 'Sportowe' },
  { id: 'challenger_2022',  marka: 'Dodge',      model: 'Challenger R/T',    rok: 2022, wartosc: 52000,   kategoria: 'Sportowe' },
  { id: 'charger_2022',     marka: 'Dodge',      model: 'Charger SRT',       rok: 2022, wartosc: 62000,   kategoria: 'Sportowe' },
  { id: 'corvette_c8',      marka: 'Chevrolet',  model: 'Corvette C8',       rok: 2022, wartosc: 67000,   kategoria: 'Sportowe' },
  { id: 'bmw_m3_2022',      marka: 'BMW',        model: 'M3',                rok: 2022, wartosc: 72000,   kategoria: 'Sportowe' },
  { id: 'bmw_m4_2022',      marka: 'BMW',        model: 'M4',                rok: 2022, wartosc: 75000,   kategoria: 'Sportowe' },
  { id: 'mercc_amg63',      marka: 'Mercedes',   model: 'AMG C63',           rok: 2022, wartosc: 77000,   kategoria: 'Sportowe' },
  { id: 'audi_rs6_2022',    marka: 'Audi',       model: 'RS6 Avant',         rok: 2022, wartosc: 85000,   kategoria: 'Sportowe' },
  { id: 'supra_2022',       marka: 'Toyota',     model: 'GR Supra',          rok: 2022, wartosc: 53000,   kategoria: 'Sportowe' },
  { id: 'nsx_2022',         marka: 'Honda',      model: 'NSX',               rok: 2022, wartosc: 165000,  kategoria: 'Sportowe' },
  { id: 'nissan_gtr',       marka: 'Nissan',     model: 'GT-R',              rok: 2022, wartosc: 115000,  kategoria: 'Sportowe' },
  { id: 'r8_2022',          marka: 'Audi',       model: 'R8 V10',            rok: 2022, wartosc: 160000,  kategoria: 'Sportowe' },

  // ─── Luksusowe / Supercar (wymagają Koneser Aut) ────────────────────────────
  { id: 'porsche_911_2022', marka: 'Porsche',    model: '911 Carrera',       rok: 2022, wartosc: 115000,  kategoria: 'Luksusowe' },
  { id: 'porsche_gt3_2022', marka: 'Porsche',    model: '911 GT3',           rok: 2022, wartosc: 180000,  kategoria: 'Luksusowe' },
  { id: 'mercc_amggt',      marka: 'Mercedes',   model: 'AMG GT',            rok: 2022, wartosc: 120000,  kategoria: 'Luksusowe' },
  { id: 'bmw_m8_2022',      marka: 'BMW',        model: 'M8',                rok: 2022, wartosc: 130000,  kategoria: 'Luksusowe' },
  { id: 'aston_vantage',    marka: 'Aston Martin', model: 'Vantage',         rok: 2022, wartosc: 145000,  kategoria: 'Luksusowe' },
  { id: 'aston_db11',       marka: 'Aston Martin', model: 'DB11',            rok: 2022, wartosc: 200000,  kategoria: 'Luksusowe' },
  { id: 'bentley_cont',     marka: 'Bentley',    model: 'Continental GT',    rok: 2022, wartosc: 220000,  kategoria: 'Luksusowe' },
  { id: 'rolls_ghost',      marka: 'Rolls-Royce',model: 'Ghost',             rok: 2022, wartosc: 330000,  kategoria: 'Luksusowe' },
  { id: 'rolls_cullinan',   marka: 'Rolls-Royce',model: 'Cullinan',          rok: 2022, wartosc: 380000,  kategoria: 'Luksusowe' },
  { id: 'mclaren_720s',     marka: 'McLaren',    model: '720S',              rok: 2022, wartosc: 300000,  kategoria: 'Luksusowe' },
  { id: 'mclaren_artura',   marka: 'McLaren',    model: 'Artura',            rok: 2022, wartosc: 240000,  kategoria: 'Luksusowe' },
  { id: 'ferrari_488',      marka: 'Ferrari',    model: '488 GTB',           rok: 2022, wartosc: 250000,  kategoria: 'Luksusowe' },
  { id: 'ferrari_sf90',     marka: 'Ferrari',    model: 'SF90 Stradale',     rok: 2022, wartosc: 500000,  kategoria: 'Luksusowe' },
  { id: 'lambo_huracan',    marka: 'Lamborghini',model: 'Huracán EVO',       rok: 2022, wartosc: 200000,  kategoria: 'Luksusowe' },
  { id: 'lambo_urus',       marka: 'Lamborghini',model: 'Urus',              rok: 2022, wartosc: 230000,  kategoria: 'Luksusowe' },
  { id: 'lambo_aventador',  marka: 'Lamborghini',model: 'Aventador SVJ',     rok: 2022, wartosc: 580000,  kategoria: 'Luksusowe' },
  { id: 'bugatti_chiron',   marka: 'Bugatti',    model: 'Chiron',            rok: 2022, wartosc: 3000000, kategoria: 'Luksusowe' },
  { id: 'bugatti_veyron',   marka: 'Bugatti',    model: 'Veyron',            rok: 2015, wartosc: 2000000, kategoria: 'Luksusowe' },
  { id: 'koenigsegg',       marka: 'Koenigsegg', model: 'Jesko',             rok: 2022, wartosc: 2800000, kategoria: 'Luksusowe' },

  // ─── Ciężarówki / Vany ──────────────────────────────────────────────────────
  { id: 'transit_2022',     marka: 'Ford',       model: 'Transit',           rok: 2022, wartosc: 38000,   kategoria: 'Vany' },
  { id: 'sprinter_2022',    marka: 'Mercedes',   model: 'Sprinter',          rok: 2022, wartosc: 45000,   kategoria: 'Vany' },
  { id: 'promaster_2022',   marka: 'RAM',        model: 'ProMaster',         rok: 2022, wartosc: 37000,   kategoria: 'Vany' },
  { id: 'savana_2022',      marka: 'GMC',        model: 'Savana',            rok: 2022, wartosc: 42000,   kategoria: 'Vany' },
  { id: 'f650_2022',        marka: 'Ford',       model: 'F-650',             rok: 2022, wartosc: 65000,   kategoria: 'Vany' },
  { id: 'silverado_hd',     marka: 'Chevrolet',  model: 'Silverado 2500HD',  rok: 2022, wartosc: 48000,   kategoria: 'Vany' },

  // ─── Elektryczne ────────────────────────────────────────────────────────────
  { id: 'tesla_m3_2022',    marka: 'Tesla',      model: 'Model 3',           rok: 2022, wartosc: 43000,   kategoria: 'Elektryczne' },
  { id: 'tesla_ms_2022',    marka: 'Tesla',      model: 'Model S',           rok: 2022, wartosc: 92000,   kategoria: 'Elektryczne' },
  { id: 'tesla_mx_2022',    marka: 'Tesla',      model: 'Model X',           rok: 2022, wartosc: 98000,   kategoria: 'Elektryczne' },
  { id: 'tesla_plaid',      marka: 'Tesla',      model: 'Model S Plaid',     rok: 2022, wartosc: 130000,  kategoria: 'Elektryczne' },
  { id: 'rivian_r1t',       marka: 'Rivian',     model: 'R1T',               rok: 2022, wartosc: 67000,   kategoria: 'Elektryczne' },
  { id: 'ioniq5_2022',      marka: 'Hyundai',    model: 'IONIQ 5',           rok: 2022, wartosc: 44000,   kategoria: 'Elektryczne' },
  { id: 'polestar2_2022',   marka: 'Polestar',   model: '2',                 rok: 2022, wartosc: 48000,   kategoria: 'Elektryczne' },
];

// Limit ceny dla roli Koneser Aut
const KONESER_LIMIT = 100000;

// Pobierz pojazd po ID
function getVehicleById(id) {
  return VEHICLES.find(v => v.id === id) || null;
}

// Pogrupuj po kategoriach
function getByCategory() {
  const groups = {};
  for (const v of VEHICLES) {
    if (!groups[v.kategoria]) groups[v.kategoria] = [];
    groups[v.kategoria].push(v);
  }
  return groups;
}

// Lista unikalnych kategorii
function getCategories() {
  return [...new Set(VEHICLES.map(v => v.kategoria))];
}

// Formatowanie ceny
function formatPrice(n) {
  return new Intl.NumberFormat('pl-PL').format(n) + ' $';
}

module.exports = { VEHICLES, KONESER_LIMIT, getVehicleById, getByCategory, getCategories, formatPrice };
