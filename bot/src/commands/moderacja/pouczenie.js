// Komenda /pouczenie — edukacyjne przypomnienie zasad regulaminu dla gracza (Helper+)
// Miękka alternatywa dla /warn: wysyła DM z konkretnym przepisem i tworzy notatkę w bazie.
// Sekcja regulaminu wybierana przez autocomplete z server-config.json.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const { auditLog } = require('../../utils/auditLog');
const logger = require('../../utils/logger');

function getConfig() {
  delete require.cache[require.resolve('../../../../server-config.json')];
  return require('../../../../server-config.json');
}

function buildRuleIndex() {
  const index = new Map();
  for (const section of (getConfig().regulamin?.sections ?? [])) {
    for (const field of (section.fields ?? [])) {
      index.set(field.name, field.rules);
    }
  }
  return index;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pouczenie')
    .setDescription('Wyślij edukacyjne przypomnienie zasad regulaminu graczowi (Helper+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz, któremu wysyłasz przypomnienie')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('zasada')
        .setDescription('Sekcja regulaminu (wpisz fragment, np. "pojazdy", "§7")')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName('wiadomosc')
        .setDescription('Dodatkowa wiadomość od Staffu (opcjonalnie, maks. 300 znaków)')
        .setRequired(false)
        .setMaxLength(300)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = [];
    for (const section of (getConfig().regulamin?.sections ?? [])) {
      for (const field of (section.fields ?? [])) {
        if (!focused || field.name.toLowerCase().includes(focused)) {
          choices.push({ name: field.name.slice(0, 100), value: field.name });
        }
        if (choices.length >= 25) break;
      }
      if (choices.length >= 25) break;
    }
    await interaction.respond(choices).catch(() => {});
  },

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply(noPermissionReply('Helper+'));
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');
    const zasada    = interaction.options.getString('zasada');
    const wiadomosc = interaction.options.getString('wiadomosc');

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz pouczyć siebie samego/samej.' });
    }
    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie możesz pouczyć bota.' });
    }

    const rules = buildRuleIndex().get(zasada);
    if (!rules) {
      return interaction.editReply({
        content: `❌ Nie znaleziono sekcji **${zasada}** w regulaminie.\nUżyj autouzupełnienia, aby wybrać właściwą sekcję.`,
      });
    }

    const rulesText = rules.map((r, i) => `**${i + 1}.** ${r}`).join('\n');

    const dmEmbed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('📋 Przypomnienie zasad — AURORA Greenville RP')
      .setDescription(
        `Otrzymujesz to przypomnienie od **Staffu AURORA Greenville RP**.\n` +
        `Zapoznaj się z poniższą sekcją regulaminu.\n\n` +
        `> *Nie jest to formalna kara — to wiadomość edukacyjna.*`
      )
      .addFields(
        { name: zasada, value: rulesText.slice(0, 1024), inline: false },
        ...(wiadomosc ? [{ name: '💬 Wiadomość od Staffu', value: wiadomosc, inline: false }] : [])
      )
      .setFooter({ text: 'AURORA Greenville RP • Pytania? Otwórz ticket!' })
      .setTimestamp();

    let dmSent = false;
    try {
      await targetUser.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch {
      // DM zablokowane przez gracza
    }

    // Zapis notatki moderacyjnej w bazie
    let authorDb = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!authorDb) {
      authorDb = await prisma.user.create({
        data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
      });
    }
    let targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDb) {
      targetDb = await prisma.user.create({
        data: { discordId: targetUser.id, discordUsername: targetUser.tag },
      });
    }
    await prisma.note.create({
      data: {
        targetId: targetDb.id,
        authorId:  authorDb.id,
        content:   `[POUCZENIE] ${zasada}${wiadomosc ? ` | "${wiadomosc}"` : ''}`,
      },
    });

    await auditLog({
      client,
      prisma,
      type: 'COMMAND',
      executor: { id: interaction.user.id, tag: interaction.user.tag },
      target:   { id: targetUser.id,      tag: targetUser.tag },
      action:   `📋 Pouczenie wysłane — ${zasada}`,
      fields: {
        '📋 Sekcja': zasada,
        '📬 DM': dmSent ? '✅ Dostarczono' : '⚠️ DM zablokowane',
        ...(wiadomosc ? { '💬 Wiadomość': wiadomosc } : {}),
      },
      guildId: interaction.guildId,
    }).catch(() => {});

    logger.info(`/pouczenie | ${interaction.user.tag} → ${targetUser.tag} | ${zasada}`);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Pouczenie wysłane')
          .setDescription(`Gracz <@${targetUser.id}> otrzymał przypomnienie zasad regulaminu.`)
          .addFields(
            { name: '📋 Sekcja regulaminu', value: zasada, inline: false },
            { name: '📬 Dostarczenie DM', value: dmSent ? '✅ Wiadomość prywatna wysłana' : '⚠️ DM zablokowane — gracz nie otrzymał wiadomości', inline: false },
            ...(wiadomosc ? [{ name: '💬 Twoja wiadomość', value: wiadomosc, inline: false }] : [])
          )
          .setFooter({ text: 'Pouczenie zarejestrowane jako notatka moderacyjna' })
          .setTimestamp(),
      ],
    });
  },
};
