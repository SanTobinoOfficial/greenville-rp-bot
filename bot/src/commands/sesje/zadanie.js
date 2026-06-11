// /zadanie — IC task/objective board for session hosts
// Hosts post IC tasks visible to all session participants; tasks auto-expire after 8h.
// dodaj / zakoncz / usun require Staff+; lista is accessible to Mieszkaniec+.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const tasks = new Map();
let nextId = 1;
const TTL_MS = 8 * 60 * 60 * 1000;

const PRIORITY = {
  LOW:    { label: 'Niski',    emoji: '🟢', color: COLORS.success },
  NORMAL: { label: 'Normalny', emoji: '🟡', color: 0xFEE75C       },
  HIGH:   { label: 'Wysoki',   emoji: '🔴', color: COLORS.error   },
};

const SERVICE_LABEL = {
  ALL:           '🌐 Wszyscy',
  POLICJA:       '🚔 Policja',
  EMS:           '🚑 EMS',
  STRAZ:         '🚒 Straż Pożarna',
  DOT:           '🚧 DOT',
  STRAZ_MIEJSKA: '🛡️ Straż Miejska',
};

const SERVICE_CHOICES = [
  { name: '🌐 Wszyscy',       value: 'ALL'           },
  { name: '🚔 Policja',       value: 'POLICJA'       },
  { name: '🚑 EMS',           value: 'EMS'           },
  { name: '🚒 Straż Pożarna', value: 'STRAZ'         },
  { name: '🚧 DOT',           value: 'DOT'           },
  { name: '🛡️ Straż Miejska', value: 'STRAZ_MIEJSKA' },
];

