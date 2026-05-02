// Baza pojazdów Greenville RP — nazwy i ceny z oficjalnej wiki
// https://greenville-wisconsin.fandom.com/wiki/List_of_all_vehicles_in_Greenville
//
// typ:
//   CIVILIAN  — każdy może zarejestrować
//   KLASYK    — wymagana rola "Kolekcjoner Aut" (klasyki/vintage)
//   LUKSUS    — wymagana rola "Koneser Aut" (droższe luksusowe)
//   POLICJA   — wymagana rola "Policja"
//   STRAZ     — wymagana rola "Straż"
//   EMS       — wymagana rola "EMS"
//   DOT       — wymagana rola "DOT"

const VEHICLES = [

  // ═══════════════════════════════════════════════════════════════════════════
  // TANIE / CODZIENNE  (do ~$20 000)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'wego_coral_90',        nazwa: '1990 WeGo Coral GV',                   cena: 2189,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'globe_city_96',        nazwa: '1996 Globe City Beater',                cena: 1500,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'newcar_falcata_96',    nazwa: '1996 Newcar Falcata XA',                cena: 2190,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'bullhorn_vivid_97',    nazwa: '1997 BullHorn Vivid',                   cena: 2000,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'caseus_imp_00',        nazwa: '2000 Caseus Imperator Fleet',           cena: 2000,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'falcon_aq_00',         nazwa: '2000 Falcon Aquarius LX',               cena: 2150,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'combi_sat_01',         nazwa: '2001 Combi Satisfaction S',             cena: 2000,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'bullhorn_conv_99',     nazwa: '1999 BullHorn Convoy',                  cena: 2700,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'sumo_woodlands_05',    nazwa: '2005 Sumo Woodlands X',                 cena: 2008,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'bayro_s30_90',         nazwa: '1990 Bayro Series30 Sedan 24d',         cena: 2500,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'brawnson_b1500_92',    nazwa: '1992 Brawnson B1500',                   cena: 3500,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'falcon_scav_96',       nazwa: '1996 Falcon Scavenger XLT',             cena: 3000,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'volzhsky_rocket_95',   nazwa: '1995 Volzhsky Rocket Basic',            cena: 5500,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'renault_twingo_95',    nazwa: '1995 Renault Twingo Easy',              cena: 5000,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'western_mamba_94',     nazwa: '1994 Western Mamba',                    cena: 4000,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'mizushima_hon_09',     nazwa: '2009 Mizushima Honor ES',               cena: 3499,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'wolfsburg_glide_08',   nazwa: '2008 Wolfsburg Glide Starter',          cena: 3000,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'shizuoka_slick_h',     nazwa: '2000 Shizuoka Slick Hatchback',         cena: 3150,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'durant_venice_12',     nazwa: '2012 Durant Venice L',                  cena: 4995,    kategoria: 'Tanie',   typ: 'CIVILIAN' },
  { id: 'navara_summit_98',     nazwa: '1998 Navara Summit SE-L',               cena: 3100,    kategoria: 'Tanie',   typ: 'CIVILIAN' },

  // ═══════════════════════════════════════════════════════════════════════════
  // KOMPAKTY / HATCHBACKI  ($5 000 – $25 000)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'wolfsburg_charge_97',  nazwa: '1997 Wolfsburg Charge GL',              cena: 4000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_charge_03',  nazwa: '2003 Wolfsburg Charge GLS TDI',         cena: 5000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_nclass_03',  nazwa: '2003 Wolfsburg New Classic GL',         cena: 4000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_sprint_08',  nazwa: '2008 Wolfsburg Sprint S 3-Door',        cena: 5000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_pitch_00',   nazwa: '2000 Wolfsburg Pitch 1.8T',             cena: 8000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_pitch_13',   nazwa: '2013 Wolfsburg Pitch SE 2.0TDI',        cena: 8000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_pitch_16',   nazwa: '2016 Wolfsburg Pitch S 3-Door',         cena: 15000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'western_cervid_97',    nazwa: '1997 Western Cervid 3S VR6',            cena: 11500,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'western_python_97',    nazwa: '1997 Western Python 3',                 cena: 4250,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'western_wendigo_02',   nazwa: '2002 Western Wendigo S Joey',           cena: 5000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'mazuku_lag_90',        nazwa: '1990 Mazuku Laguna NA',                 cena: 15000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'chryslus_ft3_03',      nazwa: '2003 Chryslus FT Stroller 5-Door',      cena: 3000,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'chryslus_lot_17',      nazwa: '2017 Chryslus Lotela LX FWD',           cena: 14590,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'falcon_dist_h_13',     nazwa: '2013 Falcon Distinct Hatchback SE',     cena: 7500,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'falcon_dist_17',       nazwa: '2017 Falcon Distinct Sedan S',          cena: 9399,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'falcon_dist_h_17',     nazwa: '2017 Falcon Distinct Hatchback SE',     cena: 10999,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'falcon_fission_19',    nazwa: '2019 Falcon Fission S',                 cena: 19999,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'falcon_impact_18',     nazwa: '2018 Falcon Impact S 1.0T',             cena: 16000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'sumo_ota_06',          nazwa: '2006 Sumo Ota Sedan 2.5',               cena: 3480,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'sumo_rockies_06',      nazwa: '2006 Sumo Rockies 2.5',                 cena: 7850,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'sumo_woodlands_18',    nazwa: '2018 Sumo Woodlands Base',              cena: 14900,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'idea_twofer_08',       nazwa: '2008 Idea Twofer Pure',                 cena: 11000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'renault_megane_18',    nazwa: '2018 Renault Megane R.S. 280',          cena: 36500,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'viking_tors_97_s',     nazwa: '1997 Viking Torslanda Sedan',           cena: 7500,    kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'viking_tors_16_s',     nazwa: '2016 Viking Torslanda Sedan 2.0T FWD', cena: 15000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_tornado_13', nazwa: '2013 Wolfsburg Tornado Tech-GT',        cena: 10000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'wolfsburg_raven_15',   nazwa: '2015 Wolfsburg Raven S',                cena: 10000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'navara_compact_20',    nazwa: '2020 Navara Compact S',                 cena: 16850,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'caseus_e2_20',         nazwa: '2020 Caseus E2',                        cena: 24000,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'acadia_syz_20',        nazwa: '2020 Acadia Syzygy BX',                 cena: 21500,   kategoria: 'Kompakty', typ: 'CIVILIAN' },
  { id: 'bandit_pred_16',       nazwa: '2016 Bandit Predator 2.0T',             cena: 22500,   kategoria: 'Kompakty', typ: 'CIVILIAN' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEDANY / KOMBI  ($8 000 – $60 000)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'arrow_phoenix_88',     nazwa: '1988 Arrow Phoenix Pacer',              cena: 13190,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_horizon_89',    nazwa: '1989 Navara Horizon GTS',               cena: 25134,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'chryslus_aurora_08',   nazwa: '2008 Chryslus Aurora Hybrid',           cena: 12000,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'chryslus_champ_08',    nazwa: '2008 Chryslus Champion LX',             cena: 6500,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'falcon_breeze_03',     nazwa: '2003 Falcon Breeze SE',                 cena: 3300,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'falcon_prime_07',      nazwa: '2007 Falcon Prime LX',                  cena: 4500,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'falcon_aquarius_12',   nazwa: '2012 Falcon Aquarius',                  cena: 10000,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'falcon_aquarius_15',   nazwa: '2015 Falcon Aquarius SE',               cena: 14000,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'maverick_arist_07',    nazwa: '2007 Maverick Aristocrat GS',           cena: 4500,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'maverick_valiant_06',  nazwa: '2006 Maverick Valiant',                 cena: 13000,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'sentinel_eurus_01',    nazwa: '2001 Sentinel Eurus V8',                cena: 4500,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_imp_08',        nazwa: '2008 Navara Imperium 2.5S',             cena: 7095,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_imp_13',        nazwa: '2013 Navara Imperium 2.5L S',           cena: 11000,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_imp_cpe_12',    nazwa: '2012 Navara Imperium Coupe 2.5L S',     cena: 11995,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_beat_14',       nazwa: '2014 Navara Beat Navmo RS',             cena: 17350,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_star_08',       nazwa: '2008 Navara Star',                      cena: 18278,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_star_11',       nazwa: '2011 Navara Star',                      cena: 26990,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'navara_star_19',       nazwa: '2019 Navara Star',                      cena: 37990,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'bayro_s10_12',         nazwa: '2012 Bayro Series10 25t SportLine',     cena: 6995,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'bayro_s30_20',         nazwa: '2020 Bayro Series30 20d',               cena: 19750,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'bayro_s50_10',         nazwa: '2010 Bayro Series50 28t',               cena: 10450,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'stuttgart_essen_17',   nazwa: '2017 Stuttgart Essen 300',              cena: 22298,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'stuttgart_exec_17',    nazwa: '2017 Stuttgart Executive 3.0L',         cena: 41500,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'stuttgart_kob_17',     nazwa: '2017 Stuttgart Koblenz 400',            cena: 33880,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'oland_exek_11',        nazwa: '2011 Oland Exekutiv I4 FWD',            cena: 17350,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'viking_goth_09',       nazwa: '2009 Viking Gothenburg 3.2 FWD',        cena: 8000,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'sentinel_plat_20',     nazwa: '2020 Sentinel Platinum',                cena: 41350,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'vision_puremia_16',    nazwa: '2016 Vision Puremia VL Fleet',          cena: 17999,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'vision_rainier_17',    nazwa: '2017 Vision Rainier LX',                cena: 25850,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'elgrand_hor_04',       nazwa: '2004 Elgrand Horizon',                  cena: 7995,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'elgrand_hor_08',       nazwa: '2008 Elgrand Horizon Journey RWD',      cena: 9735,    kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'tony_cinco_14',        nazwa: '2014 TONY Cinco Carrera',               cena: 12300,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'tony_ciento_17',       nazwa: '2017 TONY Ciento Classica',             cena: 20995,   kategoria: 'Sedany',  typ: 'CIVILIAN' },
  { id: 'leland_lcs_19',        nazwa: '2019 Leland LCS Luxury 2.0T',           cena: 53690,   kategoria: 'Sedany',  typ: 'CIVILIAN' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUV / OFFROAD  ($10 000 – $90 000)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'overland_nav_93',      nazwa: '1993 Overland Navajo SE 4D',            cena: 8299,    kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'overland_nav_01',      nazwa: '2001 Overland Navajo SE 4D',            cena: 9350,    kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'overland_apac_04',     nazwa: '2004 Overland Apache Laredo',           cena: 4400,    kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'overland_apac_14',     nazwa: '2014 Overland Buckaroo Mojave',         cena: 19000,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'overland_apac_20',     nazwa: '2020 Overland Apache Laredo',           cena: 28499,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'overland_sfp_20',      nazwa: '2020 Overland Apache SFP',              cena: 77349,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'maverick_hiker_03',    nazwa: '2003 Maverick Hiker Premier',           cena: 4600,    kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'bullhorn_pueblo_08',   nazwa: '2008 BullHorn Pueblo Premium',          cena: 9000,    kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'bullhorn_location_15', nazwa: '2015 BullHorn Location Crossroad',      cena: 24000,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'sentinell_adv_13',     nazwa: '2013 Sentinel Adventurer SWB',          cena: 24500,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'navara_advent_08',     nazwa: '2008 Navara Adventure 3.5',             cena: 7000,    kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'chryslus_sub_08',      nazwa: '2008 Chryslus Suburbia LX',             cena: 9500,    kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'chryslus_com_06',      nazwa: '2006 Chryslus Comercio Limited',        cena: 20000,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'chryslus_puma_02',     nazwa: '2002 Chryslus Puma Soft-Top',           cena: 28000,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'sumo_trailstar_16',    nazwa: '2016 Sumo Trailstar',                   cena: 15230,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'sumo_trailstar_20',    nazwa: '2020 Sumo Trailstar Limited',           cena: 28500,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'sumo_woodlands_20',    nazwa: '2020 Sumo Woodlands Limited',           cena: 30500,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'wolfsburg_karen_17',   nazwa: '2017 Wolfsburg Karen 2.0T',             cena: 28000,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'wolfsburg_pos_18',     nazwa: '2018 Wolfsburg Poseidon 2.0T FWD',      cena: 27800,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'bayro_y50_20',         nazwa: '2020 Bayro Y50 AWD30d',                 cena: 34306,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'bayro_y60_20',         nazwa: '2020 Bayro Y60 AWD30d',                 cena: 35306,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'durant_cam_dogg',      nazwa: '2020 Durant Camion DOGG 650',           cena: 89647,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'wolfsburg_handel_18',  nazwa: '2018 Wolfsburg Handel S',               cena: 15900,   kategoria: 'SUV',     typ: 'CIVILIAN' },
  { id: 'mazuku_kaz_20',        nazwa: '2020 Mazuku Kazoku Sport FWD',          cena: 26440,   kategoria: 'SUV',     typ: 'CIVILIAN' },

  // ═══════════════════════════════════════════════════════════════════════════
  // PICKUPY / VANY / CIĘŻAROWE  ($2 000 – $70 000)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'durant_lm1500_71',     nazwa: '1971 Durant L/M 1500',                  cena: 4567,    kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'durant_lm2500_71',     nazwa: '1971 Durant L/M 2500',                  cena: 10754,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'bullhorn_buf_97',      nazwa: '1997 BullHorn Buffalo 1500 SLT',        cena: 14075,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'bullhorn_buf_18',      nazwa: '2018 BullHorn Buffalo 1500 Tradesman',  cena: 23990,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'bullhorn_buf_hd',      nazwa: '2018 BullHorn Buffalo HD 2500',         cena: 29740,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'bullhorn_sfp10_18',    nazwa: '2018 BullHorn Buffalo SFP-10',          cena: 68708,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_scav_03',       nazwa: '2003 Falcon Scavenger XLT',             cena: 3500,    kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_scav_06',       nazwa: '2006 Falcon Scavenger',                 cena: 3000,    kategoria: 'Pickupy', typ: 'CIVILIAN' }, // to samo co Scavenger 03
  { id: 'falcon_scav_13',       nazwa: '2013 Falcon Scavenger',                 cena: 16000,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_scav_16',       nazwa: '2016 Falcon Scavenger',                 cena: 21600,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_adv_14',        nazwa: '2014 Falcon Advance XL',                cena: 18500,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_adv_17',        nazwa: '2017 Falcon Advance Beast',             cena: 49520,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_adv_19',        nazwa: '2019 Falcon Advance XLT Crew Cab',      cena: 42500,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_trav_06',       nazwa: '2006 Falcon Traveller XLS',             cena: 7500,    kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_wand_02',       nazwa: '2002 Falcon Wanderer XLT',              cena: 10000,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'falcon_dep_19',        nazwa: '2019 Falcon Departure',                 cena: 24500,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'bandit_ute_16',        nazwa: '2016 Bandit Ute',                       cena: 23000,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'durant_camion_20',     nazwa: '2020 Durant Camion SL',                 cena: 49064,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'durant_camion_hd',     nazwa: '2020 Durant Camion HD TL',              cena: 59301,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'durant_voyager_20',    nazwa: '2020 Durant Voyager Exploration',       cena: 68457,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'bullhorn_gconv_08',    nazwa: '2008 BullHorn Grand Convoy Cargo',      cena: 8500,    kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'bullhorn_sc_20',       nazwa: '2020 BullHorn SuperCarrier Cargo',      cena: 34000,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'explorer_dep_07',      nazwa: '2007 Explorer Dependable 4300 Tow Truck', cena: 41500, kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'stuttgart_jog_17',     nazwa: '2017 Stuttgart Jogger 2500 Cargo',      cena: 41000,   kategoria: 'Pickupy', typ: 'CIVILIAN' },
  { id: 'wolfsburg_van_61',     nazwa: '1961 Wolfsburg Van Panel',              cena: 34755,   kategoria: 'Pickupy', typ: 'KLASYK' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTOWE  ($10 000 – $110 000)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'bullhorn_ninja_96',    nazwa: '1996 BullHorn Ninja TR Twin Turbo',     cena: 13000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'mazuku_sank_95',       nazwa: '1995 Mazuku Sankakkei',                 cena: 43200,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'mazuku_sank_02',       nazwa: '2002 Mazuku Sankakkei Spirit R',        cena: 82500,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'mazuku_sank_12',       nazwa: '2012 Mazuku Sankakkei Sport',           cena: 13000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'mazuku_yuzu_07',       nazwa: '2007 Mazuku Yushu Performance',         cena: 11000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'mizushima_yari_05',    nazwa: '2005 Mizushima Yari Rally-8',           cena: 30000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'sumo_boxas_04',        nazwa: '2004 Sumo Boxas Rally X',               cena: 30000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'sumo_boxas_17',        nazwa: '2017 Sumo Boxas',                       cena: 27695,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'sumo_clim_gt_15',      nazwa: '2015 Sumo Climax GT',                   cena: 24000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'sumo_wood_spt_05',     nazwa: '2005 Sumo Woodlands SPT',               cena: 26121,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'ferdinand_road_04',    nazwa: '2004 Ferdinand Roadster 2.7',           cena: 29895,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'ferdinand_tour_90',    nazwa: '1990 Ferdinand Tourer S4',              cena: 47928,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'ferdinand_tour_95',    nazwa: '1995 Ferdinand Tourer GTS',             cena: 89258,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'ferdinand_jal_12',     nazwa: '2012 Ferdinand Jalapeno S',             cena: 22000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'ferdinand_rap_17',     nazwa: '2017 Ferdinand Rapido',                 cena: 83500,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'cobalt_pur_12',        nazwa: '2012 Cobalt Pursuiter Civil',           cena: 30000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'maverick_crim_04',     nazwa: '2004 Maverick Criminal',                cena: 21500,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'navara_hor_09',        nazwa: '2009 Navara Horizon',                   cena: 70324,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'navara_hor_17',        nazwa: '2017 Navara Horizon Premium',           cena: 109990,  kategoria: 'Sportowe', typ: 'KONESER' },
  { id: 'durant_manta_19',      nazwa: '2019 Durant Manta',                     cena: 55900,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'durant_manta_h1k',     nazwa: '2019 Durant Manta H1000',               cena: 265000,  kategoria: 'Sportowe', typ: 'KONESER' },
  { id: 'bullhorn_sfp_08',      nazwa: '2008 BullHorn Python SFP-10',           cena: 60000,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'bullhorn_sfp_17',      nazwa: '2017 BullHorn SFP Python GTS',          cena: 107995,  kategoria: 'Sportowe', typ: 'KONESER' },
  { id: 'falcon_her_05',        nazwa: '2005 Falcon Heritage',                  cena: 450000,  kategoria: 'Sportowe', typ: 'KONESER' },
  { id: 'marlin_vel_07',        nazwa: '2007 Marlin Motors Velindre 3.2',       cena: 17830,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'vision_dom_06',        nazwa: '2006 Vision Dominator',                 cena: 31680,   kategoria: 'Sportowe', typ: 'CIVILIAN' },
  { id: 'overland_sfp_dogg',    nazwa: '2020 Overland Apache SFP DOGG D1000',   cena: 116937,  kategoria: 'Sportowe', typ: 'KONESER' },
  { id: 'leland_lcs_v_19',      nazwa: '2019 Leland LCS-V',                     cena: 87990,   kategoria: 'Sportowe', typ: 'CIVILIAN' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ELEKTRYCZNE  ($4 000 – $130 000)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'sunray_thrust_96',     nazwa: '1996 Sunray Thrust Electric',           cena: 4000,    kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'shizuoka_vision_03',   nazwa: '2003 Shizuoka Vision Beater',           cena: 3999,    kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'celestial_t1_08',      nazwa: '2008 Celestial Type-1',                 cena: 50000,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'celestial_t5_12',      nazwa: '2012 Celestial Type-5',                 cena: 27400,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'celestial_t1_13',      nazwa: '2013 Celestial Type-1 Sport',           cena: 100000,  kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'celestial_t5_13',      nazwa: '2013 Celestial Type-5',                 cena: 31670,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'celestial_t5_18',      nazwa: '2018 Celestial Type-5 AWD',             cena: 38640,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'celestial_t4_19',      nazwa: '2019 Celestial Type-4',                 cena: 36000,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'celestial_t6_20',      nazwa: '2020 Celestial Type-6 Standard RWD',   cena: 40630,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'dejavu_trad_12',       nazwa: '2012 DejaVu Tradition',                 cena: 60000,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'vision_prima_12',      nazwa: '2012 Vision Prima ES',                  cena: 13500,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'wolfsburg_epitch_19',  nazwa: '2019 Wolfsburg Pitch e-Pitch SE',       cena: 17500,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'mazuku_sank_ev_08',    nazwa: '2008 Mazuku Sankakkei EV Conversion',   cena: 12500,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'navara_eco_15',        nazwa: '2015 Navara Eco S',                     cena: 8500,    kategoria: 'Elektryczne', typ: 'CIVILIAN' },
  { id: 'eezee_ziggy_08',       nazwa: '2008 Eezee Ziggy EZ800',                cena: 170000,  kategoria: 'Elektryczne', typ: 'KONESER' },
  { id: 'dejavu_trad_19',       nazwa: '2019 DejaVu Tradition',                 cena: 90000,   kategoria: 'Elektryczne', typ: 'CIVILIAN' },

  // ═══════════════════════════════════════════════════════════════════════════
  // KLASYKI — wymagana rola "Kolekcjoner Aut"
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'auburn_coupe_40',      nazwa: '1940 Auburn Skipper Coupe Antique',     cena: 4790,    kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'arrow_exec_53',        nazwa: '1953 Arrow Executive Country Tourer',   cena: 19335,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'auburn_l3_53',         nazwa: '1953 Auburn L3 Short Bed',              cena: 8000,    kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'auburn_skip_57',       nazwa: '1957 Auburn Skipper Club Sedan',        cena: 6500,    kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'mayflower_rage_58',    nazwa: '1958 Mayflower Rage Hardtop',           cena: 87500,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'bitsy_class_63',       nazwa: '1963 BITSY Classic City',               cena: 11345,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'wolfsburg_cl_65',      nazwa: '1965 Wolfsburg Classic 1200',           cena: 25000,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'auburn_green_66',      nazwa: '1966 Auburn Greenwich Country',         cena: 13455,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'silhouette_vel_67',    nazwa: '1967 Silhouette Veloce S',              cena: 297000,  kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'bullhorn_pranc_69',    nazwa: '1969 BullHorn Prancer',                 cena: 35865,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'bullhorn_conq_69',     nazwa: '1969 BullHorn Conqueror 500 Hardtop',   cena: 61352,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'durant_amigo_69',      nazwa: '1969 Durant Amigo 250',                 cena: 27110,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'leland_diam_69',       nazwa: '1969 Leland Diamante',                  cena: 25950,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'falcon_stall_70',      nazwa: '1970 Falcon Stallion Boss 302',         cena: 72835,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'bullhorn_det_71',      nazwa: '1971 BullHorn Determinator TR',         cena: 37500,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'mayflower_orb_71',     nazwa: '1971 Mayflower Orbiter',                cena: 13559,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'stuttgart_uhl_71',     nazwa: '1971 Stuttgart Uhlenhaut 280 Coupe',    cena: 11350,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'falcon_pony_72',       nazwa: '1972 Falcon Pony Hatch Runabout',       cena: 16735,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'navara_star_72',       nazwa: '1972 Navara Star',                      cena: 28799,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'renault5_turbo_80',    nazwa: '1980 Renault 5 Turbo',                  cena: 96458,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'bayro_w10_81',         nazwa: '1981 Bayro W10',                        cena: 67670,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'ferdinand_rap_81',     nazwa: '1981 Ferdinand Rapido Turbo',           cena: 85945,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'wynne_m12_83',         nazwa: '1983 Wynne Model-12',                   cena: 45000,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'brawnson_nob_86',      nazwa: '1986 Brawnson Noble Sport Limited',     cena: 20150,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'silhouette_att_86',    nazwa: '1986 Silhouette Attraente',             cena: 553100,  kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'bullhorn_can_87',      nazwa: '1987 BullHorn Canaveral',               cena: 9550,    kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'avanta_zeta_88',       nazwa: '1988 Avanta Zeta Coupe Avard',          cena: 29550,   kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'silhouette_att_88',    nazwa: '1988 Silhouette Attraente',             cena: 578350,  kategoria: 'Klasyki', typ: 'KLASYK' },
  { id: 'bitsy_class_06',       nazwa: '2006 BITSY Classic',                    cena: 6730,    kategoria: 'Klasyki', typ: 'KLASYK' },

  // ═══════════════════════════════════════════════════════════════════════════
  // LUKSUSOWE — wymagana rola "Koneser Aut"  (pojazdy oznaczone kursywą w grze)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'stuttgart_mun_55',     nazwa: '1955 Stuttgart Munster 300',            cena: 1287249, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'jaguar_etype_61',      nazwa: '1961 Jaguar E-Type Series I Roadster',  cena: 107000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'chiara_berl_62',       nazwa: '1962 Chiara Berlinetta GT',             cena: 1450000, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'chryslus_jets_64',     nazwa: '1964 Chryslus Jetstream Coupe',         cena: 400000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'bayro_w30_90_s',       nazwa: '1990 Bayro W30 Sedan W',                cena: 71250,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'bayro_w30_90_w',       nazwa: '1990 Bayro W30 Wagon W',                cena: 72500,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'bayro_w30_90_c',       nazwa: '1990 Bayro W30 Coupe W',                cena: 70000,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'jaguar_xj220_94',      nazwa: '1994 Jaguar XJ220 Coupe',               cena: 720850,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'land_rover_def_97',    nazwa: '1997 Land Rover Defender 90 NAS',       cena: 60900,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'sentinel_parl_98',     nazwa: '1998 Sentinel Parliament Executive',    cena: 7995,    kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'saleen_s7_05',         nazwa: '2005 Saleen S7 Twin Turbo',             cena: 575000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'falcon_fwd_limo_05',   nazwa: '2005 Falcon Fowarder Limo Celebrity',   cena: 350000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'leland_deroute_limo',  nazwa: '2005 Leland DeRoute Limousine',         cena: 18370,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'saleen_s7_06',         nazwa: '2006 Saleen S7 TT Competition Package', cena: 725000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'pagani_zonda_06',      nazwa: '2006 Pagani Zonda Roadster F',          cena: 1750000, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'ferdinand_ult_07',     nazwa: '2007 Ferdinand Ultima GT',              cena: 1300000, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'sentinel_parl_07',     nazwa: '2007 Sentinel Parliament Signature',    cena: 11225,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'bayro_w10_12',         nazwa: '2012 Bayro W10',                        cena: 59995,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'bayro_w50_10',         nazwa: '2010 Bayro W50 Base',                   cena: 39800,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'sir_rodgers_zen_10',   nazwa: '2010 Sir Rodgers Zenith',               cena: 159998,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'stuttgart_e063_10',    nazwa: '2010 Stuttgart E-Saloon 063',           cena: 34500,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'silhouette_gio_11',    nazwa: '2011 Silhouette Gioiosa SP-552',        cena: 135172,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'surrey_ren_12',        nazwa: '2012 Surrey Renaissance',               cena: 203325,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'navara_gtr_02',        nazwa: '2002 Navara Horizon GT-R Series-II',    cena: 485259,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'jaguar_xk_13',         nazwa: '2013 Jaguar XK R-S Convertible',        cena: 74280,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'jaguar_xjl_14',        nazwa: '2014 Jaguar XJ-L R',                    cena: 48790,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'jaguar_xf_15',         nazwa: '2015 Jaguar XF R-S',                    cena: 64550,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'marlin_swan_13',       nazwa: '2013 Marlin Motors Swan 1.3',           cena: 38256,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'stuttgart_falke_14',   nazwa: '2014 Stuttgart Sport Falke Coupe',      cena: 190000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'ramsey50_15',          nazwa: '2015 Ramsey 50 Coupe',                  cena: 130000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'stuttgart_kecs_45',    nazwa: '2015 Stuttgart Kecskemet 45',           cena: 42220,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'stuttgart_vance_63',   nazwa: '2015 Stuttgart Vance 63',               cena: 41995,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'zephyr_vic_15',        nazwa: '2015 Zephyr Vicieux',                   cena: 1690000, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'surrey_lt500_16',      nazwa: '2016 Surrey LT-500',                    cena: 349599,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'surrey_s350_16',       nazwa: '2016 Surrey S-350 Coupe',               cena: 265035,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'stuttgart_ess63_18',   nazwa: '2018 Stuttgart Essen 63',               cena: 55007,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'land_rover_sv_18',     nazwa: '2018 Land Rover Range Rover SV Autobiography', cena: 189535, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'skane_rusa_18',        nazwa: '2018 Skane Rusa',                       cena: 1875555, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'pagani_huayra_17',     nazwa: '2017 Pagani Huayra Roadster',           cena: 2375000, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'pagani_zonda_17',      nazwa: '2017 Pagani Zonda HP Barchetta',        cena: 2895000, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'stuttgart_jog_limo',   nazwa: '2017 Stuttgart Jogger Limo',            cena: 150000,  kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'land_rover_spt_19',    nazwa: '2019 Land Rover Range Rover Sport SVR', cena: 93250,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'land_rover_vel_20',    nazwa: '2020 Land Rover Range Rover Velar SVA', cena: 78000,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'surrey_speed_20',      nazwa: '2020 Surrey Speedlet Coupe',            cena: 2250000, kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'bayro_y50w_20',        nazwa: '2020 Bayro Y50 W AWD',                  cena: 81395,   kategoria: 'Luksusowe', typ: 'KONESER' },
  { id: 'bayro_y60w_20',        nazwa: '2020 Bayro Y60 W AWD',                  cena: 82395,   kategoria: 'Luksusowe', typ: 'KONESER' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SŁUŻBOWE — POLICJA  (WSP, Metro, Sheriff, Security)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'auburn_wsp_57',        nazwa: '1957 Auburn Skipper WSP',               cena: 55000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_scav_wsp_96',   nazwa: '1996 Falcon Scavenger WSP MCE',         cena: 9500,    kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_trav_wsp_98',   nazwa: '1998 Falcon Traveller WSP MCE',         cena: 9500,    kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'caseus_wsp_00',        nazwa: '2000 Caseus Imperator Interceptor WSP', cena: 15000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_prime_metro_07',nazwa: '2007 Falcon Prime Police Interceptor Metro', cena: 10500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_prime_sher_07', nazwa: '2007 Falcon Prime Police Interceptor Sheriff', cena: 10500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_prime_wsp_07',  nazwa: '2007 Falcon Prime Police Interceptor WSP', cena: 10500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_prime_sec_07',  nazwa: '2007 Falcon Prime Police Interceptor Security', cena: 9500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'bullhorn_bull_wsp_08', nazwa: '2008 BullHorn Bullet WSP',              cena: 22800,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'bullhorn_pranc_wsp_08',nazwa: '2008 BullHorn Prancer WSP',             cena: 14000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'cobalt_pur_sher_12',   nazwa: '2012 Cobalt Pursuiter Sheriff',         cena: 30000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'cobalt_pur_wsp_12',    nazwa: '2012 Cobalt Pursuiter WSP',             cena: 30000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'bullhorn_pr_sher_13',  nazwa: '2013 BullHorn Prancer Sheriff',         cena: 17500,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'bullhorn_pr_wsp_13',   nazwa: '2013 BullHorn Prancer WSP',             cena: 17500,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_sc_metro_13',   nazwa: '2013 Falcon Scavenger Interceptor Metro', cena: 34000, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_sc_sher_13',    nazwa: '2013 Falcon Scavenger Interceptor Sheriff', cena: 34000, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_sc_wsp_13',     nazwa: '2013 Falcon Scavenger WSP Slicktop',    cena: 34000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_aq_metro_15',   nazwa: '2015 Falcon Aquarius Interceptor Metro', cena: 37500,  kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_aq_sher_15',    nazwa: '2015 Falcon Aquarius Interceptor Sheriff Ghost', cena: 37500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_aq_wsp_15',     nazwa: '2015 Falcon Aquarius Interceptor WSP Unmarked', cena: 37500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_aq_sec_15',     nazwa: '2015 Falcon Aquarius Security',         cena: 37500,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_sc_metro_16',   nazwa: '2016 Falcon Scavenger Interceptor Metro Alt', cena: 37500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_sc_sher_16',    nazwa: '2016 Falcon Scavenger Interceptor Sheriff K-9', cena: 37500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_sc_wsp_16',     nazwa: '2016 Falcon Scavenger Interceptor WSP Unmarked', cena: 37500, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_sc_sec_16',     nazwa: '2016 Falcon Scavenger Security',        cena: 37500,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_fiss_wsp_19',   nazwa: '2019 Falcon Fission Interceptor WSP',   cena: 25000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_fiss_sher_19',  nazwa: '2019 Falcon Fission Interceptor Sheriff', cena: 25000, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_dep_sec_19',    nazwa: '2019 Falcon Departure Security',        cena: 25000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_fiss_sec_19',   nazwa: '2019 Falcon Fission Interceptor Security', cena: 25000, kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'durant_cam_wsp_20',    nazwa: '2020 Durant Camion PPV WSP K-9',        cena: 42000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'durant_cam_sher_20',   nazwa: '2020 Durant Camion PPV Sheriff',        cena: 42000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_adv_wsp_17',    nazwa: '2017 Falcon Advance Pro WSP',           cena: 34000,   kategoria: 'Policja', typ: 'POLICJA' },
  { id: 'falcon_adv_swat_17',   nazwa: '2017 Falcon Advance Pro SWAT Sheriff',  cena: 42000,   kategoria: 'Policja', typ: 'POLICJA' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SŁUŻBOWE — STRAŻ POŻARNA
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'falcon_prime_fire_07', nazwa: '2007 Falcon Prime Fire Rescue EMS',     cena: 10500,   kategoria: 'Straż', typ: 'STRAZ' },
  { id: 'falcon_adv_fire_14',   nazwa: '2014 Falcon Advance Fire Rescue',       cena: 28000,   kategoria: 'Straż', typ: 'STRAZ' },
  { id: 'falcon_adv_fire_17',   nazwa: '2017 Falcon Advance Pro Fire Rescue',   cena: 42000,   kategoria: 'Straż', typ: 'STRAZ' },
  { id: 'falcon_fiss_fp_19',    nazwa: '2019 Falcon Fission Interceptor Fire Police', cena: 25000, kategoria: 'Straż', typ: 'STRAZ' },
  { id: 'falcon_adv_gvfd_17',   nazwa: '2017 Falcon Advance Pro Ambulance GVFD', cena: 42000,  kategoria: 'Straż', typ: 'STRAZ' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SŁUŻBOWE — EMS / FOX MOUNTAIN MEDICAL
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'falcon_glob_amb_13',   nazwa: '2013 Falcon Global Ambulance Fox Mountain', cena: 35000, kategoria: 'EMS',  typ: 'EMS' },
  { id: 'falcon_adv_foxmt_17',  nazwa: '2017 Falcon Advance Pro Ambulance Fox Mountain', cena: 42000, kategoria: 'EMS', typ: 'EMS' },
  { id: 'leland_hearse_05',     nazwa: '2005 Leland DeRoute Hearse',            cena: 11435,   kategoria: 'EMS',  typ: 'EMS' },
  { id: 'leland_hearse_19',     nazwa: '2019 Leland LCS Hearse',                cena: 45230,   kategoria: 'EMS',  typ: 'EMS' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SŁUŻBOWE — DOT / NPS
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'falcon_adv_dot_14',    nazwa: '2014 Falcon Advance DOT',               cena: 28000,   kategoria: 'DOT',  typ: 'DOT' },
  { id: 'durant_cam_nps_20',    nazwa: '2020 Durant Camion PPV NPS Ranger',     cena: 42000,   kategoria: 'DOT',  typ: 'DOT' },
  { id: 'falcon_adv_tires_17',  nazwa: '2017 Falcon Advance Pro Tires+',        cena: 42000,   kategoria: 'DOT',  typ: 'DOT' },
];

