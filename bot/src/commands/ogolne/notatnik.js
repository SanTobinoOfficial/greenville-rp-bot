// Komenda /notatnik — prywatny notatnik IC gracza (in-memory)
// Pozwala graczom zapisywać krótkie notatki IC widoczne tylko dla nich:
// numery tablic, opisy osób/pojazdów, adresy, uwagi z sesji itp.
// Dane in-memory (jak /stan-postaci, /opis-postaci) — resetują się po restarcie bota.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Mapa notatek IC: discordId → { tresc, icName, updatedAt }
const notesMap = new Map();

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
    .setName('notatnik')
    .setDescription('Prywatny notatnik IC — zapisuj numery tablic, opisy, adresy, uwagi z sesji')
    .addSubcommand(sub =>
      sub
        .setName('zapisz')
        .setDescription('Zapisz notatkę IC (zastępuje poprzednią)')
        .addStringOption(opt =>
          opt
            .setName('tresc')
            .setDescription('Treść notatki (np. "Tabl. GRV-1234, szary sedan, rejon portu")')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(500)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('czytaj')
        .setDescription('Odczytaj swoją bieżącą notatkę IC')
    )
    .addSubcommand(sub =>
      sub
        .setName('wyczysc')
        .setDescription('Usuń swoją notatkę IC')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać notatnika.',
      });
    }

    const sub    = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ── ZAPISZ ────────────────────────────────────────────────────────────────
    if (sub === 'zapisz') {
      const tresc    = interaction.options.getString('tresc').trim();
      const icName   = await getIcName(prisma, userId, interaction.member);
      const isUpdate = notesMap.has(userId);

      notesMap.set(userId, { tresc, icName, updatedAt: Date.now() });

      logger.info(
        `/notatnik zapisz | ${interaction.user.tag} (${icName}) | ` +
        `${isUpdate ? 'aktualizacja' : 'nowa'} | ${tresc.length} znaków`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`📓 Notatka IC ${isUpdate ? 'zaktualizowana' : 'zapisana'}`)
            .setDescription(
              '> *Notatka widoczna tylko dla Ciebie. Użyj `/notatnik czytaj` aby ją odczytać.*'
            )
            .addFields(
              { name: '🎭 Postać',         value: icName, inline: true  },
              { name: '📝 Treść notatki',  value: tresc,  inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Notatnik IC | Widoczna tylko dla Ciebie' })
            .setTimestamp(),
        ],
      });
    }

    // ── CZYTAJ ────────────────────────────────────────────────────────────────
    if (sub === 'czytaj') {
      const entry = notesMap.get(userId);

      if (!entry) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📓 Notatnik IC — brak notatki')
              .setDescription(
                'Nie masz żadnej zapisanej notatki IC.\n' +
                'Użyj `/notatnik zapisz` aby dodać pierwszą.'
              )
              .setFooter({ text: 'AURORA Greenville RP — Notatnik IC' })
              .setTimestamp(),
          ],
        });
      }

      const updatedTs = Math.floor(entry.updatedAt / 1000);

      logger.info(`/notatnik czytaj | ${interaction.user.tag} (${entry.icName})`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rp)
            .setTitle('📓 Twoja notatka IC')
            .addFields(
              { name: '🎭 Postać',          value: entry.icName,         inline: true  },
              { name: '🕐 Zapisano',         value: `<t:${updatedTs}:R>`, inline: true  },
              { name: '📝 Treść notatki',    value: entry.tresc,          inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Notatnik IC | Widoczna tylko dla Ciebie' })
            .setTimestamp(),
        ],
      });
    }

    // ── WYCZYSC ───────────────────────────────────────────────────────────────
    if (sub === 'wyczysc') {
      if (!notesMap.has(userId)) {
        return interaction.editReply({
          content: '❌ Nie masz żadnej notatki do usunięcia.',
        });
      }

      const { icName } = notesMap.get(userId);
      notesMap.delete(userId);

      logger.info(`/notatnik wyczysc | ${interaction.user.tag} (${icName})`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Notatka IC usunięta')
            .setDescription(
              `Notatka postaci **${icName}** została usunięta.\n` +
              'Użyj `/notatnik zapisz` aby dodać nową.'
            )
            .setFooter({ text: 'AURORA Greenville RP — Notatnik IC' })
            .setTimestamp(),
        ],
      });
    }
  },
};
