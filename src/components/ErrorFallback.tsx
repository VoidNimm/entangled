import { chapters } from '../data/chapters';

export default function ErrorFallback() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center z-[200]" style={{ backgroundColor: 'var(--color-mint)', color: 'var(--color-ink)' }}>
      <h1 className="text-xl font-extrabold uppercase tracking-widest mb-4">Entangled</h1>
      <p className="mb-6 font-medium">Something went wrong while loading the experience.</p>
      <img src="/assets/posters/hero.webp" alt="Hero poster fallback" className="w-64 max-w-full aspect-video object-cover mb-8 rounded" />
      <button onClick={() => window.location.reload()} className="px-6 py-2 border-2 border-[var(--color-ink)] font-bold uppercase tracking-widest hover:bg-black/5 transition-colors mb-12 cursor-pointer">Reload</button>
      <ul className="flex flex-col gap-2 opacity-60 text-sm font-medium">
        {chapters.map(c => <li key={c.id}>{c.title}</li>)}
      </ul>
    </div>
  );
}
