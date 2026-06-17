// Komenda /anonimowo — anonimowe zgłoszenie IC do dyspozytorni służb
// Gracz informuje służby o podejrzanej aktywności IC bez ujawniania tożsamości Discord.
// Tożsamość nadawcy ukryta przed dyspozytorami; zapisywana tylko w logach bota
// (widocznych wyłącznie dla administracji) jako ochrona przed nadużyciami.
// Cooldown: 10 minut per użytkownik (in-memory).
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// In-memory cooldown: discordId → timestamp ostatniego zgłoszenia
const cooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minut

function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');
}

function findDispatchChannel(guild) {
  const patterns = ['dyspozytornia', 'dispatch', 'policja-czat', 'policja-radio', 'czat-sluzb', 'czat-policji'];
  return guild.channels.cache.find(
    ch => ch.isTextBased() && patterns.some(p => norm(ch.name).includes(p))
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anonimowo')
    .setDescription('Wyślij anonimowe zgłoszenie IC do dyspozytorni służb (tożsamość ukryta)')
    .addStringOption(opt =>
      opt
        .setName('tresc')
        .setDescription('Treść zgłoszenia IC — co widziałeś/aś, gdzie, kiedy')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(500)
    )
    .addStringOption(opt =>
      opt
        .setName('lokalizacja')
        .setDescription('Lokacja IC związana ze zgłoszeniem (opcjonalnie)')
        .setRequired(false)
        .setMaxLength(100)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą wysyłać anonimowe zgłoszenia.',
      });
    }

    // ── Cooldown ──────────────────────────────────────────────────────────────
    const now = Date.now();
    const lastUsed = cooldowns.get(interaction.user.id) ?? 0;
    const remaining = COOLDOWN_MS - (now - lastUsed);

    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      return interaction.editReply({
        content: `⏳ Następne anonimowe zgłoszenie możesz wysłać za **${mins} min**.`,
      });
    }

    const tresc      = interaction.options.getString('tresc').trim();
    const lokalizacja = interaction.options.getString('lokalizacja')?.trim() ?? null;

    // ── Szukaj kanału dyspozytorni ────────────────────────────────────────────
    const dispatchCh = findDispatchChannel(interaction.guild);

    if (!dispatchCh) {
      logger.warn('/anonimowo: nie znaleziono kanału dyspozytorni');
      return interaction.editReply({
        content: '❌ System zgłoszeń anonimowych jest tymczasowo niedostępny. Użyj `/zglos`.',
      });
    }

    // Ustaw cooldown przed wysłaniem (blokuje double-submit)
    cooldowns.set(interaction.user.id, now);

    // GC starych wpisów przy >100 rekordach
    if (cooldowns.size > 100) {
      const cutoff = now - COOLDOWN_MS;
      for (const [id, ts] of cooldowns) {
        if (ts < cutoff) cooldowns.delete(id);
      }
    }

    const reportId = now.toString(36).toUpperCase().slice(-6);

    // ── Embed do dyspozytorni (bez danych nadawcy) ────────────────────────────
    const dispatchEmbed = new EmbedBuilder()
      .setColor(0xFB923C)
      .setTitle(`📞 ANONIMOWE ZGŁOSZENIE IC — #${reportId}`)
      .setDescription(`**Wiadomość od anonimowego informatora:**\n> ${tresc}`)
      .addFields(
        { name: '📍 Wskazana lokalizacja', value: lokalizacja ?? '*Nie podano*',          inline: true },
        { name: '🕐 Zgłoszono',            value: `<t:${Math.floor(now / 1000)}:T>`,     inline: true },
      )
      .setFooter({ text: `AURORA Greenville RP — Zgłoszenie #${reportId} | Tożsamość nadawcy nieznana` })
      .setTimestamp();

    try {
      await dispatchCh.send({ embeds: [dispatchEmbed] });
    } catch (err) {
      logger.error(`/anonimowo: błąd wysyłania do dyspozytorni: ${err.message}`);
      cooldowns.delete(interaction.user.id);
      return interaction.editReply({
        content: '❌ Nie udało się wysłać zgłoszenia. Spróbuj ponownie lub użyj `/zglos`.',
      });
    }

    // Wewnętrzny log — tożsamość widoczna tylko w logach bota (nie w Discordzie)
    logger.info(
      `/anonimowo | nadawca: ${interaction.user.tag} (${interaction.user.id}) | ` +
      `#${reportId} | lok: "${lokalizacja ?? 'brak'}" | "${tresc.slice(0, 80)}${tresc.length > 80 ? '…' : ''}"`
    );

    // ── Potwierdzenie dla gracza (ephemeral) ──────────────────────────────────
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('✅ Anonimowe zgłoszenie IC wysłane')
          .setDescription(
            'Twoje zgłoszenie zostało przekazane do dyspozytorni służb.\n' +
            '> *Twoja tożsamość Discord nie została ujawniona.*'
          )
          .addFields(
            { name: '🔖 Numer zgłoszenia', value: `#${reportId}`,                     inline: true },
            { name: '⏳ Cooldown',          value: 'Następne zgłoszenie za **10 min**', inline: true },
          )
          .setFooter({ text: 'AURORA Greenville RP — System zgłoszeń anonimowych' })
          .setTimestamp(),
      ],
    });
  },
};
