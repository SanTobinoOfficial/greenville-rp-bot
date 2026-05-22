// Komenda /giveaway — system losowań (Host+)
// start / end / reroll — zarządzaj losowaniami na serwerze

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

// In-memory store: giveawayId → dane
const activeGiveaways = new Map();

function isHost(member) {
  const HOST_ROLES = ['Host', 'Administrator', 'Co-Owner', 'Owner'];
  return member.roles.cache.some(r => HOST_ROLES.includes(r.name))
    || member.permissions.has(PermissionFlagsBits.Administrator);
}

function pickWinners(participants, count) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Zarządzaj losowaniami na serwerze (Host+)')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Rozpocznij nowe losowanie')
        .addStringOption(opt =>
          opt.setName('nagroda')
            .setDescription('Co jest do wygrania?')
            .setMaxLength(200)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('czas')
            .setDescription('Czas trwania losowania w minutach (1-10080)')
            .setMinValue(1)
            .setMaxValue(10080)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('zwyciezcy')
            .setDescription('Liczba zwycięzców (domyślnie: 1)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('kanal')
            .setDescription('Kanał do opublikowania (domyślnie: aktualny)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('wymagania')
            .setDescription('Wymagania do wzięcia udziału (opcjonalnie)')
            .setMaxLength(300)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('Zakończ losowanie i wylosuj zwycięzcę')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('ID wiadomości losowania (z kanału)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reroll')
        .setDescription('Ponownie wylosuj zwycięzcę')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('ID wiadomości losowania')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('zwyciezcy')
            .setDescription('Liczba zwycięzców do rerollu (domyślnie: taka sama jak oryginał)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Pokaż aktywne losowania')
    ),

  async execute(interaction, client, prisma) {
    if (!isHost(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Host+ może zarządzać losowaniami.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    // ────────────────── START ──────────────────
    if (sub === 'start') {
      await interaction.deferReply({ ephemeral: true });

      const nagroda    = interaction.options.getString('nagroda');
      const czas       = interaction.options.getInteger('czas');
      const winners    = interaction.options.getInteger('zwyciezcy') ?? 1;
      const targetCh   = interaction.options.getChannel('kanal') ?? interaction.channel;
      const wymagania  = interaction.options.getString('wymagania');
      const endsAt     = new Date(Date.now() + czas * 60 * 1000);

      const endTs = Math.floor(endsAt.getTime() / 1000);

      const embed = new EmbedBuilder()
        .setColor(0xFF73FA)
        .setTitle('🎉 LOSOWANIE!')
        .setDescription(
          `**${nagroda}**\n\n` +
          `Kliknij 🎉 poniżej aby wziąć udział!\n` +
          `${wymagania ? `\n**Wymagania:** ${wymagania}\n` : ''}`
        )
        .addFields(
          { name: '⏰ Kończy się', value: `<t:${endTs}:R> (<t:${endTs}:F>)`, inline: true },
          { name: '🏆 Zwycięzcy',  value: `**${winners}**`, inline: true },
          { name: '👤 Organizator', value: `<@${interaction.user.id}>`, inline: true },
          { name: '👥 Uczestnicy', value: '0', inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — Kliknij 🎉 aby wziąć udział!' })
        .setTimestamp(endsAt);

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_join')
          .setLabel('🎉 Weź udział!')
          .setStyle(ButtonStyle.Success)
      );

      const msg = await targetCh.send({ embeds: [embed], components: [btn] });

      activeGiveaways.set(msg.id, {
        messageId:    msg.id,
        channelId:    targetCh.id,
        nagroda,
        winners,
        wymagania,
        hostId:       interaction.user.id,
        endsAt,
        participants: new Set(),
        ended:        false,
      });

      // Auto-end timer
      setTimeout(async () => {
        const gw = activeGiveaways.get(msg.id);
        if (!gw || gw.ended) return;
        await endGiveaway(msg.id, client, interaction.guild);
      }, czas * 60 * 1000);

      logger.info(`Giveaway start: "${nagroda}" przez ${interaction.user.tag} — ${czas} min, ${winners} zwycięzców`);
      await interaction.editReply({ content: `✅ Losowanie uruchomione w <#${targetCh.id}>! ID wiadomości: \`${msg.id}\`` });
      return;
    }

    // ────────────────── END ──────────────────
    if (sub === 'end') {
      const msgId = interaction.options.getString('id');
      const gw = activeGiveaways.get(msgId);

      if (!gw || gw.ended) {
        return interaction.reply({ content: '❌ Nie znaleziono aktywnego losowania o tym ID.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      await endGiveaway(msgId, client, interaction.guild);
      await interaction.editReply({ content: '✅ Losowanie zakończone!' });
      return;
    }

    // ────────────────── REROLL ──────────────────
    if (sub === 'reroll') {
      const msgId    = interaction.options.getString('id');
      const newCount = interaction.options.getInteger('zwyciezcy');
      const gw = activeGiveaways.get(msgId);

      if (!gw) {
        return interaction.reply({ content: '❌ Nie znaleziono losowania o tym ID (działa tylko dla losowań z tej sesji bota).', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const count    = newCount ?? gw.winners;
      const winnerIds = pickWinners([...gw.participants], count);

      const ch = interaction.guild.channels.cache.get(gw.channelId);
      if (!ch) return interaction.editReply({ content: '❌ Nie znaleziono kanału losowania.' });

      if (winnerIds.length === 0) {
        await ch.send({ content: `🎉 **Reroll losowania:** "${gw.nagroda}" — brak uczestników, nie ma kogo losować!` });
      } else {
        const mentions = winnerIds.map(id => `<@${id}>`).join(', ');
        await ch.send({
          content: mentions,
          embeds: [
            new EmbedBuilder()
              .setColor(0xFFD700)
              .setTitle('🔄 Reroll Losowania!')
              .setDescription(`Nowi zwycięzcy **${gw.nagroda}**: ${mentions}`)
              .setFooter({ text: `Reroll przez ${interaction.user.tag}` })
              .setTimestamp()
          ]
        });
      }

      logger.info(`Giveaway reroll: "${gw.nagroda}" — nowi zwycięzcy: ${winnerIds.join(', ')}`);
      await interaction.editReply({ content: `✅ Reroll wykonany! Zwycięzcy: ${winnerIds.map(id => `<@${id}>`).join(', ') || 'brak uczestników'}` });
      return;
    }

    // ────────────────── LISTA ──────────────────
    if (sub === 'lista') {
      const active = [...activeGiveaways.values()].filter(g => !g.ended);
      if (active.length === 0) {
        return interaction.reply({ content: '📭 Brak aktywnych losowań.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF73FA)
        .setTitle('🎉 Aktywne Losowania')
        .setTimestamp();

      for (const gw of active.slice(0, 10)) {
        const endTs = Math.floor(gw.endsAt.getTime() / 1000);
        embed.addFields({
          name: `🎁 ${gw.nagroda}`,
          value: `Uczestnicy: **${gw.participants.size}** | Zwycięzcy: **${gw.winners}** | Kończy: <t:${endTs}:R>\nID: \`${gw.messageId}\``,
          inline: false,
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

// ─── Pomocnicza funkcja kończąca losowanie ────────────────────────────────────

async function endGiveaway(msgId, client, guild) {
  const gw = activeGiveaways.get(msgId);
  if (!gw || gw.ended) return;

  gw.ended = true;

  const ch = guild.channels.cache.get(gw.channelId);
  if (!ch) return;

  const winnerIds = pickWinners([...gw.participants], gw.winners);

  // Zaktualizuj embed oryginalnej wiadomości
  try {
    const msg = await ch.messages.fetch(gw.messageId);
    const disabledBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_ended')
        .setLabel('🎉 Losowanie zakończone')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    const resultEmbed = new EmbedBuilder()
      .setColor(winnerIds.length > 0 ? 0xFFD700 : 0xED4245)
      .setTitle('🎉 LOSOWANIE ZAKOŃCZONE')
      .setDescription(
        winnerIds.length > 0
          ? `**Nagroda:** ${gw.nagroda}\n\n🏆 **Zwycięzca/y:** ${winnerIds.map(id => `<@${id}>`).join(', ')}`
          : `**Nagroda:** ${gw.nagroda}\n\n😔 Brak uczestników — nie wylosowano zwycięzcy.`
      )
      .addFields(
        { name: '👥 Uczestników', value: `${gw.participants.size}`, inline: true },
        { name: '👤 Organizator', value: `<@${gw.hostId}>`, inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — Losowanie zakończone' })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed], components: [disabledBtn] });
  } catch {}

  // Wyślij ogłoszenie o zwycięzcy
  if (winnerIds.length > 0) {
    const mentions = winnerIds.map(id => `<@${id}>`).join(', ');
    await ch.send({
      content: `🎉 Gratulacje ${mentions}! Wygrywasz **${gw.nagroda}**!\nSkontaktuj się z <@${gw.hostId}> po odbiór nagrody.`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle('🏆 Losowanie zakończone!')
          .addFields(
            { name: '🎁 Nagroda',    value: gw.nagroda, inline: false },
            { name: '🏆 Zwycięzcy', value: mentions,    inline: false },
          )
          .setTimestamp()
      ]
    }).catch(() => {});
  } else {
    await ch.send({ content: `😔 Losowanie **${gw.nagroda}** zakończyło się bez uczestników.` }).catch(() => {});
  }

  logger.info(`Giveaway ended: "${gw.nagroda}" — zwycięzcy: ${winnerIds.join(', ') || 'brak'}`);
}

// Eksportujemy mapę do użycia w handlerze przycisku
module.exports.activeGiveaways = activeGiveaways;
module.exports.endGiveaway = endGiveaway;
