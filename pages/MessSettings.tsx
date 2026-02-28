
import React, { useState } from 'react';
import { MessSystemDB, User } from '../types';
import { supabase } from '../supabase';
import { 
  Shield, 
  Hash, 
  Copy, 
  QrCode, 
  X, 
  Edit3, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCcw
} from 'lucide-react';

interface MessSettingsProps {
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB> | ((prev: MessSystemDB) => MessSystemDB)) => void;
  user: User;
  messId: string | null;
  messAdminId: string | null;
  messName: string;
  onMessNameChange: (newName: string) => void;
  t: any;
  theme: string;
}

const MessSettings: React.FC<MessSettingsProps> = ({ 
  db, 
  updateDB, 
  user, 
  messId, 
  messAdminId, 
  messName,
  onMessNameChange,
  t, 
  theme 
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [newMessName, setNewMessName] = useState(messName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

  const isAdmin = user.id === messAdminId;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} ${t.copied}`);
  };

  const qrData = `${messId}|${db.messPassword || ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

  const handleUpdateMessName = async () => {
    if (!isAdmin) return;
    if (!newMessName.trim() || newMessName === messName) {
      setIsEditingName(false);
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const { error } = await supabase
        .from('messes')
        .update({ mess_name: newMessName.trim() })
        .eq('id', messId);

      if (error) throw error;

      onMessNameChange(newMessName.trim());
      setStatusMsg({ type: 'success', text: t.updateSuccess });
      setIsEditingName(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: t.updateFail + ": " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMess = async () => {
    const confirmDelete = window.confirm(t.deleteMessConfirm);
    
    if (confirmDelete) {
      setLoading(true);
      try {
        const { error: reqError } = await supabase.from('join_requests').delete().eq('mess_id', messId);
        if (reqError) console.warn("Requests deletion error:", reqError);
        
        try {
          await supabase.from('invitations').delete().eq('mess_id', messId);
        } catch (e) {}

        const { error: messError } = await supabase.from('messes').delete().eq('id', messId);
        if (messError) {
          if (messError.message.includes("policy")) {
            throw new Error(t.deletePermissionError);
          }
          throw messError;
        }
        
        localStorage.removeItem('ACTIVE_MESS_ID');
        alert(t.deleteMessSuccess);
        window.location.reload();
      } catch (err: any) {
        console.error("Delete Fail:", err);
        alert(`${t.deleteMessFail}: ${err.message || "Unknown Database Error"}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{t.messSettings}</h2>
        <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">{t.messManagement}</p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${
          statusMsg.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20' 
            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mess Access Info */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Shield size={20} className="text-purple-500" />
              {t.messAccess}
            </h3>
            <button 
              onClick={() => setShowQRModal(true)}
              className="p-3 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-500/10"
            >
              <QrCode size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t.messIdLabel}</p>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                <code className="text-xs font-black text-blue-600 dark:text-blue-400 break-all pr-4">{messId}</code>
                <button 
                  onClick={() => copyToClipboard(messId || '', t.messIdLabel)}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t.messPasswordLabel}</p>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                <code className="text-2xl font-black text-green-600 dark:text-green-500 tracking-[0.2em]">{db.messPassword}</code>
                <button 
                  onClick={() => copyToClipboard(db.messPassword || '', t.messPasswordLabel)}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl">
            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
              {t.qrCodeDesc}
            </p>
          </div>
        </div>

        {/* Mess Name Management */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl space-y-8">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Edit3 size={20} className="text-blue-500" />
            {t.changeMessName}
          </h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t.newMessNameLabel}</label>
              <div className="relative">
                <input 
                  type="text" 
                  disabled={!isAdmin || loading}
                  className={`w-full bg-gray-50 dark:bg-gray-800/50 border ${isEditingName ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'} rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-black outline-none transition-all disabled:opacity-60`}
                  value={newMessName}
                  onChange={(e) => {
                    setNewMessName(e.target.value);
                    setIsEditingName(true);
                  }}
                  placeholder={t.messNamePlaceholder}
                />
              </div>
            </div>

            {isAdmin ? (
              <button 
                onClick={handleUpdateMessName}
                disabled={loading || !newMessName.trim() || newMessName === messName}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {t.saveChanges}
              </button>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-2xl flex items-center gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                  {t.onlyAdminCanChangeName}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
          <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-[2.5rem] border border-red-100 dark:border-red-900/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-red-600 dark:text-red-500 flex items-center gap-3">
                  <AlertCircle size={20} />
                  {t.deleteMess}
                </h3>
                <p className="text-[10px] text-red-500/70 font-bold max-w-md">
                  {t.deleteMessConfirm.split('\n\n')[1]}
                </p>
              </div>
              <button 
                onClick={handleDeleteMess}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
              >
                {loading ? <RefreshCcw className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                {t.deleteMess}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQRModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-black text-gray-900 dark:text-white">{t.messQRCode}</h3>
               <button onClick={() => setShowQRModal(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded-xl"><X size={20}/></button>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl inline-block mx-auto">
               <img src={qrUrl} alt="Mess QR Code" className="w-48 h-48 sm:w-56 sm:h-56" />
            </div>
            <div className="space-y-2">
               <p className="text-[10px] text-gray-500 font-bold leading-relaxed">{t.qrCodeDesc}</p>
            </div>
            <button onClick={() => setShowQRModal(false)} className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-black uppercase text-xs">{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessSettings;
