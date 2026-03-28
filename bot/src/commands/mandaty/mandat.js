// Komenda /mandat — wystawianie mandatów, grzywien i aresztów przez służby
// Dostępna dla: Policja, Straż Miejska
// Automatycznie zawiesza prawo jazdy po przekroczeniu limitu

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ROLES, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mandat')
    .setDescription('Wystaw mandat, grzywnę lub areszt graczowi')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz któremu wystawiasz mandat')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('typ')
        .setDescription('Typ wykroczenia')
        .setRequired(true)
        .addChoices(
          { name: 'Mandat', value: 'mandat' },
          { name: 'Grzywna', value: 'grzywna' },
          { name: 'Areszt', value: 'areszt' }
        )
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód wystawienia mandatu')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('kwota')
        .setDescription('Kwota mandatu/grzywny (opcjonalnie dla aresztu)')
        .setMinValue(1)
        .setMaxValue(50000)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Sprawdzenie czy użytkownik ma rolę służb uprawnionych do wystawiania mandatów
    const hasPolice = member.roles.cache.some(r => r.name === ROLES.POLICJA);
    const hasStrazMiejska = member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

    if (!hasPolice && !hasStrazMiejska) {
      return interaction.editReply(
        noPermissionReply('Policja lub Straż Miejska')
      );
    }

    const targetUser = interaction.options.getUser('gracz');
    const typ = interaction.options.getString('typ');
    const powod = interaction.options.getString('powod');
    const kwota = interaction.options.getInteger('kwota');

    // Sprawdzenie czy gracz istnieje w bazie
    const targetDbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!targetDbUser) {
      return interaction.editReply({
        content: `❌ Gracz ${targetUser} nie jest zarejestrowany w systemie RP.`,
      });
    }

    // Sprawdzenie czy wystawiający istnieje w bazie
    const issuerDbUser = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!issuerDbUser) {
      return interaction.editReply({
        content: '❌ Twoje konto nie jest zarejestrowane w systemie RP.',
      });
    }

    // Pobranie ustawień (limity mandatów)
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const maxMandaty = settings?.maxMandaty || 10;
    const maxGrzywny = settings?.maxGrzywny || 5;
    const maxAreszty = settings?.maxAreszty || 5;
    const suspensionDays = settings?.licenseSuspensionDays || 30;

    // Stworzenie mandatu w bazie danych
    const fine = await prisma.fine.create({
      data: {
        targetId: targetDbUser.id,
        issuerId: issuerDbUser.id,
        type: typ.toUpperCase(),
        amount: kwota ?? null,
        reason: powod,
      },
    });

    // Zliczenie aktywnych mandatów danego typu dla gracza
    const activeFines = await prisma.fine.findMany({
      where: {
        targetId: targetDbUser.id,
        active: true,
      },
    });

    const countMandaty = activeFines.filter(f => f.type === 'MANDAT').length;
    const countGrzywny = activeFines.filter(f => f.type === 'GRZYWNA').length;
    const countAreszty = activeFines.filter(f => f.type === 'ARESZT').length;

    // Sprawdzenie czy należy zawiesić prawo jazdy
    let licencjaZawieszona = false;
    let powodZawieszenia = '';

    if (typ === 'mandat' && countMandaty >= maxMandaty) {
      licencjaZawieszona = true;
      powodZawieszenia = `Przekroczono limit mandatów (${countMandaty}/${maxMandaty})`;
    } else if (typ === 'grzywna' && countGrzywny >= maxGrzywny) {
      licencjaZawieszona = true;
      powodZawieszenia = `Przekroczono limit grzywien (${countGrzywny}/${maxGrzywny})`;
    } else if (typ === 'areszt' && countAreszty >= maxAreszty) {
      licencjaZawieszona = true;
      powodZawieszenia = `Przekroczono limit aresztów (${countAreszty}/${maxAreszty})`;
    }

    // Automatyczne zawieszenie prawa jazdy
    if (licencjaZawieszona) {
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + suspensionDays);

      await prisma.license.updateMany({
        where: {
          userId: targetDbUser.id,
          status: 'ACTIVE',
        },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendedUntil,
          suspendedReason: powodZawieszenia,
        },
      });

      logger.info(`Auto-zawieszenie prawa jazdy: ${targetUser.tag} — ${powodZawieszenia}`);
    }

    // Wysłanie DM do ukaranego gracza
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(typ === 'areszt' ? COLORS.error : COLORS.warning)
        .setTitle(`🚔 Otrzymałeś ${typ === 'mandat' ? 'mandat' : typ === 'grzywna' ? 'grzywnę' : 'areszt'}`)
        .setDescription('Zostałeś ukarany przez służby porządkowe Greenville RP.')
        .addFields(
          { name: '📋 Typ', value: typ.charAt(0).toUpperCase() + typ.slice(1), inline: true },
          { name: '📝 Powód', value: powod, inline: false },
          { name: '👮 Wystawił', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ text: 'Greenville RP — Służby Porządkowe' })
        .setTimestamp();

      if (kwota) {
        dmEmbed.addFields({ name: '💰 Kwota', value: `${kwota.toLocaleString('pl-PL')} zł`, inline: true });
      }

      if (licencjaZawieszona) {
        const zawDo = new Date();
        zawDo.setDate(zawDo.getDate() + suspensionDays);
        dmEmbed.addFields({
          name: '🚗 Prawo jazdy',
          value: `⚠️ Twoje prawo jazdy zostało **zawieszone** do <t:${Math.floor(zawDo.getTime() / 1000)}:D>\n*Powód: ${powodZawieszenia}*`,
          inline: false,
        });
      }

      await targetUser.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag} (mandat)`);
    }

    // Embed do kanału #mandaty
    const typLabels = {
      mandat: { label: 'Mandat', emoji: '🚔', color: COLORS.warning },
      grzywna: { label: 'Grzywna', emoji: '💰', color: COLORS.mod_mute },
      areszt: { label: 'Areszt', emoji: '⛓️', color: COLORS.error },
    };
    const typCfg = typLabels[typ];

    const mandatEmbed = new EmbedBuilder()
      .setColor(typCfg.color)
      .setTitle(`${typCfg.emoji} Nowy ${typCfg.label} | ID: ${fine.id.slice(-6).toUpperCase()}`)
      .addFields(
        { name: '👤 Ukarany', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '👮 Wystawił', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📝 Powód', value: powod, inline: false },
        {
          name: '📊 Statystyki',
          value: `Mandaty: **${countMandaty}**/${maxMandaty} | Grzywny: **${countGrzywny}**/${maxGrzywny} | Areszty: **${countAreszty}**/${maxAreszty}`,
          inline: false,
        }
      )
      .setFooter({ text: `Greenville RP — Służby Porządkowe • ${new Date().toLocaleDateString('pl-PL')}` })
      .setTimestamp();

    if (kwota) {
      mandatEmbed.addFields({ name: '💰 Kwota', value: `${kwota.toLocaleString('pl-PL')} zł`, inline: true });
    }

    if (licencjaZawieszona) {
      mandatEmbed.addFields({
        name: '⚠️ Auto-zawieszenie prawa jazdy',
        value: powodZawieszenia,
        inline: false,
      });
    }

    // Wysłanie embeda do kanału #mandaty
    const mandatyChannel = interaction.guild.channels.cache.find(
      c => c.name === 'mandaty' && c.isTextBased()
    );

    if (mandatyChannel) {
      await mandatyChannel.send({ embeds: [mandatEmbed] });
    } else {
      logger.warn('Nie znaleziono kanału #mandaty');
    }

    // Powiadomienie dla administracji o auto-zawieszeniu
    if (licencjaZawieszona) {
      const staffChannel = interaction.guild.channels.cache.find(
        c => (c.name === 'logi-moderacji' || c.name === 'logi-rp') && c.isTextBased()
      );

      if (staffChannel) {
        const staffEmbed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle('⚠️ Auto-zawieszenie prawa jazdy')
          .setDescription(`Automatycznie zawieszono prawo jazdy gracza <@${targetUser.id}>`)
          .addFields(
            { name: '📋 Powód', value: powodZawieszenia, inline: false },
            { name: '⏱️ Czas zawieszenia', value: `${suspensionDays} dni`, inline: true },
            { name: '👮 Mandat wystawił', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setTimestamp();

        await staffChannel.send({ embeds: [staffEmbed] });
      }
    }

    // Log do kanału moderacyjnego
    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', mandatEmbed);

    // Odpowiedź dla wystawiającego
    await interaction.editReply({
      content: `✅ ${typCfg.emoji} ${typCfg.label} został wystawiony pomyślnie dla <@${targetUser.id}>.${licencjaZawieszona ? '\n⚠️ Prawo jazdy gracza zostało automatycznie zawieszone.' : ''}`,
    });
  },
};
