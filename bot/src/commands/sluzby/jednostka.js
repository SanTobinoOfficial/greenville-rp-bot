// Komenda /jednostka — rejestracja i zarządzanie jednostką patrolową w systemie CAD
// Subkomendy: zarejestruj | status | lista
// Wypełnia model CadUnit, który statystyki-cad.js odczytuje, ale żadna komenda nie tworzyła wpisów.
// Dostępna dla: Policja, EMS, Straż, DOT, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_CONFIG = {
  POLICJA:       { label: 'Policja',       roleNames: ['Policja', 'Policja On-Duty'],               emoji: '🚔', color: 0x003087 },
  EMS:           { label: 'EMS',           roleNames: ['EMS', 'EMS On-Duty'],                        emoji: '🚑', color: 0xED4245 },
  STRAZ:         { label: 'Straż Pożarna', roleNames: ['Straż Pożarna', 'Straż On-Duty'],            emoji: '🚒', color: 0xFEE75C },
  DOT:           { label: 'DOT',           roleNames: ['DOT', 'DOT On-Duty'],                        emoji: '🚧', color: 0xFF7F00 },
  STRAZ_MIEJSKA: { label: 'Straż Miejska', roleNames: ['Straż Miejska', 'Straż Miejska On-Duty'],    emoji: '🛡️', color: 0x2ECC71 },
};

const STATUS_META = {
  AVAILABLE: { label: 'Gotowy — 10-8',           emoji: '🟢' },
  BUSY:      { label: 'Zajęty / Interwencja',    emoji: '🔴' },
  TRANSPORT: { label: 'Transport zatrzymanego',  emoji: '🔵' },
  CODE_4:    { label: 'Bez zdarzeń — 10-4',      emoji: '🟡' },
  OFF_DUTY:  { label: 'Poza służbą',              emoji: '⬛' },
};

