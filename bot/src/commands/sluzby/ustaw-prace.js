// Komenda /ustaw-prace — Staff może ręcznie ustawić pracę gracza
// Dostępna dla: Helper+ (Staff)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');
const path = require('path');
const fs = require('fs');

function getJobs() {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.jobs ?? [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ustaw-prace')
    .setDescription('[STAFF] Ręcznie ustaw pracę dla gracza (pomija cooldown)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz, któremu chcesz ustawić pracę')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('praca_id')
        .setDescription('ID pracy (np. burger_knight_cashier) lub "brak" aby wyczyścić')
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('zachowaj_cooldown')
        .setDescription('Czy zachować aktualny cooldown gracza? (domyślnie: NIE — resetuje cooldown)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isStaff(interaction.member)) {
      return interaction.editReply({ content: '❌ Ta komenda jest dostępna tylko dla Staffu (Helper+).' });
    }

    const targetUser = interaction.options.getUser('gracz');
    const pracaId = interaction.options.getString('praca_id').toLowerCase().trim();
    const zachowajCooldown = interaction.options.getBoolean('zachowaj_cooldown') ?? false;

    const user = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!user) {
      return interaction.editReply({ content: `❌ Gracz ${targetUser.tag} nie jest zarejestrowany w systemie.` });
    }

    // Wyczyszczenie pracy
    if (pracaId === 'brak' || pracaId === 'none' || pracaId === 'unemployed') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentJob: null,
          jobCategory: null,
          jobAssignedAt: null,
          ...(!zachowajCooldown ? { jobCooldownEnd: null } : {}),
        },
      });

      // Log w bazie
      try {
        await prisma.auditLog.create({
          data: {
            action: 'JOB_CLEARED',
            targetId: user.id,
            staffId: interaction.user.id,
            details: `Praca wyczyszczona przez ${interaction.user.tag}`,
          },
        });
      } catch { /* auditLog może nie istnieć */ }

      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('🗑️ Praca wyczyszczona')
        .setDescription(`Praca gracza **${targetUser.tag}** została wyczyszczona.`)
        .addFields(
          { name: '👤 Gracz', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
          { name: '🛡️ Staff', value: interaction.user.tag, inline: true },
          { name: '⏳ Cooldown', value: zachowajCooldown ? 'Zachowany' : 'Zresetowany', inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // Znajdź pracę
    const jobs = getJobs();
    const job = jobs.find(j => j.id === pracaId || j.id === pracaId.replace(/-/g, '_') || j.name.toLowerCase() === pracaId);

    if (!job) {
      // Pokaż podobne
      const similar = jobs.filter(j => j.id.includes(pracaId.slice(0, 5)) || j.name.toLowerCase().includes(pracaId.slice(0, 5))).slice(0, 5);
      const hint = similar.length > 0
        ? `\n\n**Podobne IDs:**\n${similar.map(j => `\`${j.id}\` — ${j.name}`).join('\n')}`
        : '\n\nSprawdź listę dostępnych prac używając `/lista-prac`.';

      return interaction.editReply({
        content: `❌ Nie znaleziono pracy o ID \`${pracaId}\`.${hint}`,
      });
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentJob: job.name,
        jobCategory: job.kategoria,
        jobAssignedAt: now,
        ...(!zachowajCooldown ? { jobCooldownEnd: new Date(now.getTime() + 2 * 60 * 60 * 1000) } : {}),
      },
    });

    // Zapisz w JobApplication jako ręcznie przydzielone
    try {
      await prisma.jobApplication.create({
        data: {
          userId: user.id,
          jobName: job.name,
          jobCategory: job.kategoria,
          jobType: job.typ,
          answers: {},
          status: 'ACCEPTED',
          appliedAt: now,
          cooldownEnd: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          reviewedAt: now,
          reviewedBy: `STAFF:${interaction.user.tag}`,
        },
      });
    } catch { /* ignoruj jeśli model nie ma tego pola */ }

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`✅ Praca ustawiona: ${job.emoji} ${job.name}`)
      .setDescription(`Graczowi **${targetUser.tag}** ręcznie przypisano pracę.`)
      .addFields(
        { name: '👤 Gracz', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
        { name: '🛡️ Staff', value: interaction.user.tag, inline: true },
        { name: `${job.emoji} Praca`, value: job.name, inline: true },
        { name: '📁 Kategoria', value: job.kategoria, inline: true },
        { name: '💰 Wynagrodzenie', value: `${job.wynagrodzenie_min}–${job.wynagrodzenie_max}$/h`, inline: true },
        { name: '⏳ Cooldown', value: zachowajCooldown ? 'Zachowany (stary)' : 'Ustawiony na 2h', inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
