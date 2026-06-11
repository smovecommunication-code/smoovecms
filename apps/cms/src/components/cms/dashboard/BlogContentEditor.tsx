import { useRef } from 'react';
import { Bold, CaseUpper, Heading2, Italic, Link, List, ListOrdered, Quote, Redo2, RemoveFormatting, Undo2 } from 'lucide-react';

interface Props { value: string; onChange: (value: string) => void; error?: string; }

export function BlogContentEditor({ value, onChange, error }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apply = (before: string, after = before, fallback = 'texte') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    onChange(`${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };
  const transform = (fn: (text: string) => string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || value;
    onChange(`${value.slice(0, start)}${fn(selected)}${value.slice(end)}`);
  };
  const button = 'rounded-md border border-[#d6e5e9] bg-white p-2 text-[#49636c] transition hover:border-[#9fd5e1] hover:bg-[#effafd] hover:text-[#007fa3]';
  return <div>
    <div className="overflow-hidden rounded-[12px] border border-[#d8e4e8] bg-white focus-within:border-[#8bcddd] focus-within:ring-2 focus-within:ring-[#00b3e8]/10">
      <div className="flex flex-wrap gap-1.5 border-b border-[#e6eef1] bg-[#f7fafb] p-2" aria-label="Outils de mise en forme">
        <button type="button" className={button} title="Titre" onClick={() => apply('## ', '', 'Titre de section')}><Heading2 size={15} /></button>
        <button type="button" className={button} title="Gras" onClick={() => apply('**', '**')}><Bold size={15} /></button>
        <button type="button" className={button} title="Italique" onClick={() => apply('*', '*')}><Italic size={15} /></button>
        <button type="button" className={button} title="Liste à puces" onClick={() => transform((text) => text.split('\n').map((line) => `- ${line.replace(/^[-*]\s+/, '')}`).join('\n'))}><List size={15} /></button>
        <button type="button" className={button} title="Liste numérotée" onClick={() => transform((text) => text.split('\n').map((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s+/, '')}`).join('\n'))}><ListOrdered size={15} /></button>
        <button type="button" className={button} title="Citation" onClick={() => transform((text) => text.split('\n').map((line) => `> ${line.replace(/^>\s+/, '')}`).join('\n'))}><Quote size={15} /></button>
        <button type="button" className={button} title="Lien" onClick={() => apply('[', '](https://)', 'libellé du lien')}><Link size={15} /></button>
        <button type="button" className={button} title="Majuscules" onClick={() => transform((text) => text.toLocaleUpperCase('fr'))}><CaseUpper size={15} /></button>
        <button type="button" className={button} title="Effacer le formatage" onClick={() => transform((text) => text.replace(/\*\*|\*|^#{1,3}\s+|^>\s+|^[-*]\s+|^\d+\.\s+/gm, ''))}><RemoveFormatting size={15} /></button>
        <button type="button" className={button} title="Annuler" onClick={() => document.execCommand('undo')}><Undo2 size={15} /></button>
        <button type="button" className={button} title="Rétablir" onClick={() => document.execCommand('redo')}><Redo2 size={15} /></button>
      </div>
      <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[260px] w-full resize-y px-4 py-3 font-mono text-[14px] leading-7 outline-none" placeholder="Rédigez votre article… Séparez les paragraphes par une ligne vide." />
    </div>
    <p className="mt-2 text-[12px] leading-relaxed text-[#6f7f85]">Mise en forme légère et durable : titres, gras, italique, listes, citations et liens. Les retours à la ligne sont conservés.</p>
    {error ? <p className="mt-1 text-[12px] text-red-600">{error}</p> : null}
  </div>;
}
