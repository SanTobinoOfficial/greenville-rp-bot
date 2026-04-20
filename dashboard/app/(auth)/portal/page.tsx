// /portal → przekierowanie do /cad (panel gracza przeniesiony do CAD)
import { redirect } from 'next/navigation';

export default function PortalPage() {
  redirect('/cad');
}
