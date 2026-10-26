// Hier wird später das echte Backend eingesetzt. Screens importieren nur `services`.
import { httpChatService } from './chatService';
import { mockContractService } from './mock/contractService';
import { mockDiagnosisService } from './mock/diagnosisService';
import { mockTypePlateService } from './mock/typePlateService';
import { mockVideoService } from './mock/videoService';

export const services = {
  chat: httpChatService,
  contract: mockContractService,
  diagnosis: mockDiagnosisService,
  typePlate: mockTypePlateService,
  video: mockVideoService,
};

export type * from './types';
export type { ChatError, ChatResult, ChatService } from './chatService';
