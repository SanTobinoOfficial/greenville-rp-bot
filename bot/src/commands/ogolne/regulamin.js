// Komenda /regulamin — wysyła embed z regulaminem na bieżący kanał
// Dostępna dla administratorów

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regulamin')
    .setDescription('Wysyła regulamin serwera na ten kanał')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt
        .setName('sekcja')
        .setDescription('Która sekcja regulaminu? (domyślnie: cały)')
        .setRequired(false)
        .addChoices(
          { name: '📜 Cały regulamin', value: 'all' },
          { name: '§1 Zasady ogólne', value: 'general' },
          { name: '§2 Zasady Roleplay', value: 'roleplay' },
          { name: '§3 Służby', value: 'sluzby' },
          { name: '§4 Sankcje', value: 'sankcje' },
        )
    ),

  async execute(interaction) {
    const sekcja = interaction.options.getString('sekcja') ?? 'all';

    await interaction.deferReply({ ephemeral: true });

    const embed = buildRegulamim(sekcja);
    await interaction.channel.send({ embeds: [embed] });

    await interaction.editReply({ content: `✅ Regulamin wysłany na <#${interaction.channelId}>!` });
  },
};

function buildRegulamim(sekcja) {
  const sections = {
    general:
      '**§1 — Zasady ogólne**\n' +
      '> • Szanuj innych graczy i staff\n' +
      '> • Obowiązuje język **polski** na kanałach serwera\n' +
      '> • Zakaz reklamy innych serwerów\n' +
      '> • Zakaz spamu i floodowania\n' +
      '> • Zakaz używania wulgaryzmów w OOC\n' +
      '> • Wykonuj polecenia staffu\n',

    roleplay:
      '**§2 — Zasady Roleplay**\n' +
      '> • **FRP** *(Fail RP)* — zachowania niezgodne z realizmem są zabronione\n' +
      '> • **NLR** *(New Life Rule)* — po śmierci zapominasz wszystko z poprzedniego życia\n' +
      '> • **Metagaming** — używanie informacji z zewnątrz (Discord, stream) jest zabronione\n' +
      '> • **RDM** *(Random Death Match)* — zabijanie bez uzasadnienia RP jest zabronione\n' +
      '> • **VDM** *(Vehicle Death Match)* — potrącanie samochodem bez powodu jest zabronione\n' +
      '> • **Combat Logging** — wychodzenie podczas akcji RP jest zabronione\n' +
      '> • **Powertaming** — narzucanie postaci działań bez jej zgody jest zabronione\n' +
      '> • OOC w IC jest dozwolone tylko przez komendę `/ooc` lub `/b`\n',

    sluzby:
      '**§3 — Służby mundurowe**\n' +
      '> • Wykonuj polecenia przełożonych i dowódców\n' +
      '> • Nie nadużywaj uprawnień służbowych\n' +
      '> • Zgłoś nieobecność z odpowiednim wyprzedzeniem\n' +
      '> • W służbie obowiązuje mundur i pojazd służbowy\n' +
      '> • Akcje specjalne wymagają zgody officera prowadzącego\n' +
      '> • Radiowanie (radio) wyłącznie przez dedykowany system CAD\n',

    sankcje:
      '**§4 — Sankcje i kary**\n' +
      '> • Standardowa ścieżka kar: **Warn → Kick → Ban** (czas do decyzji staffu)\n' +
      '> • Poważne naruszenia skutkują **natychmiastowym banem** bez ostrzeżenia\n' +
      '> • Odwołania od kar przez system ticketów\n' +
      '> • Recydywa skutkuje surowszymi karami\n' +
      '> • Decyzje staffu są ostateczne\n',
  };

  let description = '';

  if (sekcja === 'all') {
    description =
      sections.general + '\n' +
      sections.roleplay + '\n' +
      sections.sluzby + '\n' +
      sections.sankcje + '\n' +
      '*Nieznajomość regulaminu nie zwalnia z odpowiedzialności.*';
  } else {
    description = sections[sekcja] ?? sections.general;
  }

  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('📜 Regulamin AURORA Greenville RP')
    .setDescription(description)
    .setFooter({ text: 'AURORA Greenville RP — Regulamin v2.0' })
    .setTimestamp();
}
