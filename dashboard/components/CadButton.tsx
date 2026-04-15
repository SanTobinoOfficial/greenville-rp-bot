'use client';

// Przycisk otwierający CAD w nowym, zmniejszonym oknie przeglądarki
export function CadButton({ label = '🖥️ Otwórz CAD' }: { label?: string }) {
  const openCad = () => {
    const w = 1100;
    const h = 700;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);

    window.open(
      '/cad',
      'GreenvilleCAD',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );
  };

  return (
    <button
      onClick={openCad}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold
        bg-[#00c8ff]/10 border border-[#00c8ff]/40 text-[#00c8ff]
        hover:bg-[#00c8ff]/20 hover:border-[#00c8ff]
        transition-all"
    >
      {label}
    </button>
  );
}
