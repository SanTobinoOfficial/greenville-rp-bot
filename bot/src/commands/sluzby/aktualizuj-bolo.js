// Komenda /aktualizuj-bolo — uzupełnienie aktywnego BOLO o nowe informacje
// Używana gdy pojawią się nowe dane o poszukiwanym (pojazd, lokalizacja, opis)
// Dostępna dla: Policja, EMS, Straż Pożarna, DOT, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aktualizuj-bolo')
    .setDescription('Uzupełnij aktywne BOLO o nowe informacje — pojazd, lokalizacja, opis')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('ID BOLO (6 ostatnich znaków, np. A1B2C3) lub imię i nazwisko poszukiwanego')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('aktualizacja')
        .setDescription('Nowe informacje do dodania (np. "Widziany przy porcie, zmienił pojazd na zielone Mustang")')
        .setRequired(true)
        .setMaxLength(300)
    )
    .addStringOption(opt =>
      opt.setName('roblox')
        .setDescription('Zaktualizowany nick Roblox poszukiwanego (opcjonalnie)')
        .setMaxLength(50)
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('niebezpieczny')
        .setDescription('Zaktualizuj oznaczenie: czy osoba jest uzbrojona / niebezpieczna?')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    // ── Uprawnienia ───────────────────────────────────────────────
    const member = interaction.member;
    const isPolicja  = member.roles.cache.some(r => r.name === ROLES.POLICJA || r.name === 'Policja On-Duty');
    const isEMS      = member.roles.cache.some(r => r.name === ROLES.EMS);
    const isStrazPoz = member.roles.cache.some(r => r.name === ROLES.STRAZ_POZARNA);
    const isDOT      = member.roles.cache.some(r => r.name === ROLES.DOT);
    const isSM       = member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

    if (!isPolicja && !isEMS && !isStrazPoz && !isDOT && !isSM && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ BOLO mogą aktualizować tylko służby mundurowe lub Staff.',
      });
    }

    const query       = interaction.options.getString('id').trim();
    const aktualizacja = interaction.options.getString('aktualizacja').trim();
    const nowyRoblox  = interaction.options.getString('roblox') ?? null;
    const niebezp     = interaction.options.getBoolean('niebezpieczny');

    // ── Szukaj aktywnego BOLO ─────────────────────────────────────
    let bolo = null;
    const looksLikeId = /^[A-Za-z0-9]{4,8}$/.test(query);

    if (looksLikeId) {
      const aktywne = await prisma.cadWarrant.findMany({
        where:   { active: true },
        orderBy: { createdAt: 'desc' },
      });
      const upperQuery = query.toUpperCase();
      bolo = aktywne.find(w => w.id.slice(-6).toUpperCase() === upperQuery) ?? null;
    }

    if (!bolo) {
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
          content: `❌ Nie znaleziono aktywnego BOLO dla: **${query}**\nUżyj \`/lista-bolo\` aby zobaczyć aktywne BOLO.`,
        });
      }

      if (byName.length > 1) {
        const listLines = byName.map(w => {
          const ts = `<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:d>`;
          return `• \`${w.id.slice(-6).toUpperCase()}\` — **${w.targetName}**${w.robloxName ? ` *(${w.robloxName})*` : ''} — ${ts}`;
        }).join('\n');

        return interaction.editReply({
          content: `⚠️ Znaleziono **${byName.length}** aktywnych BOLO pasujących do: **${query}**\nPodaj dokładne ID BOLO:\n\n${listLines}`,
        });
      }

      bolo = byName[0];
    }

    // ── Zbuduj nową treść powodu (dołącz aktualizację) ────────────
    const nowTs    = Math.floor(Date.now() / 1000);
    const separator = `\n\n📢 **Aktualizacja** <t:${nowTs}:T> — ${interaction.user.tag}:\n`;
    const nowyReason = (bolo.reason + separator + aktualizacja).slice(0, 2000);

    // Zaktualizuj dane: danger banner w treści jeśli zmieniono, nowy roblox nick
    const dangerLine = niebezp === true
      ? '\n🔴 **UWAGA: OZNACZONO JAKO UZBROJONY/A I NIEBEZPIECZNA!**'
      : niebezp === false
        ? '\n✅ Oznaczenie niebezpieczny/a — ZDJĘTE.'
        : '';

    const finalReason = dangerLine
      ? (nowyReason + dangerLine).slice(0, 2000)
      : nowyReason;

    const updateData = { reason: finalReason };
    if (nowyRoblox !== null) updateData.robloxName = nowyRoblox;

    await prisma.cadWarrant.update({
      where: { id: bolo.id },
      data:  updateData,
    });

    logger.info(`BOLO zaktualizowane: ${bolo.id.slice(-6).toUpperCase()} (${bolo.targetName}) przez ${interaction.user.tag}`);

    // ── Embed potwierdzenia ───────────────────────────────────────
    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`🔄 BOLO #${bolo.id.slice(-6).toUpperCase()} — Zaktualizowane`)
      .setDescription('Informacje o BOLO zostały uzupełnione. Wszystkie służby powinny zanotować zmiany.')
      .addFields(
        { name: '👤 Poszukiwany/a',    value: bolo.targetName,                                    inline: true },
        { name: '🎮 Roblox Nick',      value: nowyRoblox ?? bolo.robloxName ?? '*Nieznany*',      inline: true },
        { name: '📢 Nowe informacje',  value: aktualizacja,                                       inline: false },
        { name: '👮 Zaktualizował/a',  value: `<@${interaction.user.id}>`,                        inline: true },
        { name: '🕐 Czas',            value: `<t:${nowTs}:T>`,                                    inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — System CAD / BOLO' })
      .setTimestamp();

    await interaction.editReply({ embeds: [confirmEmbed] });

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
        .setColor(COLORS.warning)
        .setTitle(`🔄 AKTUALIZACJA BOLO — #${bolo.id.slice(-6).toUpperCase()}`)
        .setDescription(`Pojawiły się nowe informacje o poszukiwanym: **${bolo.targetName}**`)
        .addFields(
          { name: '📢 Aktualizacja',    value: aktualizacja,                      inline: false },
          { name: '👮 Zaktualizował/a', value: `<@${interaction.user.id}>`,       inline: true  },
          { name: '🕐 Czas',           value: `<t:${nowTs}:T>`,                   inline: true  },
        )
        .setFooter({ text: 'AURORA Greenville RP — System CAD / BOLO' })
        .setTimestamp();

      if (nowyRoblox) {
        notifEmbed.addFields({ name: '🎮 Nick Roblox (nowy)', value: nowyRoblox, inline: true });
      }
      if (dangerLine) {
        notifEmbed.addFields({ name: '⚠️ Zmiana oznaczenia', value: dangerLine.trim(), inline: false });
      }

      await boloChannel.send({ embeds: [notifEmbed] }).catch(() => {});
    }
  },
};
