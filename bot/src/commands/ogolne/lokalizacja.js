// Komenda /lokalizacja — IC lokalizacja postaci (in-memory)
// Pozwala graczom ogłosić swoją bieżącą lokalizację IC (ulica, dzielnica, punkt orientacyjny)
// Przydatne dla taksówkarzy, EMS szukających poszkodowanego, patroli policji.
// Wzorzec identyczny z /opis-postaci i /stan-postaci — dane in-memory, resetują się po restarcie.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Mapa lokalizacji IC: discordId → { lokalizacja, icName, updatedAt }
const locationMap = new Map();

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
    .setName('lokalizacja')
    .setDescription('Ustaw lub sprawdź bieżącą lokalizację IC postaci — ulica, dzielnica, punkt orientacyjny')
    .addSubcommand(sub =>
      sub
        .setName('ustaw')
        .setDescription('Ogłoś swoją aktualną lokalizację IC')
        .addStringOption(opt =>
          opt
            .setName('miejsce')
            .setDescription('Lokalizacja IC (np. "ul. Baker 12, rejon portu" lub "parking przy centrum handlowym")')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sprawdz')
        .setDescription('Sprawdź lokalizację IC innej postaci')
        .addUserOption(opt =>
          opt
            .setName('gracz')
            .setDescription('Czyją lokalizację chcesz sprawdzić?')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('wyczysc')
        .setDescription('Usuń swoją bieżącą lokalizację IC')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z lokalizatora IC.',
      });
    }

    const sub    = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ── USTAW ─────────────────────────────────────────────────────────────────
    if (sub === 'ustaw') {
      const miejsce  = interaction.options.getString('miejsce').trim();
      const icName   = await getIcName(prisma, userId, interaction.member);
      const isUpdate = locationMap.has(userId);

      locationMap.set(userId, { lokalizacja: miejsce, icName, updatedAt: Date.now() });

      logger.info(
        `/lokalizacja ustaw | ${interaction.user.tag} (${icName}) | ` +
        `${isUpdate ? 'aktualizacja' : 'nowa'} | "${miejsce}"`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`📍 Lokalizacja IC ${isUpdate ? 'zaktualizowana' : 'ustawiona'}`)
            .setDescription(
              'Inni gracze mogą teraz sprawdzić Twoją lokalizację IC używając `/lokalizacja sprawdz`.'
            )
            .addFields(
              { name: '🎭 Postać',         value: icName,   inline: true  },
              { name: '📍 Lokalizacja IC', value: miejsce,  inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Lokalizator IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── SPRAWDZ ───────────────────────────────────────────────────────────────
    if (sub === 'sprawdz') {
      const targetUser = interaction.options.getUser('gracz');

      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ Nie można sprawdzić lokalizacji bota.' });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.editReply({ content: '❌ Ten gracz nie jest na tym serwerze.' });
      }

      const entry = locationMap.get(targetUser.id);

      if (!entry) {
        const targetIcName = await getIcName(prisma, targetUser.id, targetMember);

        logger.info(
          `/lokalizacja sprawdz | ${interaction.user.tag} → ${targetUser.tag} (${targetIcName}) | brak lokalizacji`
        );

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📍 Lokalizacja IC — nieznana')
              .setDescription(
                `**${targetIcName}** nie ustawił/a swojej lokalizacji IC.\n\n` +
                `*Gracz może ją ustawić używając \`/lokalizacja ustaw\`.*`
              )
              .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
              .setFooter({ text: 'AURORA Greenville RP — Lokalizator IC' })
              .setTimestamp(),
          ],
        });
      }

      const updatedTs = Math.floor(entry.updatedAt / 1000);

      logger.info(
        `/lokalizacja sprawdz | ${interaction.user.tag} → ${targetUser.tag} (${entry.icName}) | "${entry.lokalizacja}"`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rp)
            .setTitle(`📍 Lokalizacja IC — ${entry.icName}`)
            .addFields(
              { name: '🎭 Postać',           value: entry.icName,               inline: true  },
              { name: '🕐 Zaktualizowano',    value: `<t:${updatedTs}:R>`,       inline: true  },
              { name: '📍 Lokalizacja IC',   value: entry.lokalizacja,          inline: false },
            )
            .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'AURORA Greenville RP — Lokalizator IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── WYCZYSC ───────────────────────────────────────────────────────────────
    if (sub === 'wyczysc') {
      if (!locationMap.has(userId)) {
        return interaction.editReply({
          content: '❌ Nie masz ustawionej lokalizacji IC — nic do usunięcia.',
        });
      }

      const { icName, lokalizacja } = locationMap.get(userId);
      locationMap.delete(userId);

      logger.info(`/lokalizacja wyczysc | ${interaction.user.tag} (${icName}) | była: "${lokalizacja}"`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Lokalizacja IC usunięta')
            .setDescription(
              `Lokalizacja postaci **${icName}** została usunięta.\n` +
              `Użyj \`/lokalizacja ustaw\` aby ustawić nową.`
            )
            .addFields({ name: '📍 Poprzednia lokalizacja', value: lokalizacja, inline: false })
            .setFooter({ text: 'AURORA Greenville RP — Lokalizator IC' })
            .setTimestamp(),
        ],
      });
    }
  },
};