function formatDutyTime(since) {
  const ms  = Date.now() - new Date(since).getTime();
  const h   = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${min}min`;
  return `${min} min`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jednostka')
    .setDescription('System jednostek CAD — zamelduj swoją jednostkę patrolową')
    .addSubcommand(sub =>
      sub.setName('zarejestruj')
        .setDescription('Zamelduj się w systemie CAD ze swoją sygnaturą jednostki')
        .addStringOption(opt =>
          opt.setName('sygnatura')
            .setDescription('Sygnatura jednostki (np. P-1, EMS-3, SM-2, D-4)')
            .setRequired(true)
            .setMaxLength(10)
        )
        .addStringOption(opt =>
          opt.setName('sluzba')
            .setDescription('Służba, w której pełnisz dyżur')
            .setRequired(true)
            .addChoices(
              { name: '🚔 Policja',        value: 'POLICJA' },
              { name: '🚑 EMS',            value: 'EMS' },
              { name: '🚒 Straż Pożarna',  value: 'STRAZ' },
              { name: '🚧 DOT',            value: 'DOT' },
              { name: '🛡️ Straż Miejska',  value: 'STRAZ_MIEJSKA' },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Zmień status swojej jednostki w systemie CAD')
        .addStringOption(opt =>
          opt.setName('stan')
            .setDescription('Nowy status jednostki')
            .setRequired(true)
            .addChoices(
              { name: '🟢 Gotowy — 10-8',           value: 'AVAILABLE'  },
              { name: '🔴 Zajęty / Interwencja',    value: 'BUSY'       },
              { name: '🔵 Transport zatrzymanego',  value: 'TRANSPORT'  },
              { name: '🟡 Bez zdarzeń — 10-4',      value: 'CODE_4'     },
              { name: '⬛ Wyloguj z CAD',            value: 'OFF_DUTY'   },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Wyświetl wszystkie aktywne jednostki w systemie CAD')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const isSluzba = member.roles.cache.some(r =>
      [
        ROLES.POLICJA, ROLES.EMS, ROLES.STRAZ, ROLES.DOT, ROLES.STRAZ_MIEJSKA,
        'Policja On-Duty', 'EMS On-Duty', 'Straż On-Duty', 'DOT On-Duty',
        'Straż Miejska On-Duty',
      ].includes(r.name)
    );

    if (!isSluzba && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ System jednostek CAD dostępny tylko dla funkcjonariuszy służb lub Staffu.',
      });
    }

    const sub = interaction.options.getSubcommand();

    // ── ZAREJESTRUJ ───────────────────────────────────────────────────────────
    if (sub === 'zarejestruj') {
      const callsign   = interaction.options.getString('sygnatura').toUpperCase().trim();
      const serviceKey = interaction.options.getString('sluzba');
      const svc        = SERVICE_CONFIG[serviceKey];

      // Weryfikacja przynależności do służby (Staff omija)
      if (!isStaff(member)) {
        const hasServiceRole = svc.roleNames.some(rn =>
          member.roles.cache.some(r => r.name === rn)
        );
        if (!hasServiceRole) {
          return interaction.editReply({
            content: `❌ Nie jesteś członkiem służby **${svc.label}**. Nie możesz zarejestrować jednostki tej służby.`,
          });
        }
      }

      // Blokada zajętej sygnatury (inna aktywna jednostka)
      const conflict = await prisma.cadUnit.findFirst({
        where: {
          callsign,
          discordId: { not: interaction.user.id },
          status:    { not: 'OFF_DUTY' },
        },
      });
      if (conflict) {
        return interaction.editReply({
          content: `❌ Sygnatura **${callsign}** jest aktualnie zajęta przez inną jednostkę. Wybierz inną sygnaturę.`,
        });
      }

      await prisma.cadUnit.upsert({
        where:  { discordId: interaction.user.id },
        update: {
          callsign,
          name:        member.displayName,
          service:     serviceKey,
          status:      'AVAILABLE',
          onDutySince: new Date(),
          lastSeen:    new Date(),
        },
        create: {
          discordId:   interaction.user.id,
          callsign,
          name:        member.displayName,
          service:     serviceKey,
          cadRole:     'OFFICER',
          status:      'AVAILABLE',
          onDutySince: new Date(),
          lastSeen:    new Date(),
        },
      });

      logger.info(`CAD Unit zarejestrowany: ${callsign} (${serviceKey}) | ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(svc.color)
        .setTitle(`${svc.emoji} Jednostka ${callsign} — Zameldowana w CAD`)
        .setDescription('Twoja jednostka jest teraz widoczna w systemie CAD. Aktualizuj status komendą `/jednostka status`.')
        .addFields(
          { name: '📡 Sygnatura',      value: callsign,                                                   inline: true },
          { name: '🏛️ Służba',         value: `${svc.emoji} ${svc.label}`,                               inline: true },
          { name: '🟢 Status',         value: `${STATUS_META.AVAILABLE.emoji} ${STATUS_META.AVAILABLE.label}`, inline: true },
          { name: '👤 Funkcjonariusz', value: `<@${interaction.user.id}>`,                                inline: true },
          { name: '🕐 Wejście',        value: `<t:${Math.floor(Date.now() / 1000)}:T>`,                   inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — System CAD' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const newStatus = interaction.options.getString('stan');

      let unit;
      try {
        unit = await prisma.cadUnit.findUnique({ where: { discordId: interaction.user.id } });
      } catch (err) {
        logger.error('jednostka status: błąd bazy danych:', err);
        return interaction.editReply({ content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.' });
      }

      if (!unit) {
        return interaction.editReply({
          content: '❌ Nie masz zarejestrowanej jednostki w systemie CAD. Użyj `/jednostka zarejestruj` aby się zameldować.',
        });
      }

      if (newStatus === 'OFF_DUTY') {
        // Wylogowanie — usuń wpis z CAD
        await prisma.cadUnit.delete({ where: { discordId: interaction.user.id } });
        logger.info(`CAD Unit wylogowany: ${unit.callsign} | ${interaction.user.tag} | czas służby: ${formatDutyTime(unit.onDutySince)}`);

        const embed = new EmbedBuilder()
          .setColor(COLORS.neutral)
          .setTitle(`⬛ Jednostka ${unit.callsign} — Wymeldowana z CAD`)
          .setDescription('Twoja jednostka została wyrejestrowana z systemu CAD.')
          .addFields(
            { name: '⏱️ Czas służby', value: formatDutyTime(unit.onDutySince), inline: true },
          )
          .setFooter({ text: 'AURORA Greenville RP — System CAD' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      await prisma.cadUnit.update({
        where: { discordId: interaction.user.id },
        data:  { status: newStatus, lastSeen: new Date() },
      });

      const sMeta = STATUS_META[newStatus] ?? STATUS_META.AVAILABLE;
      const svc   = SERVICE_CONFIG[unit.service] ?? { label: unit.service, emoji: '👮', color: COLORS.info };

      logger.info(`CAD Unit status: ${unit.callsign} → ${newStatus} | ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(svc.color)
        .setTitle(`${sMeta.emoji} Jednostka ${unit.callsign} — Status zaktualizowany`)
        .addFields(
          { name: '📡 Sygnatura',   value: unit.callsign,                           inline: true },
          { name: '🏛️ Służba',      value: `${svc.emoji} ${svc.label}`,             inline: true },
          { name: '📊 Status',      value: `${sMeta.emoji} ${sMeta.label}`,          inline: true },
          { name: '⏱️ Czas służby', value: formatDutyTime(unit.onDutySince),         inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — System CAD' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      let units;
      try {
        units = await prisma.cadUnit.findMany({
          where:   { status: { not: 'OFF_DUTY' } },
          orderBy: [
            { service:     'asc' },
            { onDutySince: 'asc' },
          ],
        });
      } catch (err) {
        logger.error('jednostka lista: błąd bazy danych:', err);
        return interaction.editReply({ content: '❌ Błąd podczas pobierania jednostek. Spróbuj ponownie.' });
      }

      if (units.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📡 Jednostki CAD — Brak aktywnych jednostek')
              .setDescription('Żadna jednostka nie jest aktualnie zameldowana w systemie CAD.\nUżyj `/jednostka zarejestruj` aby się zameldować.')
              .setFooter({ text: 'AURORA Greenville RP — System CAD' })
              .setTimestamp(),
          ],
        });
      }

      // Grupuj wg służby
      const grouped = {};
      for (const unit of units) {
        if (!grouped[unit.service]) grouped[unit.service] = [];
        grouped[unit.service].push(unit);
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`📡 Aktywne jednostki CAD — ${units.length}`)
        .setFooter({ text: 'AURORA Greenville RP — /jednostka zarejestruj | /jednostka status' })
        .setTimestamp();

      for (const [serviceKey, serviceUnits] of Object.entries(grouped)) {
        const svc   = SERVICE_CONFIG[serviceKey] ?? { label: serviceKey, emoji: '👮' };
        const lines = serviceUnits.map(u => {
          const sMeta = STATUS_META[u.status] ?? STATUS_META.AVAILABLE;
          return `${sMeta.emoji} **${u.callsign}** — <@${u.discordId}> · ${sMeta.label} · ⏱️ ${formatDutyTime(u.onDutySince)}`;
        });

        let fieldValue = lines.join('\n');
        if (fieldValue.length > 1020) fieldValue = fieldValue.slice(0, 1017) + '…';

        embed.addFields({
          name:   `${svc.emoji} ${svc.label} (${serviceUnits.length})`,
          value:  fieldValue,
          inline: false,
        });
      }

      logger.info(`/jednostka lista | ${interaction.user.tag} | ${units.length} jednostek`);
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
