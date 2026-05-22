// Event guildMemberAdd — nowy członek dołącza do serwera
// Nadaje rolę Niezweryfikowany, tworzy konto w DB, wysyła powitanie

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client, prisma) {
    try {
      const guild = member.guild;

      // ── 1. Nadaj rolę Niezweryfikowany ─────────────────────────────────────
      const niezwRole = guild.roles.cache.find(r => r.name === 'Niezweryfikowany');
      if (niezwRole) {
        await member.roles.add(niezwRole).catch(err =>
          logger.warn('Nie można nadać roli Niezweryfikowany:', err.message)
        );
      }

      // ── 2. Utwórz użytkownika w DB ─────────────────────────────────────────
      await prisma.user.upsert({
        where:  { discordId: member.id },
        create: { discordId: member.id, discordUsername: member.user.tag },
        update: { discordUsername: member.user.tag },
      });

      // ── 3. Znajdź kanał powitalny (przyloty lub ogólny) ───────────────────
      const welcomeCh = guild.channels.cache.find(
        c => c.isTextBased() && (
          c.name.includes('przyloty') ||
          c.name.includes('powitania') ||
          c.name.includes('welcome')
        )
      );

      const memberCount = guild.memberCount;

      // ── 4. Embed powitalny na kanale ───────────────────────────────────────
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🎉 Nowy mieszkaniec!')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `**${member.user.username}** dołączył/a do **AURORA Greenville RP**!\n\n` +
          `**Cześć! 👋** Witamy Cię w największym polskim serwerze Roleplay na Roblox!\n\n` +
          `**Jak zacząć?**\n` +
          `> 📋 Przejdź do <#${guild.channels.cache.find(c => c.name.includes('zacznij-tutaj'))?.id ?? ''}>\n` +
          `> 📖 Zapoznaj się z <#${guild.channels.cache.find(c => c.name.includes('regulamin') && !c.name.includes('staff'))?.id ?? ''}>\n` +
          `> ✅ Wypełnij formularz weryfikacyjny\n` +
          `> 🏠 Uzyskaj rolę **Mieszkaniec** i zacznij grać!\n\n` +
          `Jesteś członkiem **#${memberCount}** naszej społeczności! 🌟`
        )
        .setFooter({ text: 'AURORA Greenville RP — Powitanie' })
        .setTimestamp();

      if (welcomeCh) {
        await welcomeCh.send({ content: `Witaj <@${member.id}>!`, embeds: [welcomeEmbed] });
      }

      // ── 5. DM powitalne ─────────────────────────────────────────────────────
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🏙️ Witaj w AURORA Greenville RP!')
          .setDescription(
            `Cześć **${member.user.username}**! 👋\n\n` +
            `Właśnie dołączyłeś/aś do **AURORA Greenville RP** — polskiego serwera RP na Roblox.\n\n` +
            `**Jak przejść weryfikację?**\n` +
            `1️⃣ Wejdź na kanał **#📋│zacznij-tutaj**\n` +
            `2️⃣ Kliknij przycisk **Wypełnij formularz weryfikacyjny**\n` +
            `3️⃣ Podaj swój nick Roblox i odpowiedz na pytania\n` +
            `4️⃣ Zdaj quiz (min. 8/10) i uzyskaj rolę **Mieszkaniec**\n\n` +
            `**Potrzebujesz pomocy?**\n` +
            `Otwórz ticket na kanale **#🎫│otwórz-ticket** — nasz staff chętnie pomoże!\n\n` +
            `*Do zobaczenia na sesji! 🚔🚑🚒*`
          )
          .setThumbnail(guild.iconURL({ dynamic: true }) ?? null)
          .setFooter({ text: 'AURORA Greenville RP — Witamy!' })
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch {
        // DM zablokowany — OK
      }

      // ── 6. Log na #logi-członków ───────────────────────────────────────────
      const normMbr = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const logCh = guild.channels.cache.find(
        c => c.isTextBased() && normMbr(c.name).includes('logi-czl') // logi-członków
      );
      if (logCh) {
        await logCh.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('👤 Nowy członek dołączył')
              .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
              .addFields(
                { name: 'Użytkownik', value: `${member.user.tag} (<@${member.id}>)`, inline: false },
                { name: 'ID', value: member.id, inline: true },
                { name: 'Konto Discord od', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Łączna liczba członków', value: `${memberCount}`, inline: true }
              )
              .setTimestamp()
          ],
        });
      }

      logger.info(`Nowy członek: ${member.user.tag} (${member.id})`);
    } catch (error) {
      logger.error('Błąd w guildMemberAdd:', error);
    }
  },
};
