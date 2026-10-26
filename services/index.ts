// Hier wird später das echte Backend eingesetzt. Screens importieren nur `services`.
import { mockContractService } from './mock/contractService';
import { mockTypePlateService } from './mock/typePlateService';

export const services = {
  contract: mockContractService,
  typePlate: mockTypePlateService,
};

export type * from './types';
