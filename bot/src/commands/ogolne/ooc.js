// Komenda /ooc — Out of Character (poza fabułą RP)
// Wysyła publicznie widoczną wiadomość wyraźnie oznaczoną jako OOC,
// odróżniając ją wizualnie od treści In-Character (/me, /do, /szept itd.).
//
// Zasady:
//   • Treść widoczna dla wszystkich na kanale — nie ephemeral
//   • Wyświetla nick Discord + imię IC postaci (jeśli ustawione) dla pełnej identyfikacji
//   • Kolor ciemnoszary (#99AAB5) — neutralny, wyraźnie różny od wszystkich komend IC
//   • Styl (( OOC )) — powszechnie rozumiana konwencja RP
//
// Uzupełnienie zestawu RP:
//   /me (akcja) · /do (otoczenie) · /szept (IC szept) · /try (próba) · /roll (kostka) · /ooc (OOC)
//
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Kolor embeda OOC — ciemnoszary Discord greyple
// Wyraźnie odróżnia wiadomość OOC od wszystkich komend IC (niebieski, fiolet, zielony)
const OOC_COLOR = 0x99AAB5;

// ── Pomocnicza: pobierz imię IC gracza z bazy ────────────────────────────────
async function getIcName(prisma, discordId) {
  try {
    const user = await prisma.user.findUnique({
      where:   { discordId },
      include: { character: true },
    });
    if (user?.character) {
      return `${user.character.firstName} ${user.character.lastName}`;
    }
  } catch {
    // Cisza — fallback do null poniżej
  }
  return null;
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ooc')
    .setDescription('Wyraź się poza fabułą RP — wiadomość OOC widoczna publicznie dla kanału')
    .addStringOption(opt =>
      opt
        .setName('tresc')
        .setDescription(
          'Co chcesz powiedzieć OOC? (np. "Przepraszam, zaraz wracam" lub pytanie do gracza)'
        )
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(300)
    ),

  async execute(interaction, client, prisma) {
    // Publiczna odpowiedź — OOC jest widoczna dla wszystkich na kanale
    await interaction.deferReply({ ephemeral: false });

    // Wymagana rola Mieszkaniec lub wyższa
    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
        ephemeral: true,
      });
    }

    const tresc = interaction.options.getString('tresc').trim();

    // ── Pobierz imię IC gracza (opcjonalne — nie blokuje) ────────────────────
    const icName        = await getIcName(prisma, interaction.user.id);
    const displayName   = interaction.member?.displayName ?? interaction.user.username;

    // Linia identyfikacyjna:
    //   Jeśli gracz ma postać IC → "NickDiscord (IC: Imię Nazwisko)"
    //   Jeśli nie ma postaci     → "NickDiscord"
    const identityLine = icName
      ? `**${displayName}** *(IC: ${icName})*`
      : `**${displayName}**`;

    // ── Buduj embed ───────────────────────────────────────────────────────────
    // Konwencja (( OOC )) jest powszechnie rozumiana w środowiskach RP
    const embed = new EmbedBuilder()
      .setColor(OOC_COLOR)
      .setDescription(`(( **OOC** | ${identityLine}: *${tresc}* ))`)
      .setFooter({
        text:    `${interaction.user.tag} • ${interaction.channel.name} • /ooc`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    // ── Log ───────────────────────────────────────────────────────────────────
    logger.info(
      `/ooc | ${interaction.user.tag}${icName ? ` (${icName})` : ''} | ` +
      `"${tresc.slice(0, 80)}${tresc.length > 80 ? '…' : ''}"`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
