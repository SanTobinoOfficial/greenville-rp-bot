// Modal weryfikacji — krok 1: powiązanie konta Roblox + analiza formularza
// Rozbudowany formularz z wykrywaniem AI i walidacją odpowiedzi

const { EmbedBuilder } = require('discord.js');
const { getUserByUsername, isInGroup } = require('../../utils/robloxApi');
const { generateUniquePhone } = require('../../utils/tableRejestracyjna');
const { startQuiz } = require('../../utils/quizEngine');
const { analyzeForm } = require('../../utils/aiDetector');
const logger = require('../../utils/logger');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const robloxNick     = interaction.fields.getTextInputValue('roblox_nick').trim();
    const wiek           = interaction.fields.getTextInputValue('wiek').trim();
    const skadZnasz      = interaction.fields.getTextInputValue('skad_znasz').trim();
    const doswiadczenie  = interaction.fields.getTextInputValue('doswiadczenie').trim();
    const dlaczego       = interaction.fields.getTextInputValue('dlaczego').trim();

    try {
      // ── 1. Walidacja wieku ─────────────────────────────────────────────────
      const parsedAge = parseInt(wiek);
      if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 99) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('❌ Nieprawidłowy wiek')
              .setDescription(
                `Wpisałeś: **"${wiek}"** — wiek musi być liczbą od 10 do 99.\n` +
                'Podaj swój rzeczywisty wiek gracza (nie postaci RP).'
              ),
          ],
        });
      }

      // ── 2. Sprawdź nick na Roblox ──────────────────────────────────────────
      const robloxUser = await getUserByUsername(robloxNick);
      if (!robloxUser) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('❌ Nick nie znaleziony')
              .setDescription(
                `Nick **${robloxNick}** nie istnieje na Roblox.\n\n` +
                '• Upewnij się, że wpisałeś dokładną nazwę użytkownika\n' +
                '• Wielkość liter ma znaczenie\n' +
                '• Konto musi być aktywne (nie zbanowane)'
              ),
          ],
        });
      }

      // ── 3. Czy nick nie jest już zajęty ────────────────────────────────────
      const existingUser = await prisma.user.findUnique({
        where: { robloxId: String(robloxUser.id) },
      });
      if (existingUser && existingUser.discordId !== interaction.user.id) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('❌ Nick już zarejestrowany')
              .setDescription(
                `Nick **${robloxNick}** jest już powiązany z innym kontem Discord.\n` +
                'Jeśli uważasz, że to błąd, otwórz ticket ze staffem.'
              ),
          ],
        });
      }

      // ── 4. Analiza AI detection ────────────────────────────────────────────
      const { hasSuspiciousAI, results: aiResults } = analyzeForm({
        skad_znasz:     skadZnasz,
        doswiadczenie:  doswiadczenie,
        dlaczego:       dlaczego,
      });

      const highAI = aiResults.filter(r => r.score >= 60);
      const mediumAI = aiResults.filter(r => r.score >= 40 && r.score < 60);

      // Jeśli wysoki wynik AI — odrzuć automatycznie
      if (highAI.length >= 2) {
        // Log do kanału Staff
        const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
        const logCh = interaction.guild.channels.cache.find(
          c => (c.name.includes('logi-weryfikacji') || c.name.includes('logi-admin')) && c.isTextBased()
        );
        if (logCh) {
          const aiEmbed = new EmbedBuilder()
            .setColor(0xFF6B35)
            .setTitle('🤖 Wykryto potencjalne AI w formularzu weryfikacyjnym')
            .addFields(
              { name: 'Discord', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
              { name: 'Roblox Nick', value: robloxNick, inline: true },
              { name: 'Wiek', value: String(parsedAge), inline: true },
              ...highAI.map(r => ({
                name: `📊 Pole "${r.fieldId}" — ${r.score}% AI`,
                value: r.reasons.join('\n') || 'Brak szczegółów',
                inline: false,
              })),
            )
            .setDescription(
              '**Staff powinien ręcznie sprawdzić tę weryfikację.**\n' +
              'Gracz może ponownie wypełnić formularz własnymi słowami.'
            )
            .setFooter({ text: 'AURORA Greenville RP — AI Detection System' })
            .setTimestamp();
          await logCh.send({ embeds: [aiEmbed] });
        }

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF6B35)
              .setTitle('⚠️ Formularz wymaga poprawki')
              .setDescription(
                `Twoje odpowiedzi zostały automatycznie przeanalizowane i wydają się **generowane przez AI** (ChatGPT/Copilot/Gemini).\n\n` +
                `**Prosimy o wypełnienie formularza własnymi, autentycznymi słowami.**\n\n` +
                `Nie musisz pisać perfekcyjnie — zależy nam na tym, żeby odpowiedzi były Twoje, naturalne, szczere.\n\n` +
                `💡 **Wskazówki:**\n` +
                `• Pisz tak jak piszesz do kolegi na czacie\n` +
                `• Możesz popełniać błędy ortograficzne\n` +
                `• Opisuj swoje prawdziwe doświadczenia\n` +
                `• Unikaj długich, "podręcznikowych" odpowiedzi\n\n` +
                `Staff może skontaktować się z Tobą przez ticket aby wyjaśnić sytuację.`
              )
              .setFooter({ text: 'AURORA Greenville RP — Weryfikacja' })
              .setTimestamp(),
          ],
        });
      }

      // Jeśli średni wynik AI — ostrzeżenie ale kontynuuj
      let aiWarning = false;
      if (mediumAI.length >= 1 || (hasSuspiciousAI && highAI.length === 0)) {
        aiWarning = true;
      }

      // ── 5. Opcjonalne: sprawdź grupę Roblox ───────────────────────────────
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      if (settings?.robloxGroupId) {
        const inGroup = await isInGroup(robloxUser.id, settings.robloxGroupId);
        if (!inGroup) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Brak w grupie Roblox')
                .setDescription(
                  `Twoje konto **${robloxNick}** nie należy do grupy AURORA Greenville RP.\n` +
                  'Dołącz do grupy i spróbuj ponownie.'
                ),
            ],
          });
        }
      }

      // ── 6. Generuj numer telefonu i zapisz do bazy ─────────────────────────
      const phoneNumber = await generateUniquePhone(prisma);
      const dbUser = await prisma.user.upsert({
        where: { discordId: interaction.user.id },
        create: {
          discordId:      interaction.user.id,
          discordUsername: interaction.user.tag,
          robloxId:        String(robloxUser.id),
          robloxUsername:  robloxUser.name,
          phoneNumber,
        },
        update: {
          robloxId:        String(robloxUser.id),
          robloxUsername:  robloxUser.name,
          discordUsername: interaction.user.tag,
          phoneNumber,
        },
      });

      // ── 7. Nadaj rolę Niezweryfikowany ────────────────────────────────────
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const niezwerRole = interaction.guild.roles.cache.find(r => r.name === 'Niezweryfikowany');
      if (niezwerRole && !member.roles.cache.has(niezwerRole.id)) {
        await member.roles.add(niezwerRole).catch(() => {});
      }

      // ── 8. Log na #logi-weryfikacji ───────────────────────────────────────
      const logCh = interaction.guild.channels.cache.find(
        c => c.name.includes('logi-weryfikacji') && c.isTextBased()
      );
      if (logCh) {
        const logEmbed = new EmbedBuilder()
          .setColor(aiWarning ? 0xFEE75C : 0x57F287)
          .setTitle(`🪪 ${aiWarning ? '⚠️ ' : ''}Nick Roblox powiązany`)
          .addFields(
            { name: 'Discord', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
            { name: 'Roblox', value: robloxUser.name, inline: true },
            { name: 'ID Roblox', value: String(robloxUser.id), inline: true },
            { name: 'Telefon RP', value: phoneNumber, inline: true },
            { name: 'Wiek', value: String(parsedAge), inline: true },
            { name: 'Skąd zna serwer', value: skadZnasz.slice(0, 200), inline: false },
            { name: 'Doświadczenie RP', value: doswiadczenie.slice(0, 300), inline: false },
            { name: 'Dlaczego AURORA', value: dlaczego.slice(0, 300), inline: false },
            ...(aiWarning ? [{ name: '🤖 AI Detection', value: `Podejrzane (score: ${Math.max(...aiResults.map(r => r.score))}%)`, inline: true }] : []),
          )
          .setTimestamp();
        await logCh.send({ embeds: [logEmbed] });
      }

      logger.info(`Roblox powiązany: ${interaction.user.tag} → ${robloxUser.name}`);

      // ── 9. Potwierdź i uruchom quiz ───────────────────────────────────────
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Konto Roblox powiązane!')
            .setDescription(
              `Pomyślnie powiązałeś konto Discord z Roblox!\n\n` +
              `👤 **Nick Roblox:** ${robloxUser.name}\n` +
              `📱 **Numer telefonu RP:** \`${phoneNumber}\`\n` +
              `🎂 **Wiek:** ${parsedAge} lat\n\n` +
              `⏳ **Za chwilę zaczyna się quiz weryfikacyjny...**\n` +
              `📋 10 pytań • musisz uzyskać min. **8/10** punktów\n\n` +
              `${aiWarning ? '⚠️ *Staff może poprosić Cię o dodatkowe potwierdzenie odpowiedzi w formularzu.*\n\n' : ''}` +
              `Przeczytaj regulamin przed quizem — znajdziesz go na kanale regulaminowym.`
            )
            .setFooter({ text: 'AURORA Greenville RP — Weryfikacja' })
            .setTimestamp(),
        ],
      });

      // Odczekaj chwilę i uruchom quiz
      await new Promise(r => setTimeout(r, 1500));
      await startQuiz(interaction, client, prisma, dbUser);

    } catch (error) {
      logger.error('Błąd modala weryfikacji:', error);
      const reply = {
        content: '❌ Wystąpił błąd podczas weryfikacji. Spróbuj ponownie za chwilę.',
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply({ ...reply, ephemeral: true }).catch(() => {});
      }
    }
  },
};
