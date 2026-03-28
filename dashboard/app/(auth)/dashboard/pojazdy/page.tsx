// Dashboard — Baza pojazdów RP

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function VehiclesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    redirect('/login');
  }

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: { discordUsername: true, robloxUsername: true, character: true },
      },
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-2">🚗 Baza Pojazdów</h1>
      <p className="text-gray-400 mb-6">Zarejestrowanych pojazdów: <strong className="text-white">{vehicles.length}</strong></p>

      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-4 text-left">Pojazd</th>
                <th className="p-4 text-left">Rok</th>
                <th className="p-4 text-left">Kolor</th>
                <th className="p-4 text-left">Tablica</th>
                <th className="p-4 text-left">Właściciel</th>
                <th className="p-4 text-left">Postać RP</th>
                <th className="p-4 text-left">Data rej.</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white font-medium">{v.marka} {v.model}</td>
                  <td className="p-4 text-gray-300">{v.rok}</td>
                  <td className="p-4 text-gray-300">{v.kolor}</td>
                  <td className="p-4">
                    <code className="bg-white/10 px-2 py-0.5 rounded text-yellow-300 text-xs">{v.tablica}</code>
                  </td>
                  <td className="p-4 text-gray-300">{v.user.discordUsername}</td>
                  <td className="p-4 text-gray-400">
                    {v.user.character
                      ? `${v.user.character.firstName} ${v.user.character.lastName}`
                      : '—'}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{v.createdAt.toLocaleDateString('pl-PL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vehicles.length === 0 && (
          <div className="text-center py-12 text-gray-500">Brak zarejestrowanych pojazdów.</div>
        )}
      </div>
    </div>
  );
}
