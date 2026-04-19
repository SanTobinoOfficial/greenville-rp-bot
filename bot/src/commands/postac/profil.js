// Komenda /profil — pełny profil gracza RP
// Widoczny dla samego gracza | Staff może sprawdzać profil innych

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Wyświetl pełny profil gracza RP')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Profil innej osoby (tylko Staff)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');
    const isCheckingOther = !!targetUser;

    if (isCheckingOther && !isStaff(interaction.member)) {
      return interaction.editReply({ content: '❌ Tylko staff może sprawdzać profile innych graczy.' });
    }

    const discordId = isCheckingOther ? targetUser.id : interaction.user.id;
    const lookupUser = isCheckingOther ? targetUser : interaction.user;

    const user = await prisma.user.findUnique({
      where: { discordId },
      include: {
        character: true,
        vehicles: { orderBy: { createdAt: 'desc' } },
        licenses: { where: { status: 'ACTIVE' } },
        casesAsTarget: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, take: 3 },
        finesReceived: { where: { active: true } },
        arrests: { where: { active: true } },
      },
      // Dodaj pola pracy
    });
    // Pobierz pola pracy osobno (mogą nie być w include)
    const userJob = await prisma.user.findUnique({
      where: { discordId },
      select: { currentJob: true, jobCategory: true, jobAssignedAt: true },
    });

    if (!user) {
      return interaction.editReply({ content: `❌ ${isCheckingOther ? 'Ten gracz nie jest' : 'Nie jesteś'} zarejestrowany/a w systemie.` });
    }

    const char = user.character;
    const activeWarns = user.casesAsTarget.filter(c => c.type === 'WARN').length;
    const activeBans  = user.casesAsTarget.filter(c => c.type === 'BAN').length;
    const activeMutes = user.casesAsTarget.filter(c => c.type === 'MUTE').length;
    const activeFines = user.finesReceived.length;
    const isArrested  = user.arrests.length > 0;

    const embed = new EmbedBuilder()
      .setColor(isArrested ? COLORS.mod_ban : COLORS.primary)
      .setTitle(`👤 Profil — ${lookupUser.tag}`)
      .setThumbnail(lookupUser.displayAvatarURL())
      .addFields(
        {
          name: '🪪 Postać',
          value: char
            ? `${char.firstName} ${char.lastName}\nPESEL: ||${char.peselRp}||`
            : '❌ Brak postaci',
          inline: true,
        },
        {
          name: '🎮 Roblox',
          value: user.robloxUsername ? `@${user.robloxUsername}` : '❌ Nie połączono',
          inline: true,
        },
        {
          name: '📅 Na serwerze od',
          value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:D>`,
          inline: true,
        },
        {
          name: '🚗 Pojazdy',
          value: user.vehicles.length > 0
            ? user.vehicles.slice(0, 3).map(v => `• ${v.marka} ${v.model} \`${v.tablica}\``).join('\n') +
              (user.vehicles.length > 3 ? `\n+${user.vehicles.length - 3} więcej` : '')
            : 'Brak',
          inline: true,
        },
        {
          name: '🪪 Prawa jazdy',
          value: user.licenses.length > 0
            ? user.licenses.map(l => `• Kat. **${l.kategoria}**`).join('\n')
            : 'Brak',
          inline: true,
        },
        {
          name: '📊 Kary',
          value: [
            `⚠️ Warny: **${activeWarns}**`,
            `🔨 Bany: **${activeBans}**`,
            `🔇 Mute: **${activeMutes}**`,
            `📜 Mandaty: **${activeFines}**`,
          ].join('\n'),
          inline: true,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — Profil gracza' })
      .setTimestamp();

    // Praca RP
    if (userJob?.currentJob) {
      embed.addFields({
        name: '💼 Praca RP',
        value: `${userJob.currentJob}\n📁 ${userJob.jobCategory ?? '—'}${userJob.jobAssignedAt ? `\n📅 Od <t:${Math.floor(userJob.jobAssignedAt.getTime()/1000)}:D>` : ''}`,
        inline: true,
      });
    }

    if (isArrested) {
      embed.addFields({ name: '🚔 STATUS', value: '**ZATRZYMANY/A przez Policję**', inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
