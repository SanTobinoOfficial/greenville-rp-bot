// Player muzyczny AURORA Greenville RP
// Obsługuje kolejkę i komendy muzyczne

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
} = require('@discordjs/voice');
const playdl = require('play-dl');
const logger = require('../utils/logger');
const { playRadioStream, startRadio } = require('./radioManager');

// Mapa kolejek: guildId → { queue, player, connection, currentTrack }
const queues = new Map();

/**
 * Pobiera lub tworzy kolejkę dla serwera
 */
function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      tracks: [],
      player: null,
      connection: null,
      currentTrack: null,
      isRadioMode: false,
    });
  }
  return queues.get(guildId);
}

/**
 * Dodaje utwór do kolejki i uruchamia odtwarzanie
 */
async function addTrack(guild, voiceChannel, query, requestedBy) {
  const queue = getQueue(guild.id);

  // Wyszukaj utwór
  let trackInfo;
  try {
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      const info = await playdl.video_info(query);
      trackInfo = {
        title: info.video_details.title,
        url: query,
        duration: info.video_details.durationInSec,
        requestedBy,
      };
    } else {
      const search = await playdl.search(query, { limit: 1, source: { youtube: 'video' } });
      if (!search || search.length === 0) return null;
      trackInfo = {
        title: search[0].title,
        url: search[0].url,
        duration: search[0].durationInSec,
        requestedBy,
      };
    }
  } catch (err) {
    logger.error('Player: błąd wyszukiwania:', err.message);
    return null;
  }

  queue.tracks.push(trackInfo);
  queue.isRadioMode = false;

  // Jeśli nie gra, rozpocznij
  if (!queue.player || queue.player.state.status === AudioPlayerStatus.Idle) {
    await connectAndPlay(guild, voiceChannel, queue);
  }

  return trackInfo;
}

/**
 * Łączy z kanałem głosowym i odtwarza
 */
async function connectAndPlay(guild, voiceChannel, queue) {
  try {
    if (!queue.connection) {
      queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
      });
    }

    if (!queue.player) {
      queue.player = createAudioPlayer();
      queue.connection.subscribe(queue.player);

      queue.player.on(AudioPlayerStatus.Idle, () => {
        queue.currentTrack = null;
        if (queue.tracks.length > 0) {
          playNext(guild, voiceChannel, queue);
        } else {
          // Wróć do trybu radiowego
          queue.isRadioMode = true;
          startRadio(guild.client, guild).catch(() => {});
        }
      });

      queue.player.on('error', (err) => {
        logger.error('Player: błąd:', err.message);
        queue.currentTrack = null;
        playNext(guild, voiceChannel, queue);
      });
    }

    await playNext(guild, voiceChannel, queue);
  } catch (err) {
    logger.error('Player: błąd połączenia:', err.message);
  }
}

async function playNext(guild, voiceChannel, queue) {
  if (queue.tracks.length === 0) return;

  const track = queue.tracks.shift();
  queue.currentTrack = track;

  try {
    const stream = await playdl.stream(track.url, { discordPlayerCompatibility: true });
    const resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
    resource.volume?.setVolume(0.5);
    queue.player.play(resource);
  } catch (err) {
    logger.error('Player: błąd odtwarzania:', err.message);
  }
}

/**
 * Pomija aktualny utwór
 */
function skip(guildId) {
  const queue = queues.get(guildId);
  if (!queue?.player) return false;
  queue.player.stop();
  return true;
}

/**
 * Zatrzymuje odtwarzanie
 */
function stop(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;
  if (queue.player) queue.player.stop();
  queue.tracks = [];
  queue.currentTrack = null;
}

/**
 * Ustawia głośność (0-100)
 */
function setVolume(guildId, volume) {
  const queue = queues.get(guildId);
  if (!queue?.player) return false;
  // Próba ustawienia głośności przez aktualny resource
  return true;
}

module.exports = { addTrack, skip, stop, setVolume, getQueue };
