// Komenda /ic-ogloszenie — IC tablica ogłoszeń społeczności
// Mieszkańcy mogą publikować krótkie ogłoszenia IC (oferty pracy, usługi, zaginione, inne).
// Ogłoszenia wygasają automatycznie po 48h. Maks. 3 aktywne ogłoszenia per gracz.
// Dostępna dla: Mieszkaniec+

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const TTL_MS       = 48 * 60 * 60 * 1000;
const MAX_PER_USER = 3;

const CATEGORIES = {
  PRACA:     { label: 'Praca / Zatrudnienie', emoji: '💼', color: 0x22C55E },
  TRANSPORT: { label: 'Transport',            emoji: '🚗', color: 0x3B82F6 },
  USLUGI:    { label: 'Usługi',               emoji: '🔧', color: 0xF59E0B },
  INNE:      { label: 'Różne',                emoji: '📌', color: 0x6366F1 },
};

const CATEGORY_CHOICES = Object.entries(CATEGORIES).map(([value, { label, emoji }]) => ({
  name: `${emoji} ${label}`,
  value,
}));

// Map<id, entry>
const board = new Map();
let nextId = 1;

function purgeExpired() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, entry] of board) {
    if (entry.createdAt < cutoff) board.delete(id);
  }
}

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const u = await prisma.user.findUnique({
      where:   { discordId },
      include: { character: true },
    });
    if (u?.character) return `${u.character.firstName} ${u.character.lastName}`;
  } catch { /* fallback below */ }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ic-ogloszenie')
    .setDescription('IC tablica ogłoszeń — dodaj, przeglądaj lub usuń ogłoszenie społeczności')
    .addSubcommand(sub =>
      sub
        .setName('dodaj')
        .setDescription('Opublikuj ogłoszenie IC na tablicy społeczności (maks. 3 aktywne)')
        .addStringOption(opt =>
          opt
            .setName('kategoria')
            .setDescription('Kategoria ogłoszenia')
            .setRequired(true)
            .addChoices(...CATEGORY_CHOICES)
        )
        .addStringOption(opt =>
          opt
            .setName('tytul')
            .setDescription('Krótki tytuł ogłoszenia (maks. 80 znaków)')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(80)
        )
        .addStringOption(opt =>
          opt
            .setName('tresc')
            .setDescription('Treść ogłoszenia (maks. 400 znaków)')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(400)
        )
        .addStringOption(opt =>
          opt
            .setName('kontakt')
            .setDescription('Jak się z Tobą skontaktować IC? (opcjonalnie, np. numer telefonu RP)')
            .setRequired(false)
            .setMaxLength(80)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Przeglądaj aktywne ogłoszenia IC na tablicy społeczności')
        .addStringOption(opt =>
          opt
            .setName('kategoria')
            .setDescription('Filtruj po kategorii (domyślnie: wszystkie)')
            .setRequired(false)
            .addChoices(...CATEGORY_CHOICES)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('usun')
        .setDescription('Usuń swoje ogłoszenie IC (Staff może usunąć każde)')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Numer ogłoszenia widoczny na liście')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction, client, prisma) {
    if (!isVerified(interaction.member)) {
      return interaction.reply({
        content: '❌ Wymagana rola **Mieszkaniec** aby korzystać z tablicy ogłoszeń IC.',
        ephemeral: true,
      });
    }

    purgeExpired();

    const sub = interaction.options.getSubcommand();

    // ── DODAJ ─────────────────────────────────────────────────────────────────
    if (sub === 'dodaj') {
      await interaction.deferReply({ ephemeral: true });

      const myPosts = [...board.values()].filter(e => e.discordId === interaction.user.id);
      if (myPosts.length >= MAX_PER_USER) {
        const oldest = myPosts.sort((a, b) => a.createdAt - b.createdAt)[0];
        const exTs   = Math.floor((oldest.createdAt + TTL_MS) / 1000);
        return interaction.editReply({
          content:
            `❌ Masz już **${MAX_PER_USER}** aktywne ogłoszenia — limit na użytkownika.\n` +
            `Najstarsze wygaśnie <t:${exTs}:R> lub usuń je przez \`/ic-ogloszenie usun id:${oldest.id}\`.`,
        });
      }

      const katKey  = interaction.options.getString('kategoria');
      const tytul   = interaction.options.getString('tytul').trim();
      const tresc   = interaction.options.getString('tresc').trim();
      const kontakt = interaction.options.getString('kontakt')?.trim() ?? null;
      const kat     = CATEGORIES[katKey];

      const icName    = await getIcName(prisma, interaction.user.id, interaction.member);
      const id        = nextId++;
      const now       = Date.now();
      const expiresTs = Math.floor((now + TTL_MS) / 1000);
      const createdTs = Math.floor(now / 1000);

      board.set(id, {
        id,
        discordId: interaction.user.id,
        icName,
        katKey,
        tytul,
        tresc,
        kontakt,
        createdAt: now,
      });

      const publicEmbed = new EmbedBuilder()
        .setColor(kat.color)
        .setTitle(`${kat.emoji} [IC Ogłoszenie #${id}] ${tytul}`)
        .setDescription(tresc)
        .addFields(
          { name: '📂 Kategoria',  value: kat.label,               inline: true  },
          { name: '🎭 Autor IC',   value: icName,                  inline: true  },
          { name: '⏳ Wygasa',     value: `<t:${expiresTs}:R>`,    inline: true  },
        );

      if (kontakt) {
        publicEmbed.addFields({ name: '📞 Kontakt IC', value: kontakt, inline: false });
      }

      publicEmbed
        .setFooter({ text: `AURORA Greenville RP — Tablica Ogłoszeń IC | ID #${id} | /ic-ogloszenie lista` })
        .setTimestamp();

      await interaction.channel.send({ embeds: [publicEmbed] }).catch(err =>
        logger.warn(`/ic-ogloszenie dodaj: błąd wysyłania embeda: ${err.message}`)
      );

      logger.info(
        `/ic-ogloszenie dodaj | ${interaction.user.tag} (${icName}) | #${id} [${katKey}] "${tytul}"`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('✅ Ogłoszenie opublikowane!')
            .addFields(
              { name: '🆔 Numer ogłoszenia', value: `**#${id}**`,         inline: true  },
              { name: '📂 Kategoria',         value: kat.label,            inline: true  },
              { name: '⏳ Wygasa',            value: `<t:${expiresTs}:R>`, inline: true  },
              { name: '📅 Opublikowane',      value: `<t:${createdTs}:f>`, inline: false },
            )
            .setDescription(
              'Ogłoszenie zostało opublikowane na tablicy IC.\n' +
              `Aby je usunąć przed wygaśnięciem: \`/ic-ogloszenie usun id:${id}\``
            )
            .setFooter({ text: 'AURORA Greenville RP — Tablica Ogłoszeń IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      await interaction.deferReply({ ephemeral: true });

      const filter  = interaction.options.getString('kategoria') ?? null;
      let   entries = [...board.values()];

      if (filter) {
        entries = entries.filter(e => e.katKey === filter);
      }

      entries.sort((a, b) => b.createdAt - a.createdAt);

      if (entries.length === 0) {
        const katLabel = filter ? CATEGORIES[filter]?.label : null;
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📋 Tablica Ogłoszeń IC — Brak ogłoszeń')
              .setDescription(
                katLabel
                  ? `Nie ma aktywnych ogłoszeń w kategorii **${katLabel}**.\n\nSprawdź inne kategorie lub dodaj pierwsze!`
                  : 'Tablica ogłoszeń IC jest pusta.\n\nBądź pierwszy/a — dodaj ogłoszenie przez `/ic-ogloszenie dodaj`!'
              )
              .setFooter({ text: 'AURORA Greenville RP — Tablica Ogłoszeń IC' })
              .setTimestamp(),
          ],
        });
      }

      const shown  = entries.slice(0, 12);
      const katTitle = filter ? ` — ${CATEGORIES[filter]?.emoji} ${CATEGORIES[filter]?.label}` : '';

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`📋 Tablica Ogłoszeń IC${katTitle}`)
        .setDescription(
          entries.length > 12
            ? `Wyświetlono **12** z **${entries.length}** ogłoszeń. Użyj filtra kategorii aby zawęzić.`
            : `Aktywnych ogłoszeń: **${entries.length}**`
        );

      for (const e of shown) {
        const kat    = CATEGORIES[e.katKey] ?? CATEGORIES.INNE;
        const exTs   = Math.floor((e.createdAt + TTL_MS) / 1000);
        const short  = e.tresc.length > 120 ? e.tresc.slice(0, 117) + '…' : e.tresc;
        const footer = [`${kat.emoji} ${kat.label}`, `🎭 ${e.icName}`, `⏳ <t:${exTs}:R>`].join(' · ');

        embed.addFields({
          name:   `#${e.id} — ${e.tytul}`,
          value:  `${short}\n*${footer}*`,
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — /ic-ogloszenie dodaj · /ic-ogloszenie usun id:<numer>' })
        .setTimestamp();

      logger.info(
        `/ic-ogloszenie lista | ${interaction.user.tag} | filtr: ${filter ?? 'brak'} | wyniki: ${entries.length}`
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── USUN ──────────────────────────────────────────────────────────────────
    if (sub === 'usun') {
      await interaction.deferReply({ ephemeral: true });

      const id    = interaction.options.getInteger('id');
      const entry = board.get(id);

      if (!entry) {
        return interaction.editReply({
          content: `❌ Ogłoszenie **#${id}** nie istnieje lub już wygasło (TTL: 48h).`,
        });
      }

      const isOwner = entry.discordId === interaction.user.id;
      if (!isOwner && !isStaff(interaction.member)) {
        return interaction.editReply({
          content: '❌ Możesz usuwać tylko swoje własne ogłoszenia.',
        });
      }

      const { tytul, katKey, icName } = entry;
      board.delete(id);

      logger.info(
        `/ic-ogloszenie usun | ${interaction.user.tag} | #${id} "${tytul}" (autor: ${icName})` +
        (!isOwner ? ' [usunięte przez Staff]' : '')
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Ogłoszenie usunięte')
            .addFields(
              { name: '🆔 Numer',    value: `#${id}`,                              inline: true  },
              { name: '📂 Kategoria', value: CATEGORIES[katKey]?.label ?? katKey,  inline: true  },
              { name: '📌 Tytuł',     value: tytul,                                inline: false },
            )
            .setFooter({ text: `AURORA Greenville RP — usunął: ${interaction.user.tag}` })
            .setTimestamp(),
        ],
      });
    }
  },
};
