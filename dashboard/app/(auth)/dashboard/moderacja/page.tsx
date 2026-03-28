// Dashboard — Moderacja (Cases)
// Lista wszystkich przypadków moderacyjnych z filtrowaniem

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const TYPE_COLORS: Record<string, string> = {
  WARN:   'text-yellow-400',
  BAN:    'text-red-400',
  KICK:   'text-pink-400',
  MUTE:   'text-orange-400',
  UNBAN:  'text-green-400',
  UNMUTE: 'text-green-300',
};

const TYPE_EMOJIS: Record<string, string> = {
  WARN: '⚠️', BAN: '🔨', KICK: '👢', MUTE: '🔇', UNBAN: '✅', UNMUTE: '🔊',
};

export default async function ModerationPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) {
    redirect('/login');
  }

  const cases = await prisma.case.findMany({
    orderBy: { caseNumber: 'desc' },
    take: 50,
    include: {
      target: { select: { discordUsername: true, discordId: true } },
      moderator: { select: { discordUsername: true } },
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">🔨 Moderacja — Cases</h1>

      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">Typ</th>
                <th className="p-4 text-left">Gracz</th>
                <th className="p-4 text-left">Moderator</th>
                <th className="p-4 text-left">Powód</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-4 text-gray-400 font-mono">#{c.caseNumber}</td>
                  <td className="p-4">
                    <span className={`font-semibold ${TYPE_COLORS[c.type] || 'text-white'}`}>
                      {TYPE_EMOJIS[c.type]} {c.type}
                    </span>
                  </td>
                  <td className="p-4 text-white">{c.target.discordUsername}</td>
                  <td className="p-4 text-gray-300">{c.moderator.discordUsername}</td>
                  <td className="p-4 text-gray-300 max-w-xs truncate">{c.reason}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      c.status === 'ACTIVE' ? 'bg-green-500/20 text-green-300' :
                      c.status === 'EXPIRED' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    {c.createdAt.toLocaleDateString('pl-PL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cases.length === 0 && (
          <div className="text-center py-12 text-gray-500">Brak przypadków moderacyjnych.</div>
        )}
      </div>
    </div>
  );
}
