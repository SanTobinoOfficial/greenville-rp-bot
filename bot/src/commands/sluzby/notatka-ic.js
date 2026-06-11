// Komenda /notatka-ic — IC notatki służbowe na karcie postaci
// Funkcjonariusze mogą dodawać krótkie notatki IC do postaci gracza (np. „wielokrotny pirat drogowy").
// Przechowywane in-memory, wygasają po 72 godzinach.
// Dostępna dla: Policja, EMS, Straż, DOT, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const TTL_MS      = 72 * 60 * 60 * 1000;
const MAX_PER_CHAR = 10;

const SERVICE_ROLES = [
  ROLES.POLICJA, ROLES.EMS, ROLES.STRAZ, ROLES.DOT, ROLES.STRAZ_MIEJSKA,
  'Policja On-Duty', 'EMS On-Duty', 'Straż On-Duty', 'DOT On-Duty', 'Straż Miejska On-Duty',
];

// Map<targetDiscordId, Array<{ id, authorId, authorTag, tresc, createdAt }>>
const notes = new Map();
let nextNoteId = 1;

function purgeExpired() {
  const cutoff = Date.now() - TTL_MS;
  for (const [targetId, arr] of notes) {
    const filtered = arr.filter(n => n.createdAt > cutoff);
    if (filtered.length === 0) notes.delete(targetId);
    else notes.set(targetId, filtered);
  }
}

function isSluzba(member) {
  return member.roles.cache.some(r => SERVICE_ROLES.includes(r.name));
}

async function resolveDisplayName(prisma, discordId, guildMember) {
  try {
    const u = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (u?.character) return `${u.character.firstName} ${u.character.lastName}`;
  } catch {}
  return guildMember?.displayName ?? 'Nieznana postać';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notatka-ic')
    .setDescription('IC notatki służbowe przypisane do postaci gracza (Policja / EMS / Straż / Staff)')
    .addSubcommand(sub =>
      sub.setName('dodaj')
        .setDescription('Dodaj IC notatkę do karty postaci gracza')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz, do którego karty dodajesz notatkę')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('tresc')
            .setDescription('Treść notatki IC (5–200 znaków)')
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Wyświetl aktywne notatki IC przypisane do danego gracza')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz, którego notatki chcesz zobaczyć')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('usun')
        .setDescription('Usuń własną notatkę IC po numerze ID')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Numer ID notatki (widoczny w /notatka-ic lista)')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isSluzba(interaction.member) && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Dostęp tylko dla funkcjonariuszy służb mundurowych lub Staffu.',
      });
    }

    purgeExpired();

    const sub = interaction.options.getSubcommand();

    // ── DODAJ ─────────────────────────────────────────────────────────────────
    if (sub === 'dodaj') {
      const target = interaction.options.getUser('gracz');
      const tresc  = interaction.options.getString('tresc').trim();

      if (target.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ Nie możesz dodawać notatek do własnej karty.' });
      }
      if (target.bot) {
        return interaction.editReply({ content: '❌ Nie można dodawać notatek do botów.' });
      }

      const existing = notes.get(target.id) ?? [];
      if (existing.length >= MAX_PER_CHAR) {
        return interaction.editReply({
          content: `❌ Ta postać ma już **${MAX_PER_CHAR}** aktywnych notatek IC. Usuń starsze przed dodaniem nowej.`,
        });
      }

      const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      const displayName  = await resolveDisplayName(prisma, target.id, targetMember);

      const now  = Date.now();
      const note = {
        id:        nextNoteId++,
        authorId:  interaction.user.id,
        authorTag: interaction.user.tag,
        tresc,
        createdAt: now,
      };

      existing.push(note);
      notes.set(target.id, existing);

      logger.info(
        `/notatka-ic dodaj | ${interaction.user.tag} → ${target.tag} (${displayName}) | #${note.id} | "${tresc.slice(0, 60)}"`
      );

      const expiresTs = Math.floor((now + TTL_MS) / 1000);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('📋 Notatka IC dodana')
            .addFields(
              { name: '🎭 Postać',     value: displayName,          inline: true },
              { name: '🆔 ID notatki', value: `#${note.id}`,        inline: true },
              { name: '⏳ Wygasa',     value: `<t:${expiresTs}:R>`, inline: true },
              { name: '📝 Treść',      value: tresc,                inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Notatki IC | Widoczne tylko dla służb' })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const target      = interaction.options.getUser('gracz');
      const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      const displayName  = await resolveDisplayName(prisma, target.id, targetMember);

      const arr = notes.get(target.id) ?? [];

      if (arr.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle(`📋 Notatki IC — ${displayName}`)
              .setDescription('*Brak aktywnych notatek IC dla tej postaci.*')
              .setFooter({ text: 'AURORA Greenville RP — Notatki IC' })
              .setTimestamp(),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Notatki IC — ${displayName}`)
        .setDescription(`**${arr.length}** ${arr.length === 1 ? 'aktywna notatka' : 'aktywnych notatek'}:`);

      for (const note of arr.slice(0, 10)) {
        const ts   = Math.floor(note.createdAt / 1000);
        const exTs = Math.floor((note.createdAt + TTL_MS) / 1000);
        embed.addFields({
          name:  `#${note.id} · <t:${ts}:d>`,
          value: `${note.tresc}\n*Dodał: ${note.authorTag} | Wygasa: <t:${exTs}:R>*`,
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Notatki IC | Wygasają po 72h' })
        .setTimestamp();

      logger.info(
        `/notatka-ic lista | ${interaction.user.tag} → ${target.tag} (${displayName}) | ${arr.length} notatek`
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── USUŃ ──────────────────────────────────────────────────────────────────
    if (sub === 'usun') {
      const noteId = interaction.options.getInteger('id');

      let found       = null;
      let foundTarget = null;

      outer: for (const [targetId, arr] of notes) {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].id === noteId) {
            found       = arr[i];
            foundTarget = targetId;

            if (found.authorId !== interaction.user.id && !isStaff(interaction.member)) {
              return interaction.editReply({
                content: '❌ Możesz usuwać tylko własne notatki. Staff może usunąć każdą.',
              });
            }

            arr.splice(i, 1);
            if (arr.length === 0) notes.delete(targetId);
            break outer;
          }
        }
      }

      if (!found) {
        return interaction.editReply({
          content: `❌ Nie znaleziono notatki o ID **#${noteId}**. Mogła już wygasnąć lub nie istnieje.`,
        });
      }

      logger.info(`/notatka-ic usun | ${interaction.user.tag} | #${noteId}`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Notatka IC usunięta')
            .addFields(
              { name: '🆔 ID',     value: `#${noteId}`, inline: true },
              { name: '📝 Treść',  value: found.tresc,  inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Notatki IC' })
            .setTimestamp(),
        ],
      });
    }
  },
};
