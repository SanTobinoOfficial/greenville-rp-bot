// Komenda /bolo — BOLO (Be On Look Out) — ogłoszenie do wszystkich służb
// Tworzy wpis CadWarrant i wysyła powiadomienie na kanał dyspozytorni

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bolo')
    .setDescription('Wystaw ogłoszenie BOLO (Be On Look Out) dla służb')
    .addStringOption(opt =>
      opt.setName('osoba')
        .setDescription('Imię i nazwisko osoby lub opis pojazdu')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód BOLO (czego szukamy / opis przestępstwa)')
        .setRequired(true)
        .setMaxLength(400)
    )
    .addStringOption(opt =>
      opt.setName('opis')
        .setDescription('Dodatkowy opis: ubranie, pojazd, kierunek ucieczki')
        .setMaxLength(300)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('roblox')
        .setDescription('Nick Roblox osoby poszukiwanej (opcjonalnie)')
        .setMaxLength(50)
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('niebezpieczny')
        .setDescription('Czy osoba jest uzbrojona / niebezpieczna?')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const member = interaction.member;
    const isPolicja  = member.roles.cache.some(r => r.name === ROLES.POLICJA || r.name === 'Policja On-Duty');
    const isEMS      = member.roles.cache.some(r => r.name === ROLES.EMS);
    const isStrazPoz = member.roles.cache.some(r => r.name === ROLES.STRAZ_POZARNA);
    const isDOT      = member.roles.cache.some(r => r.name === ROLES.DOT);

    if (!isPolicja && !isEMS && !isStrazPoz && !isDOT && !isStaff(member)) {
      return interaction.editReply({ content: '❌ BOLO mogą wystawiać tylko służby mundurowe lub Staff.' });
    }

    const osobaName    = interaction.options.getString('osoba');
    const powod        = interaction.options.getString('powod');
    const opisDod      = interaction.options.getString('opis') ?? null;
    const robloxNick   = interaction.options.getString('roblox') ?? null;
    const niebezp      = interaction.options.getBoolean('niebezpieczny') ?? false;

    // Utwórz BOLO jako CadWarrant
    const bolo = await prisma.cadWarrant.create({
      data: {
        targetName:     osobaName,
        robloxName:     robloxNick,
        reason:         powod + (opisDod ? `\n📋 Opis: ${opisDod}` : ''),
        issuedBy:       interaction.user.id,
        issuedByName:   interaction.user.tag,
        active:         true,
      },
    });

    logger.info(`BOLO wystawione: ${osobaName} | przez ${interaction.user.tag} | ID: ${bolo.id}`);

    const dangerBanner = niebezp
      ? '\n🔴 **UWAGA: OSOBA UZBROJONA I NIEBEZPIECZNA — ZACHOWAJ OSTROŻNOŚĆ!**'
      : '';

    const embed = new EmbedBuilder()
      .setColor(niebezp ? COLORS.error : COLORS.warning)
      .setTitle(`🚨 BOLO #${bolo.id.slice(-6).toUpperCase()} — Be On Look Out`)
      .setDescription(
        `**Wszystkie służby — poszukiwana osoba/pojazd!**${dangerBanner}`
      )
      .addFields(
        { name: '👤 Poszukiwany/a',   value: osobaName,                         inline: true  },
        { name: '🎮 Roblox Nick',      value: robloxNick ?? '*Nieznany*',         inline: true  },
        { name: '📋 Powód',           value: powod,                              inline: false },
        { name: '👮 Wystawił',        value: `<@${interaction.user.id}>`,        inline: true  },
        { name: '🕐 Czas',            value: `<t:${Math.floor(Date.now()/1000)}:T>`, inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — System CAD / BOLO' })
      .setTimestamp();

    if (opisDod) {
      embed.addFields({ name: '🔍 Opis dodatkowy', value: opisDod, inline: false });
    }

    // Wyślij na kanał policji (lista-poszukiwanych lub czat)
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
    const boloChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && (
        norm(c.name).includes('lista-poszukiwanych') ||
        norm(c.name).includes('policja-czat')
      )
    );

    if (boloChannel) {
      const pingRoles = ['Policja', 'EMS', 'Straż Pożarna', 'DOT', 'Straż Miejska']
        .map(rName => interaction.guild.roles.cache.find(r => r.name === rName))
        .filter(Boolean)
        .map(r => `<@&${r.id}>`)
        .join(' ');

      await boloChannel.send({
        content: pingRoles ? `${pingRoles} — NOWE BOLO!` : '⚠️ NOWE BOLO!',
        embeds: [embed],
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
