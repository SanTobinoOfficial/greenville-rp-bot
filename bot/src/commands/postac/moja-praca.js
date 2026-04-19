// Komenda /moja-praca — sprawdź swoją aktualną pracę i cooldown
// Dostępna dla: wszystkich zweryfikowanych graczy

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const path = require('path');
const fs = require('fs');

function getJob(jobId) {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return (config.jobs ?? []).find(j => j.name === jobId || j.id === jobId);
}

function formatDuration(ms) {
  if (ms <= 0) return '0 min';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moja-praca')
    .setDescription('Sprawdź swoją aktualną pracę i status cooldownu'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({ content: '❌ Musisz być zweryfikowanym mieszkańcem, żeby korzystać z systemu pracy.' });
    }

    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      select: {
        currentJob:     true,
        jobCategory:    true,
        jobAssignedAt:  true,
        jobCooldownEnd: true,
      },
    });

    if (!user) {
      return interaction.editReply({ content: '❌ Nie znaleziono Twojego konta w bazie.' });
    }

    const now = new Date();
    const cooldownActive = user.jobCooldownEnd && now < user.jobCooldownEnd;
    const cooldownRemaining = cooldownActive ? user.jobCooldownEnd.getTime() - now.getTime() : 0;
    const cooldownTimestamp = user.jobCooldownEnd ? Math.floor(user.jobCooldownEnd.getTime() / 1000) : null;

    // Pobierz dodatkowe info o pracy z config
    const jobDetails = user.currentJob ? getJob(user.currentJob) : null;

    const embed = new EmbedBuilder()
      .setColor(user.currentJob ? (cooldownActive ? COLORS.warning : COLORS.success) : COLORS.neutral)
      .setTitle('💼 Moja Praca — AURORA Greenville RP')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
      .setTimestamp();

    if (user.currentJob) {
      embed.addFields(
        {
          name: `${jobDetails?.emoji ?? '💼'} Aktualna praca`,
          value: `**${user.currentJob}**`,
          inline: true,
        },
        {
          name: '📁 Kategoria',
          value: user.jobCategory ?? 'Brak',
          inline: true,
        },
        {
          name: '📅 Od kiedy',
          value: user.jobAssignedAt
            ? `<t:${Math.floor(user.jobAssignedAt.getTime() / 1000)}:R>`
            : 'Nieznane',
          inline: true,
        },
      );

      if (jobDetails) {
        embed.addFields(
          {
            name: '💰 Wynagrodzenie',
            value: jobDetails.wynagrodzenie_max === 0
              ? 'Brak wynagrodzenia'
              : `${jobDetails.wynagrodzenie_min}–${jobDetails.wynagrodzenie_max}$/h`,
            inline: true,
          },
          {
            name: '📋 Typ pracy',
            value: jobDetails.typ === 'SERVICE' ? '🏛️ Służbowa' : jobDetails.typ === 'CRIMINAL' ? '💀 Kryminalna' : '✅ Cywilna',
            inline: true,
          },
        );
      }
    } else {
      embed.setDescription('Nie masz aktualnie żadnej pracy.\n\nUżyj `/wybierz-prace`, żeby znaleźć coś dla siebie!');
    }

    // Cooldown info
    if (cooldownActive) {
      embed.addFields({
        name: '⏳ Cooldown — zmiana pracy zablokowana',
        value: `Możesz zmienić pracę <t:${cooldownTimestamp}:R> (o <t:${cooldownTimestamp}:t>)\n*(pozostało: ${formatDuration(cooldownRemaining)})*`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: '✅ Zmiana pracy',
        value: user.currentJob ? 'Możesz teraz zmienić pracę używając `/wybierz-prace`.' : 'Możesz wybrać pracę używając `/wybierz-prace`.',
        inline: false,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Zmień pracę (/wybierz-prace)')
        .setCustomId('noop_info')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    await interaction.editReply({ embeds: [embed], components: cooldownActive ? [] : [] });
  },
};
