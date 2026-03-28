// Wysyła embedy inicjalizujące na odpowiednie kanały po setup
// Weryfikacja, tickety, rejestracja pojazdów, prawo jazdy, etc.

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { buildRegulaminEmbeds, buildPojeciaRpEmbed } = require('./regulamin');
const logger = require('../utils/logger');

/**
 * Wysyła wszystkie inicjalizujące embedy na odpowiednie kanały
 * @param {import('discord.js').Guild} guild
 * @param {Object} channels - mapa nazwa → obiekt kanału
 */
async function sendSetupEmbeds(guild, channels) {
  const send = async (channelName, payload) => {
    const channel = channels[channelName] ||
      guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
    if (!channel) {
      logger.warn(`Kanał ${channelName} nie znaleziony — pomijam embed`);
      return;
    }
    try {
      // Wyczyść poprzednie wiadomości bota
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessages = messages.filter(m => m.author.id === guild.client.user.id);
      for (const msg of botMessages.values()) {
        await msg.delete().catch(() => {});
      }
      await channel.send(payload);
    } catch (err) {
      logger.error(`Błąd wysyłania embeda na ${channelName}:`, err.message);
    }
  };

  // ==================== REGULAMIN ====================
  const regulaminEmbeds = buildRegulaminEmbeds();
  const regulaminChannel = channels['❗│regulamin'] ||
    guild.channels.cache.find(c => c.name === '❗│regulamin' && c.isTextBased());
  if (regulaminChannel) {
    try {
      const msgs = await regulaminChannel.messages.fetch({ limit: 20 });
      const botMsgs = msgs.filter(m => m.author.id === guild.client.user.id);
      for (const m of botMsgs.values()) await m.delete().catch(() => {});
      for (const embed of regulaminEmbeds) {
        await regulaminChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error('Błąd wysyłania regulaminu:', err.message);
    }
  }

  // ==================== POJĘCIA RP ====================
  await send('📖│pojęcia-rp', { embeds: [buildPojeciaRpEmbed()] });

  // ==================== WERYFIKACJA ====================
  const weryfikacjaEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✅ Weryfikacja — Greenville RP')
    .setDescription(
      '**Witaj na serwerze Greenville RP!**\n\n' +
      'Aby uzyskać dostęp do serwera, musisz przejść przez weryfikację w 2 krokach:\n\n' +
      '**Krok 1:** Zweryfikuj swój nick Roblox klikając przycisk poniżej.\n' +
      '**Krok 2:** Rozwiąż krótki quiz z regulaminu (10 pytań).\n\n' +
      '> ⚠️ Potrzebujesz konta Roblox w wieku **13+**.'
    )
    .addFields(
      { name: '📌 Wymagania', value: '• Konto Roblox 13+\n• Min. 8/10 pkt. z quizu (lub 6–7 z ostrzeżeniem)', inline: false }
    )
    .setFooter({ text: 'Greenville RP — Weryfikacja' })
    .setTimestamp();

  const weryfikacjaRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_roblox')
      .setLabel('🔍 Zweryfikuj nick Roblox')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('verify_quiz')
      .setLabel('📋 Przejdź do quizu')
      .setStyle(ButtonStyle.Primary)
  );

  await send('📋│weryfikacja', { embeds: [weryfikacjaEmbed], components: [weryfikacjaRow] });

  // ==================== TICKET ====================
  const ticketEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 System Ticketów — Greenville RP')
    .setDescription(
      'Potrzebujesz pomocy? Masz problem? Skontaktuj się ze staffem!\n\n' +
      'Kliknij przycisk poniżej, aby otworzyć ticket i wybrać kategorię.'
    )
    .addFields(
      { name: '📋 Dostępne kategorie', value: '🆘 Problem techniczny\n❓ Pytanie do staffu\n⚖️ Apelacja od kary\n🚗 Problem z pojazdem / PJ\n💼 Sprawa dot. pracy\n😡 Skarga na gracza lub staffa', inline: false }
    )
    .setFooter({ text: 'Greenville RP — Tickety' })
    .setTimestamp();

  const ticketRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('📩 Utwórz Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await send('🎫│ticket', { embeds: [ticketEmbed], components: [ticketRow] });

  // ==================== REJESTRACJA POJAZDÓW ====================
  const pojazdyEmbed = new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('🚗 Rejestracja Pojazdów — Greenville RP')
    .setDescription(
      'Aby uczestniczyć w sesjach RP, **musisz** zarejestrować swój pojazd!\n\n' +
      '**Limity rejestracji:**\n' +
      '👤 Mieszkaniec — do **5** pojazdów (łącznie do 90 000$)\n' +
      '💜 Wspierający — do **9** pojazdów\n' +
      '💎 Booster — do **10** pojazdów\n\n' +
      '> Nie dotyczy pojazdów limitowanych, eventowych i kolekcjonerskich.'
    )
    .setFooter({ text: 'Greenville RP — Rejestracja' })
    .setTimestamp();

  const pojazdyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('vehicle_register')
      .setLabel('🚗 Zarejestruj pojazd')
      .setStyle(ButtonStyle.Primary)
  );

  await send('🚗│rejestrowanie-samochodu', { embeds: [pojazdyEmbed], components: [pojazdyRow] });

  // ==================== DOWÓD OSOBISTY ====================
  const dowodEmbed = new EmbedBuilder()
    .setColor(0x3B82F6)
    .setTitle('🪪 Dowód Osobisty — Greenville RP')
    .setDescription(
      'Stwórz postać RP i uzyskaj swój dowód osobisty!\n\n' +
      'Twoja postać będzie miała:\n' +
      '• **Imię i nazwisko** postaci RP\n' +
      '• **PESEL RP** (fikcyjny, zgodny z datą urodzenia)\n' +
      '• **Numer ID dokumentu** (format: GV-XXXXXX)\n' +
      '• **Numer telefonu RP**\n\n' +
      '> Dane postaci możesz zmienić max. 1x na 30 dni.'
    )
    .setFooter({ text: 'Greenville RP — Dowód Osobisty' })
    .setTimestamp();

  const dowodRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('character_create')
      .setLabel('🪪 Stwórz postać')
      .setStyle(ButtonStyle.Primary)
  );

  await send('🪪│dowód-osobisty', { embeds: [dowodEmbed], components: [dowodRow] });

  // ==================== PRAWO JAZDY ====================
  const prawojazdzaEmbed = new EmbedBuilder()
    .setColor(0x94A3B8)
    .setTitle('🪪 Prawo Jazdy — Greenville RP')
    .setDescription(
      'Aby legalnie prowadzić pojazd podczas sesji RP, musisz posiadać prawo jazdy!\n\n' +
      '**Dostępne kategorie:**\n' +
      '🏍️ **AM** — Motorower\n' +
      '🏍️ **A1** — Motocykl do 125cc\n' +
      '🏍️ **A2** — Motocykl do 35kW\n' +
      '🏍️ **A** — Motocykl bez ograniczeń\n' +
      '🚗 **B** — Samochód osobowy\n' +
      '🚛 **C** — Pojazd ciężarowy\n' +
      '🚌 **D** — Autobus\n\n' +
      'Kliknij przycisk poniżej, aby zapisać się na egzamin.'
    )
    .setFooter({ text: 'Greenville RP — Prawo Jazdy' })
    .setTimestamp();

  const prawojazdzaRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('license_apply')
      .setLabel('🪪 Zapisz się na egzamin')
      .setStyle(ButtonStyle.Primary)
  );

  await send('🪪│prawo-jazdy', { embeds: [prawojazdzaEmbed], components: [prawojazdzaRow] });

  // ==================== PODANIA NA PRACĘ ====================
  const podaniaEmbed = new EmbedBuilder()
    .setColor(0x10B981)
    .setTitle('💼 Podania na Służby — Greenville RP')
    .setDescription(
      'Chcesz dołączyć do służb? Wypełnij podanie!\n\n' +
      '**Dostępne służby:**\n' +
      '🚔 Policja\n🚒 Straż Pożarna\n🚑 EMS\n🚧 DOT\n🏛️ Straż Miejska\n\n' +
      '**Wymagania:** Konto Discord 7+ dni, brak aktywnych warnów (>2)'
    )
    .setFooter({ text: 'Greenville RP — Podania' })
    .setTimestamp();

  const podaniaRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('application_select')
      .setPlaceholder('Wybierz służbę...')
      .addOptions([
        { label: '🚔 Policja', value: 'Policja', description: 'Dołącz do wydziału Policji' },
        { label: '🚒 Straż Pożarna', value: 'Straż Pożarna', description: 'Dołącz do Straży Pożarnej' },
        { label: '🚑 EMS', value: 'EMS', description: 'Dołącz do Ratownictwa Medycznego' },
        { label: '🚧 DOT', value: 'DOT', description: 'Dołącz do Departamentu Transportu' },
        { label: '🏛️ Straż Miejska', value: 'Straż Miejska', description: 'Dołącz do Straży Miejskiej' },
      ])
  );

  await send('💼│podanie-o-pracę', { embeds: [podaniaEmbed], components: [podaniaRow] });

  logger.info('Wszystkie embedy inicjalizujące wysłane');
}

module.exports = { sendSetupEmbeds };
