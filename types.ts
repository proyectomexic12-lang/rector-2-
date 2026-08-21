export interface SequenceInput {
  grado: string;
  area: string;
  tema: string;
  dba: string; // Derecho Básico de Aprendizaje
  sesiones: number;
  ejeCrese: string;
}

export interface Activity {
  sesion: number;
  descripcion?: string; // Legacy field
  fase_inicio?: string;
  fase_desarrollo?: string;
  fase_cierre?: string;
  preguntas_socraticas?: string[]; // Nuevas preguntas para el docente
  materiales: string[];
  tiempo: string;
  imprimibles: string;
  adi_especifico?: string; // Momento ADI/CRESE específico de la sesión
}

export interface RubricCriteria {
  criterio: string;
  bajo?: string;
  basico: string;
  alto?: string;
  superior?: string;
  satisfactorio?: string; // Legacy
  avanzado?: string; // Legacy
  retroalimentacion: string;
}

export interface EvaluationItem {
  pregunta: string;
  tipo: string;
  opciones?: string[]; // Para preguntas de selección múltiple (A, B, C, D)
  respuesta_correcta?: string;
  justificacion?: string; // Por qué es la respuesta correcta (ICFES)
}

export interface Resource {
  nombre: string;
  descripcion: string;
}

export interface DidacticSequence {
  tema_principal: string;
  objetivo_aprendizaje: string;
  contenidos: string[];
  competencias_men: string;
  estandar: string;
  metodologia: string;
  corporiedad_adi: string; // Specific institutional field
  actividades: Activity[];
  rubrica: RubricCriteria[];
  evaluacion: EvaluationItem[];
  recursos: Resource[];
  alertas_generadas?: string[]; // Para mensajes de incoherencia (Ej: "DBA corregido...")
  dba_utilizado?: string; // El DBA que realmente usó la IA

  // Nuevos campos formato institucional
  titulo_secuencia: string;
  descripcion_secuencia: string;
  productos_asociados: string;
  instrumentos_evaluacion: string;
  bibliografia: string; // Puede ser string largo o array, usaremos string con saltos por simplicidad visual
  observaciones: string;
  adecuaciones_piar: string;
  eje_crese_utilizado?: string; // El eje CRESE seleccionado por la IA
  numero_secuencia?: string; // Para edición manual del número de secuencia
  // Nuevos campos de expansión masiva
  glosario?: { termino: string; definicion: string }[];
  aula_invertida?: string;
  // Nuevos campos para facilitar la vida al docente
  taller_imprimible: TallerImprimible;
}

export interface TallerImprimible {
  introduccion: string;
  instrucciones: string;
  bitacora_test_inicial?: string;
  ejercicios: string[];
  reto_creativo: string;
}

export interface SubscriptionStatus {
  status: 'admin' | 'vigente' | 'vencido' | 'sin_plan';
  isUnlimited: boolean;
  isValid: boolean; // True si admin o plan vigente no vencido
  startDate: string | null;
  nextBillingDate: Date | null;
  nextBillingDateStr: string;
  monthlyPrice: number;
  monthsPaid: number;
  daysOverdue: number;
  monthsOverdue: number;
  totalDebt: number;
}

export interface ChatMessage {
  id: string;
  sender_email: string;
  sender_name: string;
  receiver_email: string;
  message: string;
  role: 'docente' | 'admin';
  is_read: boolean;
  timestamp: string;
}

export interface ChatConversation {
  teacher_email: string;
  teacher_name: string;
  last_message: string;
  last_timestamp: string;
  unread_count: number;
  messages: ChatMessage[];
}


