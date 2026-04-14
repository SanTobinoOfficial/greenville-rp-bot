// Modal handler: job_modal_[jobId] — przetwarza formularz podania o pracę
// v2 — z wykrywaniem AI w odpowiedziach
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { analyzeForm } = require('../../utils/aiDetector');
const path = require('path');
const fs = require('fs');

function getJobs() {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.jobs ?? [];
}

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 godziny

module.exports = {
  async execute(interaction, client, prisma) {
    const jobId = interaction.customId.replace('job_modal_', '');
    const job = getJobs().find(j => j.id === jobId);

    if (!job) {
      return interaction.reply({ content: '❌ Nie znaleziono pracy.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // Pobierz odpowiedzi z formularza
    const answers = {};
    for (const field of (job.formularz ?? [])) {
      try {
        answers[field.id] = interaction.fields.getTextInputValue(field.id) ?? '';
      } catch {
        answers[field.id] = '';
      }
    }

    // Pobierz użytkownika
    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!user) {
      return interaction.editReply({ content: '❌ Nie znaleziono Twojego konta w bazie danych.' });
    }

    // Sprawdź cooldown ponownie (może minął czas od otwarcia menu)
    if (user.jobCooldownEnd && new Date() < user.jobCooldownEnd) {
      const remaining = Math.ceil((user.jobCooldownEnd.getTime() - Date.now()) / 60000);
      return interaction.editReply({ content: `⏳ Cooldown aktywny — poczekaj jeszcze **${remaining} min**.` });
    }

    // ── Analiza AI w formularzach służbowych (SERVICE) ─────────────────────
    if (job.typ === 'SERVICE' && Object.keys(answers).length > 0) {
      const { hasSuspiciousAI, results: aiResults } = analyzeForm(answers);
      const highAI = aiResults.filter(r => r.score >= 55);

      if (highAI.length >= 2) {
        // Log do kanału HR
        const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
        if (settings?.ticketLogsChannelId) {
          try {
            const hrChannel = await client.channels.fetch(settings.ticketLogsChannelId);
            if (hrChannel) {
              const aiEmbed = new EmbedBuilder()
                .setColor(0xFF6B35)
                .setTitle(`🤖 Podejrzane AI w podaniu: ${job.emoji} ${job.name}`)
                .setDescription(`Gracz **${interaction.user.tag}** złożył podanie — wykryto możliwe użycie AI w odpowiedziach.`)
                .addFields(
                  { name: '👤 Discord', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                  { name: '💼 Praca', value: job.name, inline: true },
                  ...highAI.map(r => ({ name: `📊 Pole ${r.fieldId} — ${r.score}%`, value: r.reasons.slice(0, 3).join('\n') || 'Wykryto wzorce AI', inline: false })),
                )
                .setTimestamp();
              await hrChannel.send({ embeds: [aiEmbed] });
            }
          } catch { /* ignoruj */ }
        }

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF6B35)
              .setTitle('⚠️ Podanie wymaga poprawki')
              .setDescription(
                `Twoje odpowiedzi zostały przeanalizowane i wyglądają na **generowane przez AI**.\n\n` +
                `Podania na służby wymagają autentycznych, szczerych odpowiedzi pisanych własnymi słowami.\n\n` +
                `**Wskazówki:**\n` +
                `• Pisz naturalnie, jak do kolegi\n` +
                `• Opisuj swoje prawdziwe doświadczenia RP\n` +
                `• Nie używaj ChatGPT/Copilot do odpowiedzi\n\n` +
                `Spróbuj ponownie za **2 godziny** pisząc własnymi słowami.`
              )
              .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
              .setTimestamp(),
          ],
        });
      }
    }

    const now = new Date();
    const cooldownEnd = new Date(now.getTime() + COOLDOWN_MS);

    // ── Prace cywilne i kryminalne — natychmiastowy zapis ────────────────────
    if (job.typ === 'PUBLIC' || job.typ === 'CRIMINAL') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentJob: job.name,
          jobCategory: job.kategoria,
          jobAssignedAt: now,
          jobCooldownEnd: cooldownEnd,
        },
      });

      await prisma.jobApplication.create({
        data: {
          userId: user.id,
          jobName: job.name,
          jobCategory: job.kategoria,
          jobType: job.typ,
          answers,
          status: 'ACCEPTED',
          appliedAt: now,
          cooldownEnd,
          reviewedAt: now,
          reviewedBy: 'AUTO',
        },
      });

      const embed = new EmbedBuilder()
        .setColor(job.typ === 'CRIMINAL' ? 0xef4444 : 0x22c55e)
        .setTitle(`✅ Praca wybrana: ${job.emoji} ${job.name}`)
        .setDescription(`Pomyślnie podjąłeś pracę **${job.name}**!\n\nPamiętaj o zapoznaniu się z mini-regulaminem tej pracy.`)
        .addFields(
          { name: '📁 Kategoria', value: job.kategoria, inline: true },
          { name: '💰 Wynagrodzenie', value: `${job.wynagrodzenie_min}–${job.wynagrodzenie_max}$/h`, inline: true },
          { name: '⏳ Cooldown', value: 'Możesz zmienić pracę za **2 godziny**', inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Prace służbowe — tworzenie podania PENDING ────────────────────────────
    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        jobName: job.name,
        jobCategory: job.kategoria,
        jobType: 'SERVICE',
        answers,
        status: 'PENDING',
        appliedAt: now,
        cooldownEnd,
      },
    });

    // Ustaw cooldown na user
    await prisma.user.update({
      where: { id: user.id },
      data: { jobCooldownEnd: cooldownEnd },
    });

    // Wyślij powiadomienie na kanał HR (jeśli skonfigurowany)
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const hrChannelId = settings?.ticketLogsChannelId; // używamy ticketLogs jako fallback

    if (hrChannelId) {
      try {
        const hrChannel = await client.channels.fetch(hrChannelId);
        if (hrChannel) {
          const hrEmbed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle(`📋 Nowe podanie o pracę: ${job.emoji} ${job.name}`)
            .setDescription(`Gracz **${interaction.user.tag}** złożył podanie na stanowisko **${job.name}**.`)
            .addFields(
              { name: '👤 Discord', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
              { name: '🎮 Roblox', value: user.robloxUsername ?? 'Brak', inline: true },
              { name: '📁 Kategoria', value: job.kategoria, inline: true },
              ...Object.entries(answers).slice(0, 5).map(([key, val], i) => ({
                name: `📝 Odpowiedź ${i + 1}`,
                value: String(val).slice(0, 1024) || 'Brak',
                inline: false,
              })),
            )
            .setFooter({ text: `ID Podania: ${application.id}` })
            .setTimestamp();

          await hrChannel.send({ embeds: [hrEmbed] });
        }
      } catch { /* kanał może nie istnieć */ }
    }

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`📋 Podanie wysłane: ${job.emoji} ${job.name}`)
      .setDescription(
        `Twoje podanie na stanowisko **${job.name}** zostało złożone i oczekuje na rozpatrzenie przez Staff.\n\n` +
        `Zostaniesz powiadomiony o decyzji. Proces może potrwać do 24-48 godzin.`
      )
      .addFields(
        { name: '⏳ Cooldown', value: 'Możesz zmienić pracę lub złożyć podanie za **2 godziny**', inline: false },
        { name: '🔍 ID Podania', value: `\`${application.id}\``, inline: false },
      )
      .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
