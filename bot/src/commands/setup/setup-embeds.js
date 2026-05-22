// Komenda /setup-embeds — re-wysyła wszystkie embedy na kanały serwera
// Dostępna dla administratorów (bez pełnego setup)

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const logger = require('../../utils/logger');
const serverConfig = require('../../../../server-config.json');

/** Split long text into chunks fitting Discord's 1024-char field limit */
function splitFieldText(text, limit = 1020) {
  if (text.length <= limit) return [text];
  const lines = text.split('\n');
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > limit) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Build embeds array from server-config.json regulamin */
function buildRegulamEmbedsFromConfig() {
  const reg = serverConfig.regulamin;
  const color = parseInt(reg.color.replace('#', ''), 16);

  return reg.sections.map((section, sIdx) => {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setFooter({ text: reg.footer })
      .setTimestamp();

    if (sIdx === 0 && section.title) {
      embed.setTitle(section.title);
      if (section.intro) embed.setDescription(section.intro);
    }

    for (const field of (section.fields || [])) {
      const value = field.rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
      const chunks = splitFieldText(value, 1020);
      chunks.forEach((chunk, ci) => {
        embed.addFields({
          name: ci === 0 ? field.name : `${field.name} (cd.)`,
          value: chunk,
          inline: false,
        });
      });
    }

    return embed;
  });
}

// Pomocnik: znajdź kanał po fragmencie nazwy
function ch(guild, fragment) {
  return guild.channels.cache.find(
    c => c.isTextBased() && c.name.toLowerCase().includes(fragment.toLowerCase())
  );
}

