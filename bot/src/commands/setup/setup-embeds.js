// Komenda /setup-embeds — re-wysyła wszystkie embedy na kanały serwera
// Dostępna dla administratorów (bez pełnego setup)

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const logger = require('../../utils/logger');

// Pomocnik: znajdź kanał po fragmencie nazwy
function ch(guild, fragment) {
  return guild.channels.cache.find(
    c => c.isTextBased() && c.name.toLowerCase().includes(fragment.toLowerCase())
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-embeds')
    .setDescription('Re-wysyła wszystkie embedy na kanały serwera (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📨 Wysyłanie embedów...')
          .setDescription('Trwa aktualizacja embedów na wszystkich kanałach.'),
      ],
      ephemeral: true,
    });

    const guild = interaction.guild;
    const sent = [];
    const failed = [];

    // ── 1. #zacznij-tutaj — weryfikacja ─────────────────────────
    const verifyChannel = ch(guild, 'zacznij-tutaj');
    if (verifyChannel) {
      try {
        const embed = new EmbedBuilder()
          .setColor(0x30d158)
          .setTitle('✅ Witaj w AURORA Greenville RP!')
          .setDescription(
            '**AURORA Greenville RP** to polski serwer Roleplay na Roblox.\n' +
            'Aby uzyskać dostęp do serwera, wypełnij formularz weryfikacyjny.\n\n' +
            '**Jak przebiega weryfikacja?**\n' +
            '> 📋 Wejdź na formularz pod linkiem poniżej\n' +
            '> 🔗 Podaj swój **Discord ID** oraz **nick Roblox**\n' +
            '> ❓ Odpowiedz na **10 pytań** z regulaminu\n' +
            '> ✅ Uzyskaj minimum **8/10 punktów**\n' +
            '> 🏠 Rola **Mieszkaniec** nadana automatycznie!\n\n' +
            '**Jak znaleźć Discord ID?**\n' +
            '> Ustawienia → Zaawansowane → **Tryb dewelopera**\n' +
            '> Kliknij prawym na swój nick → **Kopiuj ID użytkownika**\n\n' +
            '**Przed weryfikacją:**\n' +
            '• Przeczytaj regulamin na <#regulamin>\n' +
            '• Zapoznaj się z pojęciami RP (FRP, NLR, metagaming)\n\n' +
            '*Kliknij przycisk poniżej, aby otworzyć formularz!*'
          )
          .setFooter({ text: 'AURORA Greenville RP — System weryfikacji' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setURL('https://greenville-rp-bot.vercel.app/weryfikacja')
            .setLabel('📋 Wypełnij formularz weryfikacyjny')
            .setStyle(ButtonStyle.Link)
        );

        await verifyChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ ${verifyChannel.name}`);
      } catch (e) {
        failed.push(`❌ zacznij-tutaj: ${e.message}`);
      }
    }

    // ── 2. #regulamin ────────────────────────────────────────────
    const regulaminChannel = ch(guild, 'regulamin');
    if (regulaminChannel) {
      try {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('📜 Regulamin AURORA Greenville RP')
          .setDescription(
            '**§1 — Zasady ogólne**\n' +
            '> • Szanuj innych graczy i staff\n' +
            '> • Obowiązuje język polski\n' +
            '> • Zakaz reklamy innych serwerów\n' +
            '> • Zakaz spamu i floodowania\n\n' +
            '**§2 — Zasady Roleplay**\n' +
            '> • **FRP** (Fail RP) — zachowania niezgodne z realizmem są zabronione\n' +
            '> • **NLR** (New Life Rule) — po śmierci zapominasz wszystko z poprzedniego życia\n' +
            '> • **Metagaming** — używanie informacji z zewnątrz (Discord, stream) jest zabronione\n' +
            '> • **RDM** (Random Death Match) — zabijanie bez powodu RP jest zabronione\n' +
            '> • **VDM** (Vehicle Death Match) — potrącanie samochodem bez powodu jest zabronione\n\n' +
            '**§3 — Służby**\n' +
            '> • Wykonuj polecenia przełożonych\n' +
            '> • Nie nadużywaj uprawnień służbowych\n' +
            '> • Zgłoś nieobecność z wyprzedzeniem\n\n' +
            '**§4 — Sankcje**\n' +
            '> • Warn → Kick → Ban (czas do decyzji staffu)\n' +
            '> • Poważne naruszenia skutkują natychmiastowym banem\n\n' +
            '*Nieznajomość regulaminu nie zwalnia z odpowiedzialności.*'
          )
          .setFooter({ text: 'AURORA Greenville RP — Regulamin' })
          .setTimestamp();

        await regulaminChannel.send({ embeds: [embed] });
        sent.push(`✅ ${regulaminChannel.name}`);
      } catch (e) {
        failed.push(`❌ regulamin: ${e.message}`);
      }
    }

    // ── 3. #otwórz-ticket ────────────────────────────────────────
    const ticketChannel = ch(guild, 'ticket');
    if (ticketChannel) {
      try {
        const embed = new EmbedBuilder()
          .setColor(0x00c8ff)
          .setTitle('🎫 System ticketów')
          .setDescription(
            'Potrzebujesz pomocy staffu? Masz pytanie, skargę lub problem?\n\n' +
            '**Kiedy otworzyć ticket:**\n' +
            '> • Problem z weryfikacją lub kontem\n' +
            '> • Skarga na gracza lub staff\n' +
            '> • Błąd bota lub systemu\n' +
            '> • Pytanie do administracji\n\n' +
            '**Jak to działa:**\n' +
            '> 1️⃣ Kliknij przycisk poniżej\n' +
            '> 2️⃣ Wybierz kategorię ticketu\n' +
            '> 3️⃣ Opisz swój problem\n' +
            '> 4️⃣ Poczekaj na odpowiedź staffu'
          )
          .setFooter({ text: 'AURORA Greenville RP — Support' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_create')
            .setLabel('🎫 Otwórz ticket')
            .setStyle(ButtonStyle.Primary)
        );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ ${ticketChannel.name}`);
      } catch (e) {
        failed.push(`❌ ticket: ${e.message}`);
      }
    }

    // ── Wynik ────────────────────────────────────────────────────
    const lines = [];
    if (sent.length > 0) lines.push('**Wysłano:**\n' + sent.join('\n'));
    if (failed.length > 0) lines.push('**Błędy:**\n' + failed.join('\n'));
    if (sent.length === 0 && failed.length === 0) {
      lines.push('⚠️ Nie znaleziono żadnych kanałów. Upewnij się że kanały mają właściwe nazwy.');
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(failed.length === 0 ? 0x57F287 : 0xFEE75C)
          .setTitle(failed.length === 0 ? '✅ Embedy wysłane!' : '⚠️ Wysłano z błędami')
          .setDescription(lines.join('\n\n'))
          .setTimestamp(),
      ],
    });

    logger.info(`/setup-embeds użyte przez ${interaction.user.tag} — ${sent.length} kanałów`);
  },
};
