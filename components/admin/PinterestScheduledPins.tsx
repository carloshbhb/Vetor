'use client';

import { Clock, CheckCircle, XCircle, Image } from 'lucide-react';

interface ScheduledPin {
  id: string;
  reviewId: string;
  reviewSlug: string;
  title: string;
  description: string;
  imageUrl: string;
  scheduledAt: string;
  status: 'pending' | 'published' | 'failed';
  pinId?: string;
  error?: string;
  createdAt: string;
}

interface PinterestScheduledPinsProps {
  pins: ScheduledPin[];
}

export default function PinterestScheduledPins({ pins }: PinterestScheduledPinsProps) {
  if (pins.length === 0) {
    return null;
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow/15 text-yellow border-yellow/30',
    published: 'bg-green-bg text-green border-green/20',
    failed: 'bg-red-50 text-red-600 border-red-200',
  };

  const statusIcons: Record<string, typeof Clock> = {
    pending: Clock,
    published: CheckCircle,
    failed: XCircle,
  };

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
          Pins Agendados & Histórico
        </p>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {pins.map((pin) => {
          const StatusIcon = statusIcons[pin.status];
          return (
            <div key={pin.id} className="px-6 py-4 hover:bg-bg2 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-bg2 flex items-center justify-center overflow-hidden shrink-0">
                  {pin.imageUrl ? (
                    <img src={pin.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image size={24} className="text-text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColors[pin.status]}`}>
                      <StatusIcon size={10} />
                      {pin.status === 'pending' ? 'Agendado' : pin.status === 'published' ? 'Publicado' : 'Falhou'}
                    </span>
                    <span className="text-xs text-text-muted">
                      {pin.status === 'pending'
                        ? `Para: ${new Date(pin.scheduledAt).toLocaleString('pt-BR')}`
                        : new Date(pin.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-text truncate">{pin.title}</p>
                  <p className="text-xs text-text-muted truncate">{pin.description}</p>
                  {pin.error && (
                    <p className="text-xs text-red-500 mt-1">{pin.error}</p>
                  )}
                  {pin.pinId && (
                    <a
                      href={`https://pinterest.com/pin/${pin.pinId}`}
                      target="_blank"
                      className="text-xs text-blue hover:underline mt-1 inline-block"
                    >
                      Ver no Pinterest →
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
