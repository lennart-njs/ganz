// Hier wird später das echte Backend eingesetzt. Screens importieren nur `services`.
import { mockContractService } from './mock/contractService';
import { mockDiagnosisService } from './mock/diagnosisService';
import { mockTypePlateService } from './mock/typePlateService';

export const services = {
  contract: mockContractService,
  diagnosis: mockDiagnosisService,
  typePlate: mockTypePlateService,
};

export type * from './types';
