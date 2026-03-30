import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      maxVehiclesBase:       body.maxVehiclesBase       !== undefined ? Number(body.maxVehiclesBase)       : undefined,
      maxVehiclesSupporter:  body.maxVehiclesSupporter  !== undefined ? Number(body.maxVehiclesSupporter)  : undefined,
      maxVehiclesBooster:    body.maxVehiclesBooster    !== undefined ? Number(body.maxVehiclesBooster)    : undefined,
      quizPassScore:         body.quizPassScore         !== undefined ? Number(body.quizPassScore)         : undefined,
      quizTotalQuestions:    body.quizTotalQuestions    !== undefined ? Number(body.quizTotalQuestions)    : undefined,
      quizCooldownHours:     body.quizCooldownHours     !== undefined ? Number(body.quizCooldownHours)     : undefined,
      robloxGroupId:         body.robloxGroupId         !== undefined ? String(body.robloxGroupId)         : undefined,
      frpSpeedLimit:         body.frpSpeedLimit         !== undefined ? Number(body.frpSpeedLimit)         : undefined,
      maxMandaty:            body.maxMandaty            !== undefined ? Number(body.maxMandaty)            : undefined,
      maxGrzywny:            body.maxGrzywny            !== undefined ? Number(body.maxGrzywny)            : undefined,
      maxAreszty:            body.maxAreszty            !== undefined ? Number(body.maxAreszty)            : undefined,
      licenseSuspensionDays: body.licenseSuspensionDays !== undefined ? Number(body.licenseSuspensionDays) : undefined,
      radioUrl:              body.radioUrl              !== undefined ? String(body.radioUrl)              : undefined,
      warnAutoMuteCount:     body.warnAutoMuteCount     !== undefined ? Number(body.warnAutoMuteCount)     : undefined,
      warnAutoBanCount:      body.warnAutoBanCount      !== undefined ? Number(body.warnAutoBanCount)      : undefined,
      setupCompleted:        body.setupCompleted        !== undefined ? Boolean(body.setupCompleted)       : undefined,
      guildId:               body.guildId              !== undefined ? String(body.guildId)               : undefined,
    },
    create: { id: 'global' },
  });

  return NextResponse.json(settings);
}
