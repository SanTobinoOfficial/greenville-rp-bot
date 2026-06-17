// Komenda /sugestia — gracz składa sugestię trafiającą na kanał #sugestie
// Automatycznie dodaje reakcje 👍/👎 do głosowania społeczności
// Cooldown 24h na osobę (in-memory)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const cooldowns = new Map();
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 godziny

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugestia')
    .setDescription('Wyślij sugestię — trafi na #sugestie i będzie dostępna do głosowania')
    .addStringOption(opt =>
      opt
        .setName('temat')
        .setDescription('Krótki tytuł sugestii (np. "Nowe kanały głosowe")')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt
        .setName('opis')
        .setDescription('Szczegółowy opis — co, dlaczego i jak to miałoby działać (min. 30 znaków)')
        .setRequired(true)
        .setMinLength(30)
        .setMaxLength(800)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec**, aby składać sugestie.',
      });
    }

    const userId = interaction.user.id;
    const lastUsed = cooldowns.get(userId);
    if (lastUsed && Date.now() - lastUsed < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (Date.now() - lastUsed);
      const h = Math.floor(remainingMs / 3_600_000);
      const m = Math.ceil((remainingMs % 3_600_000) / 60_000);
      const timeStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
      return interaction.editReply({
        content: `⏳ Możesz wysłać kolejną sugestię za **${timeStr}**.\nNa każdego gracza przypada 1 sugestia na 24 godziny.`,
      });
    }

    const temat = interaction.options.getString('temat');
    const opis  = interaction.options.getString('opis');

    const sugChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && norm(c.name).includes('sugestie')
    );

    if (!sugChannel) {
      logger.warn('/sugestia: nie znaleziono kanału #sugestie');
      return interaction.editReply({
        content: '❌ Kanał sugestii nie został znaleziony. Skontaktuj się z administracją.',
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`💡 ${temat}`)
      .setDescription(opis)
      .addFields({
        name: '👤 Autor',
        value: `<@${userId}> (${interaction.user.tag})`,
        inline: true,
      })
      .setFooter({ text: 'AURORA Greenville RP — Sugestie • Zagłosuj reakcjami poniżej' })
      .setTimestamp();

    let msg;
    try {
      msg = await sugChannel.send({ embeds: [embed] });
      await msg.react('👍');
      await msg.react('👎');
    } catch (err) {
      logger.error(`/sugestia: błąd wysyłania — ${err.message}`);
      return interaction.editReply({
        content: '❌ Nie udało się wysłać sugestii. Spróbuj ponownie później.',
      });
    }

    cooldowns.set(userId, Date.now());
    logger.info(`/sugestia: ${interaction.user.tag} — "${temat}"`);

    await interaction.editReply({
      content:
        `✅ Twoja sugestia **„${temat}"** trafiła do <#${sugChannel.id}>!\n` +
        `Społeczność zdecyduje o jej popularności przez reakcje 👍/👎.\n\n` +
        `📌 Następną sugestię możesz wysłać za **24 godziny**.`,
    });
  },
};
