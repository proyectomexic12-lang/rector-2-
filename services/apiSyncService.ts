import { DidacticSequence, SequenceInput } from '../types';
import { authService } from './authService';

export interface RevisionMetadata {
  area: string;
  grado: string;
  numero_semana: number;
  fecha_aplicacion: string;
  duracion_clases: number;
}

export interface SyncResponse {
  success: boolean;
  mensaje: string;
  id?: string;
  radicado?: string;
  version?: number;
  estado?: string;
  fecha_registro?: string;
}

class ApiSyncService {
  private getApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_REVISION_API_URL;
    if (envUrl) {
      // Si la URL termina en /recibir, quitarlo para obtener la base
      return envUrl.replace(/\/recibir\/?$/, '');
    }
    return 'http://localhost:3001/api/planeaciones';
  }

  /**
   * Obtiene la configuración de entrega de planeaciones para un docente
   */
  async getConfigEntrega(docenteEmail?: string): Promise<any> {
    const baseUrl = this.getApiBaseUrl();
    const currentUser = authService.getCurrentUser();
    const email = docenteEmail || currentUser?.email || '';

    try {
      const response = await fetch(`${baseUrl}/config-entrega?docente_email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.warn('⚠️ No se pudo conectar con el servidor de recepción (usando fallback local):', error.message);
      return null;
    }
  }

  /**
   * Consulta las planeaciones radicadas por un docente y su estado de revisión
   */
  async consultarMisPlaneaciones(docenteEmail?: string): Promise<any[]> {
    const baseUrl = this.getApiBaseUrl();
    const currentUser = authService.getCurrentUser();
    const email = docenteEmail || currentUser?.email || '';

    try {
      const response = await fetch(`${baseUrl}?docente_email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      return [];
    }
  }

  /**
   * Envía una planeación estructurada al software receptor / SIGEP
   */
  async enviarPlaneacionARevision(
    secuencia: DidacticSequence,
    input?: SequenceInput,
    adjuntos?: any,
    metadata?: RevisionMetadata
  ): Promise<SyncResponse> {
    const baseUrl = this.getApiBaseUrl();
    const currentUser = authService.getCurrentUser();

    const payload = {
      docente: {
        email: currentUser?.email || 'docente@guaimaral.edu.co',
        nombre: currentUser?.name || 'Docente Guaimaral',
      },
      metadata: metadata || {
        area: input?.area || secuencia.competencias_men || 'General',
        grado: input?.grado || 'Sin grado',
        numero_semana: 1,
        fecha_aplicacion: new Date().toISOString().split('T')[0],
        duracion_clases: input?.sesiones || 1,
      },
      input_original: input || null,
      secuencia: secuencia,
      fecha_envio: new Date().toISOString(),
      estado: 'Pendiente de Revisión',
      version_app: 'Docente AI Pro v6.0',
    };

    try {
      // Guardar respaldo local de seguridad antes del envío para evitar pérdida de datos
      try {
        const backupKey = `guaimaral_draft_envio_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(payload));
      } catch (e) {}

      const response = await fetch(`${baseUrl}/recibir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `Error en el servidor (${response.status})`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.mensaje || errJson.error) errMsg = errJson.mensaje || errJson.error;
        } catch (e) {
          if (errText) errMsg = errText;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      return {
        success: true,
        mensaje: data.mensaje || 'Planeación registrada exitosamente en el servidor de coordinación.',
        id: data.id || data.planeacion_id,
        radicado: data.radicado || data.id,
        version: data.version || 1,
        estado: data.estado || 'Pendiente',
        fecha_registro: data.fecha_registro || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('❌ Error enviando planeación:', error);
      if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
        throw new Error(
          'No se pudo conectar con el servidor receptor de coordinación (puerto 3001 apagado). Por favor inicia el servidor ejecutando: npm run server'
        );
      }
      throw new Error(error.message || 'No se pudo conectar con el software receptor.');
    }
  }
}

export const apiSyncService = new ApiSyncService();
