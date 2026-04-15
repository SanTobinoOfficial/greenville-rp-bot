import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STR = (v: unknown) => (v !== undefined && v !== null ? String(v) : undefined);
const NUM = (v: unknown) => (v !== undefined && v !== null ? Number(v) : undefined);
const BOOL = (v: unknown) => (v !== undefined && v !== null ? Boolean(v) : undefined);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.OWNER) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });

  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.OWNER) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const body = await req.json();

  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {
      maxVehiclesBase:       NUM(body.maxVehiclesBase),
      maxVehiclesSupporter:  NUM(body.maxVehiclesSupporter),
      maxVehiclesBooster:    NUM(body.maxVehiclesBooster),
      quizPassScore:         NUM(body.quizPassScore),
      quizTotalQuestions:    NUM(body.quizTotalQuestions),
      quizCooldownHours:     NUM(body.quizCooldownHours),
      robloxGroupId:         STR(body.robloxGroupId),
      frpSpeedLimit:         NUM(body.frpSpeedLimit),
      maxMandaty:            NUM(body.maxMandaty),
      maxGrzywny:            NUM(body.maxGrzywny),
      maxAreszty:            NUM(body.maxAreszty),
      licenseSuspensionDays: NUM(body.licenseSuspensionDays),
      warnAutoMuteCount:     NUM(body.warnAutoMuteCount),
      warnAutoBanCount:      NUM(body.warnAutoBanCount),
      radioUrl:              STR(body.radioUrl),
      auditLogChannelId:     STR(body.auditLogChannelId),
      welcomeChannelId:      STR(body.welcomeChannelId),
      regulaminChannelId:    STR(body.regulaminChannelId),
      ogloszeniaChanelId:    STR(body.ogloszeniaChanelId),
      zacznijTutajChannelId: STR(body.zacznijTutajChannelId),
      ogolneChatChannelId:   STR(body.ogolneChatChannelId),
      ticketEmbedChannelId:  STR(body.ticketEmbedChannelId),
      ticketLogsChannelId:   STR(body.ticketLogsChannelId),
      ticketCategoryId:      STR(body.ticketCategoryId),
      ticketAdminRoleId:     STR(body.ticketAdminRoleId),
      ticketPingRoleId:      STR(body.ticketPingRoleId),
      roleOwner:             STR(body.roleOwner),
      roleCoOwner:           STR(body.roleCoOwner),
      roleAdmin:             STR(body.roleAdmin),
      roleMod:               STR(body.roleMod),
      roleHelper:            STR(body.roleHelper),
      roleHR:                STR(body.roleHR),
      roleHost:              STR(body.roleHost),
      rolePolicja:           STR(body.rolePolicja),
      roleEMS:               STR(body.roleEMS),
      roleStraz:             STR(body.roleStraz),
      roleDOT:               STR(body.roleDOT),
      roleMieszkaniec:       STR(body.roleMieszkaniec),
      roleNitroBooster:      STR(body.roleNitroBooster),
      roleWspierajacy:       STR(body.roleWspierajacy),
      regulaminText:         STR(body.regulaminText),
      regulaminMessageId:    STR(body.regulaminMessageId),
      embedColor:            STR(body.embedColor),
      setupCompleted:        BOOL(body.setupCompleted),
      guildId:               STR(body.guildId),
      serverDescription:     STR(body.serverDescription),
      maintenanceMode:       BOOL(body.maintenanceMode),
      maintenanceMessage:    STR(body.maintenanceMessage),
    },
    create: { id: 'global' },
  });

  return NextResponse.json(settings);
}