// ─── Konfiguracja ────────────────────────────────────────────────────────────
const ROLE_REQUIREMENTS = {
  KLASYK:  'Kolekcjoner Aut',
  KONESER: 'Koneser Aut',
  POLICJA: 'Policja',
  STRAZ:   'Straż',
  EMS:     'EMS',
  DOT:     'DOT',
};

const CATEGORY_EMOJIS = {
  'Tanie':       '🚙',
  'Kompakty':    '🚗',
  'Sedany':      '🚘',
  'SUV':         '🚐',
  'Pickupy':     '🛻',
  'Sportowe':    '🏎️',
  'Elektryczne': '⚡',
  'Klasyki':     '🏛️',
  'Luksusowe':   '💎',
  'Policja':     '🚔',
  'Straż':       '🚒',
  'EMS':         '🚑',
  'DOT':         '🚧',
};

function getVehicleById(id) {
  return VEHICLES.find(v => v.id === id) || null;
}

function getByCategory() {
  const groups = {};
  for (const v of VEHICLES) {
    if (!groups[v.kategoria]) groups[v.kategoria] = [];
    groups[v.kategoria].push(v);
  }
  return groups;
}

function getCategories() {
  return [...new Set(VEHICLES.map(v => v.kategoria))];
}

function getRequiredRole(vehicle) {
  return ROLE_REQUIREMENTS[vehicle.typ] || null;
}

function formatPrice(n) {
  return new Intl.NumberFormat('pl-PL').format(n) + ' $';
}

module.exports = {
  VEHICLES,
  ROLE_REQUIREMENTS,
  CATEGORY_EMOJIS,
  getVehicleById,
  getByCategory,
  getCategories,
  getRequiredRole,
  formatPrice,
};
