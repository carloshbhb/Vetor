'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface VideoQueueItem {
  id: string;
  product_url: string;
  product_title: string;
  product_category: string;
  product_price: string;
  product_image_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  youtube_url: string | null;
  created_at: string;
  scheduled_at: string | null;
}

export default function VideoPanel() {
  const [videos, setVideos] = useState<VideoQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('video_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching videos:', error);
      setMessage({ type: 'error', text: error.message });
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/video/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: newUrl }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create video job');
      }

      setMessage({ type: 'success', text: `Vídeo agendado: ${data.video.product_title}` });
      setNewUrl('');
      fetchVideos();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao agendar vídeo' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcess = async (id: string) => {
    setMessage(null);
    try {
      const response = await fetch('/api/video/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: id }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }

      setMessage({ type: 'success', text: data.success ? 'Processamento iniciado' : data.error });
      fetchVideos();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao processar' });
    }
  };

  const handleRetry = async (id: string) => {
    const { createClient } = await import('@/lib/supabase-browser');
    const supabase = createClient();
    
    await supabase
      .from('video_queue')
      .update({ status: 'pending', error_message: null })
      .eq('id', id);
    
    fetchVideos();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🎬 Painel de Vídeos - Vetor Blog</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Adicionar Novo Vídeo</h2>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Cole o link do produto (Amazon, Shopee, Mercado Livre)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={submitting}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Agendando...' : 'Agendar Vídeo'}
            </button>
          </form>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">YouTube</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Carregando...</td>
                  </tr>
                ) : videos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Nenhum vídeo na fila</td>
                  </tr>
                ) : (
                  videos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={video.product_image_url}
                            alt={video.product_title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-xs">{video.product_title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-xs">{video.product_url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{video.product_category}</td>
                      <td className="px-6 py-4 text-gray-900 font-medium">{video.product_price}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(video.status)}`}>
                          {video.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {video.youtube_url ? (
                          <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            Ver no YouTube
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {new Date(video.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {video.status === 'pending' && (
                            <button
                              onClick={() => handleProcess(video.id)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Processar
                            </button>
                          )}
                          {video.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(video.id)}
                              className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                            >
                              Tentar Novamente
                            </button>
                          )}
                          {video.status === 'completed' && video.youtube_url && (
                            <a
                              href={video.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Ver Vídeo
                            </a>
                          )}
                        </div>
                        {video.error_message && (
                          <p className="mt-1 text-xs text-red-600 truncate max-w-xs" title={video.error_message}>
                            Erro: {video.error_message}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}