// Pomocnik: usuń poprzednie wiadomości bota w kanale (maks. 100)
async function clearBotMessages(channel, clientId) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMsgs = messages.filter(m => m.author.id === clientId);
    if (botMsgs.size === 0) return;
    // bulkDelete działa tylko dla wiadomości < 14 dni
    const recent = botMsgs.filter(m => Date.now() - m.createdTimestamp < 12 * 24 * 60 * 60 * 1000);
    const old    = botMsgs.filter(m => Date.now() - m.createdTimestamp >= 12 * 24 * 60 * 60 * 1000);
    if (recent.size > 1) await channel.bulkDelete(recent).catch(() => {});
    else if (recent.size === 1) await recent.first().delete().catch(() => {});
    for (const msg of old.values()) await msg.delete().catch(() => {});
  } catch { /* ignoruj błędy uprawnień */ }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-embeds')
    .setDescription('Re-wysyła wszystkie embedy na kanały serwera (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📨 Wysyłanie embedów...')
          .setDescription('Trwa aktualizacja embedów na wszystkich kanałach.'),
      ],
      ephemeral: true,
    });

    const guild = interaction.guild;
    const sent = [];
    const failed = [];

    const clientId = interaction.client.user.id;

    // ── 1. #zacznij-tutaj — weryfikacja ─────────────────────────
    const verifyChannel = ch(guild, 'zacznij-tutaj');
    if (verifyChannel) {
      try {
        await clearBotMessages(verifyChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0x30d158)
          .setTitle('✅ Witaj w AURORA Greenville RP!')
          .setDescription(
            '**AURORA Greenville RP** to polski serwer Roleplay na Roblox.\n' +
            'Aby uzyskać dostęp do serwera, wypełnij formularz weryfikacyjny.\n\n' +
            '**Jak przebiega weryfikacja?**\n' +
            '> 📋 Wejdź na formularz pod linkiem poniżej\n' +
            '> 🔗 Podaj swój **Discord ID** oraz **nick Roblox**\n' +
            '> ❓ Odpowiedz na **10 pytań** z regulaminu serwera\n' +
            '> ✅ Uzyskaj minimum **8/10 punktów**\n' +
            '> 🏠 Rola **Mieszkaniec** zostanie nadana automatycznie!\n\n' +
            '**Jak znaleźć swoje Discord ID?**\n' +
            '> Ustawienia → Zaawansowane → włącz **Tryb dewelopera**\n' +
            '> Kliknij prawym na swój nick → **Kopiuj ID użytkownika**\n\n' +
            '**Zanim zaczniesz:**\n' +
            '• Przeczytaj regulamin na kanale <#regulamin>\n' +
            '• Zapoznaj się z pojęciami RP (FRP, NLR, metagaming)\n\n' +
            '*Kliknij przycisk poniżej, aby otworzyć formularz!*'
          )
          .setFooter({ text: 'AURORA Greenville RP — System weryfikacji' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setURL('https://greenville-rp-bot.vercel.app/weryfikacja')
            .setLabel('📋 Wypełnij formularz weryfikacyjny')
            .setStyle(ButtonStyle.Link)
        );

        await verifyChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ #${verifyChannel.name}`);
      } catch (e) {
        failed.push(`❌ zacznij-tutaj: ${e.message}`);
      }
    }

    // ── 2. #regulamin — pełny regulamin z server-config.json ─────
    const regulaminChannel = ch(guild, 'regulamin');
    if (regulaminChannel) {
      try {
        await clearBotMessages(regulaminChannel, clientId);
        const regEmbeds = buildRegulamEmbedsFromConfig();
        // Discord: max 10 embeds per message
        for (let i = 0; i < regEmbeds.length; i += 10) {
          await regulaminChannel.send({ embeds: regEmbeds.slice(i, i + 10) });
        }
        sent.push(`✅ #${regulaminChannel.name} (${regEmbeds.length} embedów)`);
      } catch (e) {
        failed.push(`❌ regulamin: ${e.message}`);
      }
    }

    // ── 3. #słownik-rp ───────────────────────────────────────────
    const slownikChannel = ch(guild, 'slownik') || ch(guild, 'słownik');
    if (slownikChannel) {
      try {
        await clearBotMessages(slownikChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📖 Słownik pojęć Roleplay — AURORA Greenville RP')
          .setDescription('**Znajomość poniższych pojęć jest obowiązkowa** przed przystąpieniem do sesji RP.\nNiezrozumienie pojęć nie zwalnia z odpowiedzialności za ich naruszenie.')
          .addFields(
            {
              name: '🔴 Zakazy absolutne (ban)',
              value: [
                '**FRP** (Fail Roleplay) — zachowanie sprzeczne z realizmem RP',
                '**RDM** (Random Death Match) — atakowanie bez powodu RP',
                '**VDM** (Vehicle Death Match) — taranowanie pojazdem bez powodu',
                '**Metagaming** — używanie wiedzy z poza gry (Discord/stream) w IC',
                '**Powergaming** — narzucanie innym akcji bez ich zgody',
                '**Combat Logging** — wyjście z gry podczas trwącej akcji RP',
              ].join('\n'),
              inline: false,
            },
            {
              name: '🟡 Zasady kluczowe',
              value: [
                '**NLR** — po śmierci zapominasz wszystko z poprzedniego życia',
                '**Fear RP** — odgrywaj strach przy zagrożeniu życia',
                '**Void** — anulowanie akcji RP (tylko Staff)',
                '**Peacetime** — tryb bez akcji kryminalnych (Pt1°/Pt2°)',
                '**Hostage RP** — wymaga zgody OOC celu + aktywnego Hosta',
              ].join('\n'),
              inline: false,
            },
            {
              name: '🟢 Podstawy komunikacji',
              value: [
                '**IC** — In Character: mówisz jako postać',
                '**OOC** — Out of Character: rozmowa poza RP w nawiasach ()',
                '**/me** — opisujesz czynność postaci, np. /me wyciąga dokumenty',
                '**/do** — opisujesz otoczenie (scena, przedmioty)',
              ].join('\n'),
              inline: false,
            },
            {
              name: '🔵 Kody i systemy',
              value: [
                '**10-4** — Potwierdzam (kod radiowy)',
                '**10-33** — ALARM! Pilna pomoc! (najwyższy priorytet)',
                '**10-70** — Pościg w toku',
                '**BOLO** — Be On Look Out: ogłoszenie o poszukiwanej osobie',
                'Pełna lista: `/kod-10`',
              ].join('\n'),
              inline: false,
            },
          )
          .setFooter({ text: 'AURORA Greenville RP — Słownik RP v5.0' })
          .setTimestamp();

        await slownikChannel.send({ embeds: [embed] });
        sent.push(`✅ #${slownikChannel.name}`);
      } catch (e) {
        failed.push(`❌ słownik-rp: ${e.message}`);
      }
    }

    // ── 4. #otwórz-ticket ────────────────────────────────────────
    const ticketChannel = ch(guild, 'ticket');
    if (ticketChannel) {
      try {
        await clearBotMessages(ticketChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0x00c8ff)
          .setTitle('🎫 System ticketów')
          .setDescription(
            'Potrzebujesz pomocy staffu? Masz pytanie, skargę lub problem?\n\n' +
            '**Kiedy otworzyć ticket:**\n' +
            '> • Problem z weryfikacją lub kontem\n' +
            '> • Skarga na gracza lub staff\n' +
            '> • Błąd bota lub systemu\n' +
            '> • Pytanie do administracji\n' +
            '> • Podanie o rolę specjalną\n\n' +
            '**Jak to działa:**\n' +
            '> 1️⃣ Kliknij przycisk poniżej\n' +
            '> 2️⃣ Wybierz kategorię ticketu\n' +
            '> 3️⃣ Opisz swój problem\n' +
            '> 4️⃣ Poczekaj na odpowiedź staffu\n\n' +
            '*Nie nadużywaj ticketów — służą do poważnych spraw.*'
          )
          .setFooter({ text: 'AURORA Greenville RP — Support' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_create')
            .setLabel('🎫 Otwórz ticket')
            .setStyle(ButtonStyle.Primary)
        );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ #${ticketChannel.name}`);
      } catch (e) {
        failed.push(`❌ ticket: ${e.message}`);
      }
    }

    // ── 5. #stwórz-postać ────────────────────────────────────────
    const postacChannel = ch(guild, 'postac') || ch(guild, 'postać');
    if (postacChannel) {
      try {
        await clearBotMessages(postacChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0x30d158)
          .setTitle('🪪 Tworzenie postaci RP')
          .setDescription(
            'Zanim zaczniesz grać, stwórz swoją postać!\n\n' +
            '**Co otrzymasz:**\n' +
            '> 👤 Imię i nazwisko IC\n' +
            '> 🆔 Numer PESEL\n' +
            '> 📱 Unikalny numer telefonu RP\n' +
            '> 🪪 Dowód osobisty\n\n' +
            '**Wymagania:**\n' +
            '> • Musisz mieć rolę **Mieszkaniec**\n' +
            '> • Imię i nazwisko muszą brzmieć realistycznie\n\n' +
            '**Komenda:** `/postac stworz`'
          )
          .setFooter({ text: 'AURORA Greenville RP — Postacie' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('character_create')
            .setLabel('👤 Stwórz postać')
            .setStyle(ButtonStyle.Success)
        );

        await postacChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ #${postacChannel.name}`);
      } catch (e) {
        failed.push(`❌ stwórz-postać: ${e.message}`);
      }
    }

    // ── 6. #prawo-jazdy ──────────────────────────────────────────
    const prawoChannel = ch(guild, 'prawo-jazdy') || ch(guild, 'prawojazdy');
    if (prawoChannel) {
      try {
        await clearBotMessages(prawoChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('🚗 Prawo jazdy — egzaminy')
          .setDescription(
            'Aby prowadzić pojazdy w RP, potrzebujesz prawa jazdy!\n\n' +
            '**Dostępne kategorie:**\n' +
            '> 🛵 **Kat. AM** — motorower (do 45 km/h)\n' +
            '> 🏍️ **Kat. A1** — motocykl do 125 cm³\n' +
            '> 🏍️ **Kat. A2** — motocykl do 35 kW\n' +
            '> 🏍️ **Kat. A** — każdy motocykl\n' +
            '> 🚗 **Kat. B** — samochód osobowy (wymagane do rejestracji auta)\n' +
            '> 🚛 **Kat. C** — pojazd ciężarowy\n' +
            '> 🚌 **Kat. D** — autobus\n' +
            '> 🚜 **Kat. T** — ciągnik rolniczy\n\n' +
            '**Komenda:** `/prawojazdy egzamin [kategoria]`\n\n' +
            '*Egzamin składa się z 10 pytań — wymagane 8/10.*'
          )
          .setFooter({ text: 'AURORA Greenville RP — Prawo jazdy' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('license_apply')
            .setLabel('📋 Przystąp do egzaminu')
            .setStyle(ButtonStyle.Primary)
        );

        await prawoChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ #${prawoChannel.name}`);
      } catch (e) {
        failed.push(`❌ prawo-jazdy: ${e.message}`);
      }
    }

    // ── 7. #rejestracja-auta ─────────────────────────────────────
    const autoChannel = ch(guild, 'rejestracja');
    if (autoChannel) {
      try {
        await clearBotMessages(autoChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0x94A3B8)
          .setTitle('🚗 Rejestracja pojazdu')
          .setDescription(
            'Zarejestruj swój pojazd RP!\n\n' +
            '**Wymagania:**\n' +
            '> • Rola **Mieszkaniec**\n' +
            '> • Prawo jazdy kategorii odpowiedniej do pojazdu\n' +
            '> • Stworzony dowód osobisty\n\n' +
            '**Limity pojazdów:**\n' +
            '> 👤 Mieszkaniec — do **5** pojazdów\n' +
            '> 💜 Wspierający — do **9** pojazdów\n' +
            '> 💎 Nitro Booster — do **10** pojazdów\n\n' +
            '**Komenda:** `/pojazd rejestruj`'
          )
          .setFooter({ text: 'AURORA Greenville RP — Pojazdy' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('vehicle_register')
            .setLabel('🚗 Zarejestruj pojazd')
            .setStyle(ButtonStyle.Secondary)
        );

        await autoChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ #${autoChannel.name}`);
      } catch (e) {
        failed.push(`❌ rejestracja-auta: ${e.message}`);
      }
    }

    // ── 8. #rola-powiadomień ─────────────────────────────────────
    const notifChannel = ch(guild, 'powiadomien') || ch(guild, 'powiadomień');
    if (notifChannel) {
      try {
        await clearBotMessages(notifChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0xFFFFFF)
          .setTitle('🔔 Powiadomienia o sesjach')
          .setDescription(
            'Chcesz być informowany o nadchodzących sesjach RP?\n\n' +
            'Kliknij przycisk poniżej aby przypisać/zdjąć sobie rolę ' +
            '**🔔 Powiadomienia** — będziesz oznaczany przy ogłoszeniach sesji!\n\n' +
            '*Możesz w każdej chwili usunąć rolę klikając ponownie.*'
          )
          .setFooter({ text: 'AURORA Greenville RP — Powiadomienia' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('toggle_notifications')
            .setLabel('🔔 Włącz / Wyłącz powiadomienia')
            .setStyle(ButtonStyle.Secondary)
        );

        await notifChannel.send({ embeds: [embed], components: [row] });
        sent.push(`✅ #${notifChannel.name}`);
      } catch (e) {
        failed.push(`❌ rola-powiadomień: ${e.message}`);
      }
    }

    // ── 9. #faq ──────────────────────────────────────────────────
    const faqChannel = ch(guild, 'faq');
    if (faqChannel) {
      try {
        await clearBotMessages(faqChannel, clientId);
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('❓ Najczęściej zadawane pytania')
          .setDescription(
            '**Jak dołączyć do serwera RP?**\n' +
            '> Wejdź na kanał z weryfikacją i kliknij **Wypełnij formularz weryfikacyjny**.\n\n' +
            '**Ile mam czasu na formularz?**\n' +
            '> Nie ma limitu czasu. Po nieudanej próbie odczekaj 24 godziny.\n\n' +
            '**Jak zmienić nick Roblox?**\n' +
            '> Otwórz ticket — staff pomoże zmienić powiązanie.\n\n' +
            '**Kiedy są sesje?**\n' +
            '> Sprawdź kanał z planem sesji lub włącz powiadomienia.\n\n' +
            '**Jak dołączyć do służb?**\n' +
            '> Złóż podanie na kanale podań o służbę.\n\n' +
            '**Mam problem z botem — co robić?**\n' +
            '> Otwórz ticket w dedykowanym kanale.'
          )
          .setFooter({ text: 'AURORA Greenville RP — FAQ' });

        await faqChannel.send({ embeds: [embed] });
        sent.push(`✅ #${faqChannel.name}`);
      } catch (e) {
        failed.push(`❌ faq: ${e.message}`);
      }
    }

    // ── 10. #taryfikator ─────────────────────────────────────────
    const taryfikatorChannel = ch(guild, 'taryfikator');
    if (taryfikatorChannel) {
      try {
        await clearBotMessages(taryfikatorChannel, clientId);
        const emb1 = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('⚖️ TARYFIKATOR KAR — AURORA Greenville RP')
          .setDescription('Kompletny taryfikator kar Discord i RP. Recydywa (w ciągu 30 dni) = kara x2.\nPełna lista: `/taryfikator`')
          .addFields(
            { name: '🟦 NIEBIESKA — Minimalna', value: 'Spam, caps, OT → **Warn/Mute**', inline: true },
            { name: '🟩 ZIELONA — Niska',       value: 'FRP 1×, Metagaming → **Warn + Kick**', inline: true },
            { name: '🟧 POMARAŃCZOWA — Wysoka', value: 'RDM, VDM, CL → **Ban 3–14 dni**', inline: true },
            { name: '🟥 CZERWONA — Krytyczna',  value: 'Exploit, dox, NSFW → **Permanentny ban**', inline: true },
          )
          .setFooter({ text: 'AURORA Greenville RP — Taryfikator v5.0' })
          .setTimestamp();
        await taryfikatorChannel.send({ embeds: [emb1] });
        sent.push(`✅ #${taryfikatorChannel.name}`);
      } catch (e) {
        failed.push(`❌ taryfikator: ${e.message}`);
      }
    }

    // ── Wynik ────────────────────────────────────────────────────
    const total = 10;
    const lines = [];
    if (sent.length > 0) lines.push('**Wysłano:**\n' + sent.join('\n'));
    if (failed.length > 0) lines.push('**Błędy:**\n' + failed.join('\n'));
    if (sent.length === 0 && failed.length === 0) {
      lines.push('⚠️ Nie znaleziono żadnych kanałów. Upewnij się że kanały mają właściwe nazwy.');
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(failed.length === 0 ? 0x57F287 : 0xFEE75C)
          .setTitle(
            failed.length === 0
              ? `✅ Wysłano ${sent.length}/${total} embedów!`
              : `⚠️ Wysłano ${sent.length}/${total} embedów (z błędami)`
          )
          .setDescription(lines.join('\n\n'))
          .setTimestamp(),
      ],
    });

    logger.info(`/setup-embeds użyte przez ${interaction.user.tag} — ${sent.length}/${total} kanałów`);
  },
};
