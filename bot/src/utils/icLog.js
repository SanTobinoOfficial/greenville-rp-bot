// Utility: zapisuje publiczne akcje IC (/me, /do, /krzyk) do modelu ProximityMessage.
// Fire-and-forget — nigdy nie blokuje komendy nadrzędnej. Wiadomości wygasają po 30 dniach.

const EXPIRY_DAYS = 30;

async function logIcAction(prisma, discordId, channelId, icName, type, content) {
  try {
    const user = await prisma.user.findUnique({
      where:  { discordId },
      select: { id: true },
    });
    if (!user) return;

    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000);

    await prisma.proximityMessage.create({
      data: {
        locationId: channelId,
        userId:     user.id,
        username:   icName,
        content:    `[${type}] ${content}`,
        expiresAt,
      },
    });
  } catch {
    // Cisza — błąd logowania nie może przerywać akcji IC
  }
}

module.exports = { logIcAction };
