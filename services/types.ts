// Schnittstellen zum späteren Backend. Die App spricht nur mit diesen Interfaces.
import type { Confidence, Contract, DeviceCategory } from '@/model/types';

export type LinkVia = Contract['linkedVia'];

export type LinkResult =
  { ok: true; via: LinkVia; contractNumber: string } | { ok: false; reason: 'unbekannt' };

export interface ContractService {
  /** Prüft Vertragsnummer oder Händler-Code */
  link(via: LinkVia, value: string): Promise<LinkResult>;
}

export interface TypePlateData {
  manufacturerId: string;
  category: DeviceCategory;
  model: string;
  materialNumber?: string;
  serialNumber?: string;
}

export type TypePlateResult =
  { ok: true; data: TypePlateData } | { ok: false; reason: 'nicht_erkannt' };

export interface TypePlateService {
  read(scenario: 'erkannt' | 'nicht_erkannt'): Promise<TypePlateResult>;
}

export type PhotoMode = 'display' | 'typenschild' | 'bauteil';
export type ErrorPattern = 'wasserablauf' | 'laugenpumpe_blockiert' | 'wasserzulauf';
export type DiagnosisScenario = 'standard' | 'unsicher' | 'unscharf';
export type QuestionAnswer = 'ablauf' | 'zulauf' | 'unklar';

export interface DiagnosisFinding {
  kind: 'ergebnis';
  errorPattern: ErrorPattern;
  displayMessage?: string;
  confidence: Confidence;
  /** Nur intern und für Dashboards, nie in der App */
  confidenceScore: number;
  guideId: string;
}

export type DiagnosisResult =
  | DiagnosisFinding
  | { kind: 'rueckfrage'; question: 'wasser' }
  | { kind: 'geraet' }
  | { kind: 'fehler'; reason: 'unscharf' };

export interface DiagnosisService {
  analyze(input: { mode: PhotoMode; scenario: DiagnosisScenario }): Promise<DiagnosisResult>;
  /** Antwort auf die Rückfrage. null: unklar, Hilfe holen. */
  answer(answer: QuestionAnswer): DiagnosisFinding | null;
}

export type FindingOption = 'geloest' | 'reparatur' | 'ersatzgeraet';

export interface VideoService {
  /** Wartet auf eine Fachkraft. Demo kann die Wartezeit überspringen, indem sie nicht wartet. */
  connect(scenario: 'verbunden' | 'keine_fachkraft'): Promise<'verbunden' | 'keine_fachkraft'>;
  /** Empfehlung der Fachkraft nach dem Call */
  finding(): FindingOption;
}
