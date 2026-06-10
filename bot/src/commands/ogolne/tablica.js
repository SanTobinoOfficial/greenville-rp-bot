// Komenda /tablica — Tablica ogłoszeń IC
// Cywilni gracze mogą dodawać krótkie ogłoszenia in-character:
// sprzedaż pojazdu, szukanie pracy, zagubione przedmioty, usługi itp.
// Dane in-memory (jak /notatnik) — ogłoszenia wygasają po 24h lub po restarcie bota.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Ogłoszenia in-memory: Map<id, { id, discordId, icName, tresc, katKey, createdAt }>
const ads = new Map();
let nextId = 1;

const AD_TTL_MS    = 24 * 60 * 60 * 1000;  // 24h
const MAX_PER_PLAYER = 3;

const KATEGORIE = {
  sprzedaz:  { label: 'Sprzedaż',                emoji: '💰' },
  kupno:     { label: 'Kupno / Szukam',           emoji: '🔍' },
  praca:     { label: 'Praca / Zatrudnienie',     emoji: '💼' },
  usluga:    { label: 'Usługa',                   emoji: '🔧' },
  zaginione: { label: 'Zagubione / Znalezione',   emoji: '🔎' },
  inne:      { label: 'Inne',                     emoji: '📌' },
};

function purgeExpired() {
  const now = Date.now();
  for (const [id, ad] of ads) {
    if (now - ad.createdAt > AD_TTL_MS) ads.delete(id);
  }
}

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
    // cisza — fallback poniżej
  }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

