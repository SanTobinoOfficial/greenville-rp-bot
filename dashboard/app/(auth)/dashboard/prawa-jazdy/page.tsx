// Dashboard — Zarządzanie prawami jazdy

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function LicensesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    redirect('/login');
  }

  const licenses = await prisma.license.findMany({
    orderBy: { issuedAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: { discordUsername: true, character: true },
      },
    },
  });

  const STATUS_STYLES: Record<string, string> = {
    ACTIVE:    'bg-green-500/20 text-green-300',
    SUSPENDED: 'bg-yellow-500/20 text-yellow-300',
    REVOKED:   'bg-red-500/20 text-red-300',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">🪪 Prawa Jazdy</h1>

      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="p-4 text-left">Gracz</th>
              <th className="p-4 text-left">Postać RP</th>
              <th className="p-4 text-left">Kategoria</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Zawieszone do</th>
              <th className="p-4 text-left">Wystawiono</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map(l => (
              <tr key={l.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-4 text-white">{l.user.discordUsername}</td>
                <td className="p-4 text-gray-400">
                  {l.user.character
                    ? `${l.user.character.firstName} ${l.user.character.lastName}`
                    : '—'}
                </td>
                <td className="p-4">
                  <span className="bg-[#5865F2]/20 text-[#5865F2] px-2 py-0.5 rounded font-mono text-sm">
                    Kat. {l.kategoria}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[l.status] || ''}`}>
                    {l.status}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-xs">
                  {l.suspendedUntil ? l.suspendedUntil.toLocaleDateString('pl-PL') : '—'}
                </td>
                <td className="p-4 text-gray-500 text-xs">{l.issuedAt.toLocaleDateString('pl-PL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {licenses.length === 0 && (
          <div className="text-center py-12 text-gray-500">Brak praw jazdy.</div>
        )}
      </div>
    </div>
  );
}
