// Integracja z Roblox API
// Weryfikacja nicku, sprawdzanie grup, pobieranie danych użytkownika

const axios = require('axios');
const logger = require('./logger');

const ROBLOX_API = 'https://users.roblox.com/v1';
const ROBLOX_GROUPS_API = 'https://groups.roblox.com/v1';
const ROBLOX_THUMBNAILS_API = 'https://thumbnails.roblox.com/v1';

/**
 * Pobiera dane użytkownika Roblox po nicku
 * @param {string} username
 * @returns {{ id: number, name: string, displayName: string } | null}
 */
async function getUserByUsername(username) {
  try {
    const response = await axios.post(`${ROBLOX_API}/usernames/users`, {
      usernames: [username],
      excludeBannedUsers: false,
    });

    const users = response.data?.data;
    if (!users || users.length === 0) return null;

    return {
      id: users[0].id,
      name: users[0].name,
      displayName: users[0].displayName,
    };
  } catch (error) {
    logger.error('Roblox API — getUserByUsername:', error.message);
    return null;
  }
}

/**
 * Pobiera dane użytkownika Roblox po ID
 */
async function getUserById(userId) {
  try {
    const response = await axios.get(`${ROBLOX_API}/users/${userId}`);
    return response.data;
  } catch (error) {
    logger.error('Roblox API — getUserById:', error.message);
    return null;
  }
}

/**
 * Sprawdza czy użytkownik jest w grupie Roblox
 * @param {number} userId
 * @param {number|string} groupId
 * @returns {boolean}
 */
async function isInGroup(userId, groupId) {
  if (!groupId || groupId === '') return true; // Brak grupy = brak wymogu

  try {
    const response = await axios.get(
      `${ROBLOX_GROUPS_API}/users/${userId}/groups/roles`
    );

    const groups = response.data?.data || [];
    return groups.some(g => String(g.group?.id) === String(groupId));
  } catch (error) {
    logger.error('Roblox API — isInGroup:', error.message);
    return false;
  }
}

/**
 * Pobiera URL avatara użytkownika Roblox
 */
async function getAvatarUrl(userId) {
  try {
    const response = await axios.get(
      `${ROBLOX_THUMBNAILS_API}/users/avatar-headshot`,
      {
        params: {
          userIds: userId,
          size: '150x150',
          format: 'Png',
          isCircular: false,
        },
      }
    );
    return response.data?.data?.[0]?.imageUrl || null;
  } catch (error) {
    logger.error('Roblox API — getAvatarUrl:', error.message);
    return null;
  }
}

module.exports = { getUserByUsername, getUserById, isInGroup, getAvatarUrl };
