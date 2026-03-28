// Dashboard — Logi bota

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function LogsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    redirect('/login');
  }

  const logs = await prisma.botLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const TYPE_COLORS: Record<string, string> = {
    QUIZ_RESULT: 'text-blue-400',
    ERROR: 'text-red-400',
    WARN: 'text-yellow-400',
    INFO: 'text-green-400',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">📁 Logi Bota</h1>

      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="bg-[#1E2124] rounded-lg p-4 border border-white/10 font-mono text-sm">
            <div className="flex items-start gap-3">
              <span className="text-gray-500 text-xs whitespace-nowrap mt-0.5">
                {log.createdAt.toLocaleString('pl-PL')}
              </span>
              <span className={`text-xs font-bold uppercase ${TYPE_COLORS[log.type] || 'text-gray-300'}`}>
                [{log.type}]
              </span>
              <span className="text-gray-200 break-all">{log.message}</span>
            </div>
            {log.data && (
              <details className="mt-2">
                <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300">
                  Szczegóły
                </summary>
                <pre className="text-gray-400 text-xs mt-1 overflow-x-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center py-12 text-gray-500">Brak logów.</div>
        )}
      </div>
    </div>
  );
}
