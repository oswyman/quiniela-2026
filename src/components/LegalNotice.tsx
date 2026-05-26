import { Scale } from "lucide-react";

export const LEGAL_DISCLAIMER =
  "Esta plataforma es una herramienta administrativa para organizar quinielas privadas. No constituye asesoría legal. Si un grupo usa aportaciones económicas o premios, debe consultar a un abogado y revisar la regulación aplicable en México antes de operar.";

export function LegalNotice() {
  return (
    <div className="legalNotice">
      <Scale size={20} aria-hidden />
      <span>{LEGAL_DISCLAIMER}</span>
    </div>
  );
}