const norm = s =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tablica')
    .setDescription('Tablica ogłoszeń IC — dodawaj i przeglądaj ogłoszenia społeczności')
    .addSubcommand(sub =>
      sub
        .setName('dodaj')
        .setDescription('Dodaj ogłoszenie IC na tablicę (maks. 3 na raz, wygasają po 24h)')
        .addStringOption(opt =>
          opt
            .setName('tresc')
            .setDescription('Treść ogłoszenia IC (np. "Sprzedam Honda Civic, biała, tel IC 555-1234")')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(400)
        )
        .addStringOption(opt =>
          opt
            .setName('kategoria')
            .setDescription('Kategoria ogłoszenia (domyślnie: Inne)')
            .setRequired(false)
            .addChoices(
              { name: '💰 Sprzedaż',                value: 'sprzedaz'  },
              { name: '🔍 Kupno / Szukam',           value: 'kupno'     },
              { name: '💼 Praca / Zatrudnienie',     value: 'praca'     },
              { name: '🔧 Usługa',                   value: 'usluga'    },
              { name: '🔎 Zagubione / Znalezione',   value: 'zaginione' },
              { name: '📌 Inne',                     value: 'inne'      },
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Przeglądaj aktywne ogłoszenia IC na tablicy')
    )
    .addSubcommand(sub =>
      sub
        .setName('usun')
        .setDescription('Usuń swoje ogłoszenie IC (Staff może usunąć dowolne)')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Numer ogłoszenia widoczny w /tablica lista')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z tablicy ogłoszeń.',
      });
    }

    purgeExpired();

    const sub = interaction.options.getSubcommand();

    // ── DODAJ ─────────────────────────────────────────────────────────────────
    if (sub === 'dodaj') {
      const myAds = [...ads.values()].filter(a => a.discordId === interaction.user.id);
      if (myAds.length >= MAX_PER_PLAYER) {
        return interaction.editReply({
          content: `❌ Masz już **${MAX_PER_PLAYER}** aktywne ogłoszenia. Usuń jedno przez \`/tablica usun\`, aby dodać nowe.`,
        });
      }

      const tresc     = interaction.options.getString('tresc').trim();
      const katKey    = interaction.options.getString('kategoria') ?? 'inne';
      const kat       = KATEGORIE[katKey] ?? KATEGORIE.inne;
      const icName    = await getIcName(prisma, interaction.user.id, interaction.member);
      const id        = nextId++;
      const now       = Date.now();
      const expiresTs = Math.floor((now + AD_TTL_MS) / 1000);

      ads.set(id, { id, discordId: interaction.user.id, icName, tresc, katKey, createdAt: now });

      logger.info(
        `/tablica dodaj | ${interaction.user.tag} (${icName}) | kat: ${kat.label} | ` +
        `id: ${id} | "${tresc.slice(0, 60)}${tresc.length > 60 ? '…' : ''}"`
      );

      // Wyślij na kanał tablicy ogłoszeń (jeśli istnieje)
      const boardChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() &&
          (norm(c.name).includes('tablica') ||
           norm(c.name).includes('ogloszenia') ||
           norm(c.name).includes('ogloszenie'))
      );

      const adEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`${kat.emoji} [${kat.label}] — Ogłoszenie #${id}`)
        .setDescription(`*${tresc}*`)
        .addFields(
          { name: '🎭 Wystawia',  value: icName,               inline: true },
          { name: '⏳ Wygasa',    value: `<t:${expiresTs}:R>`, inline: true },
        )
        .setFooter({
          text: `AURORA Greenville RP — Tablica Ogłoszeń IC | ID #${id}`,
          iconURL: interaction.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();

      if (boardChannel) {
        await boardChannel.send({ embeds: [adEmbed] }).catch(() => null);
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('📋 Ogłoszenie dodane na tablicę!')
            .setDescription(
              boardChannel
                ? `Twoje ogłoszenie pojawiło się na <#${boardChannel.id}>.`
                : 'Ogłoszenie zostało zarejestrowane. Wyświetl je przez `/tablica lista`.'
            )
            .addFields(
              { name: '🆔 Numer',            value: `**#${id}**`,          inline: true  },
              { name: `${kat.emoji} Kategoria`, value: kat.label,          inline: true  },
              { name: '⏳ Wygasa',            value: `<t:${expiresTs}:R>`, inline: true  },
              { name: '📝 Treść',             value: tresc,                inline: false },
            )
            .setFooter({ text: `Usuń: /tablica usun id:${id} • AURORA Greenville RP` })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const allAds = [...ads.values()].sort((a, b) => b.createdAt - a.createdAt);

      if (allAds.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📋 Tablica Ogłoszeń IC — Brak ogłoszeń')
              .setDescription(
                'Tablica jest pusta. Dodaj pierwsze ogłoszenie używając `/tablica dodaj`.'
              )
              .setFooter({ text: 'AURORA Greenville RP — Tablica Ogłoszeń IC' })
              .setTimestamp(),
          ],
        });
      }

      const shown  = allAds.slice(0, 10);
      const embed  = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`📋 Tablica Ogłoszeń IC — ${allAds.length} ogłosze${allAds.length === 1 ? 'nie' : allAds.length < 5 ? 'nia' : 'ń'}`);

      if (allAds.length > 10) {
        embed.setDescription(`Wyświetlono 10 najnowszych z **${allAds.length}** ogłoszeń.`);
      }

      for (const ad of shown) {
        const kat       = KATEGORIE[ad.katKey] ?? KATEGORIE.inne;
        const createdTs = Math.floor(ad.createdAt / 1000);
        const tresc     = ad.tresc.length > 150 ? ad.tresc.slice(0, 147) + '…' : ad.tresc;

        embed.addFields({
          name:   `${kat.emoji} [#${ad.id}] ${kat.label} — ${ad.icName}`,
          value:  `${tresc}\n*— <t:${createdTs}:R>*`,
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Tablica Ogłoszeń IC | /tablica usun aby usunąć własne' })
        .setTimestamp();

      logger.info(`/tablica lista | ${interaction.user.tag} | ${allAds.length} ogłoszeń`);

      return interaction.editReply({ embeds: [embed] });
    }

    // ── USUN ──────────────────────────────────────────────────────────────────
    if (sub === 'usun') {
      const id = interaction.options.getInteger('id');
      const ad = ads.get(id);

      if (!ad) {
        return interaction.editReply({
          content: `❌ Nie znaleziono ogłoszenia o numerze **#${id}**. Użyj \`/tablica lista\` aby sprawdzić aktualne numery.`,
        });
      }

      const isOwner = ad.discordId === interaction.user.id;
      if (!isOwner && !isStaff(interaction.member)) {
        return interaction.editReply({
          content: '❌ Możesz usuwać tylko swoje własne ogłoszenia.',
        });
      }

      ads.delete(id);

      logger.info(
        `/tablica usun | ${interaction.user.tag} | id: ${id} | ${isOwner ? 'własne' : 'STAFF'} | ` +
        `"${ad.tresc.slice(0, 60)}${ad.tresc.length > 60 ? '…' : ''}"`
      );

      const kat = KATEGORIE[ad.katKey] ?? KATEGORIE.inne;

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Ogłoszenie usunięte z tablicy')
            .addFields(
              { name: '🆔 Numer',           value: `**#${id}**`, inline: true  },
              { name: `${kat.emoji} Kategoria`, value: kat.label, inline: true },
              { name: '🎭 Wystawił/a',      value: ad.icName,    inline: true  },
            )
            .setFooter({ text: 'AURORA Greenville RP — Tablica Ogłoszeń IC' })
            .setTimestamp(),
        ],
      });
    }
  },
};
