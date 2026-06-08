// Komenda /sesja-edytuj — edytuje zaplanowaną sesję RP (UPCOMING)
// Pozwala hostowi zaktualizować opis, limit graczy lub datę/godzinę.
// Aktualizuje embed ogłoszenia w kanale.
// Dostępna dla: Host+

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const logger = require('../../utils/logger');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesja-edytuj')
    .setDescription('Edytuj zaplanowaną sesję RP — zmień opis, limit graczy lub datę (Host+)')
    .addIntegerOption(opt =>
      opt
        .setName('maks_graczy')
        .setDescription('Nowa maksymalna liczba graczy (2–50)')
        .setMinValue(2)
        .setMaxValue(50)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('opis')
        .setDescription('Nowy opis sesji (zastąpi poprzedni)')
        .setMinLength(3)
        .setMaxLength(500)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('data')
        .setDescription('Nowa data sesji w formacie DD.MM.RRRR')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('godzina')
        .setDescription('Nowa godzina sesji w formacie HH:MM')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('id')
        .setDescription('ID sesji do edycji (opcjonalne — domyślnie najbliższa Twoja sesja)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    await interaction.deferReply({ ephemeral: true });

    const newMaksGraczy = interaction.options.getInteger('maks_graczy');
    const newOpis       = interaction.options.getString('opis')?.trim() ?? null;
    const newDataStr    = interaction.options.getString('data')?.trim() ?? null;
    const newGodzina    = interaction.options.getString('godzina')?.trim() ?? null;
    const sessionId     = interaction.options.getString('id')?.trim() ?? null;

    // Sprawdź czy podano choć jedną zmianę
    if (!newMaksGraczy && !newOpis && !newDataStr && !newGodzina) {
      return interaction.editReply({
        content: '❌ Podaj co najmniej jedną zmianę: `maks_graczy`, `opis`, `data` lub `godzina`.',
      });
    }

    // Walidacja formatu daty
    if (newDataStr) {
      if (!/^\d{2}\.\d{2}\.\d{4}$/.test(newDataStr)) {
        return interaction.editReply({
          content: '❌ Nieprawidłowy format daty. Użyj: **DD.MM.RRRR** (np. `25.12.2025`)',
        });
      }
    }

    // Walidacja formatu godziny
    if (newGodzina) {
      if (!/^\d{2}:\d{2}$/.test(newGodzina)) {
        return interaction.editReply({
          content: '❌ Nieprawidłowy format godziny. Użyj: **HH:MM** (np. `19:00`)',
        });
      }
    }

    // Pobierz wewnętrzne ID hosta w bazie
    const hostDbUser = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    // Znajdź sesję
    let session;
    if (sessionId) {
      session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        return interaction.editReply({ content: '❌ Nie znaleziono sesji o podanym ID.' });
      }
    } else {
      session = hostDbUser
        ? await prisma.session.findFirst({
            where: { hostId: hostDbUser.id, status: 'UPCOMING' },
            orderBy: { date: 'asc' },
          })
        : null;

      if (!session) {
        return interaction.editReply({
          content: '❌ Nie masz żadnej zaplanowanej sesji do edycji.\nUtwórz sesję przez `/sesja`.',
        });
      }
    }

    if (session.status !== 'UPCOMING') {
      const labels = { ONGOING: 'trwa (nie można edytować trwającej sesji)', ENDED: 'zakończona', CANCELLED: 'anulowana' };
      return interaction.editReply({
        content: `❌ Ta sesja jest ${labels[session.status] ?? 'w nieprawidłowym stanie'} — edytować można tylko zaplanowane sesje.`,
      });
    }

    // Zbuduj nową datę jeśli zmieniana
    let newDate = session.date;
    let displayDataStr = null;
    let displayGodzina = null;

    if (newDataStr || newGodzina) {
      // Pobierz aktualną datę i godzinę jako punkt startowy
      const curIso   = session.date.toISOString(); // YYYY-MM-DDTHH:MM:SS.mssZ
      const curDD    = curIso.slice(8, 10);
      const curMM    = curIso.slice(5, 7);
      const curYYYY  = curIso.slice(0, 4);
      const curHH    = curIso.slice(11, 13);
      const curMin   = curIso.slice(14, 16);

      const [dd, mm, yyyy] = newDataStr
        ? newDataStr.split('.')
        : [curDD, curMM, curYYYY];
      const [hh, min] = newGodzina
        ? newGodzina.split(':')
        : [curHH, curMin];

      newDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00.000Z`);
      if (isNaN(newDate.getTime())) {
        return interaction.editReply({
          content: '❌ Nieprawidłowa data lub godzina. Sprawdź poprawność wartości.',
        });
      }

      displayDataStr = `${dd}.${mm}.${yyyy}`;
      displayGodzina = `${hh}:${min}`;
    }

    // Przygotuj pola aktualizacji
    const updateData = {};
    if (newMaksGraczy)   updateData.maxPlayers  = newMaksGraczy;
    if (newOpis !== null) updateData.description = newOpis;
    if (newDataStr || newGodzina) updateData.date = newDate;

    // Zapisz zmiany w bazie
    const updated = await prisma.session.update({
      where: { id: session.id },
      data:  updateData,
    });

    // Finalne wartości do wyświetlenia (po aktualizacji)
    const finalMaks    = updated.maxPlayers;
    const finalDate    = updated.date;
    const finalUnixTs  = Math.floor(finalDate.getTime() / 1000);
    const finalDateStr = displayDataStr ?? (() => {
      const d = finalDate.toISOString();
      return `${d.slice(8,10)}.${d.slice(5,7)}.${d.slice(0,4)}`;
    })();
    const finalGodzina = displayGodzina ?? (() => {
      const d = finalDate.toISOString();
      return `${d.slice(11,13)}:${d.slice(14,16)}`;
    })();
    const finalOpis    = updated.description ?? '_Brak opisu_';

    // Policz aktualnych zapisanych
    const signupsCount = await prisma.sessionSignup.count({ where: { sessionId: session.id } });

    // ── Zaktualizuj embed ogłoszenia w kanale ─────────────────────────────────
    if (session.messageId && session.channelId) {
      try {
        const sessionChannel = await client.channels.fetch(session.channelId);
        const sessionMsg     = await sessionChannel.messages.fetch(session.messageId);

        const joinButton = new ButtonBuilder()
          .setCustomId(`session_join_${session.id}`)
          .setLabel('✅ Zapisz się')
          .setStyle(ButtonStyle.Success);

        const leaveButton = new ButtonBuilder()
          .setCustomId(`session_leave_${session.id}`)
          .setLabel('❌ Wypisz się')
          .setStyle(ButtonStyle.Danger);

        const closeButton = new ButtonBuilder()
          .setCustomId(`session_close_${session.id}`)
          .setLabel('🔒 Zamknij zapisy')
          .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(joinButton, leaveButton, closeButton);

        const updatedEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`🎪 Sesja RP — ${finalDateStr} o ${finalGodzina}`)
          .setDescription('Zapisz się na nadchodzącą sesję RP! Liczba miejsc ograniczona.')
          .addFields(
            { name: '👤 Host',         value: `<@${interaction.user.id}>`,         inline: true  },
            { name: '📅 Data',         value: finalDateStr,                         inline: true  },
            { name: '⏰ Godzina',      value: finalGodzina,                         inline: true  },
            { name: '👥 Maks. graczy', value: `${finalMaks}`,                       inline: true  },
            { name: '✅ Zapisani',     value: `${signupsCount} / ${finalMaks}`,     inline: true  },
            { name: '🕐 Kiedy',        value: `<t:${finalUnixTs}:R>`,              inline: true  },
            { name: '📝 Opis',         value: finalOpis,                            inline: false },
          )
          .setFooter({ text: `AURORA Greenville RP • Sesja ID: ${session.id.slice(0, 8)} • ✏️ Edytowano` })
          .setTimestamp();

        await sessionMsg.edit({ embeds: [updatedEmbed], components: [actionRow] });

        logger.info(`sesja-edytuj: zaktualizowano embed dla sesji ${session.id.slice(0, 8)}`);
      } catch (err) {
        logger.warn(`sesja-edytuj: nie udało się zaktualizować wiadomości sesji ${session.id}:`, err.message);
      }
    }

    // ── Lista zmian do raportu ────────────────────────────────────────────────
    const zmiany = [];
    if (newMaksGraczy)          zmiany.push(`👥 Maks. graczy: **${newMaksGraczy}**`);
    if (newOpis !== null)       zmiany.push(`📝 Opis: *${newOpis.slice(0, 80)}${newOpis.length > 80 ? '…' : ''}*`);
    if (newDataStr || newGodzina) zmiany.push(`📅 Data/godzina: **${finalDateStr} o ${finalGodzina}**`);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Sesja zaktualizowana')
          .setDescription(
            `Sesja **ID: \`${session.id.slice(0, 8)}\`** została pomyślnie zaktualizowana.\n\n` +
            `**Zmiany:**\n${zmiany.join('\n')}`
          )
          .addFields(
            { name: '📅 Nowa data',       value: `<t:${finalUnixTs}:F>`, inline: true  },
            { name: '👥 Maks. graczy',    value: `${finalMaks}`,         inline: true  },
            { name: '✅ Zapisani',        value: `${signupsCount}`,      inline: true  },
          )
          .setFooter({ text: 'AURORA Greenville RP — Edytor Sesji' })
          .setTimestamp(),
      ],
    });

    logger.info(
      `sesja-edytuj | ${interaction.user.tag} | sesja ${session.id.slice(0, 8)} | ` +
      `zmiany: ${zmiany.map(z => z.replace(/\*|\n/g, '')).join(', ')}`
    );
  },
};
