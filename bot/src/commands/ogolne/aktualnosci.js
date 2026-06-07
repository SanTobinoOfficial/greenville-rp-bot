// /aktualnosci — System aktualności serwera (używa modelu News z bazy danych)
// lista: przegląd opublikowanych wpisów (wszyscy)
// dodaj: dodaj wpis (Moderator+)
// usun:  usuń wpis po skróconym ID (Moderator+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isMod, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const CATEGORY_EMOJI = {
  'IC':         '🎭',
  'OOC':        '💬',
  'Ogłoszenie': '📢',
  'Sesja':      '🗓️',
};

const PAGE_SIZE = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aktualnosci')
    .setDescription('System aktualności serwera AURORA Greenville RP')
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Przeglądaj najnowsze aktualności serwera')
        .addIntegerOption(opt =>
          opt
            .setName('strona')
            .setDescription('Numer strony (domyślnie 1)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('dodaj')
        .setDescription('Dodaj wpis do aktualności (Moderator+)')
        .addStringOption(opt =>
          opt.setName('tytul').setDescription('Tytuł aktualności').setRequired(true).setMaxLength(100)
        )
        .addStringOption(opt =>
          opt.setName('tresc').setDescription('Treść aktualności').setRequired(true).setMaxLength(1500)
        )
        .addStringOption(opt =>
          opt
            .setName('kategoria')
            .setDescription('Kategoria wpisu (domyślnie: Ogłoszenie)')
            .setRequired(false)
            .addChoices(
              { name: '🎭 IC — w klimacie RP',   value: 'IC' },
              { name: '💬 OOC — poza klimatem',   value: 'OOC' },
              { name: '📢 Ogłoszenie',             value: 'Ogłoszenie' },
              { name: '🗓️ Sesja',                  value: 'Sesja' },
            )
        )
        .addStringOption(opt =>
          opt
            .setName('obrazek')
            .setDescription('URL obrazka dołączonego do wpisu (opcjonalne)')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('przypnij').setDescription('Przypiń wpis na górze listy').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('usun')
        .setDescription('Usuń wpis z aktualności (Moderator+)')
        .addStringOption(opt =>
          opt
            .setName('id')
            .setDescription('Skrócone ID wpisu widoczne w /aktualnosci lista (np. ABC123)')
            .setRequired(true)
            .setMaxLength(30)
        )
    ),

  async execute(interaction, client, prisma) {
    const sub = interaction.options.getSubcommand();

    // lista jest publiczne; dodaj/usun są ephemeralne (tylko dla autora)
    await interaction.deferReply({ ephemeral: sub !== 'lista' });

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const page = (interaction.options.getInteger('strona') ?? 1) - 1;
      const skip = page * PAGE_SIZE;

      const [total, items] = await Promise.all([
        prisma.news.count({ where: { published: true } }),
        prisma.news.findMany({
          where: { published: true },
          include: { author: { select: { discordUsername: true } } },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: PAGE_SIZE,
        }),
      ]);

      if (items.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📰 Aktualności — AURORA Greenville RP')
              .setDescription(
                page === 0
                  ? '*Brak opublikowanych aktualności. Wróć tu wkrótce!*'
                  : '❌ Nie ma więcej wpisów na tej stronie.'
              )
              .setFooter({ text: 'AURORA Greenville RP — Aktualności' })
              .setTimestamp(),
          ],
        });
      }

      const totalPages = Math.ceil(total / PAGE_SIZE);

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📰 Aktualności serwera — AURORA Greenville RP');

      for (const item of items) {
        const emoji  = CATEGORY_EMOJI[item.category] ?? '📌';
        const pin    = item.pinned ? ' 📌' : '';
        const ts     = Math.floor(new Date(item.createdAt).getTime() / 1000);
        const author = item.author?.discordUsername ?? 'Staff';
        const id     = item.id.slice(-6).toUpperCase();
        const tresc  = item.content.length > 280
          ? item.content.slice(0, 280) + '…'
          : item.content;

        embed.addFields({
          name:   `${emoji}${pin} [${item.category}] ${item.title}`,
          value:  `${tresc}\n*— ${author} • <t:${ts}:D> • \`${id}\`*`,
          inline: false,
        });

        // Obrazek z pierwszego wpisu który go posiada
        if (item.imageUrl && !embed.data.image) {
          embed.setImage(item.imageUrl);
        }
      }

      if (totalPages > 1 && page + 1 < totalPages) {
        embed.setDescription(`Więcej wpisów: \`/aktualnosci lista strona:${page + 2}\``);
      }

      embed
        .setFooter({ text: `Strona ${page + 1}/${totalPages} • Łącznie: ${total} wpisów • AURORA Greenville RP` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── DODAJ ─────────────────────────────────────────────────────────────────
    if (sub === 'dodaj') {
      if (!isMod(interaction.member)) {
        return interaction.editReply(noPermissionReply('Moderator+'));
      }

      const dbAuthor = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
      });
      if (!dbAuthor) {
        return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany w systemie bota.' });
      }

      const title    = interaction.options.getString('tytul').trim();
      const content  = interaction.options.getString('tresc').trim();
      const category = interaction.options.getString('kategoria') ?? 'Ogłoszenie';
      const imageUrl = interaction.options.getString('obrazek')?.trim() || null;
      const pinned   = interaction.options.getBoolean('przypnij') ?? false;

      if (imageUrl) {
        try {
          const u = new URL(imageUrl);
          if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
        } catch {
          return interaction.editReply({
            content: '❌ Podany URL obrazka jest nieprawidłowy. Musi zaczynać się od `http://` lub `https://`.',
          });
        }
      }

      const news = await prisma.news.create({
        data: { title, content, category, imageUrl, pinned, authorId: dbAuthor.id, published: true },
      });

      const shortId = news.id.slice(-6).toUpperCase();
      const emoji   = CATEGORY_EMOJI[category] ?? '📌';

      logger.info(`/aktualnosci dodaj | ${interaction.user.tag} | [${category}] "${title}" | ID: ${news.id}`);

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Aktualność opublikowana')
        .addFields(
          { name: `${emoji} Tytuł`,  value: title,             inline: true },
          { name: '📂 Kategoria',    value: category,          inline: true },
          { name: '🆔 Skrócone ID',  value: `\`${shortId}\``, inline: true },
          { name: '📝 Treść',        value: content.slice(0, 500), inline: false },
        )
        .setFooter({ text: `Opublikował: ${interaction.user.tag} • AURORA Greenville RP` })
        .setTimestamp();

      if (pinned) {
        embed.addFields({ name: '📌 Status', value: 'Wpis przypięty na górze', inline: true });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── USUN ──────────────────────────────────────────────────────────────────
    if (sub === 'usun') {
      if (!isMod(interaction.member)) {
        return interaction.editReply(noPermissionReply('Moderator+'));
      }

      // Obsługuje zarówno pełne CUID jak i skrócone 6-znakowe ID
      const rawInput  = interaction.options.getString('id').trim();
      const searchKey = rawInput.slice(-6).toUpperCase();

      // Aktualności to mały zbiór danych — fetch + filtrowanie w JS jest OK
      const allNews = await prisma.news.findMany({
        select: { id: true, title: true, category: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      const item = allNews.find(n => n.id.slice(-6).toUpperCase() === searchKey);

      if (!item) {
        return interaction.editReply({
          content: `❌ Nie znaleziono aktualności o ID \`${searchKey}\`. Sprawdź dostępne ID: \`/aktualnosci lista\`.`,
        });
      }

      await prisma.news.delete({ where: { id: item.id } });

      logger.info(`/aktualnosci usun | ${interaction.user.tag} | "${item.title}" | ID: ${item.id}`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Aktualność usunięta')
            .addFields(
              { name: '📰 Tytuł', value: item.title,      inline: true },
              { name: '🆔 ID',    value: `\`${searchKey}\``, inline: true },
            )
            .setFooter({ text: `Usunął: ${interaction.user.tag} • AURORA Greenville RP` })
            .setTimestamp(),
        ],
      });
    }
  },
};
