// Komenda /rozpatrz-podanie — HR/Staff zatwierdza lub odrzuca podanie o pracę SERVICE
// Dostępna dla: HR+ (Staff)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rozpatrz-podanie')
    .setDescription('[HR/STAFF] Zatwierdź lub odrzuć podanie o pracę służbową')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('ID podania (z embeda lub bazy danych)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('decyzja')
        .setDescription('Decyzja dotycząca podania')
        .setRequired(true)
        .addChoices(
          { name: '✅ Zaakceptuj', value: 'ACCEPTED' },
          { name: '❌ Odrzuć', value: 'REJECTED' },
          { name: '📝 Proszę o uzupełnienie', value: 'INCOMPLETE' },
        )
    )
    .addStringOption(opt =>
      opt.setName('notatka')
        .setDescription('Notatka do gracza (opcjonalna, wysyłana do gracza w DM)')
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isStaff(interaction.member)) {
      return interaction.editReply({ content: '❌ Ta komenda jest dostępna tylko dla Staffu (Helper+).' });
    }

    const appId = interaction.options.getString('id').trim();
    const decyzja = interaction.options.getString('decyzja');
    const notatka = interaction.options.getString('notatka') ?? '';

    // Znajdź podanie
    const app = await prisma.jobApplication.findUnique({
      where: { id: appId },
      include: { user: true },
    });

    if (!app) {
      return interaction.editReply({ content: `❌ Nie znaleziono podania o ID \`${appId}\`.\n\nSprawdź czy ID jest poprawne.` });
    }

    if (app.status !== 'PENDING') {
      return interaction.editReply({
        content: `❌ To podanie zostało już rozpatrzone (status: **${app.status}**).\n\nMożesz rozpatrywać tylko podania ze statusem **PENDING**.`,
      });
    }

    // Zaktualizuj podanie
    await prisma.jobApplication.update({
      where: { id: appId },
      data: {
        status: decyzja,
        reviewedAt: new Date(),
        reviewedBy: interaction.user.tag,
        reviewNote: notatka || null,
      },
    });

    // Jeśli zaakceptowane — ustaw pracę na graczu
    if (decyzja === 'ACCEPTED') {
      await prisma.user.update({
        where: { id: app.userId },
        data: {
          currentJob: app.jobName,
          jobCategory: app.jobCategory,
          jobAssignedAt: new Date(),
        },
      });
    }

    // Wyślij DM do gracza
    const decyzjaLabels = {
      ACCEPTED: { title: '✅ Podanie zaakceptowane!', color: COLORS.success },
      REJECTED: { title: '❌ Podanie odrzucone', color: COLORS.error },
      INCOMPLETE: { title: '📝 Proszę o uzupełnienie', color: COLORS.warning },
    };
    const decyzjaInfo = decyzjaLabels[decyzja];

    try {
      const discordUser = await client.users.fetch(app.user.discordId);
      if (discordUser) {
        const dmEmbed = new EmbedBuilder()
          .setColor(decyzjaInfo.color)
          .setTitle(`${decyzjaInfo.title}`)
          .setDescription(
            decyzja === 'ACCEPTED'
              ? `Twoje podanie na stanowisko **${app.jobName}** zostało zaakceptowane! 🎉\n\nMożesz teraz podjąć pracę w grze.`
              : decyzja === 'REJECTED'
              ? `Twoje podanie na stanowisko **${app.jobName}** zostało odrzucone.\n\nMożesz spróbować ponownie po upłynięciu cooldownu.`
              : `Twoje podanie na stanowisko **${app.jobName}** wymaga uzupełnienia.\n\nProsimy o ponowne wypełnienie z uwzględnieniem uwag poniżej.`
          )
          .addFields(
            { name: '💼 Stanowisko', value: app.jobName, inline: true },
            { name: '🛡️ Rozpatrzył', value: interaction.user.tag, inline: true },
          );

        if (notatka) {
          dmEmbed.addFields({ name: '📝 Uwagi od Staff', value: notatka, inline: false });
        }

        dmEmbed
          .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
          .setTimestamp();

        await discordUser.send({ embeds: [dmEmbed] }).catch(() => { /* DM zablokowane */ });
      }
    } catch { /* ignoruj */ }

    // Odpowiedź dla staff
    const color = decyzjaInfo.color;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${decyzjaInfo.title} — Podanie rozpatrzone`)
      .addFields(
        { name: '🆔 ID Podania', value: `\`${appId}\``, inline: true },
        { name: '💼 Stanowisko', value: app.jobName, inline: true },
        { name: '📁 Kategoria', value: app.jobCategory, inline: true },
        { name: '👤 Gracz', value: `<@${app.user.discordId}> (${app.user.discordUsername ?? app.user.discordId})`, inline: true },
        { name: '🎮 Roblox', value: app.user.robloxUsername ?? 'Brak', inline: true },
        { name: '⚖️ Decyzja', value: `**${decyzja}**`, inline: true },
      )
      .setFooter({ text: `Rozpatrzył: ${interaction.user.tag} • AURORA Greenville RP` })
      .setTimestamp();

    if (notatka) {
      embed.addFields({ name: '📝 Notatka do gracza', value: notatka, inline: false });
    }

    if (decyzja === 'ACCEPTED') {
      embed.setDescription(`Praca **${app.jobName}** została przypisana do gracza. Powiadomiono go przez DM.`);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
