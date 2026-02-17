
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { User, MessSystemDB } from '../types';
import { INITIAL_DB, generateDemoData } from '../db';
import jsQR from 'jsqr';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  PlusCircle, 
  UserPlus, 
  UtensilsCrossed, 
  ChevronRight, 
  Bell, 
  Check, 
  X, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  LayoutGrid,
  AtSign,
  Building,
  RefreshCcw,
  UserCheck,
  Hash,
  ArrowRight,
  Zap,
  Info,
  AlertCircle,
  QrCode,
  Camera,
  Maximize
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
  const [invitations, setInvitations] = useState<any[]>([]);
  
  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    fetchInvitations();
    return () => stopScanner(); 
  }, [authEmail]);

  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        // Ensure dimensions are valid
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            console.log("Found QR code:", code.data);
            setMessCode(code.data);
            stopScanner();
            setStatusMsg({ type: 'success', text: 'মেস আইডি স্ক্যান করা হয়েছে!' });
            return;
          }
        }
      }
    }
    
    if (isScanningRef.current) {
      requestRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const startScanner = async () => {
    setStatusMsg({ type: 'info', text: 'ক্যামেরা চালু হচ্ছে...' });
    try {
      // Constraints optimized for mobile browsers
      // Fix: Changed '理想' to 'ideal' to match MediaTrackConstraints interface
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: {ideal: 1280},
          height: {ideal: 720}
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      isScanningRef.current = true;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Important for iOS: playsinline and muted
        videoRef.current.setAttribute("playsinline", "true"); 
        videoRef.current.muted = true; 
        
        // Wait for video to actually load before starting the loop
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
             requestRef.current = requestAnimationFrame(tick);
             setStatusMsg(null);
          }).catch(err => {
             console.error("Play error:", err);
             setStatusMsg({ type: 'error', text: 'ভিডিও প্লে করা যায়নি।' });
          });
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsScanning(false);
      isScanningRef.current = false;
      
      let errorText = 'ক্যামেরা চালু করা যায়নি।';
      if (err.name === 'NotAllowedError') {
        errorText = 'ক্যামেরা ব্যবহারের পারমিশন দেওয়া হয়নি। ব্রাউজার সেটিিংস চেক করুন।';
      } else if (err.name === 'NotFoundError') {
        errorText = 'আপনার ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি।';
      }
      setStatusMsg({ type: 'error', text: errorText });
    }
  };

  const stopScanner = () => {
    isScanningRef.current = false;
    setIsScanning(false);
    
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitee_email', authEmail.toLowerCase())
        .eq('status', 'pending');
      if (data) setInvitations(data);
    } catch (err) {}
  };

  const handleCreateMess = async () => {
    if (!messName.trim()) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const messPass = Math.floor(100000 + Math.random() * 900000).toString();
      const newDB: MessSystemDB = { ...INITIAL_DB, users: [user], messPassword: messPass };
      const { data, error } = await supabase.from('messes').insert([{ admin_id: user.id, mess_name: messName, db_json: newDB }]).select();
      if (error) throw error;
      setCreatedInfo({ id: data[0].id, pass: messPass });
      setView('success');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMess = async () => {
    if (!messCode.trim() || !messPasswordInput.trim()) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const { data: mess, error } = await supabase.from('messes').select('id, db_json').eq('id', messCode.trim()).single();
      if (error || !mess) throw new Error('সঠিক মেস আইডি প্রদান করুন।');
      const currentDB = mess.db_json as MessSystemDB;
      if (currentDB.messPassword !== messPasswordInput.trim()) throw new Error('ভুল মেস পাসওয়ার্ড!');
      
      await supabase.from('join_requests').insert([{ mess_id: mess.id, user_id: user.id, user_email: authEmail, status: 'pending' }]);
      onPending();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const seedData = async (messId: string) => {
    if(!window.confirm("আপনি কি ১ বছরের ডামি ডাটা জেনারেট করতে চান? (এটি আপনার বর্তমান ডাটার সাথে যুক্ত হবে)")) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('messes').select('db_json').eq('id', messId).single();
      if(data) {
        const newDB = generateDemoData(data.db_json);
        await supabase.from('messes').update({ db_json: newDB }).eq('id', messId);
        alert("ডামি ডাটা সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে গিয়ে চেক করুন।");
        window.location.reload();
      }
    } catch(err) {
      alert("ডাটা জেনারেট করা যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-10 items-start">
        <div className="shrink-0">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-blue-600 rounded-[3rem] flex items-center justify-center text-white shadow-2xl text-5xl font-black border-4 border-gray-900">
            {user.name[0]}
          </div>
        </div>
        <div className="space-y-4 pt-4 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-4xl font-black text-white truncate">{user.name}</h1>
            <span className="px-3 py-1 bg-blue-900/40 text-blue-400 text-xs font-black uppercase tracking-widest rounded-full border border-blue-500/20">ইউজার প্রোফাইল</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="flex items-center gap-3 text-gray-400 font-bold bg-gray-900/50 px-5 py-3 rounded-2xl border border-gray-800 truncate">
              <Mail size={18} className="text-blue-500 shrink-0" />
              <span className="truncate">{authEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-bold bg-gray-900/50 px-5 py-3 rounded-2xl border border-gray-800">
              <AtSign size={18} className="text-purple-500 shrink-0" />
              @{user.username}
            </div>
          </div>
          
          <div className="pt-2 space-y-4">
            {statusMsg && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-left-2 ${
                statusMsg.type === 'success' ? 'bg-green-900/20 text-green-400 border border-green-500/20' : 
                statusMsg.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-500/20' : 
                'bg-blue-900/20 text-blue-400 border border-blue-500/20'
              }`}>
                {statusMsg.type === 'success' ? <CheckCircle2 size={18}/> : statusMsg.type === 'error' ? <AlertCircle size={18}/> : <Loader2 size={18} className="animate-spin"/>}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {view === 'info' && (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <Building className="text-blue-500" /> আপনার মেসসমূহ
            </h3>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <button onClick={() => setView('join')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 text-gray-300 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-800">
                <UserPlus size={16}/> মেসে যোগ দিন
              </button>
              <button onClick={() => setView('create')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">
                <PlusCircle size={16}/> নতুন মেস তৈরি
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {userMesses.map(mess => (
              <div key={mess.id} className="group bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 hover:border-blue-500/50 hover:shadow-2xl transition-all text-left space-y-6 relative overflow-hidden">
                <div onClick={() => onSelectMess(mess)} className="cursor-pointer space-y-6">
                  <div className="w-16 h-16 bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform">
                    {mess.mess_name[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors truncate">{mess.mess_name}</h4>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2 flex items-center gap-2"><Hash size={12}/> ID: {mess.id.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${mess.admin_id === user.id ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' : 'bg-blue-900/30 text-blue-400 border border-blue-500/20'}`}>
                         {mess.admin_id === user.id ? 'Admin' : 'Member'}
                      </span>
                      {mess.admin_id === user.id && (
                        <button onClick={(e) => {e.stopPropagation(); seedData(mess.id)}} className="px-3 py-1 bg-amber-900/30 text-amber-500 text-[9px] font-black uppercase rounded-lg border border-amber-500/20 flex items-center gap-1 hover:bg-amber-600 hover:text-white transition-all">
                           <Zap size={10}/> ১ বছরের ডাটা
                        </button>
                      )}
                   </div>
                   <ArrowRight size={20} className="text-blue-500 group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => onSelectMess(mess)} />
                </div>
              </div>
            ))}
            {userMesses.length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-900 rounded-[3rem] border border-gray-800 border-dashed">
                 <p className="text-gray-500 font-bold">আপনি এখনো কোনো মেসে যুক্ত হননি।</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
             <button onClick={() => setView('info')} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white"><ChevronRight className="rotate-180"/></button>
             <h3 className="text-2xl font-black text-white">নতুন মেস তৈরি</h3>
          </div>
          <div className="space-y-6">
            <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" placeholder="মেসের নাম" value={messName} onChange={e => setMessName(e.target.value)} />
            <button onClick={handleCreateMess} disabled={loading || !messName} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3">
              {loading && <Loader2 size={18} className="animate-spin"/>} মেস তৈরি করুন
            </button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
             <button onClick={() => { if(isScanning) stopScanner(); setView('info'); }} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white"><ChevronRight className="rotate-180"/></button>
             <h3 className="text-2xl font-black text-white">মেসে যোগ দিন</h3>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
               {isScanning ? (
                 <div className="relative w-full aspect-square bg-black rounded-3xl overflow-hidden border-4 border-blue-500/50 shadow-2xl">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="scanner-line"></div>
                    {/* Scanner overlay corners */}
                    <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-400/30 rounded-2xl pointer-events-none"></div>
                    
                    <button 
                      onClick={stopScanner}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95"
                    >
                      বন্ধ করুন
                    </button>
                 </div>
               ) : (
                 <button 
                   onClick={startScanner} 
                   className="flex items-center justify-center gap-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 p-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95"
                 >
                   <Camera size={24}/> QR কোড স্ক্যান করুন
                 </button>
               )}
               <div className="text-center text-gray-700 text-[10px] font-black uppercase py-2">অথবা ম্যানুয়ালি আইডি দিন</div>
            </div>
            <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" placeholder="মেস আইডি" value={messCode} onChange={e => setMessCode(e.target.value)} />
            <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" placeholder="পাসওয়ার্ড" value={messPasswordInput} onChange={e => setMessPasswordInput(e.target.value)} />
            <button onClick={handleJoinMess} disabled={loading} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3">
              {loading && <Loader2 size={18} className="animate-spin"/>} অনুরোধ পাঠান
            </button>
          </div>
        </div>
      )}

      {view === 'success' && createdInfo && (
        <div className="max-w-lg mx-auto bg-gray-900 p-12 rounded-[4rem] border border-blue-500/30 text-center space-y-10 animate-in zoom-in-95">
           <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-green-500/30">
              <CheckCircle2 size={48}/>
           </div>
           <div className="space-y-4">
              <p className="text-gray-400 font-bold">নিচের তথ্যগুলো সংরক্ষণ করুন:</p>
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
           </div>
           <button onClick={() => window.location.reload()} className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm">ড্যাশবোর্ড প্রবেশ</button>
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
