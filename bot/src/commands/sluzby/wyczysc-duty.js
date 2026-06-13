// Komenda /wyczysc-duty — Staff/Admin: wymuś usunięcie ról On-Duty
// Rozwiązuje problem "przyklejonych" ról po restarcie bota lub rozłączeniu gracza.
// gracza (Staff+): zdejmij role On-Duty z jednego gracza
// sluzby (Admin+): wyczyść całą służbę hurtowo

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, isAdmin } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_MAP = {
  policja:       { key: 'POLICJA',       onDutyRole: 'Policja On-Duty',       emoji: '🚔', label: 'Policja'        },
  ems:           { key: 'EMS',           onDutyRole: 'EMS On-Duty',           emoji: '🚑', label: 'EMS'            },
  straz:         { key: 'STRAZ',         onDutyRole: 'Straż On-Duty',         emoji: '🚒', label: 'Straż Pożarna'  },
  dot:           { key: 'DOT',           onDutyRole: 'DOT On-Duty',           emoji: '🚧', label: 'DOT'            },
  straz_miejska: { key: 'STRAZ_MIEJSKA', onDutyRole: 'Straż Miejska On-Duty', emoji: '🛡️', label: 'Straż Miejska' },
  taksowkarz:    { key: 'TAKSOWKARZ',    onDutyRole: 'Taksówkarz On-Duty',    emoji: '🚕', label: 'Taksówkarz'     },
};

async function logOffDuty(prisma, discordId, discordTag, serviceKey) {
  try {
    let userDb = await prisma.user.findUnique({ where: { discordId }, select: { id: true } });
    if (!userDb) {
      userDb = await prisma.user.create({
        data: { discordId, discordUsername: discordTag },
        select: { id: true },
      });
    }
    await prisma.dutyLog.create({
      data: { userId: userDb.id, service: serviceKey, action: 'OFF_DUTY' },
    });
  } catch (err) {
    logger.warn(`wyczysc-duty: błąd DB dla ${discordTag}: ${err.message}`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wyczysc-duty')
    .setDescription('Staff: wymuś usunięcie ról On-Duty (po restarcie bota lub rozłączeniu gracza)')
    .addSubcommand(sub =>
      sub
        .setName('gracza')
        .setDescription('Zdejmij wszystkie role On-Duty z konkretnego gracza (Staff+)')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz, któremu usuwamy role On-Duty')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sluzby')
        .setDescription('Usuń rolę On-Duty z całej służby — wszyscy wychodzą ze służby (Admin+)')
        .addStringOption(opt =>
          opt.setName('sluzba')
            .setDescription('Służba do wyczyszczenia')
            .setRequired(true)
            .addChoices(
              { name: '🚔 Policja',        value: 'policja'       },
              { name: '🚑 EMS',            value: 'ems'           },
              { name: '🚒 Straż Pożarna',  value: 'straz'         },
              { name: '🚧 DOT',            value: 'dot'           },
              { name: '🛡️ Straż Miejska', value: 'straz_miejska' },
              { name: '🚕 Taksówkarz',     value: 'taksowkarz'    },
            )
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ── GRACZA ────────────────────────────────────────────────────────────────
    if (sub === 'gracza') {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: '❌ Wymagana rola **Staff** (Helper+).' });
      }

      const targetUser   = interaction.options.getUser('gracz');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.editReply({ content: '❌ Nie znaleziono tego gracza na serwerze.' });
      }
      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ Nie można użyć tej komendy na botcie.' });
      }

      const removed = [];

      for (const svc of Object.values(SERVICE_MAP)) {
        const onDutyRole = interaction.guild.roles.cache.find(r => r.name === svc.onDutyRole);
        if (!onDutyRole || !targetMember.roles.cache.has(onDutyRole.id)) continue;

        try {
          await targetMember.roles.remove(onDutyRole, `wyczysc-duty — wymuszone przez ${interaction.user.tag}`);
          await logOffDuty(prisma, targetUser.id, targetUser.tag, svc.key);
          removed.push(`${svc.emoji} ${svc.label}`);
        } catch (err) {
          logger.warn(`wyczysc-duty gracza: błąd roli ${svc.onDutyRole} dla ${targetUser.tag}: ${err.message}`);
          removed.push(`${svc.emoji} ${svc.label} *(błąd usuwania)*`);
        }
      }

      if (removed.length === 0) {
        return interaction.editReply({
          content: `ℹ️ **${targetMember.displayName}** nie ma żadnych aktywnych ról On-Duty.`,
        });
      }

      logger.info(
        `wyczysc-duty gracza | ${interaction.user.tag} → ${targetUser.tag} | usunięto: ${removed.join(', ')}`
      );

      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('🧹 Wyczyszczono role On-Duty')
        .addFields(
          { name: '👤 Gracz',         value: `<@${targetUser.id}>`,  inline: true  },
          { name: '🔧 Wykonał',       value: `<@${interaction.user.id}>`, inline: true },
          { name: '📋 Usunięte role', value: removed.join('\n'),     inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — Wymuś Off-Duty' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── SLUZBY ────────────────────────────────────────────────────────────────
    if (sub === 'sluzby') {
      if (!isAdmin(interaction.member)) {
        return interaction.editReply({ content: '❌ Wymagana rola **Administrator+**.' });
      }

      const serviceKey = interaction.options.getString('sluzba');
      const svc        = SERVICE_MAP[serviceKey];

      // Odśwież cache członków przed sprawdzeniem roli
      await interaction.guild.members.fetch().catch(() => null);

      const onDutyRole = interaction.guild.roles.cache.find(r => r.name === svc.onDutyRole);

      if (!onDutyRole || onDutyRole.members.size === 0) {
        return interaction.editReply({
          content: `ℹ️ Służba **${svc.emoji} ${svc.label}** — nikt nie jest aktualnie On-Duty.`,
        });
      }

      const members  = [...onDutyRole.members.values()];
      const results  = [];

      for (const m of members) {
        try {
          await m.roles.remove(onDutyRole, `wyczysc-duty sluzby — wymuszone przez ${interaction.user.tag}`);
          await logOffDuty(prisma, m.id, m.user.tag, svc.key);
          results.push(`✅ ${m.displayName}`);
        } catch {
          results.push(`❌ ${m.displayName} *(błąd)*`);
        }
      }

      logger.info(
        `wyczysc-duty sluzby | ${interaction.user.tag} | służba: ${serviceKey} | ` +
        `${members.length} graczy`
      );

      const resultText = results.slice(0, 20).join('\n') +
        (results.length > 20 ? `\n*...i ${results.length - 20} więcej*` : '');

      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(`🧹 Wyczyszczono On-Duty — ${svc.emoji} ${svc.label}`)
        .addFields(
          { name: '📊 Przetworzono', value: `${members.length} graczy`, inline: true  },
          { name: '🔧 Wykonał',      value: `<@${interaction.user.id}>`, inline: true  },
          { name: '📋 Wyniki',       value: resultText,                  inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — Wymuś Off-Duty (masowe)' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
