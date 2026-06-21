// Komenda /sugestia-rozpatrz — Staff formalnie zamyka sugestię gracza
// Aktualizuje embed w #sugestie i wysyła DM autorowi z decyzją

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const STATUS_CONFIG = {
  accepted:    { label: '✅ Przyjęta',     color: 0x57F287, dm: 'Twoja sugestia została **przyjęta**! Dziękujemy za wkład w rozwój serwera.' },
  rejected:    { label: '❌ Odrzucona',    color: 0xED4245, dm: 'Twoja sugestia została **odrzucona**. Dziękujemy za przesłanie opinii.' },
  in_progress: { label: '🔧 W realizacji', color: 0xFEE75C, dm: 'Twoja sugestia jest **w trakcie realizacji**! Śledź ogłoszenia na serwerze.' },
  duplicate:   { label: '🔁 Powielona',    color: 0x99AAB5, dm: 'Twoja sugestia jest **powieleniem** wcześniej zgłoszonej. Jeśli chcesz ją wesprzeć, zagłosuj na oryginał.' },
};

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugestia-rozpatrz')
    .setDescription('Rozpatrz sugestię gracza z kanału #sugestie (Staff+)')
    .addStringOption(opt =>
      opt
        .setName('message_id')
        .setDescription('ID wiadomości sugestii (skopiuj prawym klikiem → Kopiuj ID)')
        .setRequired(true)
        .setMinLength(17)
        .setMaxLength(20)
    )
    .addStringOption(opt =>
      opt
        .setName('decyzja')
        .setDescription('Wynik rozpatrzenia sugestii')
        .setRequired(true)
        .addChoices(
          { name: '✅ Przyjęta',      value: 'accepted'    },
          { name: '❌ Odrzucona',     value: 'rejected'    },
          { name: '🔧 W realizacji',  value: 'in_progress' },
          { name: '🔁 Powielona',     value: 'duplicate'   },
        )
    )
    .addStringOption(opt =>
      opt
        .setName('odpowiedz')
        .setDescription('Opcjonalne uzasadnienie / odpowiedź dla autora sugestii')
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Staff może rozpatrywać sugestie.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString('message_id').trim();
    const decyzja   = interaction.options.getString('decyzja');
    const odpowiedz = interaction.options.getString('odpowiedz')?.trim() ?? null;

    const cfg = STATUS_CONFIG[decyzja];

    // Znajdź kanał #sugestie
    const sugChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && norm(c.name).includes('sugestie')
    );

    if (!sugChannel) {
      return interaction.editReply({
        content: '❌ Nie znaleziono kanału **#sugestie** na tym serwerze.',
      });
    }

    // Pobierz wiadomość
    const msg = await sugChannel.messages.fetch(messageId).catch(() => null);

    if (!msg) {
      return interaction.editReply({
        content:
          `❌ Nie znaleziono wiadomości \`${messageId}\` w kanale <#${sugChannel.id}>.\n` +
          `Sprawdź czy skopiowałeś/aś prawidłowe ID wiadomości.`,
      });
    }

    const originalEmbed = msg.embeds?.[0];

    if (!originalEmbed) {
      return interaction.editReply({
        content: '❌ Ta wiadomość nie zawiera embeda sugestii.',
      });
    }

    // Sprawdź czy sugestia nie jest już rozpatrzona
    const alreadyResolved = originalEmbed.fields?.some(
      f => f.name.startsWith('📋 Decyzja Staff')
    );
    if (alreadyResolved) {
      return interaction.editReply({
        content: '⚠️ Ta sugestia została już wcześniej rozpatrzona.',
      });
    }

    // Wyciągnij ID autora z pola "👤 Autor"
    const autorField = originalEmbed.fields?.find(f => f.name === '👤 Autor');
    const authorIdMatch = autorField?.value?.match(/<@(\d+)>/);
    const authorId = authorIdMatch?.[1] ?? null;

    // Zaktualizuj embed — zmień kolor i dodaj pole decyzji
    const decisionLines = [
      `📋 ${cfg.label}`,
      `👮 Rozpatrzył/a: <@${interaction.user.id}>`,
    ];
    if (odpowiedz) decisionLines.push(`💬 Uzasadnienie: ${odpowiedz}`);

    const updatedEmbed = EmbedBuilder.from(originalEmbed)
      .setColor(cfg.color)
      .addFields({
        name:   '📋 Decyzja Staff',
        value:  decisionLines.join('\n'),
        inline: false,
      });

    await msg.edit({ embeds: [updatedEmbed] }).catch(err => {
      logger.warn(`/sugestia-rozpatrz: nie można edytować wiadomości — ${err.message}`);
    });

    // Wyślij DM do autora
    let dmSent = false;
    if (authorId) {
      try {
        const authorUser = await client.users.fetch(authorId);
        const dmEmbed = new EmbedBuilder()
          .setColor(cfg.color)
          .setTitle(`💡 Twoja sugestia została rozpatrzona — ${cfg.label}`)
          .setDescription(cfg.dm)
          .addFields(
            { name: '💡 Tytuł sugestii', value: originalEmbed.title?.replace(/^💡\s*/, '') ?? '_brak tytułu_', inline: false },
          );

        if (odpowiedz) {
          dmEmbed.addFields({ name: '💬 Odpowiedź Staff', value: odpowiedz, inline: false });
        }

        dmEmbed
          .addFields({ name: '👮 Rozpatrzył/a', value: `${interaction.user.tag}`, inline: true })
          .setFooter({ text: 'AURORA Greenville RP — System Sugestii' })
          .setTimestamp();

        await authorUser.send({ embeds: [dmEmbed] });
        dmSent = true;
      } catch {
        // Gracz mógł wyłączyć DM — ignorujemy cicho
      }
    }

    logger.info(
      `/sugestia-rozpatrz | ${interaction.user.tag} | ${cfg.label} | msg:${messageId}` +
      (odpowiedz ? ` | "${odpowiedz}"` : '') +
      (authorId ? ` | autor: <@${authorId}>` : '') +
      (dmSent ? ' | DM wysłany' : ' | DM nie wysłany')
    );

    const confirmLines = [
      `✅ Sugestia rozpatrzona jako **${cfg.label}**.`,
      `📌 Embed zaktualizowany w <#${sugChannel.id}>.`,
      dmSent
        ? `📬 Autor otrzymał powiadomienie DM.`
        : `⚠️ Nie udało się wysłać DM do autora (wyłączone lub nieznany użytkownik).`,
    ];
    if (odpowiedz) confirmLines.push(`💬 Uzasadnienie dołączone: _${odpowiedz}_`);

    return interaction.editReply({ content: confirmLines.join('\n') });
  },
};