function purge() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, t] of tasks) {
    if (t.createdAt < cutoff) tasks.delete(id);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zadanie')
    .setDescription('Zadania IC sesji — twórz, przeglądaj i zamykaj cele operacyjne')
    .addSubcommand(s =>
      s
        .setName('dodaj')
        .setDescription('Dodaj nowe zadanie IC dla uczestników sesji (Staff/Host+)')
        .addStringOption(o =>
          o
            .setName('tytul')
            .setDescription('Tytuł zadania (np. "Patrol strefy A", "Zabezpiecz skrzyżowanie")')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(o =>
          o
            .setName('opis')
            .setDescription('Szczegółowy opis zadania (opcjonalnie)')
            .setRequired(false)
            .setMaxLength(400)
        )
        .addStringOption(o =>
          o
            .setName('sluzba')
            .setDescription('Dla której służby (domyślnie: Wszyscy)')
            .setRequired(false)
            .addChoices(...SERVICE_CHOICES)
        )
        .addStringOption(o =>
          o
            .setName('priorytet')
            .setDescription('Priorytet zadania (domyślnie: Normalny)')
            .setRequired(false)
            .addChoices(
              { name: '🟢 Niski',    value: 'LOW'    },
              { name: '🟡 Normalny', value: 'NORMAL' },
              { name: '🔴 Wysoki',   value: 'HIGH'   },
            )
        )
    )
    .addSubcommand(s =>
      s
        .setName('lista')
        .setDescription('Wyświetl aktywne zadania IC bieżącej sesji')
        .addStringOption(o =>
          o
            .setName('sluzba')
            .setDescription('Filtruj po służbie (domyślnie: wszystkie)')
            .setRequired(false)
            .addChoices(...SERVICE_CHOICES)
        )
    )
    .addSubcommand(s =>
      s
        .setName('zakoncz')
        .setDescription('Oznacz zadanie jako zakończone (Staff/Host+)')
        .addIntegerOption(o =>
          o
            .setName('id')
            .setDescription('ID zadania do zakończenia')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(s =>
      s
        .setName('usun')
        .setDescription('Usuń zadanie z listy (Staff/Host+)')
        .addIntegerOption(o =>
          o
            .setName('id')
            .setDescription('ID zadania do usunięcia')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction, client, prisma) {
    const sub = interaction.options.getSubcommand();
    purge();

    // lista is a public board; management subcommands reply only to the caller
    await interaction.deferReply({ ephemeral: sub !== 'lista' });

    // ── LISTA ────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      if (!isVerified(interaction.member)) {
        return interaction.editReply({ content: '❌ Wymagana rola **Mieszkaniec** aby przeglądać zadania.' });
      }

      const filter = interaction.options.getString('sluzba');
      let active   = [...tasks.values()].filter(t => t.status === 'ACTIVE');

      if (filter && filter !== 'ALL') {
        active = active.filter(t => t.service === 'ALL' || t.service === filter);
      }

      const PORDER = { HIGH: 0, NORMAL: 1, LOW: 2 };
      active.sort((a, b) => (PORDER[a.priority] ?? 1) - (PORDER[b.priority] ?? 1));

      if (active.length === 0) {
        const svcSuffix = filter && filter !== 'ALL' ? ` dla **${SERVICE_LABEL[filter]}**` : '';
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📋 Zadania IC — Brak aktywnych')
              .setDescription(
                `Nie ma aktywnych zadań IC${svcSuffix}.\n\n` +
                '*Host może dodawać zadania przez `/zadanie dodaj`.*'
              )
              .setFooter({ text: 'AURORA Greenville RP — Zadania Sesji' })
              .setTimestamp(),
          ],
        });
      }

      const lines = active.map(t => {
        const pm      = PRIORITY[t.priority];
        const exTs    = Math.floor((t.createdAt + TTL_MS) / 1000);
        const svcStr  = SERVICE_LABEL[t.service] ?? '🌐 Wszyscy';
        const descStr = t.description ? `\n> *${t.description}*` : '';
        return (
          `${pm.emoji} \`#${t.id}\` **${t.title}**${descStr}\n` +
          `> ${svcStr} · Host: <@${t.createdBy}> · Wygasa <t:${exTs}:R>`
        );
      });

      const filterTitle = filter && filter !== 'ALL' ? ` — ${SERVICE_LABEL[filter]}` : '';

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle(`📋 Aktywne Zadania IC${filterTitle} — ${active.length}`)
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: 'AURORA Greenville RP — /zadanie dodaj · /zadanie zakoncz' })
            .setTimestamp(),
        ],
      });
    }

    // ── Management commands — Staff/Host only ─────────────────────────────────
    if (!isStaff(interaction.member)) {
      return interaction.editReply({ content: '❌ Tylko Staff/Host może zarządzać zadaniami IC.' });
    }

    // ── DODAJ ────────────────────────────────────────────────────────────────
    if (sub === 'dodaj') {
      const title    = interaction.options.getString('tytul').trim();
      const desc     = interaction.options.getString('opis')?.trim() ?? null;
      const service  = interaction.options.getString('sluzba')    ?? 'ALL';
      const priority = interaction.options.getString('priorytet') ?? 'NORMAL';
      const pm       = PRIORITY[priority];
      const id       = nextId++;
      const now      = Date.now();

      tasks.set(id, {
        id,
        title,
        description: desc,
        service,
        priority,
        createdBy:  interaction.user.id,
        createdAt:  now,
        status:    'ACTIVE',
      });

      const exTs     = Math.floor((now + TTL_MS) / 1000);
      const svcLabel = SERVICE_LABEL[service];

      const publicEmbed = new EmbedBuilder()
        .setColor(pm.color)
        .setTitle(`${pm.emoji} Nowe Zadanie IC — #${id}`)
        .addFields(
          { name: '📌 Tytuł',      value: title,           inline: false },
          { name: '🎯 Dla służby', value: svcLabel,         inline: true  },
          { name: '⚡ Priorytet',  value: pm.label,          inline: true  },
          { name: '⏳ Wygasa',     value: `<t:${exTs}:R>`, inline: true  },
        );

      if (desc) publicEmbed.addFields({ name: '📝 Opis', value: desc, inline: false });

      publicEmbed
        .addFields({ name: '👤 Host', value: `<@${interaction.user.id}>`, inline: true })
        .setFooter({ text: `AURORA Greenville RP — ID #${id} | /zadanie lista` })
        .setTimestamp();

      await interaction.channel.send({ embeds: [publicEmbed] }).catch(err =>
        logger.warn(`/zadanie dodaj: błąd wysyłania embeda: ${err.message}`)
      );

      logger.info(
        `/zadanie dodaj | ${interaction.user.tag} | #${id}: "${title}" | ` +
        `service=${service} priority=${priority}`
      );

      return interaction.editReply({
        content: `✅ Zadanie **#${id} — ${title}** dodane i opublikowane w kanale.`,
      });
    }

    // ── ZAKONCZ ──────────────────────────────────────────────────────────────
    if (sub === 'zakoncz') {
      const id   = interaction.options.getInteger('id');
      const task = tasks.get(id);

      if (!task || task.status !== 'ACTIVE') {
        return interaction.editReply({
          content: `❌ Zadanie **#${id}** nie istnieje, już wygasło lub zostało zakończone.`,
        });
      }

      task.status      = 'COMPLETED';
      task.completedBy = interaction.user.id;
      task.completedAt = Date.now();

      await interaction.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`✅ Zadanie IC #${id} — Zakończone`)
            .setDescription(`**${task.title}** zostało pomyślnie zakończone.`)
            .addFields({
              name:  '👤 Zakończył/a',
              value: `<@${interaction.user.id}>`,
              inline: true,
            })
            .setFooter({ text: 'AURORA Greenville RP — Zadania Sesji' })
            .setTimestamp(),
        ],
      }).catch(err =>
        logger.warn(`/zadanie zakoncz: błąd wysyłania embeda: ${err.message}`)
      );

      logger.info(`/zadanie zakoncz | ${interaction.user.tag} | #${id}: "${task.title}"`);

      return interaction.editReply({
        content: `✅ Zadanie **#${id} — ${task.title}** oznaczone jako zakończone.`,
      });
    }

    // ── USUN ─────────────────────────────────────────────────────────────────
    if (sub === 'usun') {
      const id   = interaction.options.getInteger('id');
      const task = tasks.get(id);

      if (!task) {
        return interaction.editReply({
          content: `❌ Zadanie **#${id}** nie istnieje lub już wygasło.`,
        });
      }

      const title = task.title;
      tasks.delete(id);

      logger.info(`/zadanie usun | ${interaction.user.tag} | #${id}: "${title}"`);

      return interaction.editReply({
        content: `🗑️ Zadanie **#${id} — ${title}** zostało usunięte z listy.`,
      });
    }
  },
};
