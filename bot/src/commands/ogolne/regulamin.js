// Komenda /regulamin — wysyła embedy z regulaminem z server-config.json
// Dostępna dla Managerów i wyżej

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const config = require('../../../../server-config.json');

const CHOICES = [
  { name: '📜 Cały regulamin (wszystkie sekcje)', value: 'all' },
  { name: '§1 Postanowienia ogólne',               value: '1' },
  { name: '§2-§3 Zasady komunikacji i głosowe',    value: '2' },
  { name: '§4 Słownik pojęć RP',                   value: '3' },
  { name: '§5 Zasady sesji RP',                    value: '4' },
  { name: '§6-§7 Przestępczość i pojazdy',         value: '5' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regulamin')
    .setDescription('Wysyła regulamin serwera na bieżący kanał')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt
        .setName('sekcja')
        .setDescription('Która część regulaminu? (domyślnie: cały)')
        .setRequired(false)
        .addChoices(...CHOICES)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sekcja = interaction.options.getString('sekcja') ?? 'all';
    const reg = config.regulamin;
    const color = parseInt(reg.color.replace('#', ''), 16);

    let sectionsToSend = [];

    if (sekcja === 'all') {
      sectionsToSend = reg.sections;
    } else {
      const idx = parseInt(sekcja) - 1;
      if (reg.sections[idx]) {
        sectionsToSend = [reg.sections[idx]];
      } else {
        sectionsToSend = [reg.sections[0]];
      }
    }

    const embeds = sectionsToSend.map((section, sIdx) => {
      const embed = new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: reg.footer })
        .setTimestamp();

      if (sIdx === 0 && section.title) {
        embed.setTitle(section.title);
        if (section.intro) embed.setDescription(section.intro);
      }

      for (const field of (section.fields || [])) {
        const value = field.rules
          .map((r, i) => `${i + 1}. ${r}`)
          .join('\n');

        // Discord field values max 1024 chars — split if needed
        const chunks = splitText(value, 1020);
        chunks.forEach((chunk, ci) => {
          embed.addFields({
            name: ci === 0 ? field.name : `${field.name} (cd.)`,
            value: chunk,
            inline: false,
          });
        });
      }

      return embed;
    });

    // Send each embed to channel (max 10 embeds per message)
    const BATCH = 10;
    for (let i = 0; i < embeds.length; i += BATCH) {
      await interaction.channel.send({ embeds: embeds.slice(i, i + BATCH) });
    }

    await interaction.editReply({
      content: `✅ Regulamin wysłany na <#${interaction.channelId}>!`,
    });
  },
};

/** Split long text into chunks fitting Discord's 1024-char field limit */
function splitText(text, limit) {
  if (text.length <= limit) return [text];
  const lines = text.split('\n');
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > limit) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
