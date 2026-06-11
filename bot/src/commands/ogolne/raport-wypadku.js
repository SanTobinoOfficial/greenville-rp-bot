// Komenda /raport-wypadku — Formalne raporty IC z wypadków i incydentów drogowych
// Zweryfikowany gracz składa raport po zdarzeniu — trafia do kanału raportów i powiadamia drugą stronę.
// Policja / Straż Miejska / Staff mogą przeglądać wszystkie aktywne raporty przez /raport-wypadku lista.
// Dane in-memory — raporty wygasają po 48h lub po restarcie bota.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// In-memory: Map<id, { id, discordId, icName, lokalizacja, opis, drugaStronaId, swiadekId, createdAt }>
const reports = new Map();
let nextId = 1;

const TTL_MS       = 48 * 60 * 60 * 1000; // 48 godzin
const MAX_PER_USER = 5;

function purgeExpired() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, r] of reports) {
    if (r.createdAt < cutoff) reports.delete(id);
  }
}

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const u = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (u?.character) return `${u.character.firstName} ${u.character.lastName}`;
  } catch {}
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raport-wypadku')
    .setDescription('Złóż lub przeglądaj formalne raporty IC z wypadków i incydentów drogowych')
    .addSubcommand(sub =>
      sub
        .setName('zglosz')
        .setDescription('Złóż raport IC z wypadku lub incydentu drogowego')
        .addStringOption(opt =>
          opt.setName('lokalizacja')
            .setDescription('Miejsce zdarzenia (ulica, skrzyżowanie, opis terenu)')
            .setRequired(true)
            .setMaxLength(150)
        )
        .addStringOption(opt =>
          opt.setName('opis')
            .setDescription('Opis zdarzenia — co się stało i jak do tego doszło (min. 20 znaków)')
            .setRequired(true)
            .setMinLength(20)
            .setMaxLength(500)
        )
        .addUserOption(opt =>
          opt.setName('druga-strona')
            .setDescription('Druga strona incydentu (opcjonalnie)')
            .setRequired(false)
        )
        .addUserOption(opt =>
          opt.setName('swiadek')
            .setDescription('Świadek zdarzenia (opcjonalnie)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Przeglądaj aktywne raporty IC z wypadków (Policja / Straż Miejska / Staff)')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z raportów IC.',
      });
    }

    purgeExpired();

    const sub = interaction.options.getSubcommand();

    // ── ZGŁOŚ ─────────────────────────────────────────────────────────────────
    if (sub === 'zglosz') {
      const myCount = [...reports.values()].filter(r => r.discordId === interaction.user.id).length;
      if (myCount >= MAX_PER_USER) {
        return interaction.editReply({
          content: `❌ Masz już **${MAX_PER_USER}** aktywnych raportów. Poczekaj aż wygasną (48h) lub skontaktuj się ze Staff.`,
        });
      }

      const lokalizacja = interaction.options.getString('lokalizacja').trim();
      const opis        = interaction.options.getString('opis').trim();
      const drugaStrona = interaction.options.getUser('druga-strona');
      const swiadek     = interaction.options.getUser('swiadek');

      if (drugaStrona?.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ Nie możesz wskazać samego siebie jako drugą stronę.' });
      }
      if (drugaStrona?.bot || swiadek?.bot) {
        return interaction.editReply({ content: '❌ Nie można wskazywać botów jako uczestników zdarzenia.' });
      }

      const icName    = await getIcName(prisma, interaction.user.id, interaction.member);
      const id        = nextId++;
      const now       = Date.now();
      const createdTs = Math.floor(now / 1000);
      const expiresTs = Math.floor((now + TTL_MS) / 1000);

      reports.set(id, {
        id,
        discordId:    interaction.user.id,
        icName,
        lokalizacja,
        opis,
        drugaStronaId: drugaStrona?.id ?? null,
        swiadekId:     swiadek?.id    ?? null,
        createdAt:     now,
      });

      logger.info(
        `/raport-wypadku zglosz | ${interaction.user.tag} (${icName}) | #${id} | ${lokalizacja}`
      );

      // Pobierz dane IC drugiej strony do embeda
      let ds2Name = null;
      if (drugaStrona) {
        const ds2Member = await interaction.guild.members.fetch(drugaStrona.id).catch(() => null);
        ds2Name = await getIcName(prisma, drugaStrona.id, ds2Member);
      }
      let swName = null;
      if (swiadek) {
        const swMember = await interaction.guild.members.fetch(swiadek.id).catch(() => null);
        swName = await getIcName(prisma, swiadek.id, swMember);
      }

      // Embed publiczny na kanał raportów / dyspozytorni
      const reportEmbed = new EmbedBuilder()
        .setColor(0xFF8C00)
        .setTitle(`🚗 Raport IC #${id} — Wypadek / Incydent`)
        .addFields(
          { name: '📍 Lokalizacja',    value: lokalizacja,                            inline: false },
          { name: '📝 Opis zdarzenia', value: opis,                                   inline: false },
          { name: '🎭 Zgłaszający',    value: `<@${interaction.user.id}> (${icName})`, inline: true  },
        );

      if (ds2Name) {
        reportEmbed.addFields({ name: '👤 Druga strona', value: `<@${drugaStrona.id}> (${ds2Name})`, inline: true });
      }
      if (swName) {
        reportEmbed.addFields({ name: '👁️ Świadek', value: `<@${swiadek.id}> (${swName})`, inline: true });
      }

      reportEmbed
        .addFields({ name: '⏳ Wygasa', value: `<t:${expiresTs}:R>`, inline: true })
        .setFooter({ text: `AURORA Greenville RP — Raporty IC | ID #${id}` })
        .setTimestamp();

      // Szukaj kanału raportów lub dyspozytorni
      const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const reportChannel = interaction.guild.channels.cache.find(c =>
        c.isTextBased() && (
          norm(c.name).includes('raport') ||
          norm(c.name).includes('wypadek') ||
          norm(c.name).includes('incydent')
        )
      ) ?? interaction.guild.channels.cache.find(c =>
        c.isTextBased() && (
          norm(c.name).includes('dyspozytornia') ||
          norm(c.name).includes('policja-czat')
        )
      );

      if (reportChannel) {
        await reportChannel.send({ embeds: [reportEmbed] }).catch(() => null);
      }

      // Powiadomienie DM do drugiej strony
      if (drugaStrona) {
        try {
          await drugaStrona.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF8C00)
                .setTitle('🚗 Zostałeś/aś wymieniony/a w raporcie IC')
                .setDescription(
                  `Gracz **${icName}** złożył/a formalny raport IC z incydentu, w którym figurujesz jako druga strona.\n\n` +
                  `**Lokalizacja:** ${lokalizacja}\n**ID raportu:** #${id}`
                )
                .setFooter({ text: 'AURORA Greenville RP — Raporty IC' })
                .setTimestamp(),
            ],
          });
        } catch {}
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('✅ Raport IC złożony pomyślnie')
            .setDescription(
              reportChannel
                ? `Raport został przesłany do <#${reportChannel.id}> i oczekuje na przegląd przez służby.`
                : 'Raport zarejestrowany — służby zapoznają się z nim podczas dyżuru.'
            )
            .addFields(
              { name: '🆔 Numer raportu', value: `**#${id}**`,         inline: true },
              { name: '📅 Złożony',        value: `<t:${createdTs}:f>`, inline: true },
              { name: '⏳ Wygasa',         value: `<t:${expiresTs}:R>`, inline: true },
              { name: '📍 Lokalizacja',    value: lokalizacja,           inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Raporty IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const isPolicja = interaction.member.roles.cache.some(r =>
        r.name === ROLES.POLICJA || r.name === 'Policja On-Duty'
      );
      const isSM = interaction.member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

      if (!isPolicja && !isSM && !isStaff(interaction.member)) {
        return interaction.editReply({
          content: '❌ Tylko Policja, Straż Miejska lub Staff może przeglądać raporty IC.',
        });
      }

      const all = [...reports.values()].sort((a, b) => b.createdAt - a.createdAt);

      if (all.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📋 Raporty IC — Brak aktywnych')
              .setDescription(
                'Nie ma żadnych aktywnych raportów IC z wypadków.\n\n' +
                '*Gracze składają raporty przez `/raport-wypadku zglosz`.*'
              )
              .setFooter({ text: 'AURORA Greenville RP — Raporty IC' })
              .setTimestamp(),
          ],
        });
      }

      const shown = all.slice(0, 10);
      const embed = new EmbedBuilder()
        .setColor(0xFF8C00)
        .setTitle(`🚗 Raporty IC z wypadków — ${all.length} aktywnych`);

      if (all.length > 10) {
        embed.setDescription(`Wyświetlono 10 najnowszych z **${all.length}** raportów.`);
      }

      for (const r of shown) {
        const ts    = Math.floor(r.createdAt / 1000);
        const exTs  = Math.floor((r.createdAt + TTL_MS) / 1000);
        const short = r.opis.length > 120 ? r.opis.slice(0, 117) + '…' : r.opis;
        const meta  = [
          `📍 ${r.lokalizacja}`,
          `🎭 <@${r.discordId}> (${r.icName})`,
          r.drugaStronaId ? `👤 <@${r.drugaStronaId}>` : null,
          r.swiadekId     ? `👁️ <@${r.swiadekId}>`    : null,
          `⏳ <t:${exTs}:R>`,
        ].filter(Boolean).join(' · ');

        embed.addFields({
          name:  `#${r.id} — ${r.icName} · <t:${ts}:d>`,
          value: `${short}\n*${meta}*`,
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Raporty IC | Wygasają po 48h' })
        .setTimestamp();

      logger.info(
        `/raport-wypadku lista | ${interaction.user.tag} | ${all.length} raportów`
      );

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
