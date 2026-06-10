// Komenda /weryfikacja — zarządzanie stanem weryfikacji gracza
// reset: Moderator+ resetuje cooldown quizu weryfikacyjnego
// stan:  sprawdź status weryfikacji i historię quizu (siebie lub Staff — innego gracza)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod, isStaff, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weryfikacja')
    .setDescription('Zarządzanie weryfikacją gracza')
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Zresetuj cooldown quizu weryfikacyjnego gracza (Moderator+)')
        .addUserOption(opt =>
          opt.setName('gracz').setDescription('Gracz do zresetowania').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('powod')
            .setDescription('Powód resetu (opcjonalny)')
            .setRequired(false)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stan')
        .setDescription('Sprawdź status weryfikacji i historię quizu')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz do sprawdzenia (tylko Staff; puste = Ty)')
            .setRequired(false)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ── RESET ────────────────────────────────────────────────────────────────
    if (sub === 'reset') {
      if (!isMod(interaction.member)) {
        return interaction.editReply(noPermissionReply('Moderator+'));
      }

      const targetUser = interaction.options.getUser('gracz');
      const powod = interaction.options.getString('powod') ?? 'Brak podanego powodu';

      const userDb = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
        select: { id: true, quizAttempts: true, quizLastAttempt: true, verifiedAt: true },
      });

      if (!userDb) {
        return interaction.editReply({ content: `❌ Gracz <@${targetUser.id}> nie jest zarejestrowany w systemie.` });
      }

      if (userDb.verifiedAt) {
        return interaction.editReply({
          content: `ℹ️ Gracz <@${targetUser.id}> jest już zweryfikowany — reset cooldownu nie jest potrzebny.`,
        });
      }

      if (!userDb.quizLastAttempt && userDb.quizAttempts === 0) {
        return interaction.editReply({
          content: `ℹ️ Gracz <@${targetUser.id}> nie ma aktywnego cooldownu quizu — nie podchodził/a jeszcze do testu.`,
        });
      }

      const prevAttempts = userDb.quizAttempts;

      await prisma.user.update({
        where: { id: userDb.id },
        data: {
          quizAttempts: 0,
          quizLastAttempt: null,
        },
      });

      logger.info(`/weryfikacja reset: ${interaction.user.tag} zresetował quiz dla ${targetUser.tag} (powód: ${powod})`);

      const modEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('🔄 Reset Cooldownu Quizu Weryfikacyjnego')
        .addFields(
          { name: '👤 Gracz',            value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true  },
          { name: '🛡️ Moderator',        value: `<@${interaction.user.id}>`,               inline: true  },
          { name: '📊 Poprzednie próby', value: `${prevAttempts}`,                          inline: true  },
          { name: '📝 Powód',            value: powod,                                      inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — Weryfikacja' })
        .setTimestamp();

      await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', modEmbed);

      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('🔄 Reset Quizu Weryfikacyjnego')
              .setDescription(
                'Twój cooldown quizu weryfikacyjnego na serwerze **AURORA Greenville RP** został zresetowany przez moderatora.\n' +
                'Możesz teraz ponownie podejść do quizu klikając przycisk weryfikacji.'
              )
              .addFields({ name: '📝 Powód', value: powod })
              .setFooter({ text: 'AURORA Greenville RP' })
              .setTimestamp(),
          ],
        });
      } catch {
        logger.warn(`Nie udało się wysłać DM do ${targetUser.tag} (weryfikacja reset)`);
      }

      return interaction.editReply({
        content: `✅ Cooldown quizu dla <@${targetUser.id}> został zresetowany. Gracz może teraz ponownie podejść do quizu.`,
      });
    }

    // ── STAN ─────────────────────────────────────────────────────────────────
    if (sub === 'stan') {
      const targetUser = interaction.options.getUser('gracz');
      const checkingOther = !!targetUser;

      if (checkingOther && !isStaff(interaction.member)) {
        return interaction.editReply({ content: '❌ Tylko Staff może sprawdzać weryfikację innych graczy.' });
      }

      const discordId   = checkingOther ? targetUser.id   : interaction.user.id;
      const lookupUser  = checkingOther ? targetUser       : interaction.user;

      const userDb = await prisma.user.findUnique({
        where:  { discordId },
        select: {
          quizAttempts:    true,
          quizScore:       true,
          quizLastAttempt: true,
          verifiedAt:      true,
          robloxId:        true,
          robloxUsername:  true,
          createdAt:       true,
        },
      });

      if (!userDb) {
        return interaction.editReply({
          content: `❌ ${checkingOther ? `Gracz <@${lookupUser.id}> nie jest` : 'Nie jesteś'} zarejestrowany/a w systemie.`,
        });
      }

      const settings      = await prisma.settings.findFirst();
      const cooldownHours = settings?.quizCooldownHours ?? 24;
      const isVerified    = !!userDb.verifiedAt;
      const hasRoblox     = !!userDb.robloxId;

      let cooldownStatus = '—';
      if (!isVerified) {
        if (userDb.quizLastAttempt) {
          const cooldownMs  = cooldownHours * 3_600_000;
          const elapsed     = Date.now() - userDb.quizLastAttempt.getTime();
          if (elapsed < cooldownMs) {
            const remainMs   = cooldownMs - elapsed;
            const remainMins = Math.ceil(remainMs / 60_000);
            const nextTs     = Math.floor((Date.now() + remainMs) / 1000);
            cooldownStatus = `🔴 Aktywny — ${remainMins} min (<t:${nextTs}:R>)`;
          } else {
            cooldownStatus = '🟢 Brak — może teraz podejść';
          }
        } else {
          cooldownStatus = '🟢 Brak — nie podchodził/a jeszcze';
        }
      }

      const embedColor = isVerified ? COLORS.success
        : userDb.quizAttempts > 0  ? COLORS.warning
        : COLORS.neutral;

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`🔍 Status Weryfikacji — ${lookupUser.tag}`)
        .setThumbnail(lookupUser.displayAvatarURL())
        .addFields(
          {
            name:   '✅ Weryfikacja',
            value:  isVerified
              ? `🟢 Zweryfikowany/a\n<t:${Math.floor(userDb.verifiedAt.getTime() / 1000)}:D>`
              : '🔴 Niezweryfikowany/a',
            inline: true,
          },
          {
            name:   '🎮 Roblox',
            value:  hasRoblox
              ? `🟢 Połączony\n\`${userDb.robloxUsername ?? userDb.robloxId}\``
              : '🔴 Brak konta',
            inline: true,
          },
          {
            name:   '📅 Na serwerze od',
            value:  `<t:${Math.floor(userDb.createdAt.getTime() / 1000)}:D>`,
            inline: true,
          },
        );

      if (!isVerified) {
        const attemptsValue = userDb.quizAttempts > 0
          ? [
              `Liczba prób: **${userDb.quizAttempts}**`,
              `Ostatni wynik: **${userDb.quizScore ?? '—'}/10**`,
              `Ostatnia próba: <t:${Math.floor(userDb.quizLastAttempt.getTime() / 1000)}:R>`,
            ].join('\n')
          : 'Brak prób';

        embed.addFields(
          { name: '📊 Historia quizu', value: attemptsValue,  inline: false },
          { name: '⏳ Cooldown quizu', value: cooldownStatus, inline: false },
        );

        if (checkingOther && isMod(interaction.member) && userDb.quizLastAttempt) {
          embed.addFields({
            name:   '💡 Akcja',
            value:  `Użyj \`/weryfikacja reset\` aby zresetować cooldown tego gracza.`,
            inline: false,
          });
        }
      }

      embed
        .setFooter({ text: `AURORA Greenville RP • sprawdził: ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
