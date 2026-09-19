'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  ExternalLink, 
  ArrowLeft, 
  Save, 
  LogOut, 
  Search, 
  CheckCircle2, 
  Sparkles,
  Phone,
  Mail,
  Video,
  FileText,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
  X,
  Upload,
  Send,
  Copy,
  Zap,
  Bell
} from 'lucide-react';
import { Modulo, Recurso, ClassroomConfig, Lead } from '@/lib/types';
import { INITIAL_MODULOS, DEFAULT_CONFIG } from '@/lib/demoData';
import { EmailStudio } from '@/components/admin/EmailStudio';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'modulos' | 'leads' | 'ajustes' | 'automatizaciones'>('modulos');
  
  // Data states
  const [modulos, setModulos] = useState<Modulo[]>(INITIAL_MODULOS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [config, setConfig] = useState<ClassroomConfig>(DEFAULT_CONFIG);
  const [searchLead, setSearchLead] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected module for detail viewing/editing inside admin
  const [activeModuleForLessons, setActiveModuleForLessons] = useState<Modulo | null>(null);

  // Edit Module Modal State
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Modulo | null>(null);
  const [formModTitle, setFormModTitle] = useState('');
  const [formModDesc, setFormModDesc] = useState('');
  const [formModCover, setFormModCover] = useState('');
  const [formModBanner, setFormModBanner] = useState('');
  const [formModLocked, setFormModLocked] = useState(true);
  const [formModDraft, setFormModDraft] = useState(false);
  const [formNotifyEmail, setFormNotifyEmail] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Edit Lesson Modal State
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Recurso | null>(null);
  const [formLessonTitle, setFormLessonTitle] = useState('');
  const [formLessonContent, setFormLessonContent] = useState('');
  const [formLessonVideo, setFormLessonVideo] = useState('');
  const [formLessonFile, setFormLessonFile] = useState('');
  const [formLessonDraft, setFormLessonDraft] = useState(false);

  // CSV Import State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvPreviewList, setCsvPreviewList] = useState<Array<{ nombre: string; email: string; telefono: string }>>([]);

  // Check auth
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_authenticated') === 'true';
    if (!isAuth) {
      router.push('/admin/login');
    }
  }, [router]);

  const refreshData = async () => {
    try {
      const [contentRes, leadsRes, configRes] = await Promise.all([
        fetch('/api/content', { cache: 'no-store' }),
        fetch('/api/leads', { cache: 'no-store' }),
        fetch('/api/config', { cache: 'no-store' })
      ]);

      if (contentRes.ok) {
        const cData = await contentRes.json();
        if (cData.modulos && cData.modulos.length > 0) {
          setModulos(cData.modulos);
          try {
            localStorage.setItem('boveda_modulos_cache', JSON.stringify(cData.modulos));
          } catch (e) {}

          if (activeModuleForLessons) {
            const updated = cData.modulos.find((m: Modulo) => m.id === activeModuleForLessons.id);
            if (updated) setActiveModuleForLessons(updated);
          }
        }
      }
      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        if (lData.leads) setLeads(lData.leads);
      }
      if (configRes.ok) {
        const confData = await configRes.json();
        if (confData.config) {
          setConfig(confData.config);
          try {
            localStorage.setItem('boveda_config_cache', JSON.stringify(confData.config));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error refreshing admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    router.push('/');
  };

  // --- TOGGLE LOCK FOR INDIVIDUAL MODULE ---
  const handleToggleModuleLock = async (module: Modulo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newLock = !(module.bloqueado ?? true);

    setModulos(prev => prev.map(m => m.id === module.id ? { ...m, bloqueado: newLock } : m));
    if (activeModuleForLessons?.id === module.id) {
      setActiveModuleForLessons(prev => prev ? { ...prev, bloqueado: newLock } : null);
    }

    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_module',
          moduleData: {
            ...module,
            bloqueado: newLock,
          },
        }),
      });
    } catch (err) {
      alert('Error al actualizar estado de bloqueo');
      refreshData();
    }
  };

  // --- BULK LOCK / UNLOCK ALL MODULES ---
  const handleBulkLock = async (locked: boolean) => {
    const confirmMsg = locked 
      ? '¿Deseas BLOQUEAR todos los módulos? Los visitantes tendrán que dejar sus datos para verlos.'
      : '¿Deseas DESBLOQUEAR todos los módulos? Serán de acceso libre para cualquier visitante.';
    
    if (!confirm(confirmMsg)) return;

    setModulos(prev => prev.map(m => ({ ...m, bloqueado: locked })));

    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_lock',
          locked: locked,
        }),
      });
      alert(`Módulos ${locked ? 'bloqueados' : 'desbloqueados'} correctamente`);
      refreshData();
    } catch (err) {
      alert('Error en el bloqueo masivo');
    }
  };

  // --- COVER FILE UPLOAD WITH CLIENT-SIDE CANVAS COMPRESSION (100% FAIL-PROOF FOR VERCEL) ---
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize and compress to max 1280x720 (16:9)
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1280;
          const maxHeight = 720;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Ultra-lightweight WebP / JPEG (results in ~30-50 KB)
            const compressed = canvas.toDataURL('image/webp', 0.82);
            setFormModCover(compressed);
          }
          setIsUploadingCover(false);
        };
        img.onerror = () => {
          alert('No se pudo procesar la imagen. Intenta con otro archivo.');
          setIsUploadingCover(false);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        alert('Error al leer el archivo');
        setIsUploadingCover(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Error al procesar la imagen');
      setIsUploadingCover(false);
    }
  };

  // --- OPEN MODULE EDIT MODAL ---
  const handleOpenModuleModal = (mod?: Modulo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (mod) {
      setEditingModule(mod);
      setFormModTitle(mod.titulo);
      setFormModDesc(mod.descripcion || '');
      setFormModCover(mod.portada_url || '');
      setFormModBanner(mod.etiqueta_superior || '');
      setFormModLocked(mod.bloqueado ?? true);
      setFormModDraft(mod.publicado === false);
      setFormNotifyEmail(false);
    } else {
      setEditingModule(null);
      setFormModTitle('');
      setFormModDesc('');
      setFormModCover('');
      setFormModBanner('NUEVO MÓDULO');
      setFormModLocked(true);
      setFormModDraft(false);
      setFormNotifyEmail(false);
    }
    setModuleModalOpen(true);
  };

  // --- TOGGLE PUBLISH (BORRADOR / PUBLICO) FOR INDIVIDUAL MODULE ---
  const handleToggleModulePublish = async (module: Modulo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newPublicado = !(module.publicado ?? true);

    // Optimistic instant UI update
    setModulos(prev => prev.map(m => m.id === module.id ? { ...m, publicado: newPublicado } : m));
    if (activeModuleForLessons?.id === module.id) {
      setActiveModuleForLessons(prev => prev ? { ...prev, publicado: newPublicado } : null);
    }

    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_module',
          moduleData: {
            ...module,
            publicado: newPublicado,
          },
        }),
      });
      if (!res.ok) {
        alert('Error al cambiar estado de publicación');
        refreshData();
      }
    } catch (err) {
      alert('Error de conexión');
      refreshData();
    }
  };

  // --- SAVE MODULE ---
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formModTitle.trim()) return;

    try {
      const payload: Partial<Modulo> = {
        id: editingModule ? editingModule.id : undefined,
        titulo: formModTitle.trim(),
        descripcion: formModDesc.trim(),
        portada_url: formModCover.trim(),
        etiqueta_superior: formModBanner.trim(),
        bloqueado: formModLocked,
        orden: editingModule ? editingModule.orden : modulos.length + 1,
        publicado: !formModDraft,
      };

      // 1. Optimistic Instant UI Update (0ms delay)
      if (editingModule) {
        setModulos(prev => prev.map(m => m.id === editingModule.id ? { ...m, ...payload } : m));
      } else {
        const tempMod: Modulo = {
          id: `mod-${Date.now()}`,
          titulo: payload.titulo!,
          descripcion: payload.descripcion || '',
          portada_url: payload.portada_url || '',
          etiqueta_superior: payload.etiqueta_superior || '',
          bloqueado: payload.bloqueado ?? true,
          publicado: payload.publicado ?? true,
          orden: payload.orden || modulos.length + 1,
          created_at: new Date().toISOString(),
          recursos: [],
        };
        setModulos(prev => [...prev, tempMod]);
      }

      setModuleModalOpen(false);

      // 2. Persist to API / Supabase
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_module',
          moduleData: payload,
        }),
      });

      if (res.ok) {
        // If notify email was checked, broadcast to leads
        if (formNotifyEmail) {
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'notify_module_update',
              moduleTitle: formModTitle.trim(),
              moduleDesc: formModDesc.trim(),
            }),
          }).catch(console.warn);
        }

        refreshData();
      } else {
        alert('Error al guardar en el servidor. Revisa tu conexión.');
        refreshData();
      }
    } catch (err) {
      alert('Error al guardar módulo');
      refreshData();
    }
  };

  // --- DELETE MODULE ---
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('¿Estás seguro de eliminar este módulo y todas sus lecciones?')) return;

    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_module',
          moduleId,
        }),
      });
      if (activeModuleForLessons?.id === moduleId) {
        setActiveModuleForLessons(null);
      }
      refreshData();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  // --- OPEN LESSON EDIT MODAL ---
  const handleOpenLessonModal = (lesson?: Recurso) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormLessonTitle(lesson.titulo);
      setFormLessonContent(lesson.descripcion || '');
      setFormLessonVideo(lesson.video_url || '');
      setFormLessonFile(lesson.archivo_url || lesson.enlace_url || '');
      setFormLessonDraft(!lesson.publicado);
    } else {
      setEditingLesson(null);
      setFormLessonTitle('');
      setFormLessonContent('');
      setFormLessonVideo('');
      setFormLessonFile('');
      setFormLessonDraft(false);
    }
    setLessonModalOpen(true);
  };

  // --- SAVE LESSON (WITH 0MS OPTIMISTIC UPDATE) ---
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLessonTitle.trim() || !activeModuleForLessons) return;

    try {
      const payload: Partial<Recurso> = {
        id: editingLesson ? editingLesson.id : undefined,
        modulo_id: activeModuleForLessons.id,
        titulo: formLessonTitle.trim(),
        descripcion: formLessonContent.trim(),
        video_url: formLessonVideo.trim() || undefined,
        archivo_url: formLessonFile.trim() || undefined,
        enlace_url: formLessonFile.trim() || undefined,
        publicado: !formLessonDraft,
        orden: editingLesson ? editingLesson.orden : (activeModuleForLessons.recursos?.length || 0) + 1,
        tipo: formLessonVideo.trim() ? 'video' : formLessonFile.trim() ? 'enlace' : 'texto',
      };

      // 1. Optimistic Instant UI Update (0ms delay)
      if (editingLesson) {
        const updatedRec = { ...editingLesson, ...payload } as Recurso;
        setActiveModuleForLessons(prev => {
          if (!prev) return null;
          return {
            ...prev,
            recursos: (prev.recursos || []).map(r => r.id === editingLesson.id ? updatedRec : r)
          };
        });
        setModulos(prev => prev.map(m => {
          if (m.id !== activeModuleForLessons.id) return m;
          return {
            ...m,
            recursos: (m.recursos || []).map(r => r.id === editingLesson.id ? updatedRec : r)
          };
        }));
      } else {
        const newRec: Recurso = {
          id: `rec-${Date.now()}`,
          modulo_id: activeModuleForLessons.id,
          titulo: payload.titulo!,
          descripcion: payload.descripcion || '',
          video_url: payload.video_url,
          archivo_url: payload.archivo_url,
          enlace_url: payload.enlace_url,
          publicado: payload.publicado ?? true,
          orden: payload.orden || 1,
          tipo: payload.tipo || 'video',
          created_at: new Date().toISOString()
        };
        setActiveModuleForLessons(prev => {
          if (!prev) return null;
          return {
            ...prev,
            recursos: [...(prev.recursos || []), newRec]
          };
        });
        setModulos(prev => prev.map(m => {
          if (m.id !== activeModuleForLessons.id) return m;
          return {
            ...m,
            recursos: [...(m.recursos || []), newRec]
          };
        }));
      }

      setLessonModalOpen(false);

      // 2. Persist to API / Supabase
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_recurso',
          recursoData: payload,
        }),
      });

      if (res.ok) {
        refreshData();
      } else {
        alert('Error al guardar en la base de datos');
        refreshData();
      }
    } catch (err) {
      alert('Error al guardar lección');
      refreshData();
    }
  };

  // --- DELETE LESSON (WITH 0MS OPTIMISTIC UPDATE) ---
  const handleDeleteLesson = async (lessonId: string) => {
    if (!activeModuleForLessons) return;
    if (!confirm('¿Eliminar esta lección?')) return;

    // Optimistic delete
    setActiveModuleForLessons(prev => {
      if (!prev) return null;
      return {
        ...prev,
        recursos: (prev.recursos || []).filter(r => r.id !== lessonId)
      };
    });
    setModulos(prev => prev.map(m => {
      if (m.id !== activeModuleForLessons.id) return m;
      return {
        ...m,
        recursos: (m.recursos || []).filter(r => r.id !== lessonId)
      };
    }));

    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_recurso',
          moduleId: activeModuleForLessons.id,
          recursoId: lessonId,
        }),
      });
      if (res.ok) {
        refreshData();
      }
    } catch (err) {
      alert('Error al eliminar lección');
      refreshData();
    }
  };

  // --- SAVE CONFIG ---
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        alert('Ajustes guardados correctamente');
      }
    } catch (err) {
      alert('Error al guardar ajustes');
    }
  };

  // --- COPY WHATSAPP LIST FOR EXTENSIONS ---
  const handleCopyWhatsAppList = () => {
    if (leads.length === 0) {
      alert('No hay prospectos');
      return;
    }
    const text = leads.map(l => `${l.nombre},${l.telefono}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('¡Lista copiada al portapapeles! Formato: Nombre, Teléfono (listo para pegar en extensiones de WhatsApp Web como WA Web Plus o WASender).');
  };

  // --- PARSE CSV TEXT OR FILE ---
  const handleParseCsv = (raw: string) => {
    setCsvRawText(raw);
    if (!raw.trim()) {
      setCsvPreviewList([]);
      return;
    }

    const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setCsvPreviewList([]);
      return;
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const hasHeader = headers.some(h => 
      h.includes('email') || h.includes('correo') || h.includes('mail') || 
      h.includes('nombre') || h.includes('name') || h.includes('telefono') || h.includes('phone')
    );

    let emailIdx = headers.findIndex(h => h.includes('email') || h.includes('correo') || h.includes('mail'));
    let nameIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name') || h.includes('alumno') || h.includes('usuario'));
    let phoneIdx = headers.findIndex(h => h.includes('telefono') || h.includes('phone') || h.includes('tel') || h.includes('cel') || h.includes('whatsapp') || h.includes('movil'));

    const startRow = hasHeader ? 1 : 0;
    const parsed: Array<{ nombre: string; email: string; telefono: string }> = [];

    for (let i = startRow; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0) continue;

      let email = '';
      let nombre = '';
      let telefono = '';

      if (hasHeader && emailIdx !== -1) {
        email = parts[emailIdx] || '';
        nombre = nameIdx !== -1 ? parts[nameIdx] || '' : '';
        telefono = phoneIdx !== -1 ? parts[phoneIdx] || '' : '';
      } else {
        for (const p of parts) {
          if (p.includes('@') && !email) {
            email = p;
          } else if (/^\+?[0-9\s\-()]{7,}$/.test(p) && !telefono) {
            telefono = p;
          } else if (!nombre && p.length > 1) {
            nombre = p;
          }
        }
      }

      if (email && email.includes('@')) {
        parsed.push({
          nombre: nombre || email.split('@')[0],
          email: email.toLowerCase(),
          telefono: telefono || '+52 0000000000',
        });
      }
    }

    setCsvPreviewList(parsed);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) handleParseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleExecuteCsvImport = async () => {
    if (csvPreviewList.length === 0) {
      alert('No se detectaron contactos válidos para importar.');
      return;
    }

    setIsImportingCsv(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_import',
          leads: csvPreviewList.map(l => ({
            ...l,
            pais_codigo: l.telefono.startsWith('+') ? l.telefono.split(' ')[0] : '+52',
            metadata: { origen: 'import_csv_alumnos' }
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`¡Éxito! Se importaron ${data.count || csvPreviewList.length} contactos a tu lista de leads.`);
        setCsvModalOpen(false);
        setCsvRawText('');
        setCsvPreviewList([]);
        refreshData();
      } else {
        alert('Error al importar leads.');
      }
    } catch (err) {
      alert('Error de conexión al importar leads.');
    } finally {
      setIsImportingCsv(false);
    }
  };

  // Filtered leads
  const filteredLeads = leads.filter((l) => {
    const q = searchLead.toLowerCase();
    return (
      (l.nombre && l.nombre.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.telefono && l.telefono.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-gray-900">
      
      {/* Top Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ver Classroom en Vivo</span>
            </Link>
            <h1 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <span className="text-amber-500">⚡</span>
              <span>Modo Administrador · {config.nombre_classroom}</span>
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 space-x-6 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('modulos');
              setActiveModuleForLessons(null);
            }}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'modulos'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Gestor de Módulos ({modulos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'leads'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leads Capturados ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('automatizaciones')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'automatizaciones'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Email & WhatsApp Automático</span>
          </button>

          <button
            onClick={() => setActiveTab('ajustes')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'ajustes'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes Generales</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: GESTOR DE MÓDULOS (SCREENSHOT 1 & SCREENSHOT 2) */}
        {/* ========================================================================= */}
        {activeTab === 'modulos' && (
          <div className="space-y-6">
            
            {!activeModuleForLessons ? (
              <>
                {/* Control Bar: Bulk Lock & Add Module */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                      Control de Bloqueo:
                    </span>
                    <button
                      onClick={() => handleBulkLock(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Bloquear Todos</span>
                    </button>
                    <button
                      onClick={() => handleBulkLock(false)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Desbloquear Todos</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenModuleModal()}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-black bg-[#FACC15] hover:bg-[#EAB308] shadow-xs cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Crear Nuevo Módulo</span>
                  </button>
                </div>

                {/* Modules Grid with In-Place Admin Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {modulos.map((modulo) => {
                    const isLocked = modulo.bloqueado ?? true;
                    return (
                      <div
                        key={modulo.id}
                        onClick={() => setActiveModuleForLessons(modulo)}
                        className="group bg-white rounded-2xl border border-[#e5e7eb] hover:border-gray-300 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative"
                      >
                        <div>
                          {/* Yellow Top Banner */}
                          {modulo.etiqueta_superior && (
                            <div
                              className="w-full text-black font-black text-xs sm:text-[13px] tracking-wider uppercase py-1 px-3 text-center border-b border-amber-300/60"
                              style={{ backgroundColor: modulo.color_etiqueta || '#FDE047' }}
                            >
                              {modulo.etiqueta_superior}
                            </div>
                          )}

                          {/* 16:9 Thumbnail */}
                          <div className="aspect-video w-full relative overflow-hidden bg-gray-100">
                            {modulo.portada_url ? (
                              <img
                                src={modulo.portada_url}
                                alt={modulo.titulo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-sm">
                                {modulo.titulo}
                              </div>
                            )}

                            {/* Public / Draft Badge Switch (Requested Feature) */}
                            <button
                              onClick={(e) => handleToggleModulePublish(modulo, e)}
                              className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-xs z-10 transition-all ${
                                modulo.publicado === false
                                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-500 ring-2 ring-amber-300/80'
                                  : 'bg-black/70 backdrop-blur-xs text-emerald-300 hover:bg-black/90'
                              }`}
                              title="Haz clic para alternar: Público o Borrador (Oculto)"
                            >
                              {modulo.publicado === false ? (
                                <>
                                  <span>🟡 Borrador</span>
                                </>
                              ) : (
                                <>
                                  <span>🟢 Público</span>
                                </>
                              )}
                            </button>

                            {/* Lock / Unlock Switch badge */}
                            <button
                              onClick={(e) => handleToggleModuleLock(modulo, e)}
                              className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm z-10 transition-colors ${
                                isLocked
                                  ? 'bg-amber-500 text-black hover:bg-amber-600'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                              title="Haz clic para cambiar estado de bloqueo"
                            >
                              {isLocked ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Bloqueado</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>Libre</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Details */}
                          <div className="p-4 sm:p-5">
                            <h3 className="text-gray-950 font-bold text-base leading-snug group-hover:text-amber-600 transition-colors line-clamp-1">
                              {modulo.titulo}
                            </h3>
                            <p className="text-gray-500 text-xs sm:text-[13px] leading-relaxed line-clamp-2 mt-1.5 min-h-[36px]">
                              {modulo.descripcion || 'Sin descripción'}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Bar: Progress pill + Edit buttons */}
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex items-center justify-between gap-3">
                          <div className="w-full bg-[#e5e7eb] rounded-full h-5 relative overflow-hidden flex items-center">
                            <span className="absolute left-3 text-[11px] font-extrabold text-gray-600">
                              {modulo.recursos?.length || 0} lecciones
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              onClick={(e) => handleOpenModuleModal(modulo, e)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar información del módulo"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteModule(modulo.id);
                              }}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar módulo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Inside Lesson Editor (Screenshot 2) */
              <div className="space-y-4">
                
                {/* Top back bar */}
                <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
                  <button
                    onClick={() => setActiveModuleForLessons(null)}
                    className="inline-flex items-center space-x-2 text-xs font-bold text-gray-600 hover:text-gray-950 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a Módulos</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenLessonModal()}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Añadir Lección</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Lessons list */}
                  <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 truncate max-w-[200px]">
                          {activeModuleForLessons.titulo}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          {activeModuleForLessons.recursos?.length || 0} lecciones
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenLessonModal()}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                      {(!activeModuleForLessons.recursos || activeModuleForLessons.recursos.length === 0) ? (
                        <p className="text-xs text-gray-400 italic p-3 text-center">
                          No hay lecciones. Haz clic en '+' para agregar una.
                        </p>
                      ) : (
                        activeModuleForLessons.recursos.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gray-50 border border-gray-200 flex items-center justify-between gap-2"
                          >
                            <span className="truncate">
                              {!rec.publicado && '(Borrador) '}
                              {rec.titulo}
                            </span>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                onClick={() => handleOpenLessonModal(rec)}
                                className="p-1 text-gray-500 hover:text-gray-900"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(rec.id)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Preview of Active Module */}
                  <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Vista Rápida del Módulo</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Aquí los alumnos visualizarán los videos, enlaces (como el grupo de WhatsApp) y recursos adjuntos.
                    </p>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <p className="text-xs font-bold text-gray-700">
                        Cinta superior: <span className="bg-[#FDE047] text-black px-2 py-0.5 rounded font-black">{activeModuleForLessons.etiqueta_superior || 'Sin etiqueta'}</span>
                      </p>
                      <p className="text-xs font-bold text-gray-700">
                        Estado: <span className={activeModuleForLessons.bloqueado ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>{activeModuleForLessons.bloqueado ? '🔒 Bloqueado (Pide Registro)' : '🔓 Acceso Libre'}</span>
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LEADS CAPTURADOS */}
        {/* ========================================================================= */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            
            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total de Leads</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{leads.length}</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">Registrados en la Bóveda</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tasa con WhatsApp</p>
                <p className="text-3xl font-black text-amber-600 mt-1">100%</p>
                <p className="text-[11px] text-gray-500 mt-1">Con formato internacional válido</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Canal de Remarketing</p>
                <p className="text-xl font-black text-emerald-600 mt-1">WhatsApp & Email</p>
                <p className="text-[11px] text-gray-500 mt-1">Próximo paso: Venta Mentoría VIP</p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchLead}
                  onChange={(e) => setSearchLead(e.target.value)}
                  placeholder="Buscar por nombre, correo o teléfono..."
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 border border-gray-200 text-gray-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyWhatsAppList}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
                  title="Copiar lista para extensión de WhatsApp Web"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                  <span>Copiar para WhatsApp Masivo</span>
                </button>

                <button
                  onClick={() => setCsvModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-xs transition-colors cursor-pointer"
                  title="Importar alumnos o contactos desde archivo CSV"
                >
                  <Upload className="w-4 h-4 text-amber-700" />
                  <span>Importar CSV</span>
                </button>

                <a
                  href="/api/export-leads"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV</span>
                </a>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Nombre</th>
                      <th className="px-6 py-3.5">Contacto</th>
                      <th className="px-6 py-3.5">WhatsApp Directo</th>
                      <th className="px-6 py-3.5">Interés Principal</th>
                      <th className="px-6 py-3.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                          No se encontraron prospectos registrados.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        const cleanPhone = lead.telefono.replace(/\D/g, '');
                        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Hola ${lead.nombre}, vi que te registraste en nuestra Bóveda de Recursos. ¿Pudiste revisar las herramientas?`
                        )}`;

                        return (
                          <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                              {lead.nombre}
                            </td>
                            <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                              <div className="flex flex-col">
                                <a href={`mailto:${lead.email}`} className="text-amber-600 hover:underline flex items-center gap-1 font-medium">
                                  <Mail className="w-3 h-3 text-gray-400" />
                                  <span>{lead.email}</span>
                                </a>
                                <span className="text-[11px] text-gray-500 mt-0.5">{lead.telefono}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all hover:scale-105"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Abrir WhatsApp</span>
                              </a>
                            </td>
                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  {lead.origen || 'web_landing'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {lead.metadata?.interes || 'Bóveda'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                              {new Date(lead.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AUTOMATIZACIONES (EMAIL & WHATSAPP) */}
        {/* ========================================================================= */}
        {activeTab === 'automatizaciones' && (
          <div className="space-y-8">
            {/* Dynamic Email Studio & Brevo Live Integrator */}
            <EmailStudio 
              config={config} 
              leads={leads} 
              onUpdateConfig={(newConf) => {
                const updated = { ...config, ...newConf };
                setConfig(updated);
                try {
                  localStorage.setItem('boveda_config_cache', JSON.stringify(updated));
                } catch (e) {}
              }} 
            />

            {/* WhatsApp Integration Tools */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 max-w-4xl">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Herramientas Complementarias de WhatsApp</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-emerald-950">
                      Copiar Lista para Extensiones
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Copia todos los nombres y teléfonos de tus {leads.length} prospectos en formato listo para pegarlos en extensiones como WA Web Plus o WASender.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppList}
                    className="mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                  >
                    Copiar {leads.length} Contactos
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <h4 className="text-xs font-black text-gray-900">
                    Webhook de WhatsApp en Tiempo Real (Opcional)
                  </h4>
                  <input
                    type="text"
                    value={config.whatsapp_webhook_url || ''}
                    onChange={(e) => setConfig({ ...config, whatsapp_webhook_url: e.target.value })}
                    placeholder="https://tu-n8n.com/webhook/..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-xs font-mono outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-gray-500">
                    Dispara un mensaje instantáneo en n8n / Make cada vez que un visitante deja sus datos en la página.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AJUSTES GENERALES */}
        {/* ========================================================================= */}
        {activeTab === 'ajustes' && (
          <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs">
            <h2 className="text-lg font-black text-gray-900 mb-1">Configuración General & CTAs</h2>
            <p className="text-xs text-gray-500 mb-6">
              Personaliza la identidad del aula, la comunidad de WhatsApp y los botones de venta.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Nombre de la Comunidad / Bóveda
                </label>
                <input
                  type="text"
                  required
                  value={config.nombre_classroom}
                  onChange={(e) => setConfig({ ...config, nombre_classroom: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Subtítulo / Promesa Principal
                </label>
                <textarea
                  rows={2}
                  value={config.subtitulo}
                  onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>

              {/* WhatsApp Community Section */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Comunidad Gratuita de WhatsApp</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Enlace de Invitación de WhatsApp
                    </label>
                    <input
                      type="text"
                      value={config.whatsapp_comunidad_url || ''}
                      onChange={(e) => setConfig({ ...config, whatsapp_comunidad_url: e.target.value })}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Texto de la Barra Superior de Anuncio
                    </label>
                    <input
                      type="text"
                      value={config.anuncio_superior_texto || ''}
                      onChange={(e) => setConfig({ ...config, anuncio_superior_texto: e.target.value })}
                      placeholder="🚀 Accede a la Comunidad Gratuita de WhatsApp..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* High Ticket Mentorship Section */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Oferta de Mentoría Avanzada (High Ticket)</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Texto del Botón de Mentoría
                    </label>
                    <input
                      type="text"
                      value={config.cta_oferta_texto}
                      onChange={(e) => setConfig({ ...config, cta_oferta_texto: e.target.value })}
                      placeholder="🔥 Mentoría VIP 1 a 1"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Enlace de WhatsApp o Venta
                    </label>
                    <input
                      type="text"
                      value={config.cta_oferta_url}
                      onChange={(e) => setConfig({ ...config, cta_oferta_url: e.target.value })}
                      placeholder="https://wa.me/... o checkout"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-black bg-[#FACC15] hover:bg-[#EAB308] shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Ajustes</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* MODAL: EDITAR / CREAR MÓDULO (WITH FILE UPLOAD & NOTIFICATION CHECKBOX) */}
      {moduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-gray-900">
                {editingModule ? 'Editar Módulo' : 'Crear Nuevo Módulo'}
              </h3>
              <button
                onClick={() => setModuleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveModule} className="space-y-4">
              
              {/* Yellow Banner Text Label - Cleaned as requested */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Etiqueta Superior (Cinta Amarilla)
                </label>
                <input
                  type="text"
                  value={formModBanner}
                  onChange={(e) => setFormModBanner(e.target.value)}
                  placeholder="Ej. EMPIEZA AQUI o NICHOS VIRALES"
                  className="w-full px-3 py-2 rounded-xl bg-yellow-50 border border-amber-300 text-sm text-black font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Título del Módulo
                </label>
                <input
                  type="text"
                  required
                  value={formModTitle}
                  onChange={(e) => setFormModTitle(e.target.value)}
                  placeholder="Ej. 👉🏻 | Empieza Aquí"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={formModDesc}
                  onChange={(e) => setFormModDesc(e.target.value)}
                  placeholder="De qué trata este módulo..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              {/* DEDICATED IMAGE UPLOAD SECTION (100% RELIABLE & INTUITIVE) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                    🖼️ Foto de Portada (Aspecto 16:9)
                  </label>
                  <span className="text-[11px] text-slate-500 font-semibold">1280 × 720 px</span>
                </div>

                {/* Big Drag & Drop / Click Upload Box */}
                {!formModCover ? (
                  <label
                    htmlFor="cover-file-upload"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl bg-amber-50/40 hover:bg-amber-50/70 transition-all cursor-pointer group text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-400/90 text-slate-950 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      {isUploadingCover ? 'Optimizando foto...' : '📁 Toca aquí para subir imagen'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Desde tu celular o computadora (JPG, PNG, WebP)
                    </span>
                    <input
                      id="cover-file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="space-y-2">
                    {/* Live 16:9 Preview */}
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-300 bg-slate-100 relative shadow-inner group">
                      <img
                        src={formModCover}
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label
                          htmlFor="cover-file-upload-replace"
                          className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold shadow-md cursor-pointer hover:bg-slate-100"
                        >
                          Cambiar imagen
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormModCover('')}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700"
                        >
                          Quitar
                        </button>
                      </div>
                      <input
                        id="cover-file-upload-replace"
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFileUpload}
                        className="hidden"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        ✓ Imagen lista y optimizada
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormModCover('')}
                        className="text-red-600 hover:text-red-800 font-bold cursor-pointer"
                      >
                        Eliminar foto
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional URL input toggle */}
                <details className="mt-2 text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-800 font-medium select-none">
                    🔗 O pegar URL de imagen externa
                  </summary>
                  <input
                    type="text"
                    value={formModCover}
                    onChange={(e) => setFormModCover(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 outline-none font-mono"
                  />
                </details>
              </div>

              {/* Lock Switch */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {formModLocked ? '🔒 Requiere Registro (Bloqueado)' : '🔓 Acceso Libre (Público)'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {formModLocked ? 'Pide WhatsApp para acceder.' : 'Entran directamente sin registro.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormModLocked(!formModLocked)}
                  className="text-amber-500 cursor-pointer"
                >
                  {formModLocked ? (
                    <ToggleRight className="w-8 h-8 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Draft / Visibility Switch (Requested Feature) */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {formModDraft ? '🟡 Modo Borrador (Oculto al público)' : '🟢 Publicado (Visible en la Bóveda)'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {formModDraft ? 'Los visitantes NO podrán ver este módulo en la web.' : 'Visible normalmente en la portada pública.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormModDraft(!formModDraft)}
                  className="cursor-pointer"
                >
                  {formModDraft ? (
                    <ToggleLeft className="w-8 h-8 text-amber-500" />
                  ) : (
                    <ToggleRight className="w-8 h-8 text-emerald-500" />
                  )}
                </button>
              </div>

              {/* Email notification toggle */}
              <div className="flex items-center space-x-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="notify-email-check"
                  checked={formNotifyEmail}
                  onChange={(e) => setFormNotifyEmail(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
                <label htmlFor="notify-email-check" className="text-xs font-bold text-amber-950 cursor-pointer">
                  📢 Enviar correo automático a todos los alumnos sobre este contenido
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] cursor-pointer"
                >
                  Guardar Módulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR / CREAR LECCIÓN */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-gray-900">
                {editingLesson ? 'Editar Lección' : 'Crear Nueva Lección'}
              </h3>
              <button
                onClick={() => setLessonModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Título de la Lección
                </label>
                <input
                  type="text"
                  required
                  value={formLessonTitle}
                  onChange={(e) => setFormLessonTitle(e.target.value)}
                  placeholder="Ej. Grupo de Whatsapp"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Enlace, Archivo o Imagen del Recurso
                </label>
                <div className="flex items-center gap-2 mb-1.5">
                  <label
                    htmlFor="lesson-file-upload"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-gray-600" />
                    <span>📁 Subir imagen para la lección</span>
                  </label>
                  <input
                    id="lesson-file-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          let w = img.width;
                          let h = img.height;
                          if (w > 1200) { h = Math.round(h * (1200 / w)); w = 1200; }
                          canvas.width = w; canvas.height = h;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, w, h);
                            setFormLessonFile(canvas.toDataURL('image/webp', 0.82));
                          }
                        };
                        img.src = ev.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                  <span className="text-[10px] text-gray-400">o pega el enlace abajo</span>
                </div>
                <input
                  type="text"
                  value={formLessonFile}
                  onChange={(e) => setFormLessonFile(e.target.value)}
                  placeholder="https://chat.whatsapp.com/... o https://..."
                  className="w-full px-3 py-2 rounded-xl bg-blue-50/50 border border-blue-200 text-sm text-blue-600 font-mono outline-none"
                />
                {formLessonFile && formLessonFile.startsWith('data:image/') && (
                  <div className="mt-2 max-h-32 rounded-lg overflow-hidden border border-slate-200">
                    <img src={formLessonFile} alt="Vista previa lección" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  URL de Video (YouTube, Vimeo, Loom)
                </label>
                <input
                  type="text"
                  value={formLessonVideo}
                  onChange={(e) => setFormLessonVideo(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Contenido / Instrucciones de la Lección
                </label>
                <textarea
                  rows={4}
                  value={formLessonContent}
                  onChange={(e) => setFormLessonContent(e.target.value)}
                  placeholder="Instrucciones, notas o detalles de la lección..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {formLessonDraft ? 'Modo Borrador' : 'Publicado'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {formLessonDraft ? 'Oculto para los alumnos.' : 'Visible en el aula.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormLessonDraft(!formLessonDraft)}
                  className="text-amber-500 cursor-pointer"
                >
                  {formLessonDraft ? (
                    <ToggleRight className="w-8 h-8 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] cursor-pointer"
                >
                  Guardar Lección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORTAR CSV DE LEADS / ALUMNOS */}
      {/* ========================================================================= */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Importar Alumnos o Leads (CSV)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Carga los ~300 correos de tu Supabase actual para hacer remarketing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCsvModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* File upload option */}
              <div className="p-4 border-2 border-dashed border-gray-300 hover:border-amber-400 rounded-xl text-center bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt"
                  id="csv-file-input"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                >
                  <Upload className="w-6 h-6 text-amber-600" />
                  <span className="text-xs font-bold text-gray-800">
                    Haz clic para seleccionar tu archivo .CSV exportado
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Detecta automáticamente columnas de nombre, email y teléfono
                  </span>
                </label>
              </div>

              {/* Or paste directly */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    O pega el texto CSV directamente:
                  </label>
                  {csvPreviewList.length > 0 && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ {csvPreviewList.length} contactos detectados
                    </span>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={csvRawText}
                  onChange={(e) => handleParseCsv(e.target.value)}
                  placeholder={`nombre,email,telefono\nCarlos Gomez,carlos@gmail.com,+5215551234567\nMaria Lopez,maria@hotmail.com,+51999888777`}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              {/* Preview table if parsed */}
              {csvPreviewList.length > 0 && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                  <p className="text-[11px] font-bold text-amber-900 mb-1.5">
                    Vista previa de los primeros contactos a importar:
                  </p>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                    {csvPreviewList.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-amber-100 text-gray-700">
                        <span className="font-bold truncate max-w-[140px]">{c.nombre}</span>
                        <span className="text-gray-500 truncate max-w-[160px]">{c.email}</span>
                        <span className="text-gray-400 text-[10px]">{c.telefono}</span>
                      </div>
                    ))}
                  </div>
                  {csvPreviewList.length > 5 && (
                    <p className="text-[10px] text-amber-700 mt-1.5 text-center">
                      ... y {csvPreviewList.length - 5} contactos más.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={csvPreviewList.length === 0 || isImportingCsv}
                onClick={handleExecuteCsvImport}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {isImportingCsv ? (
                  <span>Importando...</span>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar {csvPreviewList.length > 0 ? `${csvPreviewList.length} Leads` : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
