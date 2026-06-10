// Komenda /opis-pojazdu — ustaw, pokaż lub usuń IC opis zarejestrowanego pojazdu
// Vehicle.opis jest ustawiany podczas rejestracji, ale do tej pory brak było komendy do aktualizacji po fakcie.
// Opis widoczny dla Policji podczas /sprawdz-tablice — przydatny do oznaczania modyfikacji, uszkodzeń, charakterystycznych cech.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opis-pojazdu')
    .setDescription('Ustaw, pokaż lub usuń IC opis swojego zarejestrowanego pojazdu')
    .addSubcommand(sub =>
      sub
        .setName('ustaw')
        .setDescription('Ustaw lub zaktualizuj IC opis pojazdu (wygląd, modyfikacje, uszkodzenia)')
        .addStringOption(opt =>
          opt
            .setName('tablica')
            .setDescription('Numer rejestracyjny pojazdu (np. GV 123 AB)')
            .setRequired(true)
            .setMaxLength(12)
        )
        .addStringOption(opt =>
          opt
            .setName('opis')
            .setDescription('IC opis pojazdu — widoczny dla Policji przy sprawdzaniu tablic')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('pokaz')
        .setDescription('Pokaż aktualny IC opis pojazdu')
        .addStringOption(opt =>
          opt
            .setName('tablica')
            .setDescription('Numer rejestracyjny pojazdu')
            .setRequired(true)
            .setMaxLength(12)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('usun')
        .setDescription('Usuń IC opis swojego pojazdu')
        .addStringOption(opt =>
          opt
            .setName('tablica')
            .setDescription('Numer rejestracyjny pojazdu')
            .setRequired(true)
            .setMaxLength(12)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const sub = interaction.options.getSubcommand();
    const tablicaRaw = interaction.options.getString('tablica').toUpperCase().trim();

    const vehicle = await prisma.vehicle
      .findUnique({
        where: { tablica: tablicaRaw },
        include: { user: { select: { discordId: true } } },
      })
      .catch(() => null);

    if (!vehicle) {
      return interaction.editReply({
        content: `❌ Nie znaleziono pojazdu z tablicą **${tablicaRaw}** w rejestrze.`,
      });
    }

    // Subkomendy modyfikujące wymagają własności pojazdu
    if (sub === 'ustaw' || sub === 'usun') {
      if (vehicle.user.discordId !== interaction.user.id) {
        return interaction.editReply({
          content: '❌ Możesz edytować opis tylko swoich własnych pojazdów.',
        });
      }
    }

    // ── USTAW ─────────────────────────────────────────────────────────────────
    if (sub === 'ustaw') {
      const nowyOpis = interaction.options.getString('opis').trim();
      const poprzedniOpis = vehicle.opis;

      await prisma.vehicle.update({
        where: { tablica: tablicaRaw },
        data: { opis: nowyOpis },
      });

      logger.info(`/opis-pojazdu ustaw | ${interaction.user.tag} | ${tablicaRaw} | "${nowyOpis}"`);

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`✅ Opis pojazdu ${poprzedniOpis ? 'zaktualizowany' : 'ustawiony'}`)
        .setDescription('Opis będzie widoczny dla Policji przy sprawdzaniu tablic rejestracyjnych.')
        .addFields(
          { name: '🚗 Pojazd',   value: `${vehicle.marka} | Tablica: \`${tablicaRaw}\``, inline: false },
          { name: '📝 Nowy opis', value: nowyOpis,                                        inline: false },
        );

      if (poprzedniOpis) {
        embed.addFields({ name: '🗑️ Poprzedni opis', value: poprzedniOpis, inline: false });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Pojazdy RP' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── POKAZ ─────────────────────────────────────────────────────────────────
    if (sub === 'pokaz') {
      const embed = new EmbedBuilder()
        .setColor(COLORS.rp)
        .setTitle(`🚗 Opis IC — ${tablicaRaw}`)
        .addFields(
          { name: '🚗 Pojazd', value: `${vehicle.marka} (${vehicle.kolor})`, inline: true },
          { name: '🪪 Tablica', value: `\`${tablicaRaw}\``,                   inline: true },
        );

      if (vehicle.opis) {
        embed.addFields({ name: '📝 Opis IC', value: vehicle.opis, inline: false });
      } else {
        embed.addFields({
          name: '📝 Opis IC',
          value: '*Brak opisu — ustaw go komendą `/opis-pojazdu ustaw`.*',
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Pojazdy RP' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── USUN ──────────────────────────────────────────────────────────────────
    if (sub === 'usun') {
      if (!vehicle.opis) {
        return interaction.editReply({
          content: `❌ Pojazd **${tablicaRaw}** nie ma ustawionego opisu IC — nic do usunięcia.`,
        });
      }

      const usuniеtyOpis = vehicle.opis;

      await prisma.vehicle.update({
        where: { tablica: tablicaRaw },
        data: { opis: null },
      });

      logger.info(`/opis-pojazdu usun | ${interaction.user.tag} | ${tablicaRaw}`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Opis pojazdu usunięty')
            .addFields(
              { name: '🚗 Pojazd',      value: `${vehicle.marka} | Tablica: \`${tablicaRaw}\``, inline: false },
              { name: '📝 Usunięty opis', value: usuniеtyOpis,                                  inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Pojazdy RP' })
            .setTimestamp(),
        ],
      });
    }
  },
};
