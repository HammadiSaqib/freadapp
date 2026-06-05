import { useEffect, useState } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Play, Pencil, Trash2, Plus, Upload, Video, Sparkles, User, Briefcase, Film, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Testimonial = {
  id: number;
  video: string;
  client_name: string;
  client_role?: string | null;
};

export default function SupportTestimonials() {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerSrc, setPlayerSrc] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [isVideoUrlAdd, setIsVideoUrlAdd] = useState(true);
  const [videoUrlAdd, setVideoUrlAdd] = useState("");
  const [editIsVideoUrl, setEditIsVideoUrl] = useState(true);
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const toEmbedUrl = (raw: string | null | undefined) => {
    try {
      const u = (raw || '').trim();
      if (!u) return null;
      if (/youtu\.be\//i.test(u)) {
        const id = u.split('youtu.be/')[1]?.split(/[?&]/)[0];
        if (id) return `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&color=white`;
      }
      const ytWatch = u.match(/youtube\.com\/watch\?v=([^&]+)/i);
      if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}?modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&color=white`;
      const ytEmbed = u.match(/youtube\.com\/embed\/([^?&]+)/i);
      if (ytEmbed) return `https://www.youtube.com/embed/${ytEmbed[1]}?modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&color=white`;
      const vimeo = u.match(/vimeo\.com\/(\d+)/i);
      if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0&portrait=0&dnt=1`;
      const driveFile = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
      if (driveFile) return `https://drive.google.com/file/d/${driveFile[1]}/preview`;
      const driveOpen = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
      if (driveOpen) return `https://drive.google.com/file/d/${driveOpen[1]}/preview`;
      const driveUc = u.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/i);
      if (driveUc) return `https://drive.google.com/file/d/${driveUc[1]}/preview`;
      return null;
    } catch {
      return null;
    }
  };

  const loadTestimonials = async () => {
    try {
      const resp = await api.get("/api/support/testimonials");
      const rows = (resp?.data?.data ?? resp?.data ?? []) as Testimonial[];
      setTestimonials(rows);
    } catch {
      setTestimonials([]);
    }
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  const openPlayer = (src: string) => {
    setPlayerSrc(src);
    setPlayerOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditId(t.id);
    setEditName(t.client_name);
    setEditRole(t.client_role || "");
    const isUrl = /^https?:\/\//i.test(t.video);
    setEditIsVideoUrl(isUrl);
    setEditVideoUrl(isUrl ? t.video : "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editId || !editName.trim()) return;
    setSubmitting(true);
    try {
      if (editIsVideoUrl) {
        await api.put(`/api/support/testimonials/${editId}`, {
          client_name: editName.trim(),
          client_role: editRole.trim() || "",
          file_url: editVideoUrl.trim()
        });
      } else {
        const form = new FormData();
        form.append("client_name", editName.trim());
        form.append("client_role", editRole.trim() || "");
        if (editVideoFile) form.append("video", editVideoFile);
        await api.put(`/api/support/testimonials/${editId}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setEditOpen(false);
      setEditVideoFile(null);
      setEditVideoUrl("");
      await loadTestimonials();
    } catch {}
    finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("Delete this testimonial?");
    if (!ok) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/support/testimonials/${id}`);
      await loadTestimonials();
    } catch {}
    finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (!clientName.trim()) return;
    if (isVideoUrlAdd && !videoUrlAdd.trim()) return;
    if (!isVideoUrlAdd && !videoFile) return;
    setSubmitting(true);
    try {
      if (isVideoUrlAdd) {
        await api.post("/api/support/testimonials", {
          client_name: clientName.trim(),
          client_role: clientRole.trim() || "",
          file_url: videoUrlAdd.trim()
        });
      } else {
        const formData = new FormData();
        formData.append("client_name", clientName.trim());
        if (clientRole.trim()) formData.append("client_role", clientRole.trim());
        if (videoFile) formData.append("video", videoFile);
        await api.post("/api/support/testimonials", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setOpen(false);
      setClientName("");
      setClientRole("");
      setVideoFile(null);
      setVideoUrlAdd("");
      setIsVideoUrlAdd(true);
      await loadTestimonials();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <SupportLayout>
      <div className="space-y-8 p-2">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider">
                  Support Portal
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Client Testimonials
              </h1>
              <p className="text-slate-300 mt-4 max-w-xl text-lg leading-relaxed">
                Showcase success stories and build trust. Manage your video testimonials with a professional touch.
              </p>
            </div>
            <Button 
              onClick={() => setOpen(true)} 
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
            >
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Add New Story
            </Button>
          </div>
        </div>

        {/* Stats Grid - Optional but adds professional feel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-teal-100 text-teal-600">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Videos</p>
                <h3 className="text-2xl font-bold text-slate-900">{testimonials.length}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active Display</p>
                <h3 className="text-2xl font-bold text-slate-900">{testimonials.length}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Latest Addition</p>
                <h3 className="text-lg font-bold text-slate-900 truncate max-w-[150px]">
                  {testimonials[testimonials.length - 1]?.client_name || "None"}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-slate-500" />
              Video Gallery
            </h2>
            <div className="text-sm text-slate-500">
              {testimonials.length} {testimonials.length === 1 ? 'story' : 'stories'} curated
            </div>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {testimonials.map((t) => {
                const src = /^https?:\/\//i.test(t.video) ? t.video : `/${t.video.replace(/^public[\\/]/, "").replace(/\\/g, "/")}`;
                const embed = toEmbedUrl(src);
                return (
                  <motion.div
                    key={t.id}
                    variants={item}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100"
                  >
                    {/* Video Thumbnail Area */}
                    <div 
                      className="relative aspect-[9/16] bg-slate-900 cursor-pointer overflow-hidden" 
                      onClick={() => openPlayer(src)}
                    >
                      {embed ? (
                        <iframe
                          src={embed}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 ease-out bg-black"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          title={`Testimonial ${t.id}`}
                        />
                      ) : (
                        <video 
                          src={src} 
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" 
                          muted 
                          loop 
                          playsInline 
                        />
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                      {/* Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transform scale-0 group-hover:scale-100 transition-transform duration-300 ease-spring">
                          <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg pl-1">
                            <Play className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions Overlay */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300 ease-out z-10">
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="h-9 w-9 rounded-full bg-white/90 backdrop-blur shadow-lg hover:bg-white text-slate-700"
                          onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-9 w-9 rounded-full shadow-lg"
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Bottom Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="font-bold text-lg leading-tight mb-1 drop-shadow-md">{t.client_name}</h3>
                        {t.client_role && (
                          <p className="text-sm text-slate-300 font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                            <span className="w-1 h-1 rounded-full bg-teal-400"></span>
                            {t.client_role}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {testimonials.length === 0 && (
              <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Video className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No testimonials yet</h3>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                  Start building your success gallery by adding your first client video testimonial.
                </p>
                <Button onClick={() => setOpen(true)} className="mt-6 bg-teal-600 text-white hover:bg-teal-700">
                  Add First Video
                </Button>
              </div>
            )}
          </motion.div>
        </div>

        <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
          <DialogContent className="p-0 bg-black/95 border-slate-800 w-screen h-screen max-w-none flex items-center justify-center backdrop-blur-xl">
            {playerSrc ? (
              <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full z-50"
                    onClick={() => setPlayerOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </Button>
                {toEmbedUrl(playerSrc) ? (
                  <iframe
                    src={toEmbedUrl(playerSrc)!}
                    className="w-[80vw] h-[80vh] max-w-full max-h-full rounded-lg shadow-2xl bg-black"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="Video player"
                  />
                ) : (
                  <video src={playerSrc} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" />
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialogs with Modern Styling */}
        {[
          { isOpen: open, setOpen: setOpen, title: "Add New Story", action: handleAdd, isEdit: false },
          { isOpen: editOpen, setOpen: setEditOpen, title: "Edit Story", action: submitEdit, isEdit: true }
        ].map(({ isOpen, setOpen, title, action, isEdit }) => (
          <Dialog key={title} open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl">
              <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 blur-2xl rounded-full -mr-10 -mt-10"></div>
                <DialogHeader className="relative z-10">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {isEdit ? <Pencil className="w-5 h-5 text-teal-400" /> : <Plus className="w-5 h-5 text-teal-400" />}
                    {title}
                  </DialogTitle>
                </DialogHeader>
              </div>
              
              <div className="p-6 space-y-6 bg-white">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Client Details</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          value={isEdit ? editName : clientName}
                          onChange={(e) => isEdit ? setEditName(e.target.value) : setClientName(e.target.value)}
                          placeholder="Client Full Name"
                          className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          value={isEdit ? editRole : clientRole}
                          onChange={(e) => isEdit ? setEditRole(e.target.value) : setClientRole(e.target.value)}
                          placeholder="Role / Title (Optional)"
                          className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Video Source</Label>
                      <div className="flex gap-3">
                        <Button 
                          type="button"
                          variant={(isEdit ? editIsVideoUrl : isVideoUrlAdd) ? "default" : "outline"} 
                          onClick={() => isEdit ? setEditIsVideoUrl(true) : setIsVideoUrlAdd(true)}
                          className={(isEdit ? editIsVideoUrl : isVideoUrlAdd) ? "bg-teal-600 text-white hover:bg-teal-700" : ""}
                        >
                          Video URL
                        </Button>
                        <Button 
                          type="button"
                          variant={(isEdit ? editIsVideoUrl : isVideoUrlAdd) ? "outline" : "default"} 
                          onClick={() => isEdit ? setEditIsVideoUrl(false) : setIsVideoUrlAdd(false)}
                          className={!(isEdit ? editIsVideoUrl : isVideoUrlAdd) ? "bg-teal-600 text-white hover:bg-teal-700" : ""}
                        >
                          Upload Video
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(isEdit ? editIsVideoUrl : isVideoUrlAdd) ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Video URL</Label>
                      <Input
                        value={isEdit ? editVideoUrl : videoUrlAdd}
                        onChange={(e) => isEdit ? setEditVideoUrl(e.target.value) : setVideoUrlAdd(e.target.value)}
                        placeholder="https://example.com/video.mp4"
                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      />
                      {(isEdit ? editVideoUrl : videoUrlAdd) ? (
                        <div className="w-full space-y-3">
                          {toEmbedUrl(isEdit ? editVideoUrl : videoUrlAdd) ? (
                            <iframe
                              src={toEmbedUrl(isEdit ? editVideoUrl : videoUrlAdd)!}
                              className="w-full h-48 rounded-lg shadow-sm bg-black"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              title="Video preview"
                            />
                          ) : (
                            <video
                              src={(isEdit ? editVideoUrl : videoUrlAdd)}
                              className="w-full h-48 object-cover rounded-lg shadow-sm bg-black"
                              controls
                            />
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Video Content</Label>
                      <input 
                        id={isEdit ? "editVideoInput" : "addVideoInput"} 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          isEdit ? setEditVideoFile(file) : setVideoFile(file);
                        }} 
                      />
                      <div
                        className={`
                          border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300
                          ${(isEdit ? editVideoFile : videoFile) 
                            ? "border-teal-500 bg-teal-50/30" 
                            : "border-slate-200 hover:border-teal-400 hover:bg-slate-50"}
                        `}
                        onClick={() => document.getElementById(isEdit ? "editVideoInput" : "addVideoInput")?.click()}
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => { 
                          e.preventDefault(); 
                          const f = e.dataTransfer.files?.[0]; 
                          if (f && f.type.startsWith("video/")) {
                            isEdit ? setEditVideoFile(f) : setVideoFile(f);
                          }
                        }}
                      >
                        {(() => {
                           const file = isEdit ? editVideoFile : videoFile;
                           const current = isEdit ? testimonials.find((x) => x.id === editId) : null;
                           const currentSrc = current ? (/^https?:\/\//i.test(current.video) ? current.video : `/${current.video.replace(/^public[\\/]/, "").replace(/\\/g, "/")}`) : null;
                           const previewSrc = file ? URL.createObjectURL(file) : (isEdit ? currentSrc : null);
                           if (previewSrc) {
                             return (
                               <div className="w-full space-y-3">
                                 <video src={previewSrc} className="w-full h-48 object-cover rounded-lg shadow-sm bg-black" controls />
                                 <p className="text-xs text-teal-600 font-medium flex items-center justify-center gap-1">
                                   <Sparkles className="w-3 h-3" />
                                   {file ? "New video selected" : "Current video | Drag and drop to replace this video or click to upload"}
                                 </p>
                               </div>
                             );
                           }
                           return (
                             <div className="py-4 space-y-3">
                               <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto">
                                 <Upload className="w-6 h-6" />
                               </div>
                               <div>
                                 <p className="text-sm font-medium text-slate-700">Click to upload video</p>
                                 <p className="text-xs text-slate-500 mt-1">or drag and drop MP4, WebM</p>
                               </div>
                             </div>
                           );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 gap-3">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="border-slate-200 hover:bg-white hover:text-slate-900">
                  Cancel
                </Button>
                <Button 
                  onClick={action} 
                  disabled={
                    submitting || 
                    (!isEdit && (!clientName.trim() || (isVideoUrlAdd ? !videoUrlAdd.trim() : !videoFile))) ||
                    (isEdit && (!editName.trim() || (editIsVideoUrl ? !editVideoUrl.trim() : false)))
                  } 
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEdit ? "Saving Changes..." : "Uploading..."}
                    </>
                  ) : (
                    <>{isEdit ? "Save Changes" : "Publish Story"}</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </SupportLayout>
  );
}
