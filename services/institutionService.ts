import { Institution, CustomFormatSchema } from '../types';
import { User } from './authService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'saas_institutions_v1';
const ACTIVE_OVERRIDE_KEY = 'saas_active_institution_override';

export const DEFAULT_INSTITUTION: Institution = {
  id: 'guaimaral',
  name: 'INSTITUCIÓN EDUCATIVA GUAIMARAL',
  shortName: 'I.E. Guaimaral',
  slug: 'guaimaral',
  logoUrl: '/logo_guaimaral.png',
  primaryColor: '#2563eb',
  accentColor: '#4f46e5',
  status: 'active',
  formatSchema: {
    procesoName: 'PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES',
    lema: 'Calidad Humana y Excelencia Académica',
    daneCode: '154001001234',
    nit: '890.501.234-5',
    hasCorporeidadAdi: true,
    hasEjeCrese: true,
    momento1Name: 'Inicio',
    momento2Name: 'Desarrollo',
    momento3Name: 'Cierre',
    customFormatNotes: 'Enfoque DUA, Competencias MEN y Corporeidad ADI.',
    promptInstructions: 'Alinear rigurosamente con los 3 momentos clásicos (Inicio, Desarrollo, Cierre), incluyendo el momento ADI y el Eje CRESE institucional de la I.E. Guaimaral.'
  },
  totalTeachers: 24,
  createdAt: '2026-01-01T00:00:00.000Z'
};

export const INITIAL_INSTITUTIONS: Institution[] = [
  DEFAULT_INSTITUTION
];

class InstitutionService {
  private institutions: Institution[] = [];
  private listeners: (() => void)[] = [];
  private isSupabaseSubscribed = false;

  constructor() {
    this.loadFromStorage();
    this.syncWithSupabase();
  }

  private mapFromSupabase(row: any): Institution {
    return {
      id: row.id,
      name: row.name,
      shortName: row.short_name || row.shortName || row.name,
      slug: row.slug || row.id,
      logoUrl: row.logo_url || row.logoUrl || '/logo_guaimaral.png',
      primaryColor: row.primary_color || row.primaryColor || '#2563eb',
      accentColor: row.accent_color || row.accentColor || '#4f46e5',
      status: row.status || 'active',
      formatSchema: row.format_schema || row.formatSchema || {},
      totalTeachers: row.totalTeachers || 0,
      createdAt: row.created_at || row.createdAt || new Date().toISOString()
    };
  }

  public async syncWithSupabase() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('⚠️ [SaaS] No se pudieron cargar instituciones desde Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Excluir tajantemente sanjose y laesperanza - solo Guaimaral
        const cloudInsts = data
          .map(d => this.mapFromSupabase(d))
          .filter(i => i.id !== 'sanjose' && i.id !== 'laesperanza');
        
        const cloudIds = new Set(cloudInsts.map(i => i.id));
        const merged = [...cloudInsts];

        for (const local of this.institutions) {
          if (local.id !== 'sanjose' && local.id !== 'laesperanza' && !cloudIds.has(local.id)) {
            merged.push(local);
            this.persistToSupabase(local).catch(() => {});
          }
        }

        this.institutions = merged.length > 0 ? merged : [DEFAULT_INSTITUTION];
        this.saveToStorage(false); // No reenviar a Supabase para evitar bucle
      } else {
        // La tabla está vacía en Supabase: sembramos las instituciones iniciales
        for (const initInst of INITIAL_INSTITUTIONS) {
          await this.persistToSupabase(initInst);
        }
      }

