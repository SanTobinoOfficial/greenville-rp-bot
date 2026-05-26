// Komenda /opis-postaci — Wygląd IC postaci (strój, cechy szczególne)
// Uzupełnienie zestawu RP: /me (akcja) · /do (otoczenie) · /szept · /try · /opis-postaci (wygląd)
//
// Subkomendy:
//   /opis-postaci ustaw   — ustaw opis wyglądu swojej postaci (co masz na sobie, cechy)
//   /opis-postaci sprawdz — sprawdź wygląd IC innej postaci (publiczne)
//   /opis-postaci wyczysc — usuń swój opis wyglądu
//
// Opisy przechowywane in-memory (jak activePatrols w /patrol) — resetują się po restarcie bota.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Mapa wyglądu IC: discordId → { opis, icName, updatedAt }
const appearanceMap = new Map();

// ── Pomocnicza: pobierz imię IC gracza ───────────────────────────────────────
async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const userDb = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (userDb?.character) {
      return `${userDb.character.firstName} ${userDb.character.lastName}`;
    }
  } catch {
    // Cisza — fallback poniżej
  }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('opis-postaci')
    .setDescription('Ustaw lub sprawdź wygląd IC postaci — strój, cechy charakterystyczne')
    .addSubcommand(sub =>
      sub
        .setName('ustaw')
        .setDescription('Ustaw opis wyglądu swojej postaci (strój, kolor włosów, cechy szczególne)')
        .addStringOption(opt =>
          opt
            .setName('opis')
            .setDescription(
              'Opis wyglądu IC (np. "Wysoka kobieta w czerwonej kurtce, czarne krótkie włosy, okulary")'
            )
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(400)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sprawdz')
        .setDescription('Sprawdź wygląd IC innej postaci')
        .addUserOption(opt =>
          opt
            .setName('gracz')
            .setDescription('Czyj wygląd chcesz zobaczyć?')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('wyczysc')
        .setDescription('Usuń swój aktualny opis wyglądu IC')
    ),

  async execute(interaction, client, prisma) {
    // Odpowiedź ephemeral — zarządzanie własnym opisem jest prywatne
    await interaction.deferReply({ ephemeral: true });

    // Wymagana rola Mieszkaniec lub wyższa
    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const sub    = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ── USTAW ──────────────────────────────────────────────────────────────────
    if (sub === 'ustaw') {
      const opis   = interaction.options.getString('opis').trim();
      const icName = await getIcName(prisma, userId, interaction.member);

      const isUpdate = appearanceMap.has(userId);
      appearanceMap.set(userId, {
        opis,
        icName,
        updatedAt: Date.now(),
      });

      logger.info(
        `/opis-postaci ustaw | ${interaction.user.tag} (${icName}) | ` +
        `${isUpdate ? 'aktualizacja' : 'nowy'} | "${opis.slice(0, 60)}${opis.length > 60 ? '…' : ''}"`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`✅ Opis wyglądu ${isUpdate ? 'zaktualizowany' : 'ustawiony'}`)
            .setDescription(
              'Inni gracze mogą teraz sprawdzić Twój wygląd IC używając `/opis-postaci sprawdz`.'
            )
            .addFields(
              { name: '🎭 Postać',   value: icName, inline: true  },
              { name: '👁️ Wygląd IC', value: opis,   inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Wygląd IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── SPRAWDZ ────────────────────────────────────────────────────────────────
    if (sub === 'sprawdz') {
      const targetUser = interaction.options.getUser('gracz');

      // Boty nie mają postaci
      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ Nie można sprawdzić wyglądu bota.' });
      }

      // Sprawdź czy cel jest na serwerze
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.editReply({ content: '❌ Ten gracz nie jest na tym serwerze.' });
      }

      const entry = appearanceMap.get(targetUser.id);

      if (!entry) {
        // Gracz nie ustawił opisu — pobierz jego imię IC dla lepszego komunikatu
        const targetIcName = await getIcName(prisma, targetUser.id, targetMember);

        logger.info(
          `/opis-postaci sprawdz | ${interaction.user.tag} → ${targetUser.tag} | brak opisu`
        );

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('👁️ Wygląd postaci — brak opisu')
              .setDescription(
                `**${targetIcName}** nie ustawił/a opisu swojego wyglądu.\n\n` +
                `*Gracz może ustawić opis używając \`/opis-postaci ustaw\`.*`
              )
              .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
              .setFooter({ text: 'AURORA Greenville RP — Wygląd IC' })
              .setTimestamp(),
          ],
        });
      }

      const updatedTs = Math.floor(entry.updatedAt / 1000);

      logger.info(
        `/opis-postaci sprawdz | ${interaction.user.tag} → ${targetUser.tag} (${entry.icName})`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rp)
            .setTitle(`👁️ Wygląd IC — ${entry.icName}`)
            .setDescription(entry.opis)
            .addFields(
              { name: '🎭 Postać',          value: entry.icName,              inline: true },
              { name: '🕐 Opis ustawiony',  value: `<t:${updatedTs}:R>`,      inline: true },
            )
            .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'AURORA Greenville RP — Wygląd IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── WYCZYSC ────────────────────────────────────────────────────────────────
    if (sub === 'wyczysc') {
      if (!appearanceMap.has(userId)) {
        return interaction.editReply({
          content: '❌ Nie masz ustawionego opisu wyglądu — nic do usunięcia.',
        });
      }

      const icName = appearanceMap.get(userId).icName;
      appearanceMap.delete(userId);

      logger.info(`/opis-postaci wyczysc | ${interaction.user.tag} (${icName})`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Opis wyglądu usunięty')
            .setDescription(
              `Opis wyglądu postaci **${icName}** został usunięty.\n` +
              `Użyj \`/opis-postaci ustaw\` aby ustawić nowy.`
            )
            .setFooter({ text: 'AURORA Greenville RP — Wygląd IC' })
            .setTimestamp(),
        ],
      });
    }
  },
};
