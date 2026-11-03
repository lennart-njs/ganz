import { notFound } from 'next/navigation';

import { de } from '@/i18n/de';

import { VideoCall } from '../../../../components/VideoCall';
import { getCase } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

/** Videocall mit der Kundschaft. In der Demo sichtbar, ohne Verbindung (Entscheidung 35). */
export default async function Videocall({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCase(id);
  if (!data || data.record.revokedAt) notFound();
  const { tenant, record } = data;
  return (
    <VideoCall
      title={de.portal.video.title(record.file.customer.name)}
      customer={record.file.customer.name}
      device={`${record.file.device.manufacturer} ${record.file.device.model}`}
      caseId={record.file.caseId}
      user={tenant.userName}
      back={`/faelle/${encodeURIComponent(record.file.caseId)}`}
    />
  );
}
