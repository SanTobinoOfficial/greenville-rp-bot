// Komenda /emote — szybkie wyrażenie emocji postaci IC
// Odczytuje płeć postaci z DB → auto-koniugacja polskich form czasownikowych
// Publiczny embed, styl zbliżony do /me
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const { logIcAction } = require('../../utils/icLog');
const logger = require('../../utils/logger');

// ── Katalog emotek: klucz → { m: forma_mężczyzny, f: forma_kobiety, emoji, group } ──────────
const EMOTES = {
  // Radość / pozytywne
  'smiec':       { m: 'śmieje się głośno',             f: 'śmieje się głośno',             emoji: '😄', group: 'Radość'        },
  'chichoc':     { m: 'chichoce cicho',                f: 'chichoce cicho',                emoji: '🤭', group: 'Radość'        },
  'usmiech':     { m: 'uśmiecha się szeroko',          f: 'uśmiecha się szeroko',          emoji: '😊', group: 'Radość'        },
  'klaszcze':    { m: 'klaszcze w dłonie',             f: 'klaszcze w dłonie',             emoji: '👏', group: 'Radość'        },

  // Neutralne / gesty
  'kiwglowa':    { m: 'kiwa głową',                    f: 'kiwa głową',                    emoji: '🙂', group: 'Gest'          },
  'krecglowa':   { m: 'kręci głową',                   f: 'kręci głową',                   emoji: '🙅', group: 'Gest'          },
  'wzruszrym':   { m: 'wzruszył ramionami',            f: 'wzruszyła ramionami',           emoji: '🤷', group: 'Gest'          },
  'rozglada':    { m: 'rozgląda się uważnie',          f: 'rozgląda się uważnie',          emoji: '👀', group: 'Gest'          },
  'splata':      { m: 'splata ręce na piersi',         f: 'splata ręce na piersi',         emoji: '😌', group: 'Gest'          },
  'odwraca':     { m: 'odwraca się tyłem',             f: 'odwraca się tyłem',             emoji: '🔄', group: 'Gest'          },
  'zaciera':     { m: 'zaciera ręce',                  f: 'zaciera ręce',                  emoji: '🤲', group: 'Gest'          },
  'wskazuje':    { m: 'wskazuje palcem w dal',         f: 'wskazuje palcem w dal',         emoji: '👉', group: 'Gest'          },
  'moczy':       { m: 'przeciera oczy',                f: 'przeciera oczy',                emoji: '😌', group: 'Gest'          },

  // Zamyślenie / skupienie
  'zamysl':      { m: 'jest zamyślony',                f: 'jest zamyślona',                emoji: '🤔', group: 'Skupienie'     },
  'drapie':      { m: 'drapie się po głowie',          f: 'drapie się po głowie',          emoji: '🤔', group: 'Skupienie'     },
  'patrzy':      { m: 'patrzy w milczeniu',            f: 'patrzy w milczeniu',            emoji: '👁️', group: 'Skupienie'    },

  // Negatywne / stres
  'westchnie':   { m: 'westchnął głęboko',             f: 'westchnęła głęboko',            emoji: '😮‍💨', group: 'Nastrój'   },
  'marszczy':    { m: 'marszczy czoło',                f: 'marszczy czoło',                emoji: '🤨', group: 'Nastrój'      },
  'zaciska':     { m: 'zaciska usta',                  f: 'zaciska usta',                  emoji: '😬', group: 'Nastrój'      },
  'ziewie':      { m: 'ziewa i prostuje się',          f: 'ziewa i prostuje się',          emoji: '🥱', group: 'Nastrój'      },
  'drzy':        { m: 'drży z nerwów',                 f: 'drży z nerwów',                 emoji: '😰', group: 'Nastrój'      },

  // Irytacja / złość
  'burek':       { m: 'burknął pod nosem',             f: 'burknęła pod nosem',            emoji: '😠', group: 'Irytacja'     },
  'prycha':      { m: 'prycha z niezadowoleniem',      f: 'prycha z niezadowoleniem',      emoji: '😒', group: 'Irytacja'     },
  'tup':         { m: 'tupie niecierpliwie',           f: 'tupie niecierpliwie',           emoji: '😤', group: 'Irytacja'     },
};

// Lista wyboru dla autocomplete
const EMOTE_CHOICES = Object.entries(EMOTES).map(([key, val]) => ({
  name: `${val.emoji} ${val.group} — ${val.m}`,
  value: key,
}));

// ── Komenda ──────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('emote')
    .setDescription('Wyraź emocję swojej postaci IC (gest, mimika, reakcja)')
    .addStringOption(opt =>
      opt
        .setName('wyraz')
        .setDescription('Wybierz wyraz emocji postaci')
        .setRequired(true)
        .addChoices(...EMOTE_CHOICES)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać komend IC.',
        flags: ['Ephemeral'],
      });
    }

    const key = interaction.options.getString('wyraz');
    const emote = EMOTES[key];

    if (!emote) {
      return interaction.editReply({ content: '❌ Nieznana emotka. Wybierz z listy.' });
    }

    // Pobierz postać — imię IC + płeć do koniugacji
    const userDb = await prisma.user
      .findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      })
      .catch(() => null);

    const char = userDb?.character;
    const icName = char
      ? `${char.firstName} ${char.lastName}`
      : (interaction.member?.displayName ?? interaction.user.username);

    // Wybierz formę gramatyczną według płci postaci
    const isFemale = (char?.gender ?? '').toLowerCase().startsWith('k'); // 'kobieta' lub 'K'
    const form = isFemale ? emote.f : emote.m;

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setDescription(`*${emote.emoji} **${icName}** ${form}*`)
      .setFooter({
        text: `${interaction.user.tag} • ${interaction.channel.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logIcAction(
      prisma,
      interaction.user.id,
      interaction.channel.id,
      icName,
      'EMOTE',
      `[${emote.group}] ${form}`
    ).catch(() => {});

    logger.info(`/emote | ${interaction.user.tag} (${icName}) | ${key} → ${form}`);

    await interaction.editReply({ embeds: [embed] });
  },
};
