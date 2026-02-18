import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { User, MessSystemDB } from '../types';
import { INITIAL_DB } from '../db';
import jsQR from 'jsqr';
import { 
  PlusCircle, 
  UserPlus, 
  ChevronRight, 
  X, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  AtSign,
  Building,
  Hash,
  ArrowRight,
  AlertCircle,
  Camera,
  Clock,
  SendHorizontal,
  Mail
} from 'lucide-react';

interface ProfileProps {
  user: User;
  authEmail: string;
  userMesses: any[];
  onSelectMess: (mess: any) => void;
  onLogout: () => void;
  onPending: () => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  user, 
  authEmail, 
  userMesses, 
  onSelectMess, 
  onLogout, 
  onPending 
}) => {
  const [view, setView] = useState<'info' | 'create' | 'join' | 'success'>('info');
  const [messName, setMessName] = useState('');
  const [messCode, setMessCode] = useState('');
  const [messPasswordInput, setMessPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'error' | 'success' | 'info', text: string} | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{id: string, pass: string} | null>(null);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    fetchSentRequests();
    return () => stopScanner(); 
  }, [user.id]);

  useEffect(() => {
    if (isScanning) initCamera();
    else stopScanner();
  }, [isScanning]);

  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const parts = code.data.split('|');
            if (parts.length >= 2) {
              setMessCode(parts[0].trim());
              setMessPasswordInput(parts[1].trim());
              setStatusMsg({ type: 'success', text: 'কিউআর কোড স্ক্যান হয়েছে!' });
            } else {
              setMessCode(code.data.trim());
            }
            setIsScanning(false);
            return;
          }
      }
    }
    if (isScanningRef.current) requestRef.current = requestAnimationFrame(tick);
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      isScanningRef.current = true;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          requestRef.current = requestAnimationFrame(tick);
        };
      }
    } catch (err) {
      setIsScanning(false);
      setStatusMsg({ type: 'error', text: 'ক্যামেরা চালু করা যায়নি।' });
    }
  };

  const stopScanner = () => {
    isScanningRef.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
  };

  const fetchSentRequests = async () => {
    const { data } = await supabase.from('join_requests').select('*, messes(mess_name)').eq('user_id', user.id).eq('status', 'pending');
    if (data) setSentRequests(data);
  };

  const handleJoinMess = async () => {
    if (!messCode.trim() || !messPasswordInput.trim()) {
      setStatusMsg({ type: 'error', text: 'আইডি এবং পাসওয়ার্ড দিন।' });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    try {
      const { data: mess, error: fetchErr } = await supabase.from('messes').select('id, db_json').eq('id', messCode.trim()).single();
      if (fetchErr || !mess) throw new Error('সঠিক মেস আইডি দিন।');
      const db = mess.db_json as MessSystemDB;
      if (db.messPassword !== messPasswordInput.trim()) throw new Error('ভুল পাসওয়ার্ড!');
      
      const { error: reqError } = await supabase.from('join_requests').insert([{ 
        mess_id: mess.id, 
        user_id: user.id, 
        user_email: authEmail,
        user_name: user.name, 
        user_username: user.userId || user.username,
        status: 'pending' 
      }]);
      
      if (reqError) {
        if (reqError.code === '23505') throw new Error('ইতিমধ্যে আবেদন পাঠানো হয়েছে।');
        throw reqError;
      }
      fetchSentRequests();
      setView('info');
      onPending();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMess = async () => {
    if (!messName.trim()) return;
    setLoading(true);
    try {
      const pass = Math.floor(100000 + Math.random() * 900000).toString();
      const newDB: MessSystemDB = { ...INITIAL_DB, users: [user], messPassword: pass };
      const { data, error } = await supabase.from('messes').insert([{ admin_id: user.id, mess_name: messName, db_json: newDB }]).select();
      if (error) throw error;
      setCreatedInfo({ id: data[0].id, pass });
      setView('success');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-10 items-start">
        <div className="w-32 h-32 md:w-40 md:h-40 bg-blue-600 rounded-[3rem] flex items-center justify-center text-white shadow-2xl text-5xl font-black border-4 border-gray-900">
          {user.name[0]}
        </div>
        <div className="space-y-4 pt-4 flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-white truncate">{user.name}</h1>
            <span className="px-3 py-1 bg-blue-900/40 text-blue-400 text-[10px] font-black uppercase rounded-full border border-blue-500/20">ইউজার প্রোফাইল</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="flex items-center gap-3 text-gray-400 font-bold bg-gray-900/50 px-5 py-3 rounded-2xl border border-gray-800">
              <Mail size={18} className="text-blue-500 shrink-0" />
              <span className="truncate">{authEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-bold bg-gray-900/50 px-5 py-3 rounded-2xl border border-gray-800">
              <AtSign size={18} className="text-purple-500 shrink-0" />
              {user.userId || `@${user.username}`}
            </div>
          </div>
          {statusMsg && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${statusMsg.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-red-900/20 text-red-400 border-red-500/20'} border`}>
              {statusMsg.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {view === 'info' && (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h3 className="text-2xl font-black text-white flex items-center gap-3"><Building className="text-blue-500" /> আপনার মেসসমূহ</h3>
            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={() => setView('join')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 text-gray-300 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all">
                <UserPlus size={16}/> মেসে যোগ দিন
              </button>
              <button onClick={() => setView('create')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                <PlusCircle size={16}/> নতুন মেস তৈরি
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {userMesses.map(mess => (
              <div key={mess.id} onClick={() => onSelectMess(mess)} className="group bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 hover:border-blue-500/50 hover:shadow-2xl transition-all cursor-pointer space-y-6">
                <div className="w-16 h-16 bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center font-black text-2xl">{mess.mess_name[0].toUpperCase()}</div>
                <div>
                  <h4 className="text-2xl font-black text-white truncate">{mess.mess_name}</h4>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2 flex items-center gap-2"><Hash size={12}/> ID: {mess.id.slice(0, 12)}...</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${mess.admin_id === user.id ? 'bg-purple-900/30 text-purple-400 border-purple-500/20' : 'bg-blue-900/30 text-blue-400 border-blue-500/20'} border`}>
                      {mess.admin_id === user.id ? 'Admin' : 'Member'}
                   </span>
                   <ArrowRight size={20} className="text-blue-500 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            ))}
            {userMesses.length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-900 rounded-[3rem] border border-gray-800 border-dashed text-gray-500 font-bold">আপনি এখনো কোনো মেসে যুক্ত হননি।</div>
            )}
          </div>
          {sentRequests.length > 0 && (
            <div className="space-y-6">
               <h3 className="text-xl font-black text-white flex items-center gap-3"><SendHorizontal className="text-blue-500" /> পাঠানো আবেদনসমূহ</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sentRequests.map(req => (
                    <div key={req.id} className="bg-gray-900 border border-blue-500/20 p-6 rounded-[2rem] flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center"><Clock size={16} className="text-blue-400 animate-pulse"/></div>
                          <div>
                             <p className="font-bold text-white text-sm">{req.messes?.mess_name || 'মেস আইডি: ' + req.mess_id.slice(0,6)}</p>
                             <p className="text-[9px] font-black text-gray-500 uppercase">অপেক্ষমান (Pending)</p>
                          </div>
                       </div>
                       <button onClick={async () => { if(window.confirm("বাতিল করতে চান?")) { await supabase.from('join_requests').delete().eq('id', req.id); fetchSentRequests(); } }} className="text-red-500/40 hover:text-red-500"><X size={16}/></button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8">
          <div className="flex items-center gap-4">
             <button onClick={() => setView('info')} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-colors"><ChevronRight className="rotate-180"/></button>
             <h3 className="text-2xl font-black text-white">নতুন মেস তৈরি</h3>
          </div>
          <div className="space-y-6">
            <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" placeholder="মেসের নাম" value={messName} onChange={e => setMessName(e.target.value)} />
            <button onClick={handleCreateMess} disabled={loading || !messName} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all active:scale-95">
              {loading && <Loader2 size={18} className="animate-spin"/>} মেস তৈরি করুন
            </button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8">
          <div className="flex items-center gap-4">
             <button onClick={() => { setIsScanning(false); setView('info'); }} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-colors"><ChevronRight className="rotate-180"/></button>
             <h3 className="text-2xl font-black text-white">মেসে যোগ দিন</h3>
          </div>
          <div className="space-y-6">
            {!isScanning ? (
              <button onClick={() => setIsScanning(true)} className="w-full flex items-center justify-center gap-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 p-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                <Camera size={24}/> QR কোড স্ক্যান করুন
              </button>
            ) : (
              <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border-4 border-blue-500/50">
                 <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
                 <canvas ref={canvasRef} className="hidden" />
                 <div className="scanner-line"></div>
                 <button onClick={() => setIsScanning(false)} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase">বন্ধ করুন</button>
              </div>
            )}
            <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" placeholder="মেস আইডি" value={messCode} onChange={e => setMessCode(e.target.value)} />
            <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" placeholder="পাসওয়ার্ড" value={messPasswordInput} onChange={e => setMessPasswordInput(e.target.value)} />
            <button onClick={handleJoinMess} disabled={loading} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all active:scale-95">
              {loading && <Loader2 size={18} className="animate-spin"/>} আবেদন পাঠান
            </button>
          </div>
        </div>
      )}

      {view === 'success' && createdInfo && (
        <div className="max-lg mx-auto bg-gray-900 p-12 rounded-[4rem] border border-blue-500/30 text-center space-y-10">
           <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
              <CheckCircle2 size={48}/>
           </div>
           <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 space-y-4">
              <div className="text-left">
                 <p className="text-[10px] font-black text-gray-500 uppercase mb-2">মেস আইডি</p>
                 <code className="text-blue-400 font-black text-xs break-all">{createdInfo.id}</code>
              </div>
              <div className="text-left">
                 <p className="text-[10px] font-black text-gray-500 uppercase mb-2">মেস পাসওয়ার্ড</p>
                 <code className="text-green-500 font-black text-2xl">{createdInfo.pass}</code>
              </div>
           </div>
           <button onClick={() => window.location.reload()} className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl transition-all">ড্যাশবোর্ড প্রবেশ</button>
        </div>
      )}

      <div className="pt-10 border-t border-gray-900 flex justify-center">
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-all">
          <LogOut size={14}/> লগআউট করুন
        </button>
      </div>
    </div>
  );
};

export default Profile;