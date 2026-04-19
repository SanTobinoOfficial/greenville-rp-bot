// /api/jobs/stats — statystyki zatrudnienia dla dashboardu
// GET — zwraca statystyki (top prace, top kategorie, ogólne liczby)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [
    totalVerified,
    employed,
    pendingApplications,
    totalApplications,
    acceptedApplications,
    rejectedApplications,
    recentApplications,
  ] = await Promise.all([
    prisma.user.count({ where: { verifiedAt: { not: null } } }),
    prisma.user.count({ where: { currentJob: { not: null } } }),
    prisma.jobApplication.count({ where: { status: 'PENDING' } }),
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { status: 'ACCEPTED' } }),
    prisma.jobApplication.count({ where: { status: 'REJECTED' } }),
    prisma.jobApplication.findMany({
      where: { appliedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { jobName: true, jobCategory: true, jobType: true, status: true, appliedAt: true },
      orderBy: { appliedAt: 'desc' },
      take: 20,
    }),
  ]);

  // Top prace
  const allEmployed = await prisma.user.findMany({
    where: { currentJob: { not: null } },
    select: { currentJob: true, jobCategory: true },
  });

  const jobCounts: Record<string, { count: number; kategoria: string }> = {};
  const kategoryCounts: Record<string, number> = {};

  for (const u of allEmployed) {
    if (!u.currentJob) continue;
    if (!jobCounts[u.currentJob]) jobCounts[u.currentJob] = { count: 0, kategoria: u.jobCategory ?? '—' };
    jobCounts[u.currentJob].count++;
    kategoryCounts[u.jobCategory ?? 'Inne'] = (kategoryCounts[u.jobCategory ?? 'Inne'] ?? 0) + 1;
  }

  const topJobs = Object.entries(jobCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => ({ name, ...data }));

  const topKategorie = Object.entries(kategoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    overview: {
      totalVerified,
      employed,
      unemployed: totalVerified - employed,
      employmentRate: totalVerified > 0 ? Math.round((employed / totalVerified) * 100) : 0,
      pendingApplications,
      totalApplications,
      acceptedApplications,
      rejectedApplications,
    },
    topJobs,
    topKategorie,
    recentApplications,
  });
}
