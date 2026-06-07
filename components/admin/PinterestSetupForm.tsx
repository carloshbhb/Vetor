'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, ExternalLink, LogIn } from 'lucide-react';

interface Board {
  id: string;
  name: string;
  pinCount: number;
}

export default function PinterestSetupForm() {
  const [accessToken, setAccessToken] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingBoards, setFetchingBoards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const expires = params.get('expires');
    const errorMsg = params.get('error');

    if (token) {
      setAccessToken(token);
      window.history.replaceState({}, '', '/admin/pinterest');
    }

    if (expires) {
      window.history.replaceState({}, '', '/admin/pinterest');
    }

    if (errorMsg) {
      setError(`Erro na autorização: ${errorMsg}`);
      window.history.replaceState({}, '', '/admin/pinterest');
    }
  }, []);

  const handleFetchBoards = async () => {
    if (!accessToken.trim()) {
      setError('Insira o access token');
      return;
    }

    setFetchingBoards(true);
    setError(null);

    try {
      const response = await fetch('/api/pinterest/boards', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar boards');
      }

      setBoards(data.boards || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setFetchingBoards(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBoard) {
      setError('Selecione um board');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pinterest/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          boardId: selectedBoard,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar configuração');
      }

      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="mx-auto mb-3 text-green" size={48} />
        <h3 className="font-syne font-bold text-lg text-green-800 mb-2">Configuração Salva!</h3>
        <p className="text-sm text-green-600">Recarregando página...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
          Configurar Pinterest
        </p>
      </div>
      <div className="p-6">
        <button
          onClick={() => window.location.href = '/api/pinterest/auth'}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors mb-4"
        >
          <LogIn size={18} />
          Autorizar com Pinterest
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-text-2">ou cole manualmente</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Cole seu access token do Pinterest"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text mb-2">Board</label>
              {boards.length > 0 ? (
                <select
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                >
                  <option value="">Selecione um board</option>
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>
                      {board.name} ({board.pinCount} pins)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  placeholder="Ou cole o Board ID manualmente"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                />
              )}
            </div>
            <button
              onClick={handleFetchBoards}
              disabled={fetchingBoards || !accessToken.trim()}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-2 hover:bg-bg2 transition-colors disabled:opacity-50"
            >
              {fetchingBoards ? <Loader2 size={16} className="animate-spin" /> : 'Buscar Boards'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading || (!selectedBoard && boards.length === 0)}
            className="w-full px-6 py-3 bg-blue text-white rounded-lg font-medium hover:bg-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    </div>
  );
}
