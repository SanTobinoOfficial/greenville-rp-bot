// Komenda /wizytowka — publiczna wizytówka IC postaci
// Gracz "wręcza" wizytówkę: imię IC, telefon RP, zawód, prawa jazdy, nick Roblox
// Dostępna dla: wszyscy gracze posiadający postać RP

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const JOB_COLORS = {
  'Policja':        0x1D4ED8,
  'EMS':            0x10B981,
  'Straż Pożarna':  0xDC2626,
  'DOT':            0xF59E0B,
  'Security Guard': 0x4B5563,
  'NPS':            0x16A34A,
  'Taksówkarz':     0xEAB308,
  'Dyspozytornia':  0x6366F1,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wizytowka')
    .setDescription('Pokaż wizytówkę IC — imię, telefon RP, zawód (publiczne)')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz, którego wizytówkę chcesz zobaczyć (opcjonalne)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    const targetDiscordUser = interaction.options.getUser('gracz') ?? interaction.user;
    const isSelf = targetDiscordUser.id === interaction.user.id;

    const user = await prisma.user
      .findUnique({
        where: { discordId: targetDiscordUser.id },
        include: {
          character: true,
          licenses: { where: { status: 'ACTIVE' } },
        },
      })
      .catch(() => null);

    if (!user) {
      return interaction.reply({
        content: isSelf
          ? '❌ Nie jesteś zarejestrowany w systemie. Przejdź weryfikację na kanale #zacznij-tutaj.'
          : '❌ Ten gracz nie jest zarejestrowany w systemie.',
        ephemeral: true,
      });
    }

    if (!user.character) {
      return interaction.reply({
        content: isSelf
          ? '❌ Nie masz stworzonej postaci RP. Stwórz ją na kanale **#stwórz-postać**.'
          : '❌ Ten gracz nie ma jeszcze stworzonej postaci RP.',
        ephemeral: true,
      });
    }

    const char = user.character;
    const icName = `${char.firstName} ${char.lastName}`;

    const embedColor = JOB_COLORS[user.jobCategory ?? ''] ?? COLORS.rp;

    const jobLine = user.currentJob
      ? `${user.currentJob}${user.jobCategory ? ` *(${user.jobCategory})*` : ''}`
      : '*Brak zatrudnienia*';

    const phoneLine = user.phoneNumber ?? '*Brak numeru*';

    const licenseList =
      user.licenses.length > 0
        ? user.licenses.map(l => `Kat. ${l.kategoria}`).join(' · ')
        : '*Brak aktywnych praw jazdy*';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🪪 ${icName}`)
      .setDescription('*Wizytówka IC — AURORA Greenville RP*')
      .addFields(
        { name: '📱 Telefon RP', value: phoneLine,               inline: true  },
        { name: '💼 Zawód IC',   value: jobLine,                 inline: true  },
        { name: '🎮 Roblox',     value: user.robloxUsername ?? '*Nie podano*', inline: true },
        { name: '🚗 Prawa jazdy', value: licenseList,            inline: false },
      )
      .setThumbnail(targetDiscordUser.displayAvatarURL({ size: 128 }))
      .setFooter({
        text: `${targetDiscordUser.tag} · /wizytowka`,
        iconURL: targetDiscordUser.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/wizytowka | ${interaction.user.tag}` +
        (isSelf ? '' : ` → ${targetDiscordUser.tag}`)
    );

    await interaction.reply({ embeds: [embed] });
  },
};
