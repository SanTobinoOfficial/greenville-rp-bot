/**
 * Utility do odczytu i zapisu server-config.json
 * Plik leży w root repozytorium (../server-config.json względem dashboard/)
 */

import fs from 'fs';
import path from 'path';

// Na Vercelu process.cwd() = /vercel/path0/dashboard/ → plik jest w /vercel/path0/
// Lokalnie process.cwd() = dashboard/ → plik jest w ../
const CONFIG_PATH = path.join(process.cwd(), '..', 'server-config.json');

export interface ServerConfig {
  meta: { version: string; generated: string; description: string };
  server: {
    name: string;
    description: string;
    features: {
      stats_updater_interval_min: number;
      ticket_system: boolean;
      verification_web: boolean;
      verification_url: string;
      quiz_pass_threshold: number;
      quiz_total_questions: number;
    };
  };
  discord_ids: {
    guild_id: string;
    channels: Record<string, string>;
    roles: Record<string, string>;
  };
  settings: {
    server_description: string;
    roblox_group_id: string;
    embed_color: string;
    radio_url: string;
    maintenance_mode: boolean;
    maintenance_message: string;
    setup_completed: boolean;
    vehicles: { max_base: number; max_supporter: number; max_booster: number };
    quiz: { pass_score: number; total_questions: number; cooldown_hours: number };
    rp_limits: {
      frp_speed_limit: number;
      max_mandaty: number;
      max_grzywny: number;
      max_areszty: number;
      license_suspension_days: number;
    };
    warn_thresholds: { auto_mute: number; auto_ban: number };
    regulamin: { text: string; message_id: string };
    cad: {
      enabled: boolean;
      allow_civilians: boolean;
      proximity_chat_enabled: boolean;
      proximity_ttl_minutes: number;
      map_image_url: string;
      emergency_call_channel_id: string;
    };
  };
  [key: string]: unknown;
}

export function readServerConfig(): ServerConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as ServerConfig;
  } catch (err) {
    console.error('[serverConfig] Błąd odczytu server-config.json:', err);
    return null;
  }
}

export function writeServerConfig(config: ServerConfig): boolean {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[serverConfig] Błąd zapisu server-config.json:', err);
    return false;
  }
}

/** Mapuje server-config na format Settings używany przez SettingsForm */
export function configToSettings(cfg: ServerConfig) {
  const d = cfg.discord_ids ?? { guild_id: '', channels: {}, roles: {} };
  const s = cfg.settings ?? {} as ServerConfig['settings'];
  const ch = d.channels ?? {};
  const ro = d.roles ?? {};

  return {
    id: 'global',
    guildId:               d.guild_id ?? '',
    serverDescription:     s.server_description ?? '',
    robloxGroupId:         s.roblox_group_id ?? '',
    embedColor:            s.embed_color ?? '#5865F2',
    radioUrl:              s.radio_url ?? '',
    maintenanceMode:       s.maintenance_mode ?? false,
    maintenanceMessage:    s.maintenance_message ?? '',
    setupCompleted:        s.setup_completed ?? false,
    // Pojazdy
    maxVehiclesBase:       s.vehicles?.max_base ?? 5,
    maxVehiclesSupporter:  s.vehicles?.max_supporter ?? 9,
    maxVehiclesBooster:    s.vehicles?.max_booster ?? 10,
    // Quiz
    quizPassScore:         s.quiz?.pass_score ?? 8,
    quizTotalQuestions:    s.quiz?.total_questions ?? 10,
    quizCooldownHours:     s.quiz?.cooldown_hours ?? 24,
    // RP
    frpSpeedLimit:         s.rp_limits?.frp_speed_limit ?? 131,
    maxMandaty:            s.rp_limits?.max_mandaty ?? 10,
    maxGrzywny:            s.rp_limits?.max_grzywny ?? 5,
    maxAreszty:            s.rp_limits?.max_areszty ?? 5,
    licenseSuspensionDays: s.rp_limits?.license_suspension_days ?? 30,
    // Warny
    warnAutoMuteCount:     s.warn_thresholds?.auto_mute ?? 3,
    warnAutoBanCount:      s.warn_thresholds?.auto_ban ?? 5,
    // Regulamin
    regulaminText:         s.regulamin?.text ?? '',
    regulaminMessageId:    s.regulamin?.message_id ?? '',
    // Kanały
    auditLogChannelId:     ch.audit_log ?? '',
    welcomeChannelId:      ch.welcome ?? '',
    ogloszeniaChanelId:    ch.ogloszenia ?? '',
    ogolneChatChannelId:   ch.ogolne_chat ?? '',
    zacznijTutajChannelId: ch.zacznij_tutaj ?? '',
    regulaminChannelId:    ch.regulamin ?? '',
    ticketEmbedChannelId:  ch.ticket_embed ?? '',
    ticketLogsChannelId:   ch.ticket_logs ?? '',
    ticketCategoryId:      ch.ticket_category ?? '',
    // Role
    roleOwner:             ro.owner ?? '',
    roleCoOwner:           ro.co_owner ?? '',
    roleAdmin:             ro.admin ?? '',
    roleMod:               ro.mod ?? '',
    roleHelper:            ro.helper ?? '',
    roleHR:                ro.hr ?? '',
    roleHost:              ro.host ?? '',
    rolePolicja:           ro.policja ?? '',
    roleEMS:               ro.ems ?? '',
    roleStraz:             ro.straz ?? '',
    roleDOT:               ro.dot ?? '',
    roleMieszkaniec:       ro.mieszkaniec ?? '',
    roleNitroBooster:      ro.nitro_booster ?? '',
    roleWspierajacy:       ro.wspierajacy ?? '',
    ticketAdminRoleId:     ro.ticket_admin ?? '',
    ticketPingRoleId:      ro.ticket_ping ?? '',
    // CAD
    cadEnabled:                 s.cad?.enabled ?? true,
    cadAllowCivilians:          s.cad?.allow_civilians ?? true,
    cadProximityChatEnabled:    s.cad?.proximity_chat_enabled ?? true,
    cadProximityTtlMinutes:     s.cad?.proximity_ttl_minutes ?? 60,
    cadMapImageUrl:             s.cad?.map_image_url ?? '',
    cadEmergencyCallChannelId:  s.cad?.emergency_call_channel_id ?? '',
  };
}

