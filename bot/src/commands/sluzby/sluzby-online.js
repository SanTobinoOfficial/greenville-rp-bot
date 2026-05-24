// Komenda /sluzby-online — przegląd aktualnych dyżurów służb
// Wyświetla kto jest aktualnie On-Duty w każdej służbie
// Dostępna dla wszystkich zweryfikowanych graczy (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Musi być zsynchronizowane z duty.js — te same nazwy ról On-Duty
const SERVICES = [
  { onDutyRole: 'Policja On-Duty',       emoji: '🚔', label: 'Policja'        },
  { onDutyRole: 'EMS On-Duty',           emoji: '🚑', label: 'EMS'            },
  { onDutyRole: 'Straż On-Duty',         emoji: '🚒', label: 'Straż Pożarna'  },
  { onDutyRole: 'DOT On-Duty',           emoji: '🚧', label: 'DOT'            },
  { onDutyRole: 'Straż Miejska On-Duty', emoji: '🛡️', label: 'Straż Miejska' },
  { onDutyRole: 'Taksówkarz On-Duty',    emoji: '🚕', label: 'Taksówkarz'     },
];

const MAX_NAMES_PER_SERVICE = 6;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sluzby-online')
    .setDescription('Sprawdź które służby są aktualnie na dyżurze'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    // Wymagana rola Mieszkaniec lub wyższa
    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić aktywne dyżury.',
        ephemeral: true,
      });
    }

    // Pobierz wszystkich członków serwera (odświeżenie cache ról)
    try {
      await interaction.guild.members.fetch();
    } catch (err) {
      logger.warn(`sluzby-online: nie udało się odświeżyć cache członków: ${err.message}`);
    }

    const fields = [];
    let totalOnDuty = 0;
    let anyServiceFound = false;

    for (const svc of SERVICES) {
      const role = interaction.guild.roles.cache.find(r => r.name === svc.onDutyRole);

      // Rola On-Duty nie istnieje → nikt jeszcze nie używał /duty dla tej służby
      if (!role) {
        fields.push({
          name: `${svc.emoji} ${svc.label}`,
          value: '*Brak dyżurujących*',
          inline: true,
        });
        continue;
      }

      anyServiceFound = true;
      const members = role.members;
      const count   = members.size;
      totalOnDuty  += count;

      if (count === 0) {
        fields.push({
          name: `${svc.emoji} ${svc.label}`,
          value: '*Brak dyżurujących*',
          inline: true,
        });
      } else {
        const nameList = members
          .first(MAX_NAMES_PER_SERVICE)
          .map(m => `• ${m.displayName}`)
          .join('\n');
        const overflow = count > MAX_NAMES_PER_SERVICE
          ? `\n*+${count - MAX_NAMES_PER_SERVICE} więcej*`
          : '';

        fields.push({
          name: `${svc.emoji} ${svc.label} — **${count}** dyż.`,
          value: nameList + overflow,
          inline: true,
        });
      }
    }

    // Kolor embeda zależy od liczby aktywnych jednostek
    let embedColor;
    if (totalOnDuty === 0) {
      embedColor = COLORS.neutral;
    } else if (totalOnDuty >= 3) {
      embedColor = COLORS.success;
    } else {
      embedColor = COLORS.warning;
    }

    const statusLine = totalOnDuty > 0
      ? `Aktualnie na służbie: **${totalOnDuty}** ${totalOnDuty === 1 ? 'funkcjonariusz' : 'funkcjonariuszy'}.`
      : '⚠️ Żadna służba nie jest aktualnie na dyżurze. Użyj `/duty`, aby wejść na służbę.';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('🟢 Aktywne dyżury służb — AURORA Greenville RP')
      .setDescription(statusLine)
      .addFields(fields)
      .setFooter({ text: 'AURORA Greenville RP — Użyj /duty aby wejść na służbę' })
      .setTimestamp();

    logger.info(`/sluzby-online wywołane przez ${interaction.user.tag} — ${totalOnDuty} dyżurujących`);

    await interaction.editReply({ embeds: [embed] });
  },
};
