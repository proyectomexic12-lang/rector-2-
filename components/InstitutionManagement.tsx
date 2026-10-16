import React, { useState, useEffect } from 'react';
import { Institution, CustomFormatSchema } from '../types';
import { institutionService } from '../services/institutionService';
import { authService, User } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { 
  Building2, 
  Plus, 
  Sparkles, 
  Wand2, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Eye, 
  ShieldCheck, 
  FileText, 
  Upload, 
  Palette, 
  HelpCircle,
  School,
  ExternalLink,
  ChevronRight,
  Layers,
  Search,
  X,
  Users,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

interface InstitutionManagementProps {
  currentOverrideId: string | null;
  onInstitutionChange: () => void;
}

const PEDAGOGICAL_PRESETS = [
  {
    name: 'Estándar MEN (Tradicional)',
    badge: '🏛️ MEN',
    m1: 'Inicio',
    m2: 'Desarrollo',
    m3: 'Cierre',
    hasAdi: true,
    hasCrese: true,
    desc: 'Activación de saberes, modelado conceptual y síntesis con evaluación formativa.'
  },
  {
    name: 'Constructivista / Significativo',
    badge: '💡 Competencias',
    m1: 'Exploración',
    m2: 'Estructuración',
    m3: 'Transferencia',
    hasAdi: false,
    hasCrese: true,
    desc: 'Indagación del reto, conceptualización profunda y aplicación a situaciones reales.'
  },
  {
    name: 'Escuela Nueva / Activa',
    badge: '🌿 Rural / Escuela Nueva',
    m1: 'Vivencia',
    m2: 'Fundamentación',
    m3: 'Ejercitación y Aplicación',
    hasAdi: false,
    hasCrese: true,
    desc: 'Conexión vivencial, guías colaborativas y solución práctica en comunidad.'
  },
  {
    name: 'Pedagogía Conceptual (Zubiría)',
    badge: '🧠 Conceptual',
    m1: 'Fase Afectiva',
    m2: 'Fase Cognitiva',
    m3: 'Fase Expresiva',
    hasAdi: false,
    hasCrese: true,
    desc: 'Motivación y sentido, comprensión de conceptos y dominio de operaciones intelectuales.'
  },
  {
    name: 'Aprendizaje Basado en Proyectos (ABP)',
    badge: '🎯 Retos ABP',
    m1: 'Pregunta Guía / Reto',
    m2: 'Investigación y Creación',
    m3: 'Socialización y Evaluación',
    hasAdi: false,
    hasCrese: true,
    desc: 'Reto detonante, construcción colaborativa de producto y sustentación pública.'
  }
];

export const InstitutionManagement: React.FC<InstitutionManagementProps> = ({
  currentOverrideId,
  onInstitutionChange
}) => {
  const { toast } = useToast();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [daneCode, setDaneCode] = useState('');
  const [nit, setNit] = useState('');
  const [lema, setLema] = useState('');
  const [logoUrl, setLogoUrl] = useState('/logo_guaimaral.png');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  
  // Format Schema State
  const [procesoName, setProcesoName] = useState('PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES');
  const [momento1Name, setMomento1Name] = useState('Inicio');
  const [momento2Name, setMomento2Name] = useState('Desarrollo');
  const [momento3Name, setMomento3Name] = useState('Cierre');
  const [hasCorporeidadAdi, setHasCorporeidadAdi] = useState(false);
  const [hasEjeCrese, setHasEjeCrese] = useState(true);
  const [formatTextSample, setFormatTextSample] = useState('');
  const [isAnalyzingFormat, setIsAnalyzingFormat] = useState(false);

  const refreshList = () => {
    setInstitutions(institutionService.getInstitutions());
  };

  useEffect(() => {
    refreshList();
    const unsubscribe = institutionService.subscribe(refreshList);
    authService.getAllUsersWithStats().then(u => setUsers(u)).catch(() => {});
    return () => unsubscribe();
  }, []);

  const getTeacherCount = (instId: string) => {
    return users.filter(u => {
      const userInst = u.institution_id || (u.email && u.email.toLowerCase().includes('guaimaral') ? 'guaimaral' : 'guaimaral');
      return userInst === instId;
    }).length;
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setShortName('');
    setDaneCode('');
    setNit('');
    setLema('');
    setLogoUrl('/logo_guaimaral.png');
    setPrimaryColor('#2563eb');
    setProcesoName('PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES');
    setMomento1Name('Inicio');
    setMomento2Name('Desarrollo');
    setMomento3Name('Cierre');
    setHasCorporeidadAdi(false);
    setHasEjeCrese(true);
    setFormatTextSample('');
    setIsAnalyzingFormat(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (inst: Institution) => {
    setEditingId(inst.id);
    setName(inst.name);
    setShortName(inst.shortName);
    setDaneCode(inst.formatSchema?.daneCode || '');
    setNit(inst.formatSchema?.nit || '');
    setLema(inst.formatSchema?.lema || '');
    setLogoUrl(inst.logoUrl);
    setPrimaryColor(inst.primaryColor);
    setProcesoName(inst.formatSchema?.procesoName || 'PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES');
    setMomento1Name(inst.formatSchema?.momento1Name || 'Inicio');
    setMomento2Name(inst.formatSchema?.momento2Name || 'Desarrollo');
    setMomento3Name(inst.formatSchema?.momento3Name || 'Cierre');
    setHasCorporeidadAdi(inst.formatSchema?.hasCorporeidadAdi || false);
    setHasEjeCrese(inst.formatSchema?.hasEjeCrese ?? true);
    setFormatTextSample('');
    setShowModal(true);
  };

  const handleApplyPreset = (preset: typeof PEDAGOGICAL_PRESETS[0]) => {
    setMomento1Name(preset.m1);
    setMomento2Name(preset.m2);
    setMomento3Name(preset.m3);
    setHasCorporeidadAdi(preset.hasAdi);
    setHasEjeCrese(preset.hasCrese);
    toast(`✨ Modelo aplicado: ${preset.name}`, 'info');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return toast('⚠️ La imagen no debe superar 2 MB.', 'error');
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
          toast('✅ Escudo cargado correctamente.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setFormatTextSample(text.slice(0, 5000));
        toast('📄 Archivo cargado. Presiona "Analizar con IA" para procesar.', 'info');
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyzeWithAI = async () => {
    if (!formatTextSample || formatTextSample.trim().length < 15) {
      return toast('⚠️ Pega el texto o sube el archivo del formato primero.', 'error');
    }

    setIsAnalyzingFormat(true);
    try {
      const extracted = await institutionService.analyzeFormatWithAI(formatTextSample);
      setMomento1Name(extracted.momento1Name);
      setMomento2Name(extracted.momento2Name);
      setMomento3Name(extracted.momento3Name);
      if (extracted.procesoName) setProcesoName(extracted.procesoName);
      if (extracted.lema) setLema(extracted.lema);
      if (extracted.daneCode) setDaneCode(extracted.daneCode);
      if (extracted.nit) setNit(extracted.nit);
      setHasCorporeidadAdi(extracted.hasCorporeidadAdi ?? false);
      setHasEjeCrese(extracted.hasEjeCrese ?? true);
      toast('✨ ¡Formato procesado y adaptado con éxito por la IA!', 'success');
    } catch (err: any) {
      toast(`Error al analizar formato: ${err.message}`, 'error');
    } finally {
      setIsAnalyzingFormat(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast('⚠️ Ingresa el nombre oficial del colegio.', 'error');
    if (!shortName.trim()) return toast('⚠️ Ingresa el nombre corto o abreviado.', 'error');

    try {
      if (editingId) {
        institutionService.updateInstitution(editingId, {
          name: name.trim().toUpperCase(),
          shortName: shortName.trim(),
          logoUrl,
          primaryColor,
          formatSchema: {
            procesoName,
            lema,
            daneCode,
            nit,
            momento1Name,
            momento2Name,
            momento3Name,
            hasCorporeidadAdi,
            hasEjeCrese,
            customFormatNotes: `Formato configurado para ${shortName}.`
          }
        });
        toast('✅ Colegio actualizado correctamente.', 'success');
      } else {
        institutionService.createInstitution({
          name: name.trim().toUpperCase(),
          shortName: shortName.trim(),
          logoUrl,
          primaryColor,
          daneCode,
          nit,
          lema,
          formatSchema: {
            procesoName,
            lema,
            daneCode,
            nit,
            momento1Name,
            momento2Name,
            momento3Name,
            hasCorporeidadAdi,
            hasEjeCrese
          }
        });
        toast('🎉 ¡Nuevo colegio registrado exitosamente!', 'success');
      }

      setShowModal(false);
      resetForm();
      onInstitutionChange();
    } catch (err: any) {
      toast(`⚠️ ${err.message}`, 'error');
    }
  };

  const handleDelete = (id: string, instName: string) => {
    if (id === 'guaimaral') {
      return toast('⚠️ No puedes eliminar el colegio principal Guaimaral.', 'error');
    }
    if (window.confirm(`¿Estás seguro de eliminar el colegio "${instName}"? Los profesores vinculados quedarán sin asignación.`)) {
      try {
        institutionService.deleteInstitution(id);
        toast('Colegio eliminado.', 'info');
        onInstitutionChange();
      } catch (e: any) {
        toast(e.message, 'error');
      }
    }
  };

  const handleToggleSwitchOverride = (id: string) => {
    if (currentOverrideId === id) {
      institutionService.setActiveOverride(null);
      toast('Vista restablecida a tu colegio principal.', 'info');
    } else {
      institutionService.setActiveOverride(id);
      const target = institutionService.getInstitutionById(id);
      toast(`👁️ Vista activa cambiada a: ${target.shortName}`, 'success');
    }
    onInstitutionChange();
  };

  const filteredInstitutions = institutions.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inst.formatSchema?.daneCode && inst.formatSchema.daneCode.includes(searchTerm))
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      
      {/* Header Superior del SuperAdmin SaaS */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-indigo-900/40 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-wider uppercase">
              <Building2 size={14} /> Arquitectura Multi-Tenant SaaS
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Gestor de Colegios e Instituciones
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
              Administra múltiples instituciones de forma centralizada y aislada. Cada colegio opera con su propio escudo, lema institucional y <strong className="text-indigo-300">formato de planeación adaptado por IA</strong>.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center gap-3 transform hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 cursor-pointer"
          >
            <Plus size={20} /> Registrar Nuevo Colegio
          </button>
        </div>

        {/* Barra de estadísticas rápidas */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/80">
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Colegios Activos</p>
            <p className="text-3xl font-black text-white mt-1">{institutions.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Profesores</p>
            <p className="text-2xl font-black text-white mt-1 flex items-center gap-1.5">
              <Users size={20} className="text-blue-400" /> {users.length || 24}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Adaptador de Formatos</p>
            <p className="text-base font-black text-indigo-400 mt-2 flex items-center gap-1.5">
              <Wand2 size={18} /> Motor Gemini 2.0
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vista SuperAdmin</p>
            <p className="text-xs font-bold text-slate-300 mt-2 truncate">
              {currentOverrideId ? `Inspeccionando: ${currentOverrideId}` : 'Vista Predeterminada'}
            </p>
          </div>
        </div>
      </div>

      {/* Buscador de Colegios */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código DANE o NIT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all"
          />
        </div>
        <p className="text-xs font-bold text-slate-500">
          Mostrando <span className="text-slate-800 font-black">{filteredInstitutions.length}</span> de {institutions.length} instituciones
        </p>
      </div>

      {/* Grid de Colegios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInstitutions.map((inst) => {
          const isInspecting = currentOverrideId === inst.id;
          const isGuaimaral = inst.id === 'guaimaral';
          const teacherCount = getTeacherCount(inst.id);

          return (
            <div
              key={inst.id}
              className={`bg-white rounded-3xl p-6 shadow-xl border transition-all duration-300 relative flex flex-col justify-between group ${
                isInspecting 
                  ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-indigo-500/10' 
                  : 'border-slate-200/80 hover:border-slate-300 hover:shadow-2xl'
              }`}
            >
              {/* Header de la tarjeta */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <img
                      src={inst.logoUrl}
                      alt={inst.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo_guaimaral.png';
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {isGuaimaral && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                        Raíz Oficial
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                      Activo
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-slate-900 text-lg leading-snug line-clamp-2">
                  {inst.name}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                  <span className="text-indigo-600 font-extrabold">{inst.shortName}</span>
                  {inst.formatSchema?.daneCode && <span>• DANE: {inst.formatSchema.daneCode}</span>}
                </p>

                {/* Badge de Docentes Asignados */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold">
                    <Users size={12} /> {teacherCount > 0 ? `${teacherCount} Docentes` : 'Sin docentes aún'}
                  </span>
                </div>

                {inst.formatSchema?.lema && (
                  <p className="text-slate-400 text-xs italic mt-2.5 border-l-2 border-indigo-200 pl-2 line-clamp-1">
                    "{inst.formatSchema.lema}"
                  </p>
                )}

                {/* Estructura de Momentos del Formato */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers size={12} className="text-indigo-600" /> Momentos Pedagógicos:
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 flex-wrap">
                    <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                      1. {inst.formatSchema.momento1Name}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                      2. {inst.formatSchema.momento2Name}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                      3. {inst.formatSchema.momento3Name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleSwitchOverride(inst.id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isInspecting
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                      : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600'
                  }`}
                  title="Cambia la vista del sistema para generar y previsualizar como este colegio"
                >
                  <Eye size={14} />
                  {isInspecting ? 'Inspeccionando' : 'Inspeccionar'}
                </button>

                <button
                  onClick={() => handleOpenEdit(inst)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Editar configuración y formato"
                >
                  <Edit3 size={15} />
                </button>

                {!isGuaimaral && (
                  <button
                    onClick={() => handleDelete(inst.id, inst.name)}
                    className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                    title="Eliminar colegio"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL REGISTRAR / EDITAR COLEGIO CON IA */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white relative flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] font-black uppercase tracking-wider">
                  <School size={12} /> {editingId ? 'Editar Colegio' : 'Nuevo Colegio Multi-Tenant'}
                </div>
                <h2 className="text-2xl font-black tracking-tight">
                  {editingId ? 'Configuración Institucional' : 'Registrar Nueva Institución'}
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  Define la identidad y adapta su formato oficial para que la IA genere planeaciones exactas.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleSave} className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1 text-slate-800">
              
              {/* Sección 1: Datos Básicos */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-600" /> Identidad del Colegio
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Nombre Oficial de la Institución *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: INSTITUCIÓN EDUCATIVA SIMÓN BOLÍVAR"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Nombre Corto / Sigla *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: I.E. Simón Bolívar"
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Lema Institucional
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Hacia la excelencia con valor"
                      value={lema}
                      onChange={(e) => setLema(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Código DANE
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 154001004567"
                      value={daneCode}
                      onChange={(e) => setDaneCode(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      NIT
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 890.123.456-7"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Escudo y Color */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Palette size={16} className="text-indigo-600" /> Escudo y Color Temático
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                  <div className="sm:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center shadow-inner mb-3">
                      <img src={logoUrl} alt="Escudo" className="max-w-full max-h-full object-contain" />
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5">
                      <Upload size={14} /> Subir Escudo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="sm:col-span-2 space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                        URL del Escudo (o archivo local)
                      </label>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://... o /logo.png"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                        Color Primario del Colegio
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-slate-600">{primaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Ingestor Inteligente de Formato con IA y Modelos Predefinidos */}
              <div className="p-6 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-purple-50/80 rounded-3xl border border-indigo-100 space-y-5 relative overflow-hidden">
                
                {/* 1-Click Pedagogical Presets */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Compass size={16} className="text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Modelos Pedagógicos Comunes en Colombia (Carga Rápida en 1 Clic):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {PEDAGOGICAL_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="p-3 bg-white hover:bg-indigo-50/70 border border-indigo-100 rounded-xl text-left transition-all hover:border-indigo-300 shadow-2xs group cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-indigo-600">{p.badge}</span>
                        </div>
                        <p className="font-bold text-xs text-slate-800 leading-tight">{p.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-indigo-200/60 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/30">
                        <Wand2 size={18} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">O Cargar Formato Propio con IA</h4>
                        <p className="text-[11px] text-indigo-800 font-medium">Pega el texto de la plantilla o sube el archivo</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors">
                        <Upload size={14} /> Cargar Archivo
                        <input type="file" accept=".txt,.json,.doc,.docx,.pdf" onChange={handleFormatFileUpload} className="hidden" />
                      </label>

                      <button
                        type="button"
                        onClick={handleAnalyzeWithAI}
                        disabled={isAnalyzingFormat}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={14} className={isAnalyzingFormat ? 'animate-spin' : ''} />
                        {isAnalyzingFormat ? 'Analizando...' : '🪄 Analizar con IA'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={formatTextSample}
                    onChange={(e) => setFormatTextSample(e.target.value)}
                    placeholder="Pega aquí el encabezado, tabla o texto del formato de este colegio..."
                    className="w-full p-4 bg-white/90 border border-indigo-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none font-medium shadow-inner"
                  />
                </div>

                {/* Campos detectados y editables */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider mb-1.5">
                      Fase / Momento 1
                    </label>
                    <input
                      type="text"
                      required
                      value={momento1Name}
                      onChange={(e) => setMomento1Name(e.target.value)}
                      placeholder="Ej: Inicio / Exploración / Vivencia"
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider mb-1.5">
                      Fase / Momento 2
                    </label>
                    <input
                      type="text"
                      required
                      value={momento2Name}
                      onChange={(e) => setMomento2Name(e.target.value)}
                      placeholder="Ej: Desarrollo / Estructuración"
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider mb-1.5">
                      Fase / Momento 3
                    </label>
                    <input
                      type="text"
                      required
                      value={momento3Name}
                      onChange={(e) => setMomento3Name(e.target.value)}
                      placeholder="Ej: Cierre / Transferencia / Valoración"
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider mb-1.5">
                      Encabezado de Calidad en Word
                    </label>
                    <input
                      type="text"
                      value={procesoName}
                      onChange={(e) => setProcesoName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={hasCorporeidadAdi}
                        onChange={(e) => setHasCorporeidadAdi(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      Incluir Momento ADI / Corporeidad
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={hasEjeCrese}
                        onChange={(e) => setHasEjeCrese(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      Eje CRESE / Transversal
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones de Envío */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {editingId ? 'Guardar Cambios' : 'Registrar Colegio'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
