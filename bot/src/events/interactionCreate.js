// Obsługa wszystkich interakcji Discord
// Komendy slash, przyciski, modals, select menus

const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client, prisma) {
    try {
      // ==================== SLASH COMMANDS ====================
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          logger.warn(`Nieznana komenda: /${interaction.commandName}`);
          return;
        }

        // Log użycia komendy
        logger.info(`/${interaction.commandName} użyte przez ${interaction.user.tag} na ${interaction.guild?.name}`);

        try {
          await command.execute(interaction, client, prisma);
        } catch (error) {
          logger.error(`Błąd komendy /${interaction.commandName}:`, error);
          const errorMsg = {
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Błąd komendy')
                .setDescription(
                  `Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub skontaktuj się z administracją.\n\`\`\`${error.message}\`\`\``
                )
                .setTimestamp()
            ],
            ephemeral: true,
          };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMsg).catch(() => {});
          } else {
            await interaction.reply(errorMsg).catch(() => {});
          }
        }
        return;
      }

      // ==================== BUTTONS ====================
      if (interaction.isButton()) {
        const [prefix, ...args] = interaction.customId.split('_');
        const handlerFile = BUTTON_HANDLERS[interaction.customId] || BUTTON_PREFIX_HANDLERS[prefix];

        if (handlerFile) {
          try {
            const handler = require(`../buttons/${handlerFile}`);
            await handler.execute(interaction, client, prisma, args);
          } catch (error) {
            logger.error(`Błąd przycisku ${interaction.customId}:`, error);
            await interaction.reply({
              content: '❌ Wystąpił błąd podczas obsługi przycisku.',
              ephemeral: true,
            }).catch(() => {});
          }
        } else {
          logger.warn(`Brak handlera dla przycisku: ${interaction.customId}`);
        }
        return;
      }

      // ==================== MODALS ====================
      if (interaction.isModalSubmit()) {
        const [prefix, ...args] = interaction.customId.split('_');
        const handlerFile = MODAL_HANDLERS[interaction.customId] || MODAL_PREFIX_HANDLERS[prefix];

        if (handlerFile) {
          try {
            const handler = require(`../modals/${handlerFile}`);
            await handler.execute(interaction, client, prisma, args);
          } catch (error) {
            logger.error(`Błąd modala ${interaction.customId}:`, error);
            await interaction.reply({
              content: '❌ Wystąpił błąd podczas przetwarzania formularza.',
              ephemeral: true,
            }).catch(() => {});
          }
        } else {
          logger.warn(`Brak handlera dla modala: ${interaction.customId}`);
        }
        return;
      }

      // ==================== SELECT MENUS ====================
      if (interaction.isStringSelectMenu()) {
        const [prefix, ...args] = interaction.customId.split('_');
        const handlerFile = SELECT_HANDLERS[interaction.customId] || SELECT_PREFIX_HANDLERS[prefix];

        if (handlerFile) {
          try {
            const handler = require(`../selectMenus/${handlerFile}`);
            await handler.execute(interaction, client, prisma, args);
          } catch (error) {
            logger.error(`Błąd select menu ${interaction.customId}:`, error);
            await interaction.reply({
              content: '❌ Wystąpił błąd.',
              ephemeral: true,
            }).catch(() => {});
          }
        }
        return;
      }

    } catch (error) {
      logger.error('Krytyczny błąd w interactionCreate:', error);
    }
  },
};

// ==================== MAPOWANIE HANDLERÓW ====================

// Dokładne dopasowanie customId → plik w /buttons
const BUTTON_HANDLERS = {
  // ── Weryfikacja (nowy system) ──────────────────────────────
  'verify_start':    'verification/startVerification',  // przycisk w embedzie #zacznij-tutaj
  // ── Stare handlery (zachowane dla kompatybilności) ─────────
  'verify_roblox':   'verification/verifyRoblox',
  'verify_quiz':     'verification/verifyQuiz',
  // ── Tickety ────────────────────────────────────────────────
  'ticket_create':   'tickets/createTicket',
  'ticket_close':    'tickets/closeTicket',
  'ticket_claim':    'tickets/claimTicket',
  // ── Inne ───────────────────────────────────────────────────
  'vehicle_register':'vehicles/registerVehicle',
  'character_create':'characters/createCharacter',
  'license_apply':   'licenses/applyLicense',
};

// Dopasowanie po prefixie (np. ticket_close_1234 → prefix 'ticket')
const BUTTON_PREFIX_HANDLERS = {
  'quiz':      'verification/quizAnswer',   // quiz_A_0, quiz_B_2, itd.
  'session':   'sessions/sessionButton',
  'license':   'licenses/applyLicense',
  'job':       'jobs/jobApply',             // job_apply_[jobId], job_cancel
};

const MODAL_HANDLERS = {
  'modal_verification':    'verification/verificationModal',  // nowy system
  'modal_verify_roblox':   'verification/robloxModal',        // stary (fallback)
  'modal_character':       'characters/characterModal',
  'modal_vehicle':         'vehicles/vehicleModal',
};

const MODAL_PREFIX_HANDLERS = {
  'job': 'jobs/jobModal',  // job_modal_[jobId]
};

const SELECT_HANDLERS = {
  'application_select':    'applications/applicationSelect',
  'ticket_category':       'tickets/ticketCategorySelect',
  'license_select':        'licenses/licenseSelect',
  'job_select_kategoria':  'jobs/jobSelectKategoria',
  'job_select_praca':      'jobs/jobSelectPraca',
};

const SELECT_PREFIX_HANDLERS = {};