/** Mapuje dane z SettingsForm z powrotem na format server-config */
export function settingsToConfig(cfg: ServerConfig, body: Record<string, unknown>): ServerConfig {
  const updated = JSON.parse(JSON.stringify(cfg)) as ServerConfig;

  // Upewnij się że sekcje istnieją
  if (!updated.discord_ids) updated.discord_ids = { guild_id: '', channels: {}, roles: {} };
  if (!updated.settings) updated.settings = {} as ServerConfig['settings'];

  const d = updated.discord_ids;
  const s = updated.settings;

  // Ogólne
  d.guild_id             = String(body.guildId ?? d.guild_id);
  s.server_description   = String(body.serverDescription ?? s.server_description);
  s.roblox_group_id      = String(body.robloxGroupId ?? s.roblox_group_id);
  s.embed_color          = String(body.embedColor ?? s.embed_color);
  s.radio_url            = String(body.radioUrl ?? s.radio_url);
  s.maintenance_mode     = Boolean(body.maintenanceMode ?? s.maintenance_mode);
  s.maintenance_message  = String(body.maintenanceMessage ?? s.maintenance_message);
  s.setup_completed      = Boolean(body.setupCompleted ?? s.setup_completed);

  // Pojazdy
  if (!s.vehicles) s.vehicles = { max_base: 5, max_supporter: 9, max_booster: 10 };
  s.vehicles.max_base       = Number(body.maxVehiclesBase ?? s.vehicles.max_base);
  s.vehicles.max_supporter  = Number(body.maxVehiclesSupporter ?? s.vehicles.max_supporter);
  s.vehicles.max_booster    = Number(body.maxVehiclesBooster ?? s.vehicles.max_booster);

  // Quiz
  if (!s.quiz) s.quiz = { pass_score: 8, total_questions: 10, cooldown_hours: 24 };
  s.quiz.pass_score       = Number(body.quizPassScore ?? s.quiz.pass_score);
  s.quiz.total_questions  = Number(body.quizTotalQuestions ?? s.quiz.total_questions);
  s.quiz.cooldown_hours   = Number(body.quizCooldownHours ?? s.quiz.cooldown_hours);

  // RP limits
  if (!s.rp_limits) s.rp_limits = { frp_speed_limit: 131, max_mandaty: 10, max_grzywny: 5, max_areszty: 5, license_suspension_days: 30 };
  s.rp_limits.frp_speed_limit      = Number(body.frpSpeedLimit ?? s.rp_limits.frp_speed_limit);
  s.rp_limits.max_mandaty           = Number(body.maxMandaty ?? s.rp_limits.max_mandaty);
  s.rp_limits.max_grzywny           = Number(body.maxGrzywny ?? s.rp_limits.max_grzywny);
  s.rp_limits.max_areszty           = Number(body.maxAreszty ?? s.rp_limits.max_areszty);
  s.rp_limits.license_suspension_days = Number(body.licenseSuspensionDays ?? s.rp_limits.license_suspension_days);

  // Warny
  if (!s.warn_thresholds) s.warn_thresholds = { auto_mute: 3, auto_ban: 5 };
  s.warn_thresholds.auto_mute = Number(body.warnAutoMuteCount ?? s.warn_thresholds.auto_mute);
  s.warn_thresholds.auto_ban  = Number(body.warnAutoBanCount ?? s.warn_thresholds.auto_ban);

  // Regulamin
  if (!s.regulamin) s.regulamin = { text: '', message_id: '' };
  s.regulamin.text       = String(body.regulaminText ?? s.regulamin.text);
  s.regulamin.message_id = String(body.regulaminMessageId ?? s.regulamin.message_id);

  // Kanały
  if (!d.channels) d.channels = {};
  d.channels.audit_log       = String(body.auditLogChannelId ?? d.channels.audit_log ?? '');
  d.channels.welcome         = String(body.welcomeChannelId ?? d.channels.welcome ?? '');
  d.channels.ogloszenia      = String(body.ogloszeniaChanelId ?? d.channels.ogloszenia ?? '');
  d.channels.ogolne_chat     = String(body.ogolneChatChannelId ?? d.channels.ogolne_chat ?? '');
  d.channels.zacznij_tutaj   = String(body.zacznijTutajChannelId ?? d.channels.zacznij_tutaj ?? '');
  d.channels.regulamin       = String(body.regulaminChannelId ?? d.channels.regulamin ?? '');
  d.channels.ticket_embed    = String(body.ticketEmbedChannelId ?? d.channels.ticket_embed ?? '');
  d.channels.ticket_logs     = String(body.ticketLogsChannelId ?? d.channels.ticket_logs ?? '');
  d.channels.ticket_category = String(body.ticketCategoryId ?? d.channels.ticket_category ?? '');

  // Role
  if (!d.roles) d.roles = {};
  d.roles.owner         = String(body.roleOwner ?? d.roles.owner ?? '');
  d.roles.co_owner      = String(body.roleCoOwner ?? d.roles.co_owner ?? '');
  d.roles.admin         = String(body.roleAdmin ?? d.roles.admin ?? '');
  d.roles.mod           = String(body.roleMod ?? d.roles.mod ?? '');
  d.roles.helper        = String(body.roleHelper ?? d.roles.helper ?? '');
  d.roles.hr            = String(body.roleHR ?? d.roles.hr ?? '');
  d.roles.host          = String(body.roleHost ?? d.roles.host ?? '');
  d.roles.policja       = String(body.rolePolicja ?? d.roles.policja ?? '');
  d.roles.ems           = String(body.roleEMS ?? d.roles.ems ?? '');
  d.roles.straz         = String(body.roleStraz ?? d.roles.straz ?? '');
  d.roles.dot           = String(body.roleDOT ?? d.roles.dot ?? '');
  d.roles.mieszkaniec   = String(body.roleMieszkaniec ?? d.roles.mieszkaniec ?? '');
  d.roles.nitro_booster = String(body.roleNitroBooster ?? d.roles.nitro_booster ?? '');
  d.roles.wspierajacy   = String(body.roleWspierajacy ?? d.roles.wspierajacy ?? '');
  d.roles.ticket_admin  = String(body.ticketAdminRoleId ?? d.roles.ticket_admin ?? '');
  d.roles.ticket_ping   = String(body.ticketPingRoleId ?? d.roles.ticket_ping ?? '');

  // CAD
  if (!s.cad) s.cad = { enabled: true, allow_civilians: true, proximity_chat_enabled: true, proximity_ttl_minutes: 60, map_image_url: '', emergency_call_channel_id: '' };
  s.cad.enabled                    = Boolean(body.cadEnabled ?? s.cad.enabled);
  s.cad.allow_civilians            = Boolean(body.cadAllowCivilians ?? s.cad.allow_civilians);
  s.cad.proximity_chat_enabled     = Boolean(body.cadProximityChatEnabled ?? s.cad.proximity_chat_enabled);
  s.cad.proximity_ttl_minutes      = Number(body.cadProximityTtlMinutes ?? s.cad.proximity_ttl_minutes);
  s.cad.map_image_url              = String(body.cadMapImageUrl ?? s.cad.map_image_url);
  s.cad.emergency_call_channel_id  = String(body.cadEmergencyCallChannelId ?? s.cad.emergency_call_channel_id);

  // Aktualizuj też server.features dla kompatybilności z botem
  if (updated.server?.features) {
    updated.server.features.quiz_pass_threshold  = s.quiz.pass_score;
    updated.server.features.quiz_total_questions = s.quiz.total_questions;
  }

  // Zaktualizuj datę
  if (updated.meta) updated.meta.generated = new Date().toISOString().split('T')[0];

  return updated;
}