      // Suscripción Realtime para actualizar la lista de colegios instantáneamente en todas las pestañas
      if (!this.isSupabaseSubscribed) {
        this.isSupabaseSubscribed = true;
        supabase
          .channel('saas-institutions-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => {
            this.syncWithSupabase();
          })
          .subscribe();
      }
    } catch (e) {
      console.error('Error sincronizando instituciones con Supabase:', e);
    }
  }

  private async persistToSupabase(inst: Institution) {
    if (!supabase || inst.id === 'sanjose' || inst.id === 'laesperanza') return;
    try {
      const payload = {
        id: inst.id,
        name: inst.name,
        short_name: inst.shortName,
        slug: inst.slug,
        logo_url: inst.logoUrl,
        primary_color: inst.primaryColor,
        accent_color: inst.accentColor,
        status: inst.status,
        format_schema: inst.formatSchema,
        created_at: inst.createdAt
      };
      await supabase.from('institutions').upsert([payload]);
    } catch (err) {
      console.warn('Persist error to Supabase institutions:', err);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((p: any) => p.id !== 'sanjose' && p.id !== 'laesperanza');
          const existingIds = new Set(filtered.map((p: any) => p.id));
          const merged = [...filtered];
          for (const initInst of INITIAL_INSTITUTIONS) {
            if (!existingIds.has(initInst.id)) {
              merged.push(initInst);
            }
          }
          this.institutions = merged.length > 0 ? merged : [DEFAULT_INSTITUTION];
          this.saveToStorage(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error loading institutions from storage, using defaults', e);
    }
    this.institutions = [...INITIAL_INSTITUTIONS];
    this.saveToStorage(false);
  }

  private saveToStorage(notifyCloud: boolean = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.institutions));
      this.notifyListeners();
    } catch (e) {
      console.error('Error saving institutions to storage', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error('Listener error', e); }
    });
  }

  public getInstitutions(): Institution[] {
    return this.institutions.filter(i => i.id !== 'sanjose' && i.id !== 'laesperanza');
  }

  public getInstitutionById(id: string): Institution {
    const found = this.institutions.find(i => i.id === id || i.slug === id);
    return found || DEFAULT_INSTITUTION;
  }

  public getActiveInstitution(user?: User | null): Institution {
    // Modo Institucional Fijo: Exclusivo I.E. Guaimaral
    return DEFAULT_INSTITUTION;
  }

  public setActiveOverride(institutionId: string | null) {
    localStorage.removeItem(ACTIVE_OVERRIDE_KEY);
    this.notifyListeners();
  }

  public getActiveOverrideId(): string | null {
    return localStorage.getItem(ACTIVE_OVERRIDE_KEY);
  }

  public createInstitution(data: {
    name: string;
    shortName: string;
    logoUrl?: string;
    primaryColor?: string;
    daneCode?: string;
    nit?: string;
    lema?: string;
    formatSchema?: Partial<CustomFormatSchema>;
  }): Institution {
    const slug = data.shortName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `col-${Date.now()}`;

    const id = slug;

    const newInst: Institution = {
      id,
      name: data.name.trim().toUpperCase(),
      shortName: data.shortName.trim(),
      slug,
      logoUrl: data.logoUrl || '/logo_guaimaral.png',
      primaryColor: data.primaryColor || '#2563eb',
      accentColor: '#3b82f6',
      status: 'active',
      formatSchema: {
        procesoName: data.formatSchema?.procesoName || 'PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES',
        lema: data.lema || data.formatSchema?.lema || 'Calidad y Formación Integral',
        daneCode: data.daneCode || '',
        nit: data.nit || '',
        hasCorporeidadAdi: data.formatSchema?.hasCorporeidadAdi ?? false,
        hasEjeCrese: data.formatSchema?.hasEjeCrese ?? true,
        momento1Name: data.formatSchema?.momento1Name || 'Inicio',
        momento2Name: data.formatSchema?.momento2Name || 'Desarrollo',
        momento3Name: data.formatSchema?.momento3Name || 'Cierre',
        customFormatNotes: data.formatSchema?.customFormatNotes || '',
        promptInstructions: data.formatSchema?.promptInstructions || ''
      },
      totalTeachers: 0,
      createdAt: new Date().toISOString()
    };

    // Evitar duplicados por ID
    this.institutions = this.institutions.filter(i => i.id !== id);
    this.institutions.push(newInst);
    this.saveToStorage();
    this.persistToSupabase(newInst).catch(() => {});

    return newInst;
  }

  public updateInstitution(id: string, updates: Partial<Institution>): Institution {
    const index = this.institutions.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error(`Colegio con ID ${id} no encontrado.`);
    }

    const current = this.institutions[index];
    const updated: Institution = {
      ...current,
      ...updates,
      formatSchema: {
        ...current.formatSchema,
        ...(updates.formatSchema || {})
      }
    };

    this.institutions[index] = updated;
    this.saveToStorage();
    this.persistToSupabase(updated).catch(() => {});
    return updated;
  }

  public deleteInstitution(id: string): boolean {
    if (id === 'guaimaral') {
      throw new Error('No es posible eliminar el colegio raíz Guaimaral.');
    }
    this.institutions = this.institutions.filter(i => i.id !== id);
    this.saveToStorage();
    if (supabase) {
      supabase.from('institutions').delete().eq('id', id).then(({ error }) => {
        if (error) console.error("Error eliminando colegio en Supabase:", error);
      });
    }
    return true;
  }

  /**
   * INGESTOR INTELIGENTE CON IA:
   * Analiza el formato institucional provisto por el usuario (texto de la plantilla,
   * encabezados de tabla, o estructura) y devuelve automáticamente el esquema
   * paramétrico con los nombres exactos de los momentos pedagógicos y lema.
   */
  public async analyzeFormatWithAI(rawFormatSample: string): Promise<CustomFormatSchema> {
    if (!rawFormatSample || rawFormatSample.trim().length < 15) {
      throw new Error('El texto del formato es muy corto para ser analizado.');
    }

    // Heurística de detección rápida offline / fallback
    const lower = rawFormatSample.toLowerCase();
    
    // Detección de momentos pedagógicos habituales en Colombia
    let m1 = 'Inicio';
    let m2 = 'Desarrollo';
    let m3 = 'Cierre';

    if (lower.includes('exploraci') || lower.includes('exploracion')) m1 = 'Exploración';
    else if (lower.includes('vivencia')) m1 = 'Vivencia';
    else if (lower.includes('indagaci')) m1 = 'Indagación';
    else if (lower.includes('saberes previos')) m1 = 'Saberes Previos';
    else if (lower.includes('apertura')) m1 = 'Apertura';

    if (lower.includes('estructuraci') || lower.includes('estructuracion')) m2 = 'Estructuración';
    else if (lower.includes('fundamentaci') || lower.includes('fundamentacion')) m2 = 'Fundamentación';
    else if (lower.includes('conceptualizaci')) m2 = 'Conceptualización';
    else if (lower.includes('desarrollo y practica')) m2 = 'Práctica Guiada';

    if (lower.includes('transferencia')) m3 = 'Transferencia';
    else if (lower.includes('valoraci') || lower.includes('valoracion')) m3 = 'Valoración';
    else if (lower.includes('evaluacion formativa') || lower.includes('evaluación')) m3 = 'Evaluación Formativa';
    else if (lower.includes('cierre y evaluaci')) m3 = 'Cierre y Reflexión';

    const hasAdi = lower.includes('adi') || lower.includes('corporeidad') || lower.includes('actividad fisica');
    const hasCrese = lower.includes('crese') || lower.includes('socioemocional') || lower.includes('ciudadana');

    // Intentar refinar con Gemini si hay llave disponible
    try {
      const apiKey = process.env.GEMINI_API_KEY || (window as any).__GEMINI_API_KEY__;
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { responseMimeType: 'application/json' }
        });
        const prompt = `Analiza este formato o texto institucional de planeación docente de un colegio colombiano.
Extrae y devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "procesoName": "Nombre del proceso o encabezado de calidad si existe",
  "lema": "Lema o slogan institucional si existe",
  "daneCode": "Código DANE si se menciona",
  "nit": "NIT si se menciona",
  "momento1Name": "Nombre de la fase inicial (ej: Inicio, Exploración, Vivencia, etc.)",
  "momento2Name": "Nombre de la fase central (ej: Desarrollo, Estructuración, Fundamentación, etc.)",
  "momento3Name": "Nombre de la fase final (ej: Cierre, Transferencia, Valoración, etc.)",
  "hasCorporeidadAdi": true/false,
  "hasEjeCrese": true/false,
  "customFormatNotes": "Breve resumen de particularidades del formato",
  "promptInstructions": "Instrucción clara para la IA sobre cómo redactar las clases según las exigencias de este colegio"
}

Texto del formato institucional:
"""
${rawFormatSample.slice(0, 4000)}
"""`;

        const res = await model.generateContent(prompt);
        const resText = res.response.text();

        if (resText) {
          const parsed = JSON.parse(resText);
          return {
            procesoName: parsed.procesoName || 'PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES',
            lema: parsed.lema || 'Calidad y Formación Integral',
            daneCode: parsed.daneCode || '',
            nit: parsed.nit || '',
            momento1Name: parsed.momento1Name || m1,
            momento2Name: parsed.momento2Name || m2,
            momento3Name: parsed.momento3Name || m3,
            hasCorporeidadAdi: parsed.hasCorporeidadAdi ?? hasAdi,
            hasEjeCrese: parsed.hasEjeCrese ?? hasCrese,
            customFormatNotes: parsed.customFormatNotes || 'Formato institucional adaptado por IA.',
            promptInstructions: parsed.promptInstructions || `Estructurar cada sesión en: 1) ${m1}, 2) ${m2}, 3) ${m3}.`
          };
        }
      }
    } catch (err) {
      console.warn('Gemini analysis fallback to heuristic parser:', err);
    }

    // Retorno basado en heurística inteligente
    return {
      procesoName: 'PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES',
      lema: 'Calidad y Excelencia Académica',
      daneCode: '',
      nit: '',
      momento1Name: m1,
      momento2Name: m2,
      momento3Name: m3,
      hasCorporeidadAdi: hasAdi,
      hasEjeCrese: hasCrese,
      customFormatNotes: `Formato adaptado con momentos: ${m1} -> ${m2} -> ${m3}.`,
      promptInstructions: `Estructurar las sesiones didácticas rigurosamente en tres momentos institucionales: 1) ${m1}, 2) ${m2}, y 3) ${m3}.`
    };
  }
}

export const institutionService = new InstitutionService();
