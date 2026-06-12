// Komenda /przypomnij — osobiste przypomnienia z timerem
// Gracz ustawia przypomnienie (1–360 min), bot wysyła DM po czasie
// Dane in-memory — resetują się po restarcie bota (jak /stan-postaci, /tablica)
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Map<discordId, Array<{ id, wiadomosc, expiresAt, timerId }>>
const reminderStore = new Map();
let nextId = 1;

const MAX_PER_USER = 5;
const MIN_MINUTES   = 1;
const MAX_MINUTES   = 360;

function getUserReminders(userId) {
  if (!reminderStore.has(userId)) reminderStore.set(userId, []);
  return reminderStore.get(userId);
}

function removeFromStore(userId, reminderId) {
  const list = getUserReminders(userId);
  const idx  = list.findIndex(r => r.id === reminderId);
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  clearTimeout(removed.timerId);
  return removed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('przypomnij')
    .setDescription('Osobiste przypomnienie — bot wyśle Ci DM po ustawionym czasie')
    .addSubcommand(sub =>
      sub
        .setName('ustaw')
        .setDescription(`Ustaw przypomnienie (${MIN_MINUTES}–${MAX_MINUTES} minut)`)
        .addIntegerOption(opt =>
          opt
            .setName('minuty')
            .setDescription('Za ile minut mam Ci przypomnieć?')
            .setRequired(true)
            .setMinValue(MIN_MINUTES)
            .setMaxValue(MAX_MINUTES)
        )
        .addStringOption(opt =>
          opt
            .setName('wiadomosc')
            .setDescription('Co chcesz zapamiętać? (treść DM)')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Wyświetl swoje aktywne przypomnienia')
    )
    .addSubcommand(sub =>
      sub
        .setName('anuluj')
        .setDescription('Anuluj aktywne przypomnienie')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Numer przypomnienia z /przypomnij lista')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z przypomnień.',
      });
    }

    const sub    = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ── USTAW ─────────────────────────────────────────────────────────────────
    if (sub === 'ustaw') {
      const reminders = getUserReminders(userId);

      if (reminders.length >= MAX_PER_USER) {
        return interaction.editReply({
          content: `❌ Masz już **${MAX_PER_USER}** aktywnych przypomnień. Anuluj jedno przez \`/przypomnij anuluj\`, aby dodać nowe.`,
        });
      }

      const minuty    = interaction.options.getInteger('minuty');
      const wiadomosc = interaction.options.getString('wiadomosc').trim();
      const id        = nextId++;
      const msDelay   = minuty * 60 * 1000;
      const expiresAt = Date.now() + msDelay;
      const expiresTs = Math.floor(expiresAt / 1000);

      const timerId = setTimeout(async () => {
        // Usuń z listy (mógł już być anulowany — sprawdź)
        const list = getUserReminders(userId);
        const idx  = list.findIndex(r => r.id === id);
        if (idx !== -1) list.splice(idx, 1);

        try {
          const user = await client.users.fetch(userId);
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.primary)
                .setTitle('⏰ Przypomnienie!')
                .setDescription(`> ${wiadomosc}`)
                .setFooter({ text: 'AURORA Greenville RP — Przypomnienie' })
                .setTimestamp(),
            ],
          });
          logger.info(`/przypomnij | DM wysłane → ${interaction.user.tag} | id: ${id}`);
        } catch {
          logger.warn(`/przypomnij | Nie można wysłać DM → ${interaction.user.tag} | id: ${id} (zablokowane DM?)`);
        }
      }, msDelay);

      reminders.push({ id, wiadomosc, expiresAt, timerId });

      logger.info(
        `/przypomnij ustaw | ${interaction.user.tag} | id: ${id} | ${minuty} min` +
        ` | "${wiadomosc.slice(0, 60)}${wiadomosc.length > 60 ? '…' : ''}"`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('⏰ Przypomnienie ustawione!')
            .setDescription(
              'Bot wyśle Ci DM z przypomnieniem o podanej godzinie.\n' +
              '*Upewnij się, że masz włączone wiadomości prywatne od członków serwera.*'
            )
            .addFields(
              { name: '🆔 Numer',       value: `**#${id}**`,           inline: true  },
              { name: '⏱️ Za',          value: `**${minuty} min**`,    inline: true  },
              { name: '🔔 O godzinie',  value: `<t:${expiresTs}:t>`,   inline: true  },
              { name: '📝 Treść',       value: wiadomosc,               inline: false },
            )
            .setFooter({ text: `Anuluj: /przypomnij anuluj id:${id} • AURORA Greenville RP` })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const reminders = getUserReminders(userId);

      if (reminders.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('⏰ Twoje przypomnienia — brak aktywnych')
              .setDescription('Nie masz żadnych aktywnych przypomnień.\n\nUstaw nowe: `/przypomnij ustaw`')
              .setFooter({ text: 'AURORA Greenville RP — Przypomnienia' })
              .setTimestamp(),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`⏰ Twoje przypomnienia — ${reminders.length}/${MAX_PER_USER}`)
        .setFooter({ text: 'AURORA Greenville RP — Przypomnienia | /przypomnij anuluj aby usunąć' })
        .setTimestamp();

      for (const r of reminders) {
        const ts    = Math.floor(r.expiresAt / 1000);
        const tresc = r.wiadomosc.length > 200 ? r.wiadomosc.slice(0, 197) + '…' : r.wiadomosc;
        embed.addFields({
          name:  `#${r.id} — <t:${ts}:R>`,
          value: tresc,
          inline: false,
        });
      }

      logger.info(`/przypomnij lista | ${interaction.user.tag} | ${reminders.length} aktywnych`);

      return interaction.editReply({ embeds: [embed] });
    }

    // ── ANULUJ ────────────────────────────────────────────────────────────────
    if (sub === 'anuluj') {
      const id       = interaction.options.getInteger('id');
      const removed  = removeFromStore(userId, id);

      if (!removed) {
        return interaction.editReply({
          content: `❌ Nie znaleziono przypomnienia **#${id}**. Użyj \`/przypomnij lista\` aby sprawdzić aktywne numery.`,
        });
      }

      logger.info(
        `/przypomnij anuluj | ${interaction.user.tag} | id: ${id}` +
        ` | "${removed.wiadomosc.slice(0, 60)}${removed.wiadomosc.length > 60 ? '…' : ''}"`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Przypomnienie anulowane')
            .addFields(
              { name: '🆔 Numer',  value: `**#${id}**`,      inline: true  },
              { name: '📝 Treść',  value: removed.wiadomosc, inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Przypomnienia' })
            .setTimestamp(),
        ],
      });
    }
  },
};
