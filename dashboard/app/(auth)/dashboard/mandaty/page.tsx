// Dashboard — Historia mandatów RP

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function MandatyPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    redirect('/login');
  }

  const fines = await prisma.fine.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      target: { select: { discordUsername: true, character: true } },
      issuer: { select: { discordUsername: true } },
    },
  });

  const TYPE_INFO: Record<string, { emoji: string; color: string }> = {
    MANDAT:  { emoji: '📜', color: 'text-yellow-400' },
    GRZYWNA: { emoji: '💸', color: 'text-orange-400' },
    ARESZT:  { emoji: '🚔', color: 'text-red-400' },
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">📜 Mandaty RP</h1>

      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="p-4 text-left">Typ</th>
              <th className="p-4 text-left">Gracz</th>
              <th className="p-4 text-left">Postać RP</th>
              <th className="p-4 text-left">Kwota</th>
              <th className="p-4 text-left">Powód</th>
              <th className="p-4 text-left">Wystawił</th>
              <th className="p-4 text-left">Data</th>
            </tr>
          </thead>
          <tbody>
            {fines.map(f => {
              const info = TYPE_INFO[f.type] || { emoji: '📋', color: 'text-white' };
              return (
                <tr key={f.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <span className={`font-medium ${info.color}`}>{info.emoji} {f.type}</span>
                  </td>
                  <td className="p-4 text-white">{f.target.discordUsername}</td>
                  <td className="p-4 text-gray-400">
                    {f.target.character
                      ? `${f.target.character.firstName} ${f.target.character.lastName}`
                      : '—'}
                  </td>
                  <td className="p-4 text-gray-300">{f.amount ? `${f.amount} zł` : '—'}</td>
                  <td className="p-4 text-gray-300 max-w-[200px] truncate">{f.reason}</td>
                  <td className="p-4 text-gray-400">{f.issuer.discordUsername}</td>
                  <td className="p-4 text-gray-500 text-xs">{f.createdAt.toLocaleDateString('pl-PL')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {fines.length === 0 && (
          <div className="text-center py-12 text-gray-500">Brak mandatów RP.</div>
        )}
      </div>
    </div>
  );
}
