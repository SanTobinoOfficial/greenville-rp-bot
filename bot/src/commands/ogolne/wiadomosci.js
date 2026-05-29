// Komenda /wiadomosci — Gazeta IC / Tablica Ogłoszeń RP
// Używa istniejącego modelu News z bazy danych (schema.prisma)
// opublikuj: HR+ publikuje artykuł IC widoczny na kanale
// lista:     Mieszkańcy przeglądają ostatnie artykuły (z opcją filtra kategorii)
// pokaz:     Wyświetla pełen artykuł po 6-znakowym skróconym ID

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { hasRole, ROLES, isVerified, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const CATEGORIES = {
  lokalne:    { label: 'Wiadomości Lokalne', emoji: '📰', color: 0x3498DB },
  policja:    { label: 'Komunikat Policji',  emoji: '🚔', color: 0x003087 },
  ems:        { label: 'Komunikat EMS',      emoji: '🚑', color: 0xED4245 },
  ogloszenie: { label: 'Ogłoszenie',         emoji: '📢', color: 0xF1C40F },
  wypadek:    { label: 'Raport Wypadku',     emoji: '🚨', color: 0xFF7F00 },
  sad:        { label: 'Decyzja Sądu',       emoji: '⚖️', color: 0x9B59B6 },
  kronika:    { label: 'Kronika Miejska',    emoji: '📜', color: 0x2ECC71 },
};

const CATEGORY_CHOICES = [
  { name: '📰 Wiadomości Lokalne', value: 'lokalne'    },
  { name: '🚔 Komunikat Policji',  value: 'policja'    },
  { name: '🚑 Komunikat EMS',      value: 'ems'        },
  { name: '📢 Ogłoszenie',         value: 'ogloszenie' },
  { name: '🚨 Raport Wypadku',     value: 'wypadek'    },
  { name: '⚖️ Decyzja Sądu',       value: 'sad'        },
  { name: '📜 Kronika Miejska',    value: 'kronika'    },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wiadomosci')
    .setDescription('Gazeta IC — wiadomości i ogłoszenia In-Character')
    .addSubcommand(sub =>
      sub.setName('opublikuj')
        .setDescription('Opublikuj artykuł w gazecie IC (HR+)')
        .addStringOption(opt =>
          opt.setName('tytul')
            .setDescription('Tytuł artykułu')
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(100)
        )
        .addStringOption(opt =>
          opt.setName('tresc')
            .setDescription('Treść artykułu IC')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(1800)
        )
        .addStringOption(opt =>
          opt.setName('kategoria')
            .setDescription('Kategoria artykułu (domyślnie: Wiadomości Lokalne)')
            .setRequired(false)
            .addChoices(...CATEGORY_CHOICES)
        )
        .addStringOption(opt =>
          opt.setName('zdjecie')
            .setDescription('URL obrazka do artykułu (opcjonalnie, musi zaczynać się od https://)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Przeglądaj ostatnie wiadomości IC (Mieszkaniec+)')
        .addStringOption(opt =>
          opt.setName('kategoria')
            .setDescription('Filtruj po kategorii (opcjonalnie)')
            .setRequired(false)
            .addChoices(...CATEGORY_CHOICES)
        )
    )
    .addSubcommand(sub =>
      sub.setName('pokaz')
        .setDescription('Wyświetl pełen artykuł IC po identyfikatorze (Mieszkaniec+)')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('6-znakowe ID artykułu z /wiadomosci lista (np. A1B2C3)')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ── OPUBLIKUJ ─────────────────────────────────────────────────────────────
    if (sub === 'opublikuj') {
      if (!hasRole(interaction.member, ROLES.HR)) {
        return interaction.editReply(noPermissionReply('HR'));
      }

      const tytul      = interaction.options.getString('tytul').trim();
      const tresc      = interaction.options.getString('tresc').trim();
      const catKey     = interaction.options.getString('kategoria') ?? 'lokalne';
      const zdjecieUrl = interaction.options.getString('zdjecie')?.trim() ?? null;
      const cat        = CATEGORIES[catKey];

      if (zdjecieUrl) {
        try {
          const parsed = new URL(zdjecieUrl);
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        } catch {
          return interaction.editReply({ content: '❌ Podany URL obrazka jest nieprawidłowy. Musi zaczynać się od `https://`.' });
        }
      }

      let userDb = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      if (!userDb) {
        userDb = await prisma.user.create({
          data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
        });
      }

      const article = await prisma.news.create({
        data: {
          title:     tytul,
          content:   tresc,
          imageUrl:  zdjecieUrl,
          category:  cat.label,
          authorId:  userDb.id,
          published: true,
        },
      });

      const shortId = article.id.slice(-6).toUpperCase();

      const pubEmbed = new EmbedBuilder()
        .setColor(cat.color)
        .setAuthor({
          name:    `${cat.emoji} ${cat.label}`,
          iconURL: interaction.user.displayAvatarURL({ size: 32 }),
        })
        .setTitle(tytul)
        .setDescription(tresc.length > 900 ? tresc.slice(0, 900) + '…' : tresc)
        .addFields(
          { name: '✍️ Autor', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🆔 ID',    value: `\`${shortId}\``,            inline: true },
        )
        .setFooter({ text: `AURORA Greenville RP — Gazeta IC | ID: ${shortId}` })
        .setTimestamp();

      if (zdjecieUrl) pubEmbed.setImage(zdjecieUrl);

      await interaction.channel.send({ embeds: [pubEmbed] }).catch(err =>
        logger.warn(`/wiadomosci opublikuj: błąd wysyłania na kanał: ${err.message}`)
      );

      logger.info(`/wiadomosci opublikuj | ${interaction.user.tag} | ID: ${shortId} | "${tytul}"`);

      return interaction.editReply({
        content: `✅ Artykuł **„${tytul}"** opublikowany w kategorii **${cat.label}**.\nID: \`${shortId}\` — gracze mogą go odczytać przez \`/wiadomosci pokaz ${shortId}\`.`,
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      if (!isVerified(interaction.member)) {
        return interaction.editReply({ content: '❌ Tylko zweryfikowani mieszkańcy mogą przeglądać gazetę.' });
      }

      const catKey   = interaction.options.getString('kategoria') ?? null;
      const catLabel = catKey ? CATEGORIES[catKey]?.label : null;

      const where = { published: true };
      if (catLabel) where.category = catLabel;

      const articles = await prisma.news.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        include: { author: { select: { discordId: true } } },
      });

      if (articles.length === 0) {
        return interaction.editReply({
          content: '📰 Brak opublikowanych wiadomości' +
            (catLabel ? ` w kategorii **${catLabel}**` : '') + '.',
        });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('📰 Gazeta IC — Ostatnie wiadomości')
        .setFooter({ text: 'AURORA Greenville RP — Gazeta IC | /wiadomosci pokaz <ID>' })
        .setTimestamp();

      for (const art of articles) {
        const artCat  = Object.values(CATEGORIES).find(c => c.label === art.category) ?? CATEGORIES.lokalne;
        const sid     = art.id.slice(-6).toUpperCase();
        const pinTag  = art.pinned ? '📌 ' : '';
        const ts      = Math.floor(art.createdAt.getTime() / 1000);
        const preview = art.content.length > 120 ? art.content.slice(0, 120) + '…' : art.content;

        embed.addFields({
          name:  `${pinTag}${artCat.emoji} ${art.title}  \`[${sid}]\``,
          value: `${preview}\n*<t:${ts}:R> — <@${art.author.discordId}>*`,
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── POKAZ ─────────────────────────────────────────────────────────────────
    if (sub === 'pokaz') {
      if (!isVerified(interaction.member)) {
        return interaction.editReply({ content: '❌ Tylko zweryfikowani mieszkańcy mogą czytać gazetę.' });
      }

      const shortId = interaction.options.getString('id').trim().toUpperCase();

      // CUID ends with the last 6 chars — match case-insensitively
      const article = await prisma.news.findFirst({
        where: {
          published: true,
          id: { endsWith: shortId.toLowerCase() },
        },
        include: { author: { select: { discordId: true } } },
      });

      if (!article) {
        return interaction.editReply({
          content: `❌ Nie znaleziono artykułu o ID \`${shortId}\`.\nSprawdź dostępne wiadomości przez \`/wiadomosci lista\`.`,
        });
      }

      const artCat = Object.values(CATEGORIES).find(c => c.label === article.category) ?? CATEGORIES.lokalne;
      const ts     = Math.floor(article.createdAt.getTime() / 1000);
      const title  = article.pinned ? `📌 ${article.title}` : article.title;

      const embed = new EmbedBuilder()
        .setColor(artCat.color)
        .setAuthor({ name: `${artCat.emoji} ${article.category}` })
        .setTitle(title)
        .setDescription(article.content)
        .addFields(
          { name: '✍️ Autor',        value: `<@${article.author.discordId}>`, inline: true },
          { name: '🕐 Opublikowano', value: `<t:${ts}:F>`,                   inline: true },
          { name: '🆔 ID',           value: `\`${shortId}\``,                inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — Gazeta IC' })
        .setTimestamp();

      if (article.imageUrl) embed.setImage(article.imageUrl);

      logger.info(`/wiadomosci pokaz | ${interaction.user.tag} | ID: ${shortId} | "${article.title}"`);

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
