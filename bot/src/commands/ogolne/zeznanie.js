// Komenda /zeznanie — IC formalne zeznanie świadka
// Gracz-świadek opisuje co widział podczas incydentu IC.
// Zeznanie trafia na kanał dyspozytorni/zeznań i może być przywołane po numerze przez Policję/Staff.
// Różni się od /raport-wypadku (drogowe, dwie strony) — tu jest jeden świadek, dowolny incydent IC.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// In-memory store: Map<id, entry>
const statements = new Map();
let nextId = 1;

const TTL_MS       = 72 * 60 * 60 * 1000; // 72 godziny
const MAX_PER_USER = 5;

function purgeExpired() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, s] of statements) {
    if (s.createdAt < cutoff) statements.delete(id);
  }
}

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const u = await prisma.user.findUnique({
      where:   { discordId },
      include: { character: true },
    });
    if (u?.character) return `${u.character.firstName} ${u.character.lastName}`;
  } catch { /* cisza — fallback poniżej */ }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

const norm = s =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zeznanie')
    .setDescription('IC formalne zeznanie świadka — złóż lub przeglądaj zeznania (Policja/Staff)')
    .addSubcommand(sub =>
      sub
        .setName('zloz')
        .setDescription('Złóż zeznanie świadka — opisz co widziałeś/aś podczas incydentu IC')
        .addStringOption(opt =>
          opt
            .setName('co-sie-stalo')
            .setDescription('Co widziałeś/aś? Opisz przebieg zdarzenia (min. 30 znaków)')
            .setRequired(true)
            .setMinLength(30)
            .setMaxLength(600)
        )
        .addStringOption(opt =>
          opt
            .setName('lokalizacja')
            .setDescription('Gdzie doszło do zdarzenia? (ulica, budynek, opis miejsca)')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(150)
        )
        .addStringOption(opt =>
          opt
            .setName('kiedy-ic')
            .setDescription('Kiedy to się stało IC? (np. "dziś około 14:00" — opcjonalnie)')
            .setRequired(false)
            .setMaxLength(80)
        )
        .addUserOption(opt =>
          opt
            .setName('podejrzany')
            .setDescription('Osoba podejrzana / sprawca zdarzenia (opcjonalnie, gracz na serwerze)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Przeglądaj aktywne zeznania IC (Policja / Staff)')
    )
    .addSubcommand(sub =>
      sub
        .setName('szczegoly')
        .setDescription('Wyświetl szczegóły zeznania po numerze (Policja / Staff)')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Numer zeznania')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z zeznań IC.',
      });
    }

    purgeExpired();

    const sub = interaction.options.getSubcommand();

    // ── ZŁÓŻ ─────────────────────────────────────────────────────────────────
    if (sub === 'zloz') {
      const myCount = [...statements.values()].filter(s => s.discordId === interaction.user.id).length;
      if (myCount >= MAX_PER_USER) {
        return interaction.editReply({
          content:
            `❌ Masz już **${MAX_PER_USER}** aktywnych zeznań. Poczekaj aż wygasną (72h) ` +
            'lub skontaktuj się ze Staff.',
        });
      }

      const coSieSt   = interaction.options.getString('co-sie-stalo').trim();
      const lokalizacja = interaction.options.getString('lokalizacja').trim();
      const kiedyIc   = interaction.options.getString('kiedy-ic')?.trim() ?? null;
      const podejrzany = interaction.options.getUser('podejrzany') ?? null;

      if (podejrzany?.bot) {
        return interaction.editReply({ content: '❌ Nie można wskazywać bota jako podejrzanego.' });
      }
      if (podejrzany?.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ Nie możesz wskazać samego siebie jako podejrzanego.' });
      }

      const icName    = await getIcName(prisma, interaction.user.id, interaction.member);
      const id        = nextId++;
      const now       = Date.now();
      const createdTs = Math.floor(now / 1000);
      const expiresTs = Math.floor((now + TTL_MS) / 1000);

      let podejrzanyIcName = null;
      if (podejrzany) {
        const podMember = await interaction.guild.members.fetch(podejrzany.id).catch(() => null);
        podejrzanyIcName = await getIcName(prisma, podejrzany.id, podMember);
      }

      statements.set(id, {
        id,
        discordId:    interaction.user.id,
        icName,
        lokalizacja,
        coSieSt,
        kiedyIc,
        podejrzanyId:      podejrzany?.id ?? null,
        podejrzanyIcName,
        createdAt:    now,
      });

      logger.info(
        `/zeznanie zloz | ${interaction.user.tag} (${icName}) | #${id} | ${lokalizacja}` +
        (podejrzany ? ` | podejrzany: ${podejrzanyIcName}` : '')
      );

      // Embed na kanał zeznań / dyspozytorni policji
      const statEmbed = new EmbedBuilder()
        .setColor(0x2B6CB0)
        .setTitle(`📜 Zeznanie Świadka IC — #${id}`)
        .addFields(
          { name: '🎭 Świadek',         value: `<@${interaction.user.id}> *(${icName})*`, inline: true  },
          { name: '📍 Lokalizacja',      value: lokalizacja,                               inline: false },
          { name: '📝 Opis zdarzenia',   value: coSieSt,                                  inline: false },
        );

      if (kiedyIc) {
        statEmbed.addFields({ name: '🕐 Czas zdarzenia IC', value: kiedyIc, inline: true });
      }
      if (podejrzanyIcName) {
        statEmbed.addFields({
          name:   '🔍 Podejrzany/a',
          value:  `<@${podejrzany.id}> *(${podejrzanyIcName})*`,
          inline: true,
        });
      }

      statEmbed
        .addFields({ name: '⏳ Wygasa', value: `<t:${expiresTs}:R>`, inline: true })
        .setFooter({ text: `AURORA Greenville RP — Zeznania IC | ID #${id}` })
        .setTimestamp();

      // Szukaj kanału zeznań, dyspozytorni, lub policja-czat
      const targetChannel =
        interaction.guild.channels.cache.find(c =>
          c.isTextBased() && (
            norm(c.name).includes('zeznani') ||
            norm(c.name).includes('raporty') ||
            norm(c.name).includes('posterunek')
          )
        ) ??
        interaction.guild.channels.cache.find(c =>
          c.isTextBased() && (
            norm(c.name).includes('dyspozytorni') ||
            norm(c.name).includes('policja-czat')
          )
        );

      if (targetChannel) {
        await targetChannel.send({ embeds: [statEmbed] }).catch(() => null);
      }

      // Powiadom podejrzanego przez DM (jeśli wskazano)
      if (podejrzany) {
        try {
          await podejrzany.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('⚠️ Złożono zeznanie IC na Twoją postać')
                .setDescription(
                  `Gracz **${icName}** złożył/a formalne zeznanie IC, w którym figurujesz jako podejrzany/a.\n\n` +
                  `**Lokalizacja zdarzenia:** ${lokalizacja}\n**Numer zeznania:** #${id}\n\n` +
                  '*Skontaktuj się z Policją IC w celu wyjaśnienia sytuacji.*'
                )
                .setFooter({ text: 'AURORA Greenville RP — Zeznania IC' })
                .setTimestamp(),
            ],
          });
        } catch { /* DM zablokowane — cicho ignorujemy */ }
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('✅ Zeznanie IC złożone pomyślnie')
            .setDescription(
              targetChannel
                ? `Twoje zeznanie zostało przekazane do <#${targetChannel.id}> i oczekuje na przegląd przez służby.`
                : 'Zeznanie zarejestrowane — policja zapozna się z nim podczas dyżuru.'
            )
            .addFields(
              { name: '🆔 Numer zeznania',  value: `**#${id}**`,         inline: true  },
              { name: '📅 Złożone',          value: `<t:${createdTs}:f>`, inline: true  },
              { name: '⏳ Wygasa',           value: `<t:${expiresTs}:R>`, inline: true  },
              { name: '📍 Lokalizacja',      value: lokalizacja,           inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Zeznania IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const isPolicja = interaction.member.roles.cache.some(r => r.name === ROLES.POLICJA);
      if (!isPolicja && !isStaff(interaction.member)) {
        return interaction.editReply({
          content: '❌ Tylko Policja lub Staff może przeglądać listę zeznań IC.',
        });
      }

      const all = [...statements.values()].sort((a, b) => b.createdAt - a.createdAt);

      if (all.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📜 Zeznania IC — Brak aktywnych')
              .setDescription(
                'Nie ma żadnych aktywnych zeznań IC.\n\n' +
                '*Gracze składają zeznania przez `/zeznanie zloz`.*'
              )
              .setFooter({ text: 'AURORA Greenville RP — Zeznania IC' })
              .setTimestamp(),
          ],
        });
      }

      const shown = all.slice(0, 10);
      const embed = new EmbedBuilder()
        .setColor(0x2B6CB0)
        .setTitle(`📜 Aktywne zeznania IC — ${all.length}`);

      if (all.length > 10) {
        embed.setDescription(`Wyświetlono 10 najnowszych z **${all.length}** zeznań.`);
      }

      for (const s of shown) {
        const ts    = Math.floor(s.createdAt / 1000);
        const exTs  = Math.floor((s.createdAt + TTL_MS) / 1000);
        const short = s.coSieSt.length > 100 ? s.coSieSt.slice(0, 97) + '…' : s.coSieSt;
        const meta  = [
          `📍 ${s.lokalizacja}`,
          `🎭 <@${s.discordId}> (${s.icName})`,
          s.podejrzanyId ? `🔍 <@${s.podejrzanyId}> (${s.podejrzanyIcName})` : null,
          `⏳ <t:${exTs}:R>`,
        ].filter(Boolean).join(' · ');

        embed.addFields({
          name:  `#${s.id} — <t:${ts}:d> <t:${ts}:t>`,
          value: `${short}\n*${meta}*`,
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Zeznania IC | /zeznanie szczegoly id:<numer>' })
        .setTimestamp();

      logger.info(`/zeznanie lista | ${interaction.user.tag} | ${all.length} zeznań`);

      return interaction.editReply({ embeds: [embed] });
    }

    // ── SZCZEGÓŁY ────────────────────────────────────────────────────────────
    if (sub === 'szczegoly') {
      const isPolicja = interaction.member.roles.cache.some(r => r.name === ROLES.POLICJA);
      if (!isPolicja && !isStaff(interaction.member)) {
        return interaction.editReply({
          content: '❌ Tylko Policja lub Staff może przeglądać zeznania IC.',
        });
      }

      const id = interaction.options.getInteger('id');
      const s  = statements.get(id);

      if (!s) {
        return interaction.editReply({
          content: `❌ Zeznanie **#${id}** nie istnieje lub wygasło (TTL: 72h).`,
        });
      }

      const createdTs = Math.floor(s.createdAt / 1000);
      const expiresTs = Math.floor((s.createdAt + TTL_MS) / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x2B6CB0)
        .setTitle(`📜 Zeznanie IC — Szczegóły #${id}`)
        .addFields(
          { name: '🎭 Świadek',       value: `<@${s.discordId}> *(${s.icName})*`, inline: true  },
          { name: '📅 Data złożenia', value: `<t:${createdTs}:f>`,                 inline: true  },
          { name: '⏳ Wygasa',        value: `<t:${expiresTs}:R>`,                 inline: true  },
          { name: '📍 Lokalizacja',   value: s.lokalizacja,                        inline: false },
          { name: '📝 Zeznanie',      value: s.coSieSt,                            inline: false },
        );

      if (s.kiedyIc) {
        embed.addFields({ name: '🕐 Czas zdarzenia IC', value: s.kiedyIc, inline: true });
      }
      if (s.podejrzanyIcName) {
        embed.addFields({
          name:  '🔍 Podejrzany/a',
          value: `<@${s.podejrzanyId}> *(${s.podejrzanyIcName})*`,
          inline: true,
        });
      }

      embed
        .setFooter({ text: `AURORA Greenville RP — Zeznania IC | ID #${id}` })
        .setTimestamp();

      logger.info(`/zeznanie szczegoly | ${interaction.user.tag} | #${id}`);

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
