// add-job-limits.js — dodaje max_pracownikow do każdej pracy

const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'server-config.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Limity per job id (lub fallback po kategorii)
const LIMITS = {
  // Policja
  fox_valley_police: 10,
  outagamie_sheriff: 8,
  wisconsin_state_patrol: 6,
  // Dyspozytornia
  outagamie_communications: 4,
  // Straż
  brookmere_fire: 6,
  greenville_fire_rescue: 8,
  // EMS
  fox_mountain_medical: 8,
  // DOT
  wisconsin_dot: 5,
  // Security / Park
  security_guard: 8,
  national_park_service: 5,
  // Transport
  taxi_driver: 6,
  sahara_delivery: 5,
  school_bus_driver: 4,
  gv_transit: 5,
  // Kryminalne
  heist_crew: 6,
  // Edukacja
  teacher: 4,
  driving_experience_teacher: 3,
  daycare: 4,
  librarian: 3,
  student: 20,
  // Zdrowie
  fox_mountain_medical: 8,
  heritage_animal_hospital: 4,
  lifeguard: 4,
  // Przemysł / Rolnictwo
  factory_pulse: 5,
  farmer: 4,
  // Finanse
  credit_union: 3,
  fox_mountain_banker: 3,
  allen_insurance: 3,
  // Administracja
  dmv: 4,
  greenville_town_hall: 3,
  horton_village_hall: 3,
  // Inne
  unemployed: 0,
};

// Domyślne limity per kategoria
const CAT_DEFAULTS = {
  'Gastronomia': 5,
  'Kawiarnia': 4,
  'Handel': 5,
  'Motoryzacja': 4,
  'Rozrywka': 4,
  'Usługi': 4,
  'Administracja': 3,
  'Edukacja': 4,
  'Zdrowie': 4,
  'Przemysł': 4,
  'Rolnictwo': 3,
  'Finanse': 3,
  'Transport': 5,
  'Przestępczość': 6,
  'Policja': 8,
  'Straż': 6,
  'EMS': 8,
  'DOT': 5,
  'Dyspozytornia': 4,
  'Inne': 0,
};

let count = 0;
cfg.jobs.forEach(job => {
  if (!('max_pracownikow' in job)) {
    job.max_pracownikow = LIMITS[job.id] ?? CAT_DEFAULTS[job.kategoria] ?? 5;
    count++;
  }
});

fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log(`Added max_pracownikow to ${count} jobs`);
console.log('Sample:');
cfg.jobs.slice(0, 6).forEach(j => console.log(`  ${j.name}: ${j.max_pracownikow}`));
