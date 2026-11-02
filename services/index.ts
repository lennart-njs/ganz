// Hier wird später das echte Backend eingesetzt. Screens importieren nur `services`.
import { httpChatService } from './chatService';
import { httpGuideService } from './guideService';
import { mockContractService } from './mock/contractService';
import { mockDiagnosisService } from './mock/diagnosisService';
import { mockTypePlateService } from './mock/typePlateService';
import { mockVideoService } from './mock/videoService';

export const services = {
  chat: httpChatService,
  contract: mockContractService,
  diagnosis: mockDiagnosisService,
  guides: httpGuideService,
  typePlate: mockTypePlateService,
  video: mockVideoService,
};

export type * from './types';
export type { ChatError, ChatResult, ChatService } from './chatService';
export type { GuideService } from './guideService';
