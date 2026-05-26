// Komenda /anuluj-bolo — zamknięcie aktywnego BOLO
// Używana gdy poszukiwana osoba/pojazd zostanie znaleziona lub sprawa zostanie rozwiązana
// Dostępna dla: Policja, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anuluj-bolo')
    .setDescription('Zamknij aktywne BOLO — osoba/pojazd znaleziony lub sprawa rozwiązana')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('ID BOLO (6 ostatnich znaków, np. A1B2C3) lub imię i nazwisko poszukiwanego')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('notatka')
        .setDescription('Notatka zamknięcia (np. "Osoba zatrzymana przez patrol P-3")')
        .setRequired(false)
        .setMaxLength(200)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    // ── Uprawnienia ───────────────────────────────────────────────
    const member = interaction.member;
    const isPolicja = member.roles.cache.some(r =>
      r.name === ROLES.POLICJA || r.name === 'Policja On-Duty'
    );
    const isSM = member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

    if (!isPolicja && !isSM && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Tylko Policja, Straż Miejska lub Staff może zamykać BOLO.',
      });
    }

    const query  = interaction.options.getString('id').trim();
    const notatka = interaction.options.getString('notatka') ?? null;

    // ── Szukaj BOLO ───────────────────────────────────────────────
    // 1) Próbuj dopasować po 6-znakowym ID (ostatnie znaki cuid)
    // 2) Fallback: szukaj po nazwisku (insensitive)
    let bolo = null;
    let matchMode = 'id';

    // Sprawdź, czy query wygląda jak krótki ID (alfanumeryczny, 4-8 znaków)
    const looksLikeId = /^[A-Za-z0-9]{4,8}$/.test(query);

    if (looksLikeId) {
      // Pobierz wszystkie aktywne BOLO i znajdź pasujące po końcówce ID
      const activeBOLOs = await prisma.cadWarrant.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });

      const upperQuery = query.toUpperCase();
      bolo = activeBOLOs.find(w => w.id.slice(-6).toUpperCase() === upperQuery) ?? null;
    }

    // Jeśli nie znaleziono po ID, szukaj po nazwisku
    if (!bolo) {
      matchMode = 'name';
      const byName = await prisma.cadWarrant.findMany({
        where: {
          active: true,
          OR: [
            { targetName: { contains: query, mode: 'insensitive' } },
            { robloxName: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (byName.length === 0) {
        return interaction.editReply({
          content: `❌ Nie znaleziono aktywnego BOLO dla: **${query}**\nSprawdź ID lub nazwisko i spróbuj ponownie. Użyj \`/lista-bolo\` aby zobaczyć aktywne BOLO.`,
        });
      }

      if (byName.length > 1) {
        // Zwróć listę - niech oficer poda dokładne ID
        const listLines = byName.map(w => {
          const ts = `<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:d>`;
          return `• \`${w.id.slice(-6).toUpperCase()}\` — **${w.targetName}**${w.robloxName ? ` *(${w.robloxName})*` : ''} — ${ts}`;
        }).join('\n');

        return interaction.editReply({
          content: `⚠️ Znaleziono **${byName.length}** aktywnych BOLO pasujących do: **${query}**\nPodaj dokładne ID BOLO, aby je zamknąć:\n\n${listLines}`,
        });
      }

      bolo = byName[0];
    }

    if (!bolo) {
      return interaction.editReply({
        content: `❌ Nie znaleziono aktywnego BOLO dla: **${query}**`,
      });
    }

    // ── Zamknij BOLO ──────────────────────────────────────────────
    await prisma.cadWarrant.update({
      where: { id: bolo.id },
      data:  { active: false },
    });

    logger.info(`BOLO zamknięte: ${bolo.id.slice(-6).toUpperCase()} (${bolo.targetName}) przez ${interaction.user.tag}${notatka ? ` — ${notatka}` : ''}`);

    // ── Embed potwierdzenia ───────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`✅ BOLO #${bolo.id.slice(-6).toUpperCase()} — Zamknięte`)
      .setDescription('BOLO zostało pomyślnie zamknięte. Służby mogą zakończyć poszukiwania.')
      .addFields(
        { name: '👤 Poszukiwany/a',  value: bolo.targetName,                            inline: true },
        { name: '🎮 Roblox Nick',    value: bolo.robloxName ?? '*Nieznany*',             inline: true },
        { name: '📋 Powód BOLO',     value: bolo.reason.length > 120
            ? bolo.reason.slice(0, 117) + '…'
            : bolo.reason,                                                               inline: false },
        { name: '👮 Wystawione przez', value: bolo.issuedByName || bolo.issuedBy,       inline: true },
        { name: '🔒 Zamknięte przez', value: `<@${interaction.user.id}>`,               inline: true },
        { name: '🕐 Zamknięto',       value: `<t:${Math.floor(Date.now() / 1000)}:T>`,  inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — System CAD / BOLO' })
      .setTimestamp();

    if (notatka) {
      embed.addFields({ name: '📝 Notatka zamknięcia', value: notatka, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });

    // ── Powiadom kanał policji ────────────────────────────────────
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
    const boloChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && (
        norm(c.name).includes('lista-poszukiwanych') ||
        norm(c.name).includes('policja-czat')
      )
    );

    if (boloChannel && boloChannel.id !== interaction.channelId) {
      const notifEmbed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`✅ BOLO ZAMKNIĘTE — #${bolo.id.slice(-6).toUpperCase()}`)
        .setDescription(`Poszukiwania zostały zakończone dla: **${bolo.targetName}**`)
        .addFields(
          { name: '🔒 Zamknął/a', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🕐 Czas',      value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — System CAD / BOLO' })
        .setTimestamp();

      if (notatka) {
        notifEmbed.addFields({ name: '📝 Notatka', value: notatka, inline: false });
      }

      await boloChannel.send({ embeds: [notifEmbed] }).catch(() => {});
    }
  },
};
