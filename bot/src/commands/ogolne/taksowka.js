// /taksowka — IC Taxi Dispatch System
// Players order a taxi to their location; Taksówkarze accept and complete orders.
// In-memory — orders auto-expire after 30 min; consistent with /zadanie, /tablica pattern.
// Dostępna dla: Mieszkaniec+ (zamawianie) | Taksówkarz (przyjmowanie)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const orders = new Map(); // id → order object
let nextId = 1;

const ORDER_TTL_MS = 30 * 60 * 1000; // 30 minutes

function purgeExpired() {
  const cutoff = Date.now() - ORDER_TTL_MS;
  for (const [id, o] of orders) {
    if (o.createdAt < cutoff) orders.delete(id);
  }
}

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const userDb = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (userDb?.character) return `${userDb.character.firstName} ${userDb.character.lastName}`;
  } catch { /* cisza — fallback poniżej */ }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

const norm = s =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taksowka')
    .setDescription('System taksówek IC — zamów przejazd lub przejmij zlecenie')
    .addSubcommand(sub =>
      sub
        .setName('zamow')
        .setDescription('Zamów taksówkę — zlecenie trafi do dostępnych taksówkarzy')
        .addStringOption(opt =>
          opt
            .setName('lokalizacja')
            .setDescription('Twoja obecna lokalizacja IC (np. "Centrum Handlowe, wejście główne")')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('przyjmij')
        .setDescription('Przyjmij zlecenie (wymagana rola: Taksówkarz)')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Numer zlecenia do przyjęcia')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('zakoncz')
        .setDescription('Zakończ swoje aktywne zlecenie (wymagana rola: Taksówkarz)')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Numer zlecenia do zakończenia')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('anuluj')
        .setDescription('Anuluj swoje aktywne zlecenie taksówki')
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Wyświetl aktywne zlecenia taksówek')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({ content: '❌ Wymagana rola **Mieszkaniec**, aby korzystać z systemu taksówek.' });
    }

    purgeExpired();

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const isTaxi = interaction.member.roles.cache.some(r => r.name === ROLES.TAKSOWKARZ);

    // Find taxi/transport channel for public dispatch embed
    const taxiChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() &&
        (norm(c.name).includes('taksowk') ||
         norm(c.name).includes('taxi') ||
         norm(c.name).includes('transport-ic'))
    );

    // ── ZAMÓW ────────────────────────────────────────────────────────────────
    if (sub === 'zamow') {
      const existing = [...orders.values()].find(
        o => o.discordId === userId && (o.status === 'WAITING' || o.status === 'ACTIVE')
      );
      if (existing) {
        const statusLabel = existing.status === 'WAITING' ? 'Oczekuje na kierowcę' : 'W realizacji';
        return interaction.editReply({
          content:
            `❌ Masz już aktywne zlecenie **#${existing.id}** (${statusLabel}).\n` +
            'Anuluj je przez `/taksowka anuluj` przed złożeniem nowego.',
        });
      }

      const location = interaction.options.getString('lokalizacja').trim();
      const icName = await getIcName(prisma, userId, interaction.member);
      const id = nextId++;
      const now = Date.now();
      const expiresTs = Math.floor((now + ORDER_TTL_MS) / 1000);

      orders.set(id, {
        id,
        discordId: userId,
        icName,
        location,
        status: 'WAITING',
        driverId: null,
        driverName: null,
        createdAt: now,
      });

      const dispatchEmbed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle(`🚕 Nowe Zlecenie — #${id}`)
        .addFields(
          { name: '🎭 Pasażer',      value: icName,               inline: true  },
          { name: '📍 Lokalizacja',  value: location,             inline: false },
          { name: '⏳ Wygasa',       value: `<t:${expiresTs}:R>`, inline: true  },
        )
        .setFooter({ text: `AURORA Greenville RP — Taksówki IC | /taksowka przyjmij id:${id}` })
        .setTimestamp();

      if (taxiChannel) {
        await taxiChannel.send({ embeds: [dispatchEmbed] }).catch(() => null);
      }

      logger.info(`/taksowka zamow | ${interaction.user.tag} (${icName}) | #${id} | "${location}"`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🚕 Zlecenie złożone!')
            .setDescription(
              taxiChannel
                ? `Twoje zlecenie **#${id}** zostało wysłane do taksówkarzy na <#${taxiChannel.id}>.`
                : 'Twoje zlecenie zostało zarejestrowane — taksówkarz wkrótce się z Tobą skontaktuje IC.'
            )
            .addFields(
              { name: '🆔 Numer',       value: `**#${id}**`, inline: true  },
              { name: '📍 Lokalizacja', value: location,     inline: false },
            )
            .setFooter({ text: 'Anuluj przez /taksowka anuluj • AURORA Greenville RP' })
            .setTimestamp(),
        ],
      });
    }

    // ── PRZYJMIJ ─────────────────────────────────────────────────────────────
    if (sub === 'przyjmij') {
      if (!isTaxi) {
        return interaction.editReply({
          content: '❌ Tylko taksówkarze mogą przyjmować zlecenia (wymagana rola: **Taksówkarz**).',
        });
      }

      const id = interaction.options.getInteger('id');
      const order = orders.get(id);

      if (!order) {
        return interaction.editReply({ content: `❌ Zlecenie **#${id}** nie istnieje lub wygasło.` });
      }
      if (order.status === 'ACTIVE') {
        return interaction.editReply({
          content: `❌ Zlecenie **#${id}** jest już w trakcie realizacji przez innego kierowcę.`,
        });
      }
      if (order.status !== 'WAITING') {
        return interaction.editReply({ content: `❌ Zlecenie **#${id}** nie jest dostępne.` });
      }
      if (order.discordId === userId) {
        return interaction.editReply({ content: '❌ Nie możesz przyjąć własnego zlecenia.' });
      }

      const driverIcName = await getIcName(prisma, userId, interaction.member);
      order.status = 'ACTIVE';
      order.driverId = userId;
      order.driverName = driverIcName;

      if (taxiChannel) {
        await taxiChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setTitle(`✅ Zlecenie #${id} — Przyjęte`)
              .addFields(
                { name: '🚕 Kierowca',    value: driverIcName,   inline: true  },
                { name: '🎭 Pasażer',     value: order.icName,   inline: true  },
                { name: '📍 Lokalizacja', value: order.location, inline: false },
              )
              .setFooter({ text: 'AURORA Greenville RP — Taksówki IC' })
              .setTimestamp(),
          ],
        }).catch(() => null);
      }

      logger.info(`/taksowka przyjmij | ${interaction.user.tag} (${driverIcName}) | #${id} | pasażer: ${order.icName}`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🚕 Zlecenie przyjęte!')
            .addFields(
              { name: '🆔 Numer',       value: `**#${id}**`, inline: true  },
              { name: '🎭 Pasażer',     value: order.icName,   inline: true  },
              { name: '📍 Lokalizacja', value: order.location, inline: false },
            )
            .setFooter({ text: 'Zakończ przez /taksowka zakoncz • AURORA Greenville RP' })
            .setTimestamp(),
        ],
      });
    }

    // ── ZAKONCZ ──────────────────────────────────────────────────────────────
    if (sub === 'zakoncz') {
      if (!isTaxi) {
        return interaction.editReply({ content: '❌ Tylko taksówkarze mogą kończyć zlecenia.' });
      }

      const id = interaction.options.getInteger('id');
      const order = orders.get(id);

      if (!order) {
        return interaction.editReply({ content: `❌ Zlecenie **#${id}** nie istnieje lub wygasło.` });
      }
      if (order.status !== 'ACTIVE' || order.driverId !== userId) {
        return interaction.editReply({
          content: `❌ Nie jesteś przypisanym kierowcą zlecenia **#${id}** lub zlecenie nie jest aktywne.`,
        });
      }

      const pasazer = order.icName;
      orders.delete(id);

      logger.info(`/taksowka zakoncz | ${interaction.user.tag} | #${id} | pasażer: ${pasazer}`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🏁 Zlecenie zakończone!')
            .addFields(
              { name: '🆔 Numer',    value: `**#${id}**`, inline: true },
              { name: '🎭 Pasażer', value: pasazer,       inline: true },
            )
            .setFooter({ text: 'AURORA Greenville RP — Taksówki IC' })
            .setTimestamp(),
        ],
      });
    }

    // ── ANULUJ ───────────────────────────────────────────────────────────────
    if (sub === 'anuluj') {
      const order = [...orders.values()].find(
        o => o.discordId === userId && (o.status === 'WAITING' || o.status === 'ACTIVE')
      );
      if (!order) {
        return interaction.editReply({ content: '❌ Nie masz żadnego aktywnego zlecenia do anulowania.' });
      }

      orders.delete(order.id);

      logger.info(`/taksowka anuluj | ${interaction.user.tag} (${order.icName}) | #${order.id}`);

      return interaction.editReply({
        content: `✅ Zlecenie **#${order.id}** zostało anulowane.`,
      });
    }

    // ── LISTA ────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const active = [...orders.values()].sort((a, b) => a.createdAt - b.createdAt);

      if (active.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('🚕 Zlecenia Taksówek IC — Brak aktywnych')
              .setDescription(
                'Brak aktywnych zleceń taksówek.\n' +
                '*Zamów przejazd: `/taksowka zamow`*'
              )
              .setFooter({ text: 'AURORA Greenville RP — Taksówki IC' })
              .setTimestamp(),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle(`🚕 Zlecenia Taksówek IC — ${active.length} aktywnych`);

      for (const o of active) {
        const statusLabel = o.status === 'WAITING'
          ? '⏳ Oczekuje na kierowcę'
          : `🚗 W realizacji — ${o.driverName}`;
        const expiresTs = Math.floor((o.createdAt + ORDER_TTL_MS) / 1000);

        embed.addFields({
          name:  `#${o.id} — ${o.icName}  |  ${statusLabel}`,
          value: `📍 ${o.location}\n*Wygasa <t:${expiresTs}:R>*`,
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — /taksowka przyjmij id:<numer>' })
        .setTimestamp();

      logger.info(`/taksowka lista | ${interaction.user.tag} | ${active.length} zleceń`);

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
