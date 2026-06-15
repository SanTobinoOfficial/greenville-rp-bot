// Komenda /urlop — system urlopów i nieobecności dla służb i staffu
// Subkomendy: zglos / anuluj / lista
// Przechowuje wpisy w modelu Note (targetId = authorId = własne konto DB)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const DATE_REGEX = /^(\d{2})\.(\d{2})\.(\d{4})$/;

// Format zapisu w Note.content: [URLOP|<sluzba>|<data_powrotu_lub_pusty>] <powód>
// Przykłady:
//   [URLOP|Policja|25.06.2026] Wyjazd rodzinny
//   [URLOP|EMS|] Sprawy prywatne
const LEAVE_TAG = '[URLOP|';
const LEAVE_REGEX = /^\[URLOP\|([^\|]*)\|([^\]]*)\] (.+)$/;

// Zwraca pierwszą pasującą rolę służby lub staffu wraz z emoji
function detectRole(member) {
  const SERVICE_MAP = [
    ['Owner',         '👑'],
    ['Co-Owner',      '👑'],
    ['Administrator', '⚙️'],
    ['Moderator',     '🛡️'],
    ['HR',            '📋'],
    ['Host',          '🎪'],
    ['Helper',        '💙'],
    ['Policja',       '🚔'],
    ['EMS',           '🚑'],
    ['Straż Pożarna', '🚒'],
    ['DOT',           '🚧'],
    ['Straż Miejska', '🛡️'],
    ['Taksówkarz',    '🚕'],
    ['NPS',           '🌲'],
    ['Security Guard','🔐'],
  ];
  for (const [role, emoji] of SERVICE_MAP) {
    if (member.roles.cache.some(r => r.name === role)) return { name: role, emoji };
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urlop')
    .setDescription('System urlopów i nieobecności dla służb i staffu')
    .addSubcommand(sub =>
      sub
        .setName('zglos')
        .setDescription('Zgłoś urlop lub nieobecność')
        .addStringOption(opt =>
          opt
            .setName('powod')
            .setDescription('Powód nieobecności (np. wyjazd, sprawy osobiste)')
            .setRequired(true)
            .setMaxLength(280)
        )
        .addStringOption(opt =>
          opt
            .setName('data_powrotu')
            .setDescription('Planowana data powrotu DD.MM.RRRR (opcjonalnie)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('anuluj')
        .setDescription('Anuluj swój aktywny urlop / nieobecność')
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Wyświetl listę aktywnych urlopów — tylko Staff')
    ),

  async execute(interaction, client, prisma) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    // Pobierz lub utwórz użytkownika w DB
    let userDb = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!userDb) {
      userDb = await prisma.user.create({
        data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
      });
    }

    // ── /urlop zglos ──────────────────────────────────────────────────────────
    if (sub === 'zglos') {
      const role = detectRole(interaction.member);
      if (!role) {
        return interaction.editReply({
          content: '❌ Tylko członkowie służb i staff mogą zgłaszać urlopy.',
        });
      }

      // Sprawdź czy nie ma już aktywnego urlopu
      const existing = await prisma.note.findFirst({
        where: {
          targetId: userDb.id,
          authorId: userDb.id,
          content: { startsWith: LEAVE_TAG },
        },
      });
      if (existing) {
        return interaction.editReply({
          content: '❌ Masz już aktywny urlop. Anuluj go najpierw komendą `/urlop anuluj`.',
        });
      }

      const powod = interaction.options.getString('powod');
      const dataPowrotu = interaction.options.getString('data_powrotu') ?? '';

      // Walidacja daty powrotu
      if (dataPowrotu) {
        if (!DATE_REGEX.test(dataPowrotu)) {
          return interaction.editReply({
            content: '❌ Nieprawidłowy format daty. Użyj: **DD.MM.RRRR** (np. `25.06.2026`)',
          });
        }
        const [, dd, mm, yyyy] = dataPowrotu.match(DATE_REGEX);
        const returnDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
        if (isNaN(returnDate.getTime()) || returnDate <= new Date()) {
          return interaction.editReply({ content: '❌ Data powrotu musi być w przyszłości.' });
        }
      }

      // Zapisz jako Note
      const noteContent = `${LEAVE_TAG}${role.name}|${dataPowrotu}] ${powod}`;
      await prisma.note.create({
        data: { targetId: userDb.id, authorId: userDb.id, content: noteContent },
      });

      // Embed ogłoszenia
      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(`${role.emoji} Urlop / Nieobecność`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: '👤 Pracownik',  value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: '💼 Jednostka',  value: role.name,                                              inline: true },
          { name: '📅 Powrót',     value: dataPowrotu || '_Nie podano_',                         inline: true },
          { name: '📝 Powód',      value: powod,                                                  inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — System Urlopów' })
        .setTimestamp();

      // Wyślij do kanału ogłoszeń personelu (jeśli istnieje)
      const norm = s =>
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const annCh = interaction.guild.channels.cache.find(c =>
        c.isTextBased() && (
          norm(c.name).includes('urlopy') ||
          norm(c.name).includes('nieobecnosci') ||
          norm(c.name).includes('ogloszenia-personelu') ||
          norm(c.name).includes('ogloszen-staff')
        )
      );
      if (annCh) await annCh.send({ embeds: [embed] }).catch(() => null);

      logger.info(
        `Urlop: ${interaction.user.tag} [${role.name}] ` +
        `powód="${powod}" powrót=${dataPowrotu || '—'}`
      );
      await interaction.editReply({
        content:
          `✅ Urlop zgłoszony pomyślnie.\n` +
          `📝 **Powód:** ${powod}\n` +
          `📅 **Powrót:** ${dataPowrotu || 'Nie podano'}`,
      });

    // ── /urlop anuluj ─────────────────────────────────────────────────────────
    } else if (sub === 'anuluj') {
      const existing = await prisma.note.findFirst({
        where: {
          targetId: userDb.id,
          authorId: userDb.id,
          content: { startsWith: LEAVE_TAG },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!existing) {
        return interaction.editReply({ content: '❌ Nie masz żadnego aktywnego urlopu do anulowania.' });
      }

      await prisma.note.delete({ where: { id: existing.id } });
      logger.info(`Urlop anulowany: ${interaction.user.tag}`);
      await interaction.editReply({ content: '✅ Twój urlop został anulowany. Witaj z powrotem! 👋' });

    // ── /urlop lista ──────────────────────────────────────────────────────────
    } else if (sub === 'lista') {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: '❌ Tylko staff może przeglądać listę urlopów.' });
      }

      const leaves = await prisma.note.findMany({
        where: { content: { startsWith: LEAVE_TAG } },
        include: { target: true },
        orderBy: { createdAt: 'asc' },
      });

      if (leaves.length === 0) {
        return interaction.editReply({ content: '✅ Brak aktywnych urlopów.' });
      }

      const lines = leaves.map(n => {
        const m = n.content.match(LEAVE_REGEX);
        const sluzba = m?.[1] ?? '?';
        const powrot = m?.[2] || null;
        const powod  = m?.[3] ?? n.content;
        const since  = `<t:${Math.floor(n.createdAt.getTime() / 1000)}:d>`;
        const discId = n.target.discordId;
        return (
          `• <@${discId}> **[${sluzba}]** — od ${since}${powrot ? ` → **${powrot}**` : ''}\n` +
          `  └ ${powod}`
        );
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`🏖️ Aktywne urlopy / nieobecności — ${leaves.length}`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'AURORA Greenville RP — System Urlopów' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
