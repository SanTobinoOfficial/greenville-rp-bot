// Dashboard — Archiwum ticketów

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    redirect('/login');
  }

  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { discordUsername: true, discordId: true } },
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">🎫 Tickety</h1>

      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="p-4 text-left">#</th>
              <th className="p-4 text-left">Gracz</th>
              <th className="p-4 text-left">Kategoria</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Otwarto</th>
              <th className="p-4 text-left">Transkrypt</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-4 text-gray-400 font-mono">#{t.ticketNumber}</td>
                <td className="p-4 text-white">{t.user.discordUsername}</td>
                <td className="p-4 text-gray-300">{t.category}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    t.status === 'OPEN'    ? 'bg-green-500/20 text-green-300' :
                    t.status === 'CLAIMED' ? 'bg-blue-500/20 text-blue-300' :
                                           'bg-gray-500/20 text-gray-400'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-xs">{t.createdAt.toLocaleDateString('pl-PL')}</td>
                <td className="p-4">
                  {t.transcript ? (
                    <button className="text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 py-1 rounded transition-colors">
                      📄 Pobierz
                    </button>
                  ) : (
                    <span className="text-gray-600 text-xs">Brak</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <div className="text-center py-12 text-gray-500">Brak ticketów.</div>
        )}
      </div>
    </div>
  );
}
