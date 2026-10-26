// Nur für die Platzhalter aus Schritt 4. Ab Schritt 5 kommen Geräte und Fälle aus dem Store.
import { demoConfig } from '@/config/demo.config';

export const DEMO_DEVICE_ID = 'geraet-demo';
export const DEMO_CASE_ID = `${demoConfig.caseNumber.prefix}${demoConfig.caseNumber.start}`;
export const DEMO_DEVICE_LABEL = `${demoConfig.manufacturer.name} ${demoConfig.device.model}`;
