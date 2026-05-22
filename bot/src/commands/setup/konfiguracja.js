// Komenda /konfiguracja — podgląd i zmiana ustawień bota (Co-Owner+)

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function isCOwner(member) {
  return member.roles.cache.some(r => ['Co-Owner', 'Owner'].includes(r.name))
    || member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('konfiguracja')
    .setDescription('Podgląd i zmiana ustawień bota (Co-Owner+)')
    .addSubcommand(sub =>
      sub.setName('pokaz')
        .setDescription('Pokaż aktualne ustawienia bota')
    )
    .addSubcommand(sub =>
      sub.setName('quiz')
        .setDescription('Zmień ustawienia quizu weryfikacyjnego')
        .addIntegerOption(opt =>
          opt.setName('prog-zaliczenia')
            .setDescription('Minimalna liczba poprawnych odpowiedzi (domyślnie: 8/10)')
            .setMinValue(5)
            .setMaxValue(10)
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('cooldown-godzin')
            .setDescription('Czas oczekiwania między próbami quizu w godzinach (domyślnie: 24)')
            .setMinValue(1)
            .setMaxValue(168)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('warny')
        .setDescription('Zmień progi auto-kar za ostrzeżenia')
        .addIntegerOption(opt =>
          opt.setName('mute-po-warnach')
            .setDescription('Ile warnów → auto-mute 24h (domyślnie: 3)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('ban-po-warnach')
            .setDescription('Ile warnów → auto-ban 7 dni (domyślnie: 5)')
            .setMinValue(2)
            .setMaxValue(20)
            .setRequired(false)
        )
    ),

  async execute(interaction, client, prisma) {
    if (!isCOwner(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Co-Owner+ może zmieniać konfigurację.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } })
      ?? await prisma.settings.create({ data: { id: 'global' } });

    // ──────── POKAŻ ────────
    if (sub === 'pokaz') {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⚙️ Konfiguracja Bota — AURORA Greenville RP')
        .addFields(
          {
            name: '📝 Quiz Weryfikacyjny',
            value:
              `Próg zaliczenia: **${settings.quizPassScore}/${settings.quizTotalQuestions}**\n` +
              `Cooldown: **${settings.quizCooldownHours}h**`,
            inline: true,
          },
          {
            name: '⚖️ Auto-Kary',
            value:
              `Mute po warnach: **${settings.warnAutoMuteCount}**\n` +
              `Ban po warnach: **${settings.warnAutoBanCount}**`,
            inline: true,
          },
          {
            name: '🚗 Pojazdy',
            value:
              `Max bazowo: **${settings.maxVehiclesBase}**\n` +
              `Max Wspierający: **${settings.maxVehiclesSupporter}**\n` +
              `Max Booster: **${settings.maxVehiclesBooster}**`,
            inline: true,
          },
          {
            name: '💰 Ekonomia RP',
            value:
              `Max mandatów: **${settings.maxMandaty}**\n` +
              `Max grzywien: **${settings.maxGrzywny}**\n` +
              `Zawieszenie PJ: **${settings.licenseSuspensionDays} dni**`,
            inline: true,
          },
          {
            name: '🔧 Tryb Konserwacji',
            value:
              `Status: ${settings.maintenanceMode ? '🔴 **WŁĄCZONY**' : '🟢 **Wyłączony**'}\n` +
              `Komunikat: *${settings.maintenanceMessage}*`,
            inline: true,
          },
          {
            name: '📊 Statystyki Setup',
            value:
              `Setup ukończony: ${settings.setupCompleted ? '✅ Tak' : '❌ Nie'}\n` +
              `Guild ID: \`${settings.guildId || 'Nie ustawiono'}\``,
            inline: true,
          },
        )
        .setFooter({ text: 'Użyj /konfiguracja quiz/warny aby zmienić ustawienia' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ──────── QUIZ ────────
    if (sub === 'quiz') {
      const prog     = interaction.options.getInteger('prog-zaliczenia');
      const cooldown = interaction.options.getInteger('cooldown-godzin');

      if (!prog && !cooldown) {
        return interaction.editReply({ content: '❌ Podaj przynajmniej jeden parametr do zmiany.' });
      }

      const updateData = {};
      if (prog)     updateData.quizPassScore     = prog;
      if (cooldown) updateData.quizCooldownHours = cooldown;

      await prisma.settings.update({ where: { id: 'global' }, data: updateData });

      const lines = [];
      if (prog)     lines.push(`Próg zaliczenia: **${prog}/10**`);
      if (cooldown) lines.push(`Cooldown: **${cooldown}h**`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Zaktualizowano ustawienia quizu')
            .setDescription(lines.join('\n'))
            .setTimestamp()
        ]
      });
    }

    // ──────── WARNY ────────
    if (sub === 'warny') {
      const muteAt = interaction.options.getInteger('mute-po-warnach');
      const banAt  = interaction.options.getInteger('ban-po-warnach');

      if (!muteAt && !banAt) {
        return interaction.editReply({ content: '❌ Podaj przynajmniej jeden parametr.' });
      }

      if (muteAt && banAt && muteAt >= banAt) {
        return interaction.editReply({ content: '❌ Próg mute musi być mniejszy niż próg bana.' });
      }

      const updateData = {};
      if (muteAt) updateData.warnAutoMuteCount = muteAt;
      if (banAt)  updateData.warnAutoBanCount  = banAt;

      await prisma.settings.update({ where: { id: 'global' }, data: updateData });

      const lines = [];
      if (muteAt) lines.push(`Auto-mute po: **${muteAt} warnach** (mute 24h)`);
      if (banAt)  lines.push(`Auto-ban po: **${banAt} warnach** (ban 7 dni)`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Zaktualizowano progi auto-kar')
            .setDescription(lines.join('\n'))
            .setTimestamp()
        ]
      });
    }

  },
};
