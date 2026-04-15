// Komenda /wyczyść-mandat — dezaktywacja mandatu przez administratora
// Dostępna dla: Administrator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wyczyść-mandat')
    .setDescription('Dezaktywuj mandat po jego ID (Admin+)')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('ID mandatu do wyczyszczenia (ostatnie 6 znaków lub pełne ID)')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Tylko Administrator+ może czyścić mandaty
    if (!isAdmin(member)) {
      return interaction.editReply(noPermissionReply('Administrator'));
    }

    const idInput = interaction.options.getString('id').trim();

    // Szukanie mandatu — po pełnym ID lub po ostatnich 6 znakach
    let fine = await prisma.fine.findFirst({
      where: {
        OR: [
          { id: idInput },
          { id: { endsWith: idInput.toLowerCase() } },
        ],
      },
      include: {
        target: true,
        issuer: true,
      },
    });

    if (!fine) {
      return interaction.editReply({
        content: `❌ Nie znaleziono mandatu o ID: \`${idInput}\`\nSprawdź czy ID jest poprawne (możesz podać pełne ID lub ostatnie 6 znaków).`,
      });
    }

    // Sprawdzenie czy mandat jest już nieaktywny
    if (!fine.active) {
      return interaction.editReply({
        content: `⚠️ Mandat \`${fine.id.slice(-6).toUpperCase()}\` jest już nieaktywny.`,
      });
    }

    // Dezaktywacja mandatu
    await prisma.fine.update({
      where: { id: fine.id },
      data: { active: false },
    });

    logger.info(`Wyczyszczono mandat ${fine.id} przez ${interaction.user.tag}`);

    // Typ mandatu po polsku
    const typLabels = {
      MANDAT: { label: 'Mandat', emoji: '🚔' },
      GRZYWNA: { label: 'Grzywna', emoji: '💰' },
      ARESZT: { label: 'Areszt', emoji: '⛓️' },
    };
    const typCfg = typLabels[fine.type] || { label: fine.type, emoji: '📋' };

    // Pobranie discordowego obiektu ukaranego (może nie być na serwerze)
    const targetDiscordUser = await client.users.fetch(fine.target.discordId).catch(() => null);

    // Log embed do kanału moderacyjnego
    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`🧹 Wyczyszczono ${typCfg.label} | ID: ${fine.id.slice(-6).toUpperCase()}`)
      .addFields(
        {
          name: '👤 Ukarany',
          value: targetDiscordUser
            ? `<@${fine.target.discordId}> (${targetDiscordUser.tag})`
            : `ID: ${fine.target.discordId}`,
          inline: true,
        },
        {
          name: '🛡️ Wyczyszczono przez',
          value: `<@${interaction.user.id}>`,
          inline: true,
        },
        {
          name: `${typCfg.emoji} Typ`,
          value: typCfg.label,
          inline: true,
        },
        {
          name: '📝 Oryginalny powód',
          value: fine.reason,
          inline: false,
        }
      )
      .setFooter({ text: 'AURORA Greenville RP — Moderacja' })
      .setTimestamp();

    if (fine.amount) {
      logEmbed.addFields({
        name: '💰 Kwota',
        value: `${fine.amount.toLocaleString('pl-PL')} zł`,
        inline: true,
      });
    }

    // Wysłanie logu do kanału moderacyjnego
    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', logEmbed);

    await interaction.editReply({
      content: `✅ Mandat \`${fine.id.slice(-6).toUpperCase()}\` (${typCfg.emoji} ${typCfg.label}) został wyczyszczony.`,
    });
  },
};
