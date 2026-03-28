// Radio Manager — zarządza odtwarzaniem radia 24/7 na kanale głosowym
// Automatycznie dołącza do kanału 🎵 RMF MAXX i odtwarza stream

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const playdl = require('play-dl');
const logger = require('../utils/logger');

let audioPlayer = null;
let currentGuildId = null;

/**
 * Uruchamia radio na kanale 🎵 RMF MAXX
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 */
async function startRadio(client, guild) {
  try {
    const radioUrl = process.env.RADIO_URL;
    if (!radioUrl) {
      logger.warn('Brak RADIO_URL — radio nie zostanie uruchomione');
      return;
    }

    // Znajdź kanał głosowy RMF MAXX
    const radioChannel = guild.channels.cache.find(
      c => c.name.includes('RMF MAXX') && c.type === 2 // ChannelType.GuildVoice
    );

    if (!radioChannel) {
      logger.warn('Kanał 🎵 RMF MAXX nie znaleziony — radio nie zostanie uruchomione');
      return;
    }

    currentGuildId = guild.id;

    // Dołącz do kanału
    const connection = joinVoiceChannel({
      channelId: radioChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    // Utwórz player audio
    audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    connection.subscribe(audioPlayer);

    // Obsługa zdarzeń połączenia
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      logger.warn('Radio: rozłączono z kanałem głosowym, próba ponownego połączenia...');
      setTimeout(() => startRadio(client, guild), 5000);
    });

    // Obsługa zakończenia utworu — restart streamu
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      logger.debug('Radio: stream zakończony, restartowanie...');
      setTimeout(() => playRadioStream(radioUrl), 2000);
    });

    audioPlayer.on('error', (error) => {
      logger.error('Radio: błąd odtwarzania:', error.message);
      setTimeout(() => playRadioStream(radioUrl), 5000);
    });

    // Rozpocznij odtwarzanie
    await playRadioStream(radioUrl);
    logger.info(`Radio uruchomione na kanale ${radioChannel.name}`);

  } catch (error) {
    logger.error('Błąd uruchamiania radia:', error.message);
  }
}

/**
 * Odtwarza stream audio z YouTube URL
 */
async function playRadioStream(url) {
  try {
    if (!audioPlayer) return;

    const stream = await playdl.stream(url, { discordPlayerCompatibility: true });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });

    resource.volume?.setVolume(0.5);
    audioPlayer.play(resource);
  } catch (error) {
    logger.error('Błąd tworzenia streamu radio:', error.message);
  }
}

/**
 * Zatrzymuje radio
 */
function stopRadio(guildId) {
  if (audioPlayer) {
    audioPlayer.stop();
  }
  const connection = getVoiceConnection(guildId || currentGuildId);
  if (connection) {
    connection.destroy();
  }
  audioPlayer = null;
  logger.info('Radio zatrzymane');
}

/**
 * Pobiera aktualny player audio
 */
function getAudioPlayer() {
  return audioPlayer;
}

module.exports = { startRadio, stopRadio, getAudioPlayer, playRadioStream };
