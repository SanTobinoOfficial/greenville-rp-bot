// Komenda /void — anulowanie sceny RP przez Staff
// Tylko Staff (Helper+) może ogłosić Void; gracze nie mają takiego prawa (§ Regulamin — Pojęcia RP).
// Wysyła publiczny embed na bieżący kanał i loguje akcję w ProximityMessage (ic log).

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');
const { logIcAction } = require('../../utils/icLog');
const logger = require('../../utils/logger');

// Predefiniowane zakresy void — pojawiają się w choices komendy
const SCOPES = {
  ostatnia_scena:    'Ostatnia scena/akcja (cofnij bezpośrednio poprzedzające wydarzenie)',
  ostatnie_5_min:    'Ostatnie 5 minut RP (cofnij wszystko z ostatnich ~5 minut)',
  ostatnie_15_min:   'Ostatnie 15 minut RP (cofnij ostatnie ~15 minut sesji)',
  cala_sekwencja:    'Cała sekwencja zdarzeń (określona w powodzie przez Staffa)',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('void')
    .setDescription('[STAFF] Anuluj scenę RP — void cofa i unieważnia wskazane zdarzenia IC')
    .addStringOption(opt =>
      opt
        .setName('powod')
        .setDescription('Dlaczego scena jest anulowana? (np. "VDA bez uzasadnienia", "błąd techniczny")')
        .setRequired(false)
        .setMinLength(3)
        .setMaxLength(300)
    )
    .addStringOption(opt =>
      opt
        .setName('zakres')
        .setDescription('Zakres anulowania (domyślnie: ostatnia scena/akcja)')
        .setRequired(false)
        .addChoices(
          { name: '🔙 Ostatnia scena / akcja', value: 'ostatnia_scena'  },
          { name: '⏱️ Ostatnie 5 minut RP',   value: 'ostatnie_5_min'  },
          { name: '⏱️ Ostatnie 15 minut RP',  value: 'ostatnie_15_min' },
          { name: '📋 Cała sekwencja zdarzeń', value: 'cala_sekwencja'  },
        )
    ),

  async execute(interaction, client, prisma) {
    // Publiczne ogłoszenie — void jest widoczny dla wszystkich na kanale
    await interaction.deferReply({ ephemeral: false });

    if (!isStaff(interaction.member)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.error)
            .setTitle('❌ Brak uprawnień')
            .setDescription(
              'Tylko **Staff (Helper i wyżej)** może ogłosić Void.\n' +
              '> *Zasada z Regulaminu: Void to prawo wyłącznie Staffu — gracze nie mogą go stosować.*'
            )
            .setFooter({ text: 'AURORA Greenville RP — Void' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    const powod     = interaction.options.getString('powod')    ?? null;
    const zakresCfg = interaction.options.getString('zakres')   ?? 'ostatnia_scena';
    const zakresOpis = SCOPES[zakresCfg] ?? SCOPES.ostatnia_scena;

    // Pobierz imię IC osoby ogłaszającej void (Staff może mieć postać)
    let staffIcName = interaction.member.displayName;
    try {
      const userDb = await prisma.user.findUnique({
        where:   { discordId: interaction.user.id },
        include: { character: true },
      });
      if (userDb?.character) {
        staffIcName = `${userDb.character.firstName} ${userDb.character.lastName}`;
      }
    } catch {
      // Fallback na displayName — nie przerywaj
    }

    // Buduj publiczny embed void
    const voidEmbed = new EmbedBuilder()
      .setColor(0x2B2D31) // Ciemny szary — neutralny, wyróżnia się od akcji IC
      .setTitle('🚫 VOID — Anulowanie sceny RP')
      .setDescription(
        '**Wskazana scena/akcja zostaje anulowana przez Staff.**\n' +
        '> Cofnij wszelkie działania i konsekwencje wynikające z anulowanych zdarzeń.\n' +
        '> Kontynuuj RP tak, jakby anulowane wydarzenie nie miało miejsca.\n\n' +
        '*W razie wątpliwości — zapytaj Staffa przez `/ooc` lub wiadomość prywatną.*'
      )
      .addFields(
        {
          name:   '📋 Zakres anulowania',
          value:  zakresOpis,
          inline: false,
        },
        {
          name:   '📝 Powód',
          value:  powod ?? '*Brak podanego powodu.*',
          inline: false,
        },
        {
          name:   '🛡️ Ogłosił/a',
          value:  `**${staffIcName}** (<@${interaction.user.id}>)`,
          inline: true,
        },
        {
          name:   '📍 Kanał',
          value:  `<#${interaction.channel.id}>`,
          inline: true,
        },
        {
          name:   '🕐 Czas',
          value:  `<t:${Math.floor(Date.now() / 1000)}:T>`,
          inline: true,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — Void | Decyzja Staffu jest ostateczna' })
      .setTimestamp();

    // Log IC (fire-and-forget)
    const logContent = `VOID [${zakresCfg}]${powod ? ` — ${powod}` : ''}`;
    logIcAction(prisma, interaction.user.id, interaction.channel.id, staffIcName, 'VOID', logContent).catch(() => {});

    logger.info(
      `/void | ${interaction.user.tag} (${staffIcName}) | zakres: ${zakresCfg}` +
      (powod ? ` | powód: "${powod.slice(0, 80)}${powod.length > 80 ? '…' : ''}"` : ' | brak powodu')
    );

    await interaction.editReply({ embeds: [voidEmbed] });
  },
};